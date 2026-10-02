/**
 * Tests de OpenCode Chat, sin navegador y sin gastar cuota:
 *
 *   1. El servidor de verdad, arrancado como proceso hijo, hablando con un Zen
 *      FALSO en local: rutas, proxy con streaming, traducción de errores y
 *      que la key no se escape nunca al cliente.
 *   2. app.js cargado con un DOM simulado: init, lista de modelos, streaming,
 *      markdown, error 403, respuesta vacía, parar y sonda.
 *
 *   node test.mjs
 */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { MODELS, MODEL_IDS } from "./models.mjs";
import { acumulador, aAnthropicBody, aGoogleBody } from "./protocols.mjs";
import { parseModel, protocoloDe } from "./providers.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "app.js"), "utf8");

// La sección de app.js sustituye globalThis.fetch por un mock (para no salir a
// la red). Se guarda la de verdad aquí, antes de que ocurra, para poder seguir
// hablando con servidores reales en las secciones siguientes.
const fetchReal = globalThis.fetch;

// Ruta de caché de models.dev que NO existe: así las secciones que no prueban
// proveedores ven un catálogo vacío y no leen (ni escriben) el del usuario.
const SIN_CATALOGO = join(tmpdir(), "opencode-chat-test-sin-catalogo.json");

/**
 * Entorno para los procesos hijos. El test NO debe heredar `QWEN_HOME` ni
 * `QWEN_SETTINGS` de quien lo lance: `sync-qwen-models.mjs` los respeta, así que
 * heredarlos lo haría escribir en la configuración REAL del usuario en vez de en
 * el HOME temporal del test. (Y encima pasaría en verde o en rojo según el
 * entorno de quien lo ejecute.)
 */
const entornoHijo = (extra = {}) => {
  const env = { ...process.env, ...extra };
  delete env.QWEN_HOME;
  delete env.QWEN_SETTINGS;
  return env;
};

let fallos = 0;
const ok = (cond, etiqueta, detalle = "") => {
  console.log(`${cond ? "  ✅" : "  ❌"} ${etiqueta}${detalle ? " — " + detalle : ""}`);
  if (!cond) fallos++;
};

/* =====================================================================
 * 1. SERVIDOR + ZEN FALSO
 * ===================================================================== */
const KEY = "oc_sk_de_prueba_no_real";
const GKEY = "ock_clave_del_gateway_de_prueba";   // tu clave de /v1
const SIN_RECETA = "mimo-v2.5-free";             // el mock le devuelve 403
const PROTOCOLO = "muse-spark-1.3-contributor-free"; // el mock le devuelve 400

/**
 * Zen de mentira. Guarda la última petición recibida para poder comprobar la
 * receta (UA, ids, stream, tools) y simula los tres finales posibles:
 *   - muse-spark-1.3 → 400 de protocolo (como el real)
 *   - mimo-v2.5-free → 403 FreeTierError (como si faltara la receta)
 *   - el resto       → SSE normal
 */
function startFakeZen() {
  return new Promise((resolve) => {
    const visto = { headers: null, body: null };
    const srv = createServer((req, res) => {
      let raw = "";
      visto.headers = req.headers;
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        visto.body = body;
        if (body.model === "mimo-v2.5-free") {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: "error", error: { type: "FreeTierError", message: "OpenCode's free tier can only be used from within OpenCode" } }));
          return;
        }
        if (body.model === "muse-spark-1.3-contributor-free") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Model does not support this protocol." } }));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        // El puente de tool calls forzadas (forced-tools.mjs) traduce la llamada a
        // "responde con este JSON". Así responden los del tier gratis, que no emiten
        // tool calls: longcat lo dice limpio y en valla, nemotron mete prosa antes.
        const forzado = (body.messages || []).some(
          (m) => typeof m.content === "string" && m.content.includes("would have been the arguments of the function"),
        );
        if (forzado) {
          const json = '{"shouldBlock":false}';
          const partes = body.model === "nemotron-3.5-lightning-free"
            ? [{ content: "Let me think. The answer is: " + json + " — hope that helps." }]
            : [{ content: "```json\n" + json + "\n```" }];
          for (const p of partes) res.write(`data: ${JSON.stringify({ choices: [{ delta: p }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        // Solo la ruta de Claude Code (/v1/messages con herramientas) usa
        // tool_choice:"auto"; ahí el modelo "decide" llamar a una herramienta.
        if (body.tool_choice === "auto") {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read", arguments: '{"file_path":"README.md"}' } }] } }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 50, completion_tokens: 9 } })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "pensando…" } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Hola " } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "mundo" }, finish_reason: "stop" }] })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve({ srv, port: srv.address().port, visto }));
  });
}

/** Arranca server.mjs apuntando al Zen falso y espera a que escuche. */
function startServer(mockPort, port, conKey = true, extra = {}) {
  return new Promise((resolve, reject) => {
    // MODELS_OFFLINE evita que los tests toquen models.dev por la red.
    const env = entornoHijo({
      OPENCODE_BASE: `http://127.0.0.1:${mockPort}`,
      CHAT_API_KEY: GKEY,
      MODELS_OFFLINE: "1",
      MODELS_CACHE_FILE: SIN_CATALOGO,
      ...extra,
    });
    if (conKey) env.OPENCODE_API_KEY = KEY;
    else delete env.OPENCODE_API_KEY;
    const child = spawn(process.execPath, ["server.mjs", String(port)], { cwd: HERE, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => reject(new Error("el server no arrancó a tiempo")), 8000);
    child.stdout.on("data", (d) => {
      out += d;
      if (/(?:localhost|127\.0\.0\.1):\d+/.test(out)) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on("data", (d) => (out += d));
    child.on("exit", () => {
      clearTimeout(timer);
      reject(new Error("el server murió: " + out));
    });
  });
}

const BASE = "http://127.0.0.1:8099";
const post = (path, body) => fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const OFICIALES = ["bash", "edit", "glob", "grep", "read", "skill", "task", "todowrite", "webfetch", "websearch", "write"];

console.log("\n== servidor y proxy ==");
const zen = await startFakeZen();
let server;
try {
  server = await startServer(zen.port, 8099);

  const status = await (await fetch(`${BASE}/api/status`)).json();
  ok(status.hasKey === true, "/api/status dice que hay key");
  ok(!JSON.stringify(status).includes(KEY), "/api/status no filtra la key");
  ok(status.upstream === `http://127.0.0.1:${zen.port}`, "/api/status apunta al upstream configurado");

  const home = await fetch(`${BASE}/`);
  const html = await home.text();
  ok(home.status === 200, "sirve index.html en /");
  ok(/OpenCode Chat/.test(html), "el HTML es el del chat");
  ok(!html.includes(KEY) && !SRC.includes(KEY), "la key no está ni en el HTML ni en app.js");

  const css = await fetch(`${BASE}/styles.css`);
  ok(css.headers.get("content-type").startsWith("text/css"), "styles.css se sirve como CSS");

  const fuera = await fetch(`${BASE}/../../etc/passwd`);
  ok(fuera.status === 404 || fuera.status === 403, "no se sale de la carpeta del proyecto");

  const sinModelo = await post("/api/chat", { messages: [] });
  ok(sinModelo.status === 400, "POST /api/chat sin modelo → 400");

  const rechazado = await post("/api/chat", { model: SIN_RECETA, messages: [{ role: "user", content: "hola" }] });
  const rechazadoBody = await rechazado.json();
  ok(rechazado.status === 403, "el 403 del upstream se propaga");
  ok(/cliente oficial|within OpenCode/.test(rechazadoBody.error), "el 403 se traduce a algo legible", rechazadoBody.error.slice(0, 50));

  const stream = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "big-pickle", messages: [{ role: "user", content: "hola" }], stream: true }),
  });
  const sse = await stream.text();
  ok(stream.status === 200, "el modelo gratis responde 200");
  ok(stream.headers.get("content-type").startsWith("text/event-stream"), "el proxy devuelve text/event-stream");
  ok(sse.includes('"content":"Hola "') && sse.includes("[DONE]"), "el SSE pasa tal cual, con su [DONE]");
  ok(sse.includes("reasoning_content"), "el razonamiento también pasa");

  /* --- la receta que exige el servidor de Zen --- */
  const h = zen.visto.headers;
  const b = zen.visto.body;
  ok(h.authorization === `Bearer ${KEY}`, "el proxy mete la key él mismo (el cliente no la manda)");
  ok(/^opencode\/\d/.test(h["user-agent"] || ""), "User-Agent con formato opencode/<versión>", h["user-agent"]);
  ok(/^ses_[0-9a-f]{12}[0-9A-Za-z]{14}$/.test(h["x-opencode-session"] || ""), "x-opencode-session: ses_ + 26 chars", h["x-opencode-session"]);
  ok(/^msg_[0-9a-f]{12}[0-9A-Za-z]{14}$/.test(h["x-opencode-request"] || ""), "x-opencode-request: msg_ + 26 chars", h["x-opencode-request"]);
  ok(b.stream === true, "el proxy fuerza stream:true (sin él, 403)");
  const nombres = (b.tools || []).map((t) => t.function?.name);
  ok(OFICIALES.every((n) => nombres.includes(n)), "inyecta las 11 tools oficiales", String(nombres.length));
  ok((b.tools || []).every((t) => /no está disponible|nunca la llames/i.test(t.function?.description || "") || nombres.length === 0), "las tools de relleno se declaran no usables");
  ok(b.tool_choice === "none", "pide tool_choice:none para que conteste con texto");

  const probeOk = await (await post("/api/probe", { model: "big-pickle" })).json();
  ok(probeOk.ok === true && probeOk.status === 200, "/api/probe marca vivo un modelo gratis");
  ok(typeof probeOk.ms === "number", "/api/probe mide la latencia");
  ok(typeof probeOk.text === "string" && probeOk.text.length > 0, "/api/probe devuelve un trocito de texto", probeOk.text);
  ok(zen.visto.body.stream === true, "/api/probe también manda stream:true");

  const probeBad = await (await post("/api/probe", { model: SIN_RECETA })).json();
  ok(probeBad.ok === false && probeBad.status === 403, "/api/probe marca 403 el rechazado");

  const probeProtocolo = await (await post("/api/probe", { model: PROTOCOLO })).json();
  ok(probeProtocolo.ok === false && probeProtocolo.status === 400, "/api/probe marca 400 el de protocolo distinto");

  const desconocido = await fetch(`${BASE}/api/nope`);
  ok(desconocido.status === 404, "las rutas /api/ desconocidas dan 404");

  /* --- la API estilo OpenAI: tu clave, CORS y formato --- */
  const preflight = await fetch(`${BASE}/v1/chat/completions`, { method: "OPTIONS" });
  ok(preflight.status === 204, "el preflight OPTIONS responde 204");
  ok(preflight.headers.get("access-control-allow-origin") === "*", "CORS abierto en el preflight");
  ok(/authorization/.test(preflight.headers.get("access-control-allow-headers") || ""), "el preflight permite Authorization y x-api-key");

  const sinClave = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "big-pickle", messages: [{ role: "user", content: "hola" }] }),
  });
  ok(sinClave.status === 401, "sin clave, /v1 responde 401");
  ok(sinClave.headers.get("access-control-allow-origin") === "*", "el 401 también lleva CORS (si no, el navegador no leería el error)");

  ok((await fetch(`${BASE}/v1/models`, { headers: { Authorization: "Bearer ock_otra" } })).status === 401, "con una clave que no es, 401");

  const lista = await fetch(`${BASE}/v1/models`, { headers: { Authorization: `Bearer ${GKEY}` } });
  const listaJson = await lista.json();
  ok(lista.status === 200, "GET /v1/models con la clave responde 200");
  ok(listaJson.object === "list" && listaJson.data.length === MODELS.length, "devuelve el catálogo gratis en formato OpenAI", String(listaJson.data?.length));
  ok((await fetch(`${BASE}/v1/models`, { headers: { "x-api-key": GKEY } })).status === 200, "x-api-key también vale (como en los demás gateways)");

  const chat = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "big-pickle", messages: [{ role: "user", content: "hola" }] }),
  });
  const chatJson = await chat.json();
  ok(chat.status === 200 && chatJson.object === "chat.completion", "sin stream devuelve un completion de OpenAI");
  ok(chatJson.choices?.[0]?.message?.content === "Hola mundo", "junta el SSE en un solo mensaje", chatJson.choices?.[0]?.message?.content);
  ok(chatJson.choices?.[0]?.finish_reason === "stop", "conserva el finish_reason");
  ok(zen.visto.body.model === "big-pickle", "al upstream le llega el id limpio");

  const conStream = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "big-pickle", messages: [{ role: "user", content: "hola" }], stream: true }),
  });
  ok(conStream.headers.get("content-type").startsWith("text/event-stream"), "con stream:true devuelve SSE");
  ok((await conStream.text()).includes("[DONE]"), "el SSE de /v1 también cierra con [DONE]");

  const conPrefijo = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "oc/big-pickle", messages: [{ role: "user", content: "hola" }] }),
  });
  ok(conPrefijo.status === 200, "acepta el prefijo oc/ en el nombre del modelo");

  // Un cliente real (Qwen Code) manda `stream_options` y tools con `parameters`
  // vacío; Zen contesta 400 "invalid request". El proxy tiene que limpiar ambas.
  const qwen = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "big-pickle",
      messages: [{ role: "user", content: "hola" }],
      stream: true,
      stream_options: { include_usage: true },
      tools: [{ type: "function", function: { name: "list_agents", parameters: {} } }],
    }),
  });
  await qwen.text();
  ok(qwen.status === 200, "con stream_options y una tool sin type no rompe");
  ok(!("stream_options" in zen.visto.body), "borra stream_options (Zen lo rechaza con 400)");
  const listAgents = (zen.visto.body.tools || []).find((t) => t.function?.name === "list_agents");
  ok(listAgents?.function?.parameters?.type === "object", "completa el parameters de una tool sin type");
  ok((zen.visto.body.tools || []).every((t) => t.function?.parameters?.type), "todas las tools acaban con parameters.type");

  const modeloRaro = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-5.5", messages: [{ role: "user", content: "hola" }] }),
  });
  ok(modeloRaro.status === 404, "un modelo que no es gratis da 404, no un error raro del upstream");

  /* --- tool call forzada: el puente que hace funcionar el modo auto ---
     El motor pide el JSON de `generateJson` con una tool (`respond_in_schema`) y
     `tool_choice:"required"`. El tier gratis no emite tool calls, así que el proxy
     lo traduce a "responde con el JSON" y devuelve la llamada que el cliente esperaba.
     Sin esto, el clasificador del modo auto sale como "unavailable" y el modo auto
     no puede aprobar nada. */
  const CLASIF_SCHEMA = { type: "object", required: ["shouldBlock"], additionalProperties: false, properties: { shouldBlock: { type: "boolean" } } };
  const clasificador = (extra = {}) => ({
    method: "POST",
    headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "longcat-2.5-preview-free",
      messages: [
        { role: "system", content: "Eres el clasificador del modo auto." },
        { role: "user", content: "¿`ls -la` es seguro?" },
      ],
      tools: [{ type: "function", function: { name: "respond_in_schema", description: "Provide the response in provided schema", parameters: CLASIF_SCHEMA } }],
      tool_choice: "required",
      max_tokens: 256,
      ...extra,
    }),
  });

  const cls = await (await fetch(`${BASE}/v1/chat/completions`, clasificador())).json();
  const llamada = cls.choices?.[0]?.message?.tool_calls?.[0];
  ok(llamada?.type === "function" && llamada?.function?.name === "respond_in_schema", "una tool forzada vuelve como tool call", JSON.stringify(cls.choices?.[0]?.message).slice(0, 90));
  ok(llamada?.function?.arguments === '{"shouldBlock":false}', "con los argumentos que pidió el esquema", llamada?.function?.arguments);
  ok(cls.choices?.[0]?.message?.content === "", "una respuesta con tool call no lleva texto al lado");
  ok(zen.visto.body.tool_choice === "none", "al modelo se le pide texto, no una llamada (el tier no las hace)");
  ok(/would have been the arguments of the function `respond_in_schema`/.test(zen.visto.body.messages[0].content), "el system lleva la instrucción de responder con el JSON");
  ok(zen.visto.body.messages[0].content.includes('"shouldBlock"'), "y el esquema, para que no se lo invente");
  ok(OFICIALES.every((n) => (zen.visto.body.tools || []).some((t) => t.function?.name === n)), "las 11 tools oficiales siguen ahí: el gate del tier depende de ellas");

  // La valla de markdown y la prosa alrededor también valen: lo que se busca es el objeto.
  const clsValla = await (await fetch(`${BASE}/v1/chat/completions`, clasificador({ model: "nemotron-3.5-lightning-free" }))).json();
  ok(clsValla.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments === '{"shouldBlock":false}', "saca el JSON aunque venga en valla o con prosa alrededor");

  // `tool_choice` con la función nombrada es la otra forma de forzarla.
  const clsNombrada = await (await fetch(`${BASE}/v1/chat/completions`, clasificador({ tool_choice: { type: "function", function: { name: "respond_in_schema" } } }))).json();
  ok(clsNombrada.choices?.[0]?.message?.tool_calls?.[0]?.function?.name === "respond_in_schema", "también con tool_choice nombrando la función");

  // Lo que NO se toca: streaming, tool_choice "auto" (una sesión normal) y "required"
  // con varias tools, donde no se sabe cuál se forzaba.
  const clsStream = await fetch(`${BASE}/v1/chat/completions`, clasificador({ stream: true }));
  const clsStreamTxt = await clsStream.text();
  ok(zen.visto.body.tool_choice === "required", "con stream:true el puente no se mete (lo que usa stream va como iba)");
  ok(clsStream.headers.get("content-type").startsWith("text/event-stream"), "y sigue siendo SSE");

  const auto = await (await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "big-pickle", messages: [{ role: "user", content: "hola" }], tools: [{ type: "function", function: { name: "read", parameters: { type: "object" } } }], tool_choice: "auto" }),
  })).json();
  ok(zen.visto.body.tool_choice === "auto", "una sesión normal (tool_choice auto) se manda tal cual");
  ok(!auto.choices?.[0]?.message?.tool_calls, "y no se le fabrica una tool call");

  const dosTools = await (await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "big-pickle",
      messages: [{ role: "user", content: "hola" }],
      tools: [
        { type: "function", function: { name: "una", parameters: { type: "object" } } },
        { type: "function", function: { name: "otra", parameters: { type: "object" } } },
      ],
      tool_choice: "required",
    }),
  })).json();
  ok(zen.visto.body.tool_choice === "required", "con varias tools y required no se sabe cuál es: se deja como está");
  ok(!dosTools.choices?.[0]?.message?.tool_calls, "y no se inventa ninguna llamada");

  const esquemaRaro = await (await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${GKEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "big-pickle",
      messages: [{ role: "user", content: "hola" }],
      tools: [{ type: "function", function: { name: "lista", parameters: { type: "array" } } }],
      tool_choice: { type: "function", function: { name: "lista" } },
    }),
  })).json();
  ok(zen.visto.body.tool_choice?.type === "function", "un esquema que no es objeto no se traduce: mejor el intento original");
  ok(!esquemaRaro.choices?.[0]?.message?.tool_calls, "y no se fabrica una llamada con argumentos inventados");
  ok(esquemaRaro.choices?.[0]?.message?.content === "Hola mundo", "la respuesta normal llega intacta");

  // Puede existir un .api-key de un arranque real: lo que se comprueba es que el
  // server no haya escrito en él la clave del test.
  const enDisco = existsSync(join(HERE, ".api-key")) ? readFileSync(join(HERE, ".api-key"), "utf8").trim() : "";
  ok(enDisco !== GKEY, "con CHAT_API_KEY el server no escribe la clave en disco");

  /* --- /v1/messages: el puente para Claude Code --- */
  const sinClaveMsg = await fetch(`${BASE}/v1/messages`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 100, messages: [{ role: "user", content: "hola" }] }),
  });
  ok(sinClaveMsg.status === 401, "/v1/messages sin clave → 401");
  ok((await sinClaveMsg.clone().json()).error?.type === "authentication_error", "el error va en formato Anthropic");

  const msg = await fetch(`${BASE}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": GKEY, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 300, messages: [{ role: "user", content: "hola" }] }),
  });
  const msgJson = await msg.json();
  ok(msg.status === 200 && msgJson.type === "message" && msgJson.role === "assistant", "/v1/messages devuelve un message de Anthropic");
  ok(msgJson.content?.[0]?.type === "text" && msgJson.content[0].text.includes("Hola mundo"), "el texto se traduce a un bloque content", msgJson.content?.[0]?.text);
  ok(msgJson.stop_reason === "end_turn", "stop_reason traducido");
  ok(typeof msgJson.usage?.input_tokens === "number", "devuelve usage");
  ok(msgJson.model === "claude-sonnet-4-5", "devuelve el modelo que pidió el cliente, no el de Zen");
  ok(zen.visto.body.model === "big-pickle", "claude-sonnet-4-5 se traduce a un modelo gratis de Zen", zen.visto.body.model);

  const msgStream = await fetch(`${BASE}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": GKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 300, stream: true, messages: [{ role: "user", content: "hola" }] }),
  });
  const sseAnt = await msgStream.text();
  ok(msgStream.headers.get("content-type").startsWith("text/event-stream"), "/v1/messages con stream devuelve SSE");
  ok(sseAnt.includes("event: message_start") && sseAnt.includes("event: message_stop"), "emite message_start y message_stop");
  ok(sseAnt.includes('"type":"content_block_delta"') && sseAnt.includes('"type":"text_delta"'), "emite los text_delta");
  ok(sseAnt.includes("event: ping"), "emite el ping inicial");
  ok(zen.visto.body.model === "mimo-v2.6-flash-free", "un modelo haiku se mapea al gratis más rápido", zen.visto.body.model);

  /* --- herramientas: ida y vuelta de nombres --- */
  const conTools = await fetch(`${BASE}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": GKEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5", max_tokens: 500, stream: true,
      tools: [
        { name: "Read", description: "Lee un archivo", input_schema: { type: "object", properties: { file_path: { type: "string" } }, required: ["file_path"] } },
        { name: "Bash", description: "Ejecuta un comando", input_schema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
      ],
      messages: [{ role: "user", content: "Lee el README" }],
    }),
  });
  const sseTools = await conTools.text();
  const nombresParaZen = (zen.visto.body.tools || []).map((t) => t.function?.name);
  ok(nombresParaZen.includes("read") && nombresParaZen.includes("bash"), "las tools de Claude Code viajan en minúscula (lo que exige Zen)", nombresParaZen.slice(0, 4).join(","));
  ok(OFICIALES.every((n) => nombresParaZen.includes(n)), "se completan las 11 oficiales que Zen exige");
  ok(zen.visto.body.tool_choice === "auto", "con herramientas NO se fuerza tool_choice:none");
  ok(sseTools.includes('"type":"tool_use"') && sseTools.includes('"name":"Read"'), "el tool_use vuelve con el nombre de Claude Code", sseTools.includes('"name":"Read"') ? "Read" : "no");
  ok(sseTools.includes('"type":"input_json_delta"') && sseTools.includes("README.md"), "los argumentos llegan como input_json_delta");
  ok(sseTools.includes('"stop_reason":"tool_use"'), "stop_reason tool_use");
  ok(!sseTools.includes('"name":"read"'), "no se cuela el nombre interno en la respuesta a Claude Code");

  const count = await fetch(`${BASE}/v1/messages/count_tokens`, {
    method: "POST", headers: { "x-api-key": GKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hola mundo" }] }),
  });
  const countJson = await count.json();
  ok(count.status === 200 && countJson.input_tokens > 0, "/v1/messages/count_tokens responde una estimación", String(countJson.input_tokens));

  /* --- sin key: tier anónimo con el literal public --- */
  ok((await (await fetch(`${BASE}/api/status`)).json()).hasKey === true, "el server escucha en loopback");

  const anon = await startServer(zen.port, 8098, false);
  try {
    const st = await (await fetch("http://127.0.0.1:8098/api/status")).json();
    ok(st.hasKey === false, "sin env la key no está");
    await fetch("http://127.0.0.1:8098/api/probe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "big-pickle" }) });
    ok(zen.visto.headers.authorization === "Bearer public", "sin key usa el tier anónimo (Bearer public)", zen.visto.headers.authorization);
  } finally {
    anon.kill();
  }
} finally {
  server?.kill();
  zen.srv.close();
}

/* =====================================================================
 * 2. app.js CON DOM SIMULADO
 * ===================================================================== */
function makeNode(id) {
  let text = "";
  const n = {
    id, value: "", className: "", disabled: false, children: [],
    scrollTop: 0, scrollHeight: 0, style: {}, listeners: {}, onclick: null, attrs: {},
    append(...c) { text = ""; n.children.push(...c); },
    replaceChildren(...c) { text = ""; n.children.length = 0; n.children.push(...c); },
    insertBefore(nuevo, ref) {
      const i = n.children.indexOf(ref);
      if (i < 0) n.children.push(nuevo);
      else n.children.splice(i, 0, nuevo);
      text = "";
    },
    addEventListener(ev, fn) { (n.listeners[ev] ||= []).push(fn); },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return n.attrs[k]; },
    focus() {}, select() {}, remove() {}, click() {},
  };
  const clases = () => new Set(n.className.split(/\s+/).filter(Boolean));
  n.classList = {
    add(...c) { const s = clases(); c.forEach((x) => s.add(x)); n.className = [...s].join(" "); },
    remove(...c) { const s = clases(); c.forEach((x) => s.delete(x)); n.className = [...s].join(" "); },
    toggle(c, on) { (on === undefined ? !clases().has(c) : on ? n.classList.add : n.classList.remove)(c); },
    contains(c) { return clases().has(c); },
  };
  const ds = {};
  Object.defineProperty(n, "dataset", { get: () => ds });
  Object.defineProperty(n, "textContent", {
    get() { return n.children.length ? n.children.map((c) => c.textContent ?? "").join("") : text; },
    set(v) { text = v == null ? "" : String(v); n.children.length = 0; },
  });
  Object.defineProperty(n, "innerHTML", {
    get() { return ""; },
    set(v) { if (v === "") { n.children.length = 0; text = ""; } },
  });
  return n;
}
const textNode = (t) => ({ textContent: String(t), children: [] });

const IDS = ["serverstate", "themetoggle", "banner", "models", "messages", "form", "input", "maxtokens",
  "clear", "stop", "send", "probebtn", "proberows", "probesummary", "toast", "empty", "modelsearch"];

function findAll(root, cls) {
  const out = [];
  const walk = (node) => {
    for (const c of node.children || []) {
      if (typeof c.className === "string" && c.className.split(/\s+/).includes(cls)) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

/** Chunks SSE listos para el `getReader()` simulado. */
function sseResponse(events, status = 200) {
  const enc = new TextEncoder();
  const payload = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
  let i = 0;
  const chunks = [enc.encode(payload.slice(0, 40)), enc.encode(payload.slice(40))];
  return {
    ok: status < 400,
    status,
    json: async () => JSON.parse(payload.replace(/^data: /gm, "").split("\n\n")[0] || "{}"),
    text: async () => payload,
    body: {
      getReader: () => ({
        read: async () => (i < chunks.length ? { value: chunks[i++], done: false } : { value: undefined, done: true }),
      }),
    },
  };
}

const DELTAS = [
  { choices: [{ delta: { reasoning_content: "pensando un poco" } }] },
  { choices: [{ delta: { content: "Hola **mundo**" } }] },
  { choices: [{ delta: { content: "\n```js\nconst x = 1;\n```" }, finish_reason: "stop" }] },
];

async function boot(fetchImpl) {
  const store = new Map(IDS.map((i) => [i, makeNode(i)]));
  store.get("maxtokens").value = "1200";
  const ls = new Map();
  globalThis.localStorage = {
    getItem: (k) => (ls.has(k) ? ls.get(k) : null),
    setItem: (k, v) => ls.set(k, String(v)),
    removeItem: (k) => ls.delete(k),
  };
  const chips = ["a", "b"].map((p) => {
    const c = makeNode("chip-" + p);
    c.dataset.prompt = "prompt " + p;
    return c;
  });
  globalThis.document = {
    documentElement: makeNode("html"),
    querySelector: (s) => store.get(s.replace("#", "")) || makeNode(s),
    querySelectorAll: (s) => (s === ".chip" ? chips : []),
    createElement: (t) => makeNode(t),
    createTextNode: textNode,
    addEventListener: (ev, fn) => { if (ev === "DOMContentLoaded") globalThis.__init = fn; },
    body: makeNode("body"),
  };
  // En Node 22 `navigator` es de solo lectura: hay que redefinirlo.
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async () => {} } },
    configurable: true, writable: true,
  });
  globalThis.fetch = fetchImpl;
  // `import` cachea el módulo entre bloques (y app.js es CJS para Node), así que
  // se evalúa el fuente igual que haría un <script>: cada bloque parte de cero.
  new Function(`${SRC}\n//# sourceURL=app.js`)();
  const initFn = globalThis.__init;
  if (initFn) initFn();
  await new Promise((r) => setTimeout(r, 0));
  return { store, ls };
}

const submit = (store) => store.get("form").listeners.submit[0]({ preventDefault() {} });
const wait = () => new Promise((r) => setTimeout(r, 0));

console.log("\n== app.js: init y catálogo ==");
{
  const { store } = await boot(async (url) =>
    url.endsWith("/status") ? { ok: true, json: async () => ({ hasKey: true }) } : sseResponse(DELTAS)
  );
  ok(store.get("serverstate").textContent.includes("key cargada"), "el chip dice que hay key en el server");
  const modelos = findAll(store.get("models"), "model");
  ok(modelos.length === 10, "se listan los 10 modelos gratis", String(modelos.length));
  ok(modelos[0].className.includes("active"), "el primero (big-pickle) sale seleccionado");
  ok(store.get("models").textContent.includes("no usable"), "los que no hablan chat/completions se marcan");
  ok(findAll(store.get("models"), "tag-warn").length === 1, "el lento sale en ámbar");
  ok(findAll(store.get("models"), "tag-bad").length === 3, "los 3 inservibles salen en rojo");
  ok(store.get("banner").className.includes("ok"), "con un modelo bueno el banner es verde");

  store.get("modelsearch").listeners.input[0]({ target: { value: "pickle" } });
  ok(findAll(store.get("models"), "model").length === 1, "el buscador filtra por id");
  store.get("modelsearch").listeners.input[0]({ target: { value: "zzz" } });
  ok(store.get("models").textContent.includes("ningún"), "el buscador avisa cuando no hay coincidencias");
}

console.log("\n== app.js: enviar, streaming y markdown ==");
{
  const { store } = await boot(async (url) =>
    url.endsWith("/status") ? { ok: true, json: async () => ({ hasKey: true }) } : sseResponse(DELTAS)
  );
  store.get("input").value = "hola";
  submit(store);
  await wait();
  await wait();

  const texto = store.get("messages").textContent;
  ok(texto.includes("hola"), "el mensaje del usuario aparece");
  ok(texto.includes("Hola mundo"), "el texto del stream aparece");
  ok(texto.includes("pensamiento") || texto.includes("pensando"), "el razonamiento se muestra");
  ok(store.get("messages").children.length === 2, "hay una burbuja de usuario y una del bot");
  ok(store.get("empty").className.includes("hidden"), "la pantalla de bienvenida se oculta");
  ok(store.get("send").disabled === false && store.get("stop").disabled === true, "al terminar se rehabilitan los botones");

  const bot = store.get("messages").children[1];
  const codigos = findAll(bot, "md-code");
  ok(codigos.length === 1, "el bloque de código se renderiza como bloque");
  ok(codigos[0].textContent.includes("const x = 1;"), "el código conserva su texto");
  ok(findAll(bot, "tk-kw").length > 0, "el código sale resaltado");
  ok(findAll(bot, "md-strong").length === 0, "no se inventan clases raras");

  const input = store.get("input");
  input.value = "otra vez";
  submit(store);
  await wait(); await wait();
  ok(store.get("messages").children.length === 4, "un segundo turno añade dos burbujas más");

  store.get("clear").listeners.click[0]();
  ok(store.get("messages").children.length === 0, "limpiar vacía el historial");
  ok(!store.get("empty").className.includes("hidden"), "limpiar devuelve la bienvenida");
}

console.log("\n== app.js: errores y respuesta vacía ==");
{
  const { store } = await boot(async (url) => {
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ hasKey: true }) };
    return { ok: false, status: 403, json: async () => ({ error: "reservado al cliente oficial" }) };
  });
  store.get("input").value = "hola";
  submit(store);
  await wait(); await wait();
  ok(store.get("messages").textContent.includes("reservado al cliente oficial"), "el 403 se pinta en la burbuja");
  ok(findAll(store.get("messages"), "error").length === 1, "la burbuja de error se marca");

  const { store: s2 } = await boot(async (url) => {
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ hasKey: true }) };
    return sseResponse([
      { choices: [{ delta: { reasoning_content: "mucho razonamiento" } }] },
      { choices: [{ delta: {}, finish_reason: "length" }] },
    ]);
  });
  s2.get("input").value = "hola";
  submit(s2);
  await wait(); await wait();
  const t = s2.get("messages").textContent;
  ok(t.includes("Sin texto") && t.includes("max_tokens"), "la respuesta vacía por max_tokens se explica");
  ok(!t.includes("reasoning"), "no se dice 'reasoning' a pelo al usuario");

  const { store: s3 } = await boot(async (url) => {
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ hasKey: false }) };
    return sseResponse(DELTAS);
  });
  ok(s3.get("serverstate").textContent.includes("tier anónimo"), "sin key el chip dice que se usa el tier anónimo");
  ok(s3.get("banner").className.includes("warn"), "sin key el banner sale en ámbar, no en rojo");
  await wait();
  ok(s3.get("banner").textContent.includes("OPENCODE_API_KEY"), "el banner dice cómo subir el límite con key");
}

console.log("\n== app.js: parar, tema y sonda ==");
{
  const { store, ls } = await boot(async (url) => {
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ hasKey: true }) };
    if (url.endsWith("/probe")) return { ok: true, json: async () => ({ ok: true, status: 200, ms: 130 }) };
    return sseResponse(DELTAS);
  });
  store.get("themetoggle").listeners.click[0]();
  ok(ls.get("opencode_theme") === "light", "el tema se guarda en localStorage");
  ok(store.get("themetoggle").textContent === "☀️", "el botón cambia de icono");
  store.get("themetoggle").listeners.click[0]();
  ok(ls.get("opencode_theme") === "dark", "y vuelve al oscuro");

  const pet = async () => { await wait(); await wait(); await wait(); await wait(); };
  store.get("probebtn").listeners.click[0]();
  await pet(); await pet();
  const filas = findAll(store.get("proberows"), "proberow");
  ok(filas.length === 10, "la sonda pinta una fila por modelo", String(filas.length));
  ok(store.get("probesummary").textContent.includes("10 de 10"), "la sonda da un resumen", store.get("probesummary").textContent);
  const modeloRows = findAll(store.get("models"), "model");
  ok(findAll(modeloRows[0], "tag-ok").length > 0, "tras la sonda, el modelo vivo sale marcado en verde");
}
{
  // la sonda marca los que fallan
  const { store } = await boot(async (url) => {
    if (url.endsWith("/status")) return { ok: true, json: async () => ({ hasKey: true }) };
    if (url.endsWith("/probe")) return { ok: true, json: async () => ({ ok: false, status: 403, error: "restringido" }) };
    return sseResponse(DELTAS);
  });
  const pet = async () => { await wait(); await wait(); await wait(); await wait(); };
  store.get("probebtn").listeners.click[0]();
  await pet(); await pet();
  ok(store.get("probesummary").textContent.includes("0 de 10"), "con todo en 403 el resumen dice 0");
  ok(findAll(store.get("models"), "tag-bad").length > 0, "los modelos caídos se marcan en rojo");
}

console.log(`\n${fallos === 0 ? "✅ todo bien" : `❌ ${fallos} comprobación(es) fallida(s)`}\n`);
console.log("\n== catálogo compartido ==");
{
  // app.js no puede importar models.mjs (es un script de navegador), así que
  // lleva su propia copia: esta comprobación evita que las dos se separen.
  const idsEnApp = [...SRC.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  const faltan = MODELS.filter((m) => !idsEnApp.includes(m.id)).map((m) => m.id);
  const sobran = idsEnApp.filter((id) => !MODEL_IDS.includes(id));
  ok(faltan.length === 0, "app.js conoce todos los modelos de models.mjs", faltan.join(", "));
  ok(sobran.length === 0, "app.js no ofrece modelos que el server no acepte", sobran.join(", "));
}

console.log("\n== menú /model de Claude Code ==");
{
  // claude-settings.json define el modelPicker: sus filas tienen que ser modelos
  // que el proxy acepte de verdad, o Claude Code pedirá algo que da 404.
  const ruta = join(HERE, "claude-settings.json");
  ok(existsSync(ruta), "existe claude-settings.json");
  const cfg = JSON.parse(readFileSync(ruta, "utf8"));
  const filas = cfg?.modelPicker?.options ?? [];
  ok(Array.isArray(filas) && filas.length > 0, "el modelPicker tiene filas");
  ok(cfg.modelPicker.replaceBuiltInOptions === true, "oculta el catálogo de Claude (replaceBuiltInOptions)");
  const desconocidos = filas.filter((f) => !MODEL_IDS.includes(f.model)).map((f) => f.model);
  ok(desconocidos.length === 0, "todas las filas del menú son modelos reales de Zen", desconocidos.join(", "));
  ok(filas.every((f) => typeof f.behavesAs === "string" && f.behavesAs.startsWith("claude-")),
    "cada fila trae behavesAs (si no, Claude Code avisa de modelo desconocido)");
  ok(filas.every((f) => f.label && f.description), "cada fila trae label y description");
  const repetidos = filas.filter((f, i) => filas.findIndex((g) => g.model === f.model) !== i);
  ok(repetidos.length === 0, "no hay filas repetidas en el menú");
}

/* =====================================================================
 * 3. MULTI-PROVEEDOR (portado de OpenCode)
 * ===================================================================== */

console.log("\n== unidades de protocolo (multi-proveedor) ==");
{
  ok(parseModel("groq/llama-3.3").providerID === "groq", "parseModel parte por la primera barra");
  ok(parseModel("openrouter/anthropic/claude-3.5").modelID === "anthropic/claude-3.5", "los ids con barras se conservan enteros");
  ok(protocoloDe({ npm: "@ai-sdk/anthropic" }) === "anthropic", "npm de Anthropic → protocolo anthropic");
  ok(protocoloDe({ npm: "@ai-sdk/google" }) === "google", "npm de Google → protocolo google");
  ok(protocoloDe({ npm: "@ai-sdk/openai-compatible" }) === "openai", "cualquier otro npm → protocolo openai");

  const ant = aAnthropicBody({
    model: "x",
    messages: [{ role: "system", content: "eres útil" }, { role: "user", content: "hola" }],
    max_tokens: 100,
    tools: [{ type: "function", function: { name: "leer", description: "lee", parameters: { type: "object", properties: {} } } }],
    tool_choice: "auto",
  });
  ok(ant.system === "eres útil" && ant.messages.length === 1, "Anthropic: el system sale del hilo de mensajes");
  ok(ant.max_tokens === 100, "Anthropic: conserva max_tokens (lo exige la API)");
  ok(ant.tools[0].name === "leer" && ant.tools[0].input_schema.type === "object", "Anthropic: tools con input_schema");
  ok(ant.tool_choice.type === "auto", "Anthropic: tool_choice se traduce");
  ok(aAnthropicBody({ model: "x", messages: [{ role: "user", content: "a" }] }).max_tokens === 4096, "Anthropic: max_tokens por defecto si no viene");

  const antTool = aAnthropicBody({
    model: "x",
    messages: [
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "leer", arguments: '{"a":1}' } }] },
      { role: "tool", tool_call_id: "c1", content: "contenido" },
    ],
  });
  ok(antTool.messages[0].content[0].type === "tool_use" && antTool.messages[0].content[0].input.a === 1, "Anthropic: tool_calls → tool_use con input parseado");
  ok(antTool.messages[1].content[0].type === "tool_result", "Anthropic: el rol tool → bloque tool_result");

  const goo = aGoogleBody({
    model: "x",
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "hola" },
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "leer", arguments: '{"a":1}' } }] },
      { role: "tool", tool_call_id: "c1", content: "ok" },
    ],
    tools: [{ type: "function", function: { name: "leer", parameters: { type: "object", properties: {} } } }],
    tool_choice: "none",
  });
  ok(goo.systemInstruction.parts[0].text === "sys", "Google: el system va en systemInstruction");
  ok(goo.contents[0].role === "user" && goo.contents[1].role === "model", "Google: assistant se llama model");
  ok(goo.contents[1].parts[0].functionCall.name === "leer", "Google: tool_calls → functionCall");
  ok(goo.contents[2].parts[0].functionResponse.name === "leer", "Google: el resultado recupera el NOMBRE de la función (no el id)");
  ok(goo.toolConfig.functionCallingConfig.mode === "NONE", "Google: tool_choice none → modo NONE");

  const acc = acumulador();
  acc.push({ id: "a", choices: [{ delta: { content: "ho" } }] });
  acc.push({ choices: [{ delta: { content: "la" } }] });
  acc.push({ choices: [{ delta: { tool_calls: [{ index: 0, id: "t1", function: { name: "leer", arguments: '{"x"' } }] } }] });
  acc.push({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ":1}" } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 1, completion_tokens: 2 } });
  const r = acc.resultado();
  ok(r.content === "hola", "el acumulador junta el texto");
  ok(r.toolCalls[0].function.arguments === '{"x":1}', "el acumulador junta los argumentos troceados");
  ok(r.finish === "tool_calls" && r.id === "a", "el acumulador guarda id y finish_reason");
}

/** Upstream falso que entiende los tres protocolos, para probar el enrutado entero. */
function startFakeUpstream() {
  return new Promise((resolve) => {
    const visto = {};
    const srv = createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        let body = {};
        try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
        const url = req.url || "";
        const proto = /:stream?GenerateContent|:generateContent/.test(url)
          ? "google"
          : url.endsWith("/messages")
            ? "anthropic"
            : "openai";
        visto[proto] = { url, headers: req.headers, body };

        if (proto === "openai") {
          if (body.stream) {
            res.writeHead(200, { "Content-Type": "text/event-stream" });
            res.write(`data: ${JSON.stringify({ id: "cc_1", choices: [{ delta: { content: "hola groq" } }] })}\n\n`);
            res.write(`data: ${JSON.stringify({ id: "cc_1", choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 7, completion_tokens: 2 } })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ id: "cc_1", object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: "hola groq" }, finish_reason: "stop" }], usage: { prompt_tokens: 7, completion_tokens: 2 } }));
          }
          return;
        }
        if (proto === "anthropic") {
          if (body.stream) {
            const ev = (t, d) => res.write(`event: ${t}\ndata: ${JSON.stringify(d)}\n\n`);
            res.writeHead(200, { "Content-Type": "text/event-stream" });
            ev("message_start", { type: "message_start", message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } } });
            ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
            ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "hola anthropic" } });
            ev("content_block_stop", { type: "content_block_stop", index: 0 });
            ev("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } });
            ev("message_stop", { type: "message_stop" });
            res.end();
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", content: [{ type: "text", text: "hola anthropic" }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 3 } }));
          }
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ responseId: "g1", candidates: [{ content: { parts: [{ text: "hola google" }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 } }));
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve({ srv, port: srv.address().port, visto }));
  });
}

console.log("\n== catálogo de proveedores y estado ==");
const fake = await startFakeUpstream();
const zen2 = await startFakeZen();
const dir = mkdtempSync(join(tmpdir(), "opencode-chat-test-"));
const cacheFile = join(dir, "models.json");
const modelo = (id, name) => ({ id, name, tool_call: true, reasoning: false, attachment: false, limit: { context: 128000, output: 8192 }, cost: { input: 0.1, output: 0.2 } });
writeFileSync(cacheFile, JSON.stringify({
  ts: Date.now(),
  data: {
    groq: { id: "groq", name: "Groq", env: ["GROQ_API_KEY"], npm: "@ai-sdk/groq", api: `http://127.0.0.1:${fake.port}/groq/v1`, models: { "llama-3.3-70b-versatile": modelo("llama-3.3-70b-versatile", "Llama 3.3 70B") } },
    anthropic: { id: "anthropic", name: "Anthropic", env: ["ANTHROPIC_API_KEY"], npm: "@ai-sdk/anthropic", api: `http://127.0.0.1:${fake.port}/anthropic/v1`, models: { "claude-sonnet-4-5": modelo("claude-sonnet-4-5", "Claude Sonnet 4.5") } },
    google: { id: "google", name: "Google", env: ["GOOGLE_API_KEY"], npm: "@ai-sdk/google", api: `http://127.0.0.1:${fake.port}/google/v1beta`, models: { "gemini-2.5-flash": modelo("gemini-2.5-flash", "Gemini 2.5 Flash") } },
    "amazon-bedrock": { id: "amazon-bedrock", name: "Amazon Bedrock", env: ["AWS_ACCESS_KEY_ID"], npm: "@ai-sdk/amazon-bedrock", models: { nova: modelo("nova", "Nova") } },
    sinapi: { id: "sinapi", name: "Sin Api", env: ["SIN_API_KEY"], npm: "@ai-sdk/openai-compatible", models: { m: modelo("m", "M") } },
  },
}));

const PROV = "http://127.0.0.1:8098";
const AUTH = { "Content-Type": "application/json", Authorization: `Bearer ${GKEY}` };
const postAuth = (path, body) => fetchReal(PROV + path, { method: "POST", headers: AUTH, body: JSON.stringify(body) });
const getAuth = (path) => fetchReal(PROV + path, { headers: AUTH });

let serverProv;
try {
  serverProv = await startServer(zen2.port, 8098, true, {
    MODELS_CACHE_FILE: cacheFile,
    MODELS_OFFLINE: "1",
    PROVIDERS_FILE: join(dir, "providers.json"),
    PROVIDERS_AUTH_FILE: join(dir, "auth.json"),
    GROQ_API_KEY: "gsk_de_prueba",
    SIN_API_KEY: "x",
  });

  const sinClaveProv = await fetchReal(`${PROV}/v1/providers`);
  ok(sinClaveProv.status === 401, "sin clave, /v1/providers responde 401", `status=${sinClaveProv.status}`);

  const resLista = await getAuth("/v1/providers");
  const lista = await resLista.json();
  const idsLista = (lista.data || []).map((p) => p.id);
  ok(resLista.status === 200 && lista.total === 5, "el catálogo carga los 5 proveedores de prueba",
    `status=${resLista.status} total=${lista.total} ${JSON.stringify(lista).slice(0, 140)}`);
  ok(idsLista.length === 1 && idsLista[0] === "groq", "solo se enseña el proveedor conectado", idsLista.join(", "));

  const conTodo = await (await getAuth("/v1/providers?all=1&models=1")).json();
  ok(conTodo.data.length === 5 && conTodo.usables === 1, "con ?all=1 salen todos pero `usables` dice la verdad",
    `data=${conTodo.data.length} usables=${conTodo.usables}`);
  const antFicha = (conTodo.data || []).find((p) => p.id === "anthropic");
  ok(antFicha?.conectado === false, "anthropic aparece como NO conectado");
  ok(/ANTHROPIC_API_KEY/.test(antFicha.motivo || ""), "y dice qué variable falta", antFicha.motivo);
  const groqFicha = (conTodo.data || []).find((p) => p.id === "groq") || {};
  ok(groqFicha.protocolo === "openai", "groq se enruta por el protocolo openai");
  ok((groqFicha.models || []).some((m) => m.id === "llama-3.3-70b-versatile"), "con ?models=1 trae sus modelos");

  const bedrock = await (await getAuth("/v1/providers/amazon-bedrock")).json();
  ok(/SigV4/.test(bedrock.motivo || ""), "los proveedores con firma propia explican el motivo", bedrock.motivo);
  ok(bedrock.protocolo === "openai", "aunque no se pueda usar, declara su protocolo");

  ok((await getAuth("/v1/providers/noexiste")).status === 404, "proveedor inexistente → 404");

  const puesta = await (await postAuth("/v1/providers/anthropic/key", { apiKey: "sk-ant-de-prueba" })).json();
  ok(puesta.guardada === true && puesta.activo === true, "POST /key guarda la clave y lo activa");
  const lista2 = await (await getAuth("/v1/providers")).json();
  ok((lista2.data || []).length === 2, "tras conectar anthropic ya se enseña", (lista2.data || []).map((p) => p.id).join(", "));

  await postAuth("/v1/providers/anthropic/disable", {});
  const lista3 = await (await getAuth("/v1/providers")).json();
  ok((lista3.data || []).length === 1, "desactivado deja de aparecer aunque tenga clave");
  await postAuth("/v1/providers/anthropic/enable", {});
  ok(((await (await getAuth("/v1/providers")).json()).data || []).length === 2, "y se vuelve a activar");

  const modelosV1 = await (await getAuth("/v1/models")).json();
  const ids = modelosV1.data.map((m) => m.id);
  ok(modelosV1.data.length > 10, "/v1/models suma los de los proveedores a los de Zen", String(modelosV1.data.length));
  ok(ids.includes("groq/llama-3.3-70b-versatile"), "/v1/models lista los modelos de los conectados");
  ok(!ids.includes("google/gemini-2.5-flash"), "y NO los de los que no lo están");
  ok(ids.includes("big-pickle"), "/v1/models sigue listando los gratis de Zen");
  const conTodoModelos = await (await getAuth("/v1/models?all=1")).json();
  ok(conTodoModelos.data.map((m) => m.id).includes("google/gemini-2.5-flash"), "con ?all=1 sí salen todos");

  console.log("\n== enrutado a cada proveedor ==");
  const cab = (r) => r.headers.get("x-opencode-provider");

  const g = await postAuth("/v1/chat/completions", { model: "groq/llama-3.3-70b-versatile", messages: [{ role: "user", content: "hola" }] });
  const gjson = await g.json();
  ok(g.status === 200 && gjson.choices[0].message.content === "hola groq", "OpenAI: respuesta normalizada");
  ok(cab(g) === "groq", "la respuesta dice de qué proveedor viene", `x-opencode-provider=${cab(g)} cabeceras=${[...g.headers.keys()].join(",")}`);
  ok(fake.visto.openai.url === "/groq/v1/chat/completions", "pega en la URL base del catálogo + /chat/completions", fake.visto.openai.url);
  ok(fake.visto.openai.headers.authorization === "Bearer gsk_de_prueba", "manda la clave del proveedor (no la de Zen)");
  ok(fake.visto.openai.body.model === "llama-3.3-70b-versatile" && !fake.visto.openai.body.stream, "no pide stream si el cliente no lo pidió");

  const gs = await postAuth("/v1/chat/completions", { model: "groq/llama-3.3-70b-versatile", messages: [{ role: "user", content: "hola" }], stream: true });
  const gsse = await gs.text();
  ok(gs.headers.get("content-type").startsWith("text/event-stream"), "OpenAI: streaming en text/event-stream");
  ok(/"content":"hola groq"/.test(gsse) && gsse.trim().endsWith("[DONE]"), "OpenAI: el SSE lleva los trozos y su [DONE]");

  const a = await postAuth("/v1/chat/completions", { model: "anthropic/claude-sonnet-4-5", messages: [{ role: "system", content: "sys" }, { role: "user", content: "hola" }], max_tokens: 64 });
  ok((await a.json()).choices[0].message.content === "hola anthropic", "Anthropic: respuesta normalizada");
  ok(fake.visto.anthropic.url === "/anthropic/v1/messages", "Anthropic: pega en /messages");
  ok(fake.visto.anthropic.body.system === "sys", "Anthropic: convierte el system");
  ok(fake.visto.anthropic.headers["x-api-key"] === "sk-ant-de-prueba", "Anthropic: autentica con x-api-key");
  ok(fake.visto.anthropic.headers["anthropic-version"] === "2023-06-01", "Anthropic: manda anthropic-version");

  // Google aún no está conectado (así se comprobó que no salía en /v1/models).
  await postAuth("/v1/providers/google/key", { apiKey: "goog-de-prueba" });
  const go = await postAuth("/v1/chat/completions", { model: "google/gemini-2.5-flash", messages: [{ role: "user", content: "hola" }] });
  const gojson = await go.json();
  ok(gojson.choices?.[0]?.message?.content === "hola google", "Google: respuesta normalizada", `status=${go.status} url=${fake.visto.google?.url} ${JSON.stringify(gojson).slice(0, 160)}`);
  ok(/:generateContent$/.test(fake.visto.google.url), "Google: pega en :generateContent", fake.visto.google.url);
  ok(fake.visto.google.headers["x-goog-api-key"] === "goog-de-prueba", "Google: autentica con x-goog-api-key");
  ok(fake.visto.google.body.contents[0].parts[0].text === "hola", "Google: convierte los mensajes a contents");

  const malo = await postAuth("/v1/chat/completions", { model: "groq/no-existe", messages: [{ role: "user", content: "hola" }] });
  ok(malo.status === 404, "modelo que no está en el catálogo → 404");

  const bed = await (await postAuth("/v1/chat/completions", { model: "amazon-bedrock/nova", messages: [{ role: "user", content: "hola" }] })).json();
  ok(/SigV4/.test(bed.error.message), "proveedor no soportado → error con el motivo", bed.error.message);

  const sinBase = await (await postAuth("/v1/chat/completions", { model: "sinapi/m", messages: [{ role: "user", content: "hola" }] })).json();
  ok(/URL base/.test(sinBase.error.message), "sin URL base y sin tabla conocida → error claro", sinBase.error.message);

  const zenOk = await postAuth("/v1/chat/completions", { model: "big-pickle", messages: [{ role: "user", content: "hola" }] });
  ok((await zenOk.json()).choices[0].message.content === "Hola mundo", "el tier gratis de Zen sigue funcionando igual");

  console.log("\n== puente Anthropic con proveedores ==");
  const men = await postAuth("/v1/messages", { model: "groq/llama-3.3-70b-versatile", max_tokens: 50, messages: [{ role: "user", content: "hola" }] });
  const menJson = await men.json();
  ok(menJson.type === "message" && menJson.content[0].text === "hola groq", "v1/messages con un proveedor devuelve formato Anthropic");
  ok(menJson.stop_reason === "end_turn", "y traduce el stop_reason");
  ok(menJson.usage.input_tokens === 7, "y las cuentas de tokens");

  const menStream = await postAuth("/v1/messages", { model: "groq/llama-3.3-70b-versatile", max_tokens: 50, stream: true, messages: [{ role: "user", content: "hola" }] });
  const menSse = await menStream.text();
  ok(/event: message_start/.test(menSse) && /event: message_stop/.test(menSse), "v1/messages en streaming emite eventos de Anthropic");
  ok(/text_delta/.test(menSse) && /hola groq/.test(menSse), "con su text_delta correspondiente");

  const provNoExiste = await (await postAuth("/v1/messages", { model: "zzz/no", max_tokens: 10, messages: [{ role: "user", content: "hola" }] })).json();
  ok(provNoExiste.type === "error", "v1/messages con proveedor inexistente → error en formato Anthropic");
} finally {
  serverProv?.kill();
  fake.srv.close();
  zen2.srv.close();
  rmSync(dir, { recursive: true, force: true });
}

/* =====================================================================
 * 3. LA LISTA DE MODELOS DE QWEN (sync-qwen-models)
 * ===================================================================== */
console.log("\n== lista de modelos de Qwen (sync-qwen-models) ==");
{
  const qhome = mkdtempSync(join(tmpdir(), "qwen-home-"));
  mkdirSync(join(qhome, ".qwen"), { recursive: true });
  // Ajustes previos con un proveedor que el usuario conectó él (con /auth):
  // sync tiene que conservarlo intacto.
  writeFileSync(join(qhome, ".qwen/settings.json"), JSON.stringify({
    theme: "dark",
    model: { name: "big-pickle" },
    modelProviders: { deepseek: [{ id: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com/v1", envKey: "DEEPSEEK_API_KEY" }] },
  }));

  // Gateway falso mínimo: el script solo pide /models y /providers.
  const gw = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url.includes("/models")) {
      // Tal cual lo sirve el gateway de verdad: los de Zen con su título y
      // `owned_by`, y los de proveedor con el prefijo y su x_opencode_provider.
      return res.end(JSON.stringify({ object: "list", data: [
        { id: "mimo-v2.6-flash-free", owned_by: "opencode-zen", x_opencode_title: "MiMo V2.6 Flash Free" },
        { id: "big-pickle", owned_by: "opencode-zen", x_opencode_title: "Big Pickle" },
        { id: "opencode/gpt-5", owned_by: "opencode", name: "GPT-5", x_opencode_provider: "opencode", x_opencode_protocol: "openai" },
        { id: "opencode/gro2", owned_by: "opencode", name: "Gro 2", x_opencode_provider: "opencode", x_opencode_protocol: "openai" },
        { id: "opencode-go/glm-5", owned_by: "opencode-go", name: "GLM-5", x_opencode_provider: "opencode-go", x_opencode_protocol: "openai" },
      ] }));
    }
    if (req.url.includes("/providers")) {
      return res.end(JSON.stringify({ total: 2, usables: 2, data: [
        { id: "opencode", name: "OpenCode Zen" },
        { id: "opencode-go", name: "OpenCode Go" },
      ] }));
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise((r) => gw.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${gw.address().port}/v1`;

  // Ojo: tiene que ser ASÍNCRONO. `execFileSync` bloquearía el bucle de eventos de
  // este mismo proceso, y el gateway falso (que vive aquí) nunca respondería.
  const correr = (extra = []) =>
    new Promise((res, rej) => {
      execFile(process.execPath, [join(HERE, "sync-qwen-models.mjs"), ...extra], {
        env: entornoHijo({ HOME: qhome, OPENCODE_GATEWAY_URL: url, OPENCODE_GATEWAY_KEY: "k" }),
      }, (err) => (err ? rej(err) : res()));
    });
  const leer = () => JSON.parse(readFileSync(join(qhome, ".qwen/settings.json"), "utf8"));

  await correr();
  const gen = leer();
  const nuestras = gen.modelProviders["opencode-zen"];
  // Por defecto: Zen gratis + conectados, PERO sin el catálogo de pago de Zen
  // (`opencode`/`opencode-go`), que sin plan de pago solo ensucia la lista.
  ok(nuestras.length === 2, "por defecto trae los gratis de Zen y deja fuera el catálogo de pago de Zen", String(nuestras.length));
  ok(nuestras[0].id === "mimo-v2.6-flash-free" && nuestras[1].id === "big-pickle", "los de Zen primero y en el orden del gateway");
  ok(!nuestras.some((e) => e.id.startsWith("opencode")), "ni Sol, ni Opus, ni el resto de modelos de pago");
  ok(nuestras.every((e) => e.baseUrl === url && e.envKey === "OPENCODE_GATEWAY_KEY"), "apuntan al gateway y usan envKey (nunca la clave en el fichero)");
  ok(gen.providerProtocol["opencode-zen"] === "openai", "mapea la clave propia al protocolo openai");
  ok(gen.modelProviders.deepseek?.length === 1, "conserva el proveedor que conectaste con /auth");
  ok(gen.theme === "dark" && gen.model?.name === "big-pickle", "respeta el resto de ajustes");

  // Etiqueta estilo OpenCode: «Modelo · Proveedor», con los gratis marcados.
  ok(nuestras[0].name === "MiMo V2.6 Flash Free · OpenCode Zen", "el nombre lleva detrás el proveedor", nuestras[0].name);
  ok(nuestras[0].description === "Gratis, sin cuenta", "y los gratis de Zen se distinguen", nuestras[0].description);

  // Con plan de pago sí entran, etiquetados con su proveedor.
  await correr(["--zen-plan"]);
  const conPlan = leer().modelProviders["opencode-zen"];
  ok(conPlan.length === 5, "--zen-plan añade el catálogo de pago de Zen", String(conPlan.length));
  ok(
    conPlan[2].id === "opencode/gpt-5" && conPlan[3].id === "opencode/gro2" && conPlan[4].id === "opencode-go/glm-5",
    "agrupados por proveedor (Zen, opencode, opencode-go)",
  );
  ok(conPlan[2].name === "GPT-5 · OpenCode Zen", "un modelo de proveedor usa su nombre corto, sin el prefijo del id", conPlan[2].name);
  ok(conPlan[2].description === "Conectado en el gateway (openai)", "y se marca como conectado", conPlan[2].description);
  ok(conPlan[4].name === "GLM-5 · OpenCode Go", "y con el nombre del proveedor del catálogo", conPlan[4].name);

  await correr(["--zen"]);
  const gen2 = leer();
  ok(gen2.modelProviders["opencode-zen"].length === 2, "--zen deja solo los gratis de Zen");
  ok(gen2.modelProviders.deepseek?.length === 1, "y tampoco toca lo de /auth");

  // `--all` (antiguo «incluye los conectados») sigue aceptándose.
  await correr(["--all"]);
  ok(leer().modelProviders["opencode-zen"].length === 2, "--all se acepta como alias del modo por defecto");

  // La variable de entorno vale igual que el flag (es lo que usa el envoltorio).
  await new Promise((res, rej) => {
    execFile(process.execPath, [join(HERE, "sync-qwen-models.mjs")], {
      env: entornoHijo({ HOME: qhome, OPENCODE_GATEWAY_URL: url, OPENCODE_GATEWAY_KEY: "k", OPENCODE_ZEN_PLAN: "1" }),
    }, (err) => (err ? rej(err) : res()));
  });
  ok(leer().modelProviders["opencode-zen"].length === 5, "OPENCODE_ZEN_PLAN=1 hace lo mismo que --zen-plan");

  // Config recién estrenada (sin `model` ni `security`): tiene que sembrar uno
  // que exista y mapear el protocolo, sin petar por referencias antiguas.
  writeFileSync(join(qhome, ".qwen/settings.json"), JSON.stringify({ theme: "dark" }));
  await correr();
  const gen3 = leer();
  ok(gen3.model?.name === "big-pickle", "con una config vacía siembra un modelo que existe", gen3.model?.name);
  ok(gen3.providerProtocol["opencode-zen"] === "openai" && gen3.security?.auth?.selectedType === "openai", "y el protocolo + tipo de auth");

  gw.close();
  rmSync(qhome, { recursive: true, force: true });
}

process.exit(fallos ? 1 : 0);
