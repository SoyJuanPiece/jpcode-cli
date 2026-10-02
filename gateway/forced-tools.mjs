/**
 * Puente de "tool call forzada" para los modelos que no emiten tool calls.
 *
 * ## Por qué existe
 *
 * Buena parte del motor no pide JSON en texto: pide una **llamada a función forzada**.
 * El caso grande es `generateJson`, que declara una tool llamada `respond_in_schema`
 * con el esquema de la respuesta y manda `tool_choice: "required"`. Sobre eso:
 *
 *   - el **modo auto**, cuyo clasificador (`classifyAction` en chunk-AN36BHDM.js)
 *     decide con `STAGE1_SCHEMA` / `STAGE2_SCHEMA` si una acción se bloquea;
 *   - el modelo rápido, el de compactación, el advisor, el enrutado de cron…
 *
 * El clasificador es el que más se nota cuando falla, porque su error lo formatea
 * `formatClassifierUnavailableFallbackMessage` y sale tal cual en el chat:
 *
 *   Auto Mode couldn't classify this action (Classifier stage 1 unavailable).
 *   Review it manually. Switching to Default Mode is recommended if you want to
 *   continue without the classifier.
 *
 * es decir, el modo auto no está disponible. Sin clasificador, el modo auto no puede
 * aprobar nada: cada llamada a una herramienta cae en revisión manual.
 *
 * El tier gratis de Zen **no emite tool calls**. No es un fallo: es la receta. El gate
 * del tier (ver gateway/README.md y ZEN-FREE-TIER.md) exige ver en el body las 11
 * tools oficiales, y cuando se mandan como herramientas de verdad los modelos las
 * llaman y contestan con texto vacío. La receta que sí funciona es describirlas como
 * no disponibles y poner `tool_choice: "none"`. Comprobado contra el upstream real:
 * `big-pickle` con `tool_choice: "required"` devuelve `content: ""` o frases en prosa
 * ("I'll call the function…") y `tool_calls: null`; con `tool_choice: "none"` y la
 * misma pregunta devuelve `{ "shouldBlock": false }` limpio.
 *
 * ## Qué hace este módulo
 *
 * Traduce una llamada forzada a la forma que esos modelos sí cumplen, y vuelve a
 * traducir la respuesta:
 *
 *   1. **Hacia el modelo**: `tool_choice: "none"` + la instrucción de que responda
 *      solo con el JSON que habrían sido los argumentos de la función, con el esquema
 *      delante. Las tools de relleno del gateway se quedan: hacen falta para el gate.
 *   2. **Hacia el cliente**: si la respuesta trae JSON en el texto, se fabrica el
 *      `tool_calls` que el cliente esperaba y se deja el `content` vacío, como
 *      cualquier respuesta con tool call.
 *
 * Así el `generateJson` del motor encuentra su `respond_in_schema` y valida el
 * esquema, y el modo auto funciona con los modelos gratis de jpcode.
 *
 * Solo se aplica cuando se puede saber **qué** función se forzaba y su esquema es un
 * objeto. En cualquier otro caso el cuerpo sale tal cual entró.
 */

/** Nombres de los `tool_choice` que forzan una función concreta. */
function toolForzado(tools, tool_choice) {
  if (!Array.isArray(tools) || !tools.length) return null;
  const funciones = tools.filter((t) => t?.type === "function" && typeof t.function?.name === "string");
  if (!funciones.length) return null;

  let nombre = null;
  if (typeof tool_choice === "string") {
    // "required" no nombra función: solo se puede saber si el cliente mandó una sola.
    if (tool_choice !== "required" || funciones.length !== 1) return null;
    nombre = funciones[0].function.name;
  } else if (tool_choice && typeof tool_choice === "object") {
    if (tool_choice.type !== "function") return null;
    nombre = tool_choice.function?.name ?? null;
  }
  if (!nombre) return null;

  const tool = funciones.find((t) => t.function.name === nombre);
  if (!tool) return null;

  // El puente solo sabe reconstruir argumentos de tipo objeto (que es lo que
  // declara todo `generateJson`: {type:"object", …}). Cualquier otro esquema se deja
  // como estaba: es mejor el intento original que una reconstrucción inventada.
  const schema = tool.function.parameters;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return null;
  if (schema.type !== "object") return null;

  return { nombre, schema };
}

/** Lo que se le pide al modelo en vez de la llamada a la función. */
function instruccion({ nombre, schema }) {
  return [
    "",
    "## How to answer this turn",
    "",
    "You cannot call functions in this conversation. Answer with the JSON object that",
    `would have been the arguments of the function \`${nombre}\`, and nothing else:`,
    "no prose, no explanation, no markdown code fence, just the object.",
    "",
    "It must match this JSON schema:",
    JSON.stringify(schema),
  ].join("\n");
}

/**
 * Qué tool está forzando este cuerpo, si es que fuerza alguna. Se exporta suelto para
 * el caso de los proveedores del catálogo, a los que **no** se les cambia la petición
 * (esos sí saben llamar funciones) pero sí se les recoge la llamada del texto.
 */
export function detectaForzada(body) {
  return toolForzado(body?.tools, body?.tool_choice);
}

/**
 * Devuelve el cuerpo que hay que mandar al modelo y la tool forzada que había, o
 * `{ body, forzado: null }` si aquí no hay nada que translate.
 */
export function forzarComoJson(body) {
  const forzado = detectaForzada(body);
  if (!forzado) return { body, forzado: null };

  const mensajes = Array.isArray(body.messages) ? body.messages : [];
  const donde = mensajes.findIndex((m) => m?.role === "system" && typeof m.content === "string");

  const instrucción = instruccion(forzado);
  const nuevos = mensajes.map((m) => m);
  if (donde >= 0) {
    const m = mensajes[donde];
    nuevos[donde] = { ...m, content: `${m.content}${instrucción}` };
  } else {
    nuevos.unshift({ role: "system", content: `Eres un asistente que responde en JSON.${instrucción}` });
  }

  return {
    body: { ...body, messages: nuevos, tool_choice: "none" },
    forzado,
  };
}

/**
 * Extrae el objeto JSON de un texto de modelo: le quita el valla de markdown si la
 * tiene y, si hay texto alrededor, se queda con lo que hay entre la primera llave y
 * su pareja. Devuelve `null` si no hay un objeto entero.
 */
export function objetoJson(text) {
  if (typeof text !== "string" || !text.includes("{")) return null;

  let s = text.trim();
  // ```json … ``` (o ``` … ```), con espacios o sin ellos.
  const valla = /^```[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/m.exec(s);
  if (valla) s = valla[1].trim();
  if (s.startsWith("{")) {
    try {
      return JSON.parse(s);
    } catch { /* seguimos buscando */
    }
  }

  // Barajar: primer `{` que cierre de verdad, contando llaves y comillas.
  const inicio = s.indexOf("{");
  if (inicio < 0) return null;
  let nivel = 0;
  let enTexto = false;
  let escapado = false;
  for (let i = inicio; i < s.length; i++) {
    const c = s[i];
    if (enTexto) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enTexto = false;
      continue;
    }
    if (c === '"') enTexto = true;
    else if (c === "{") nivel++;
    else if (c === "}") {
      nivel--;
      if (nivel === 0) {
        try {
          return JSON.parse(s.slice(inicio, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Si a `forzado` le tocaba una tool call y la respuesta no la trae, la fabrica con el
 * JSON del texto. Devuelve un cuerpo nuevo (o el mismo si no hay nada que hacer).
 */
export function conToolCall(respuesta, forzado) {
  if (!forzado) return respuesta;
  const eleccion = respuesta?.choices?.[0];
  if (!eleccion) return respuesta;
  const mensaje = eleccion.message;
  if (!mensaje) return respuesta;
  if (Array.isArray(mensaje.tool_calls) && mensaje.tool_calls.length) return respuesta;

  const args = objetoJson(mensaje.content ?? "");
  if (!args || typeof args !== "object") return respuesta;

  mensaje.tool_calls = [
    {
      id: `call_${forzado.nombre}_${Date.now().toString(36)}`,
      type: "function",
      function: { name: forzado.nombre, arguments: JSON.stringify(args) },
    },
  ];
  // Una respuesta con tool call no lleva texto al lado, como en cualquier otro sitio.
  mensaje.content = "";
  return respuesta;
}
