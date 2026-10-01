/**
 * Puente entre la API **Messages de Anthropic** y `chat/completions` de OpenCode Zen.
 *
 * Sirve para lo que pide Claude Code: esa CLI habla `/v1/messages` (Anthropic) y no
 * se le puede cambiar el proveedor tocando el código (es un binario cerrado), pero
 * sí apuntarla a otro endpoint con `ANTHROPIC_BASE_URL`. Aquí se traduce en los dos
 * sentidos, incluidos los tool calls.
 *
 * Dirección 1 (petición):  Anthropic → OpenAI
 *   - `system` (texto o bloques)          → mensaje system
 *   - bloques `text` / `tool_use`         → content + assistant.tool_calls
 *   - bloques `tool_result`               → mensajes role:"tool"
 *   - `tools[].input_schema`              → `tools[].function.parameters`
 *   - `stop_sequences`                    → `stop`
 *
 * Dirección 2 (respuesta): OpenAI → Anthropic
 *   - texto                    → content_block text + text_delta
 *   - `tool_calls`             → content_block tool_use + input_json_delta
 *   - `finish_reason`          → stop_reason (end_turn / max_tokens / tool_use)
 *
 * Detalle importante de las tools: el servidor de Zen exige que estén presentes
 * por NOMBRE las 11 del cliente oficial. Las de Claude Code se llaman `Bash`,
 * `Read`, `Write`… en mayúscula, así que se renombran a su equivalente en
 * minúscula (`bash`, `read`, `write`…) y se guarda la vuelta para poder
 * devolver el tool_use con el nombre que Claude Code espera. Si dos tools
 * distintas chocan en el mismo nombre oficial, la segunda se deja tal cual.
 */

/** Las 11 que exige el servidor de Zen (por nombre, en minúscula). */
export const OFFICIAL_TOOLS = [
  "bash", "edit", "glob", "grep", "read", "skill",
  "task", "todowrite", "webfetch", "websearch", "write",
];

// Los ids con formato de opencode viven en ids.mjs: los comparten el servidor,
// el puente y el registro de proveedores. Se reexporta por comodidad.
export { ocId } from "./ids.mjs";
import { ocId } from "./ids.mjs";

/** text (plano o en bloques) → una sola cadena. */
function aTexto(contenido) {
  if (contenido == null) return "";
  if (typeof contenido === "string") return contenido;
  if (!Array.isArray(contenido)) return String(contenido);
  return contenido
    .filter((b) => b?.type === "text" || typeof b === "string")
    .map((b) => (typeof b === "string" ? b : b.text ?? ""))
    .join("\n");
}

/** tool_result.content puede ser texto, bloques o un array de strings. */
function aTextoDeResultado(contenido) {
  if (contenido == null) return "";
  if (typeof contenido === "string") return contenido;
  if (Array.isArray(contenido)) return contenido.map((b) => (typeof b === "string" ? b : b?.text ?? (b?.type === "image" ? "[imagen]" : ""))).join("\n");
  return JSON.stringify(contenido);
}

const STOP_A_ANTHROPIC = { stop: "end_turn", length: "max_tokens", tool_calls: "tool_use", content_filter: "end_turn" };

/**
 * Renombra las tools al nombre oficial que exige Zen y devuelve la tabla para
 * poder deshacer el cambio al contestar.
 */
export function mapearTools(tools = []) {
  const ida = new Map();      // nombre original Claude Code → nombre oficial
  const vuelta = new Map();   // nombre oficial → nombre original
  const usados = new Set();
  const salida = [];

  for (const t of tools) {
    const original = t?.name || "";
    if (!original) continue;
    const oficial = original.toLowerCase();
    const sePuedeRenombrar = OFFICIAL_TOOLS.includes(oficial) && !usados.has(oficial);
    const nombreParaZen = sePuedeRenombrar ? oficial : original;
    if (sePuedeRenombrar) {
      usados.add(oficial);
      ida.set(original, oficial);
      vuelta.set(oficial, original);
    }
    salida.push({
      type: "function",
      function: {
        name: nombreParaZen,
        description: t.description || `Herramienta ${original}`,
        parameters: t.input_schema || { type: "object", properties: {} },
      },
    });
  }
  return { ida, vuelta, usados, tools: salida };
}

/**
 * Anthropic Messages request → body de chat/completions para Zen.
 * `names` es el resultado de mapearTools (para traducir tool_use de vuelta a Zen).
 */
export function aOpenAI(body, names) {
  const mensajes = [];

  const sistema = aTexto(body.system);
  if (sistema) mensajes.push({ role: "system", content: sistema });

  for (const m of body.messages || []) {
    const rol = m.role === "assistant" ? "assistant" : "user";
    if (typeof m.content === "string") {
      mensajes.push({ role: rol, content: m.content });
      continue;
    }
    const bloques = Array.isArray(m.content) ? m.content : [];

    // Las herramientas que ejecutó Claude Code vuelven como bloques tool_result
    // dentro del turno de usuario; en OpenAI son mensajes role:"tool".
    const resultados = bloques.filter((b) => b?.type === "tool_result");
    for (const r of resultados) {
      mensajes.push({
        role: "tool",
        tool_call_id: r.tool_use_id || "",
        content: aTextoDeResultado(r.content),
      });
    }

    const texto = aTexto(bloques.filter((b) => b?.type === "text"));
    const usos = bloques.filter((b) => b?.type === "tool_use");

    if (rol === "assistant" && usos.length) {
      mensajes.push({
        role: "assistant",
        content: texto || null,
        tool_calls: usos.map((u) => ({
          id: u.id || ocId("call_"),
          type: "function",
          function: { name: names.ida.get(u.name) || u.name.toLowerCase(), arguments: JSON.stringify(u.input ?? {}) },
        })),
      });
      continue;
    }

    if (texto) mensajes.push({ role: rol, content: texto });
  }

  const out = {
    model: body.model,
    messages: mensajes,
    max_tokens: body.max_tokens || 4096,
  };
  if (body.temperature != null) out.temperature = body.temperature;
  if (body.top_p != null) out.top_p = body.top_p;
  if (Array.isArray(body.stop_sequences) && body.stop_sequences.length) out.stop = body.stop_sequences;
  if (names.tools.length) out.tools = names.tools;
  return out;
}

/** Respuesta OpenAI (sin stream) → mensaje de Anthropic. */
export function respuestaAnthropic(openai, model, vuelta = new Map()) {
  const choice = openai?.choices?.[0] || {};
  const msg = choice.message || {};
  const contenido = [];

  if (msg.content) contenido.push({ type: "text", text: msg.content });

  for (const tc of msg.tool_calls || []) {
    let input = {};
    try {
      input = JSON.parse(tc.function?.arguments || "{}");
    } catch {
      input = { _raw: tc.function?.arguments ?? "" };
    }
    contenido.push({
      type: "tool_use",
      id: tc.id || ocId("toolu_"),
      name: vuelta.get(tc.function?.name) || tc.function?.name || "tool",
      input,
    });
  }

  return {
    id: openai?.id || ocId("msg_"),
    type: "message",
    role: "assistant",
    model,
    content: contenido,
    stop_reason: STOP_A_ANTHROPIC[choice.finish_reason] || "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: openai?.usage?.prompt_tokens ?? 0,
      output_tokens: openai?.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Traductor de streaming: recibe trozos de OpenAI y devuelve eventos SSE de
 * Anthropic. Necesita estado, por eso es una fábrica.
 */
export function traductorSse({ id, model, vuelta = new Map() }) {
  const msgId = id || ocId("msg_");
  let empezado = false;
  let siguienteIndice = 0;
  let bloqueTexto = null;          // índice del bloque de texto abierto
  const bloquesTool = new Map();   // índice de tool de OpenAI → { indice, id, nombre }
  let tokensSalida = 0;

  const evento = (tipo, datos) => `event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`;

  function cerrarAbiertos() {
    const out = [];
    if (bloqueTexto !== null) {
      out.push(evento("content_block_stop", { type: "content_block_stop", index: bloqueTexto }));
      bloqueTexto = null;
    }
    for (const b of bloquesTool.values()) {
      if (b.abierto) {
        out.push(evento("content_block_stop", { type: "content_block_stop", index: b.indice }));
        b.abierto = false;
      }
    }
    return out;
  }

  return {
    /** Trozo de OpenAI ya parseado → array de frames SSE de Anthropic. */
    push(json) {
      const out = [];
      if (!empezado) {
        empezado = true;
        out.push(evento("message_start", {
          type: "message_start",
          message: {
            id: msgId, type: "message", role: "assistant", model,
            content: [], stop_reason: null, stop_sequence: null,
            usage: { input_tokens: json?.usage?.prompt_tokens ?? 0, output_tokens: 0 },
          },
        }));
        out.push(evento("ping", { type: "ping" }));
      }

      if (json?.usage?.completion_tokens) tokensSalida = json.usage.completion_tokens;

      const choice = json?.choices?.[0];
      const delta = choice?.delta || {};

      if (delta.content) {
        if (bloqueTexto === null) {
          // Un bloque de texto abierto se cierra si empieza una herramienta.
          out.push(...cerrarAbiertos());
          bloqueTexto = siguienteIndice++;
          out.push(evento("content_block_start", {
            type: "content_block_start", index: bloqueTexto,
            content_block: { type: "text", text: "" },
          }));
        }
        out.push(evento("content_block_delta", {
          type: "content_block_delta", index: bloqueTexto,
          delta: { type: "text_delta", text: delta.content },
        }));
      }

      for (const tc of delta.tool_calls || []) {
        const clave = tc.index ?? 0;
        let b = bloquesTool.get(clave);
        if (!b) {
          out.push(...cerrarAbiertos());
          b = {
            indice: siguienteIndice++,
            id: tc.id || ocId("toolu_"),
            nombre: vuelta.get(tc.function?.name) || tc.function?.name || "tool",
            abierto: true,
          };
          bloquesTool.set(clave, b);
          out.push(evento("content_block_start", {
            type: "content_block_start", index: b.indice,
            content_block: { type: "tool_use", id: b.id, name: b.nombre, input: {} },
          }));
        }
        if (tc.function?.arguments) {
          out.push(evento("content_block_delta", {
            type: "content_block_delta", index: b.indice,
            delta: { type: "input_json_delta", partial_json: tc.function.arguments },
          }));
        }
      }

      if (choice?.finish_reason) {
        out.push(...cerrarAbiertos());
        out.push(evento("message_delta", {
          type: "message_delta",
          delta: { stop_reason: STOP_A_ANTHROPIC[choice.finish_reason] || "end_turn", stop_sequence: null },
          usage: { output_tokens: tokensSalida },
        }));
        out.push(evento("message_stop", { type: "message_stop" }));
      }
      return out;
    },
    /** Por si el stream se corta sin finish_reason. */
    cerrar() {
      if (!empezado) return [];
      return [...cerrarAbiertos(), evento("message_stop", { type: "message_stop" })];
    },
  };
}

/** Error en el formato que espera Anthropic. */
export const errorAnthropic = (mensaje, tipo = "invalid_request_error") => ({
  type: "error",
  error: { type: tipo, message: mensaje },
});
