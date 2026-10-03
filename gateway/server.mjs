import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { MODELS, MODEL_IDS, resolveModel } from "./models.mjs";
import { aOpenAI, errorAnthropic, mapearTools, respuestaAnthropic, traductorSse } from "./anthropic.mjs";
import {
  CATALOGO_URL,
  ajustar,
  catalogo,
  config as configProveedores,
  ficha,
  guardarClave,
  listar as listarProveedores,
  modelos as modelosDeProveedores,
  parseModel,
  resolver,
} from "./providers.mjs";
import { protocolo } from "./protocols.mjs";
import { ZEN_UA, ocId } from "./ids.mjs";
import { conToolCall, detectaForzada, forzarComoJson } from "./forced-tools.mjs";

/**
 * Servidor estático + gateway, sin dependencias.
 *   node server.mjs [puerto]                              # tier anónimo de Zen
 *   OPENCODE_API_KEY=oc_sk_... node server.mjs [puerto]   # con tu key de Zen
 *   CHAT_API_KEY=mi_clave node server.mjs [puerto]        # tu propia clave del gateway
 *
 * Sirve dos cosas a la vez:
 *
 *   1. **Una API estilo OpenAI** en /v1/*  → para usarla desde Cursor, aider,
 *      Claude Code, curl, o donde quieras. Requiere TU clave (`CHAT_API_KEY`).
 *   2. **El chat** de esta carpeta en / → sus rutas /api/* solo se aceptan desde
 *      loopback, así que el chat funciona sin clave pero nadie de la red lo usa.
 *
 * La key de Zen (OPENCODE_API_KEY) NO sale nunca de aquí: la sustituye el proxy.
 *
 * ¿Por qué hace falta un proxy y no llamar a Zen directo?
 * El tier gratis valida que la petición parezca del cliente oficial, y el
 * navegador no puede mandar esas cabeceras (además opencode.ai no contesta al
 * preflight CORS). La receta, verificada el 2026-09-30 (ver ../ZEN-FREE-TIER.md):
 *   1. User-Agent `opencode/<versión>` — nunca "local"
 *   2. x-opencode-session: ses_ + 26 chars y x-opencode-request: msg_ + 26 chars
 *   3. body con `stream: true` (obligatorio)
 *   4. body con las 11 tools oficiales por NOMBRE (el chequeo es de subconjunto)
 */

const PORT = Number(process.argv[2] || process.env.PORT || 8090);
/* Solo loopback por defecto: este proceso guarda tu key, así que no debe quedar
 * expuesto a la LAN. `listen(PORT)` sin host escucharía en TODAS las interfaces.
 * Para exponerlo de verdad, ponlo detrás de un proxy con TLS, no aquí a pelo. */
const HOST = process.env.HOST || "127.0.0.1";
/* Dónde vive el estado del gateway: `.api-key`, `providers.json`, `auth.json`,
 * la caché y la UI estática que sirve. Por defecto, la carpeta desde la que se
 * arranca. `OPENCODE_CHAT_DIR` lo fija a mano, y jpcode lo usa para arrancar el
 * proceso con el cwd FUERA del paquete: en Windows una carpeta que es el cwd de
 * un proceso vivo no se puede renombrar, y npm renombra la suya en cada
 * instalación/actualización (el `EBUSY` al hacer `npm i -g`). */
const ROOT = process.env.OPENCODE_CHAT_DIR || process.cwd();
const UPSTREAM = process.env.OPENCODE_BASE || "https://opencode.ai/zen/v1";
const KEY = process.env.OPENCODE_API_KEY || process.env.ZEN_API_KEY || "";
const MAX_BODY = 30 * 1024 * 1024; // 30 MB, para soportar capturas e imágenes en base64

/* CORS abierto por defecto: la API es para que la llames desde donde quieras.
 * Ojo: el CORS no autentica. Lo que protege /v1/ es CHAT_API_KEY. */
const CORS = process.env.CORS_ORIGIN || "*";

/** Sin key de Zen se usa el tier anónimo: el literal `public` es lo que espera. */
const AUTH = KEY ? `Bearer ${KEY}` : "Bearer public";

/** Las 11 tools que el servidor exige ver por nombre (el check es de subconjunto). */
const OFFICIAL_TOOLS = [
  "bash", "edit", "glob", "grep", "read", "skill",
  "task", "todowrite", "webfetch", "websearch", "write",
];

/* ================== tu clave del gateway ================== */

const KEY_FILE = join(ROOT, ".api-key");

/** Prioridad: OPENCODE_GATEWAY_KEY > CHAT_API_KEY > .api-key > una nueva que se guarda con permisos 600. */
async function claveDelGateway() {
  if (process.env.OPENCODE_GATEWAY_KEY) return process.env.OPENCODE_GATEWAY_KEY;
  if (process.env.CHAT_API_KEY) return process.env.CHAT_API_KEY;
  try {
    const guardada = (await readFile(KEY_FILE, "utf8")).trim();
    if (guardada) return guardada;
  } catch {
    /* primera vez */
  }
  const nueva = "ock_" + randomBytes(24).toString("hex");
  try {
    await writeFile(KEY_FILE, nueva + "\n", { mode: 0o600 });
  } catch {
    /* si no se puede escribir, la clave vive solo en memoria */
  }
  return nueva;
}

let GATEWAY_KEY = await claveDelGateway();

/** Comparación en tiempo constante (evita filtrar la clave por el tiempo). */
function esLaClave(candidata) {
  if (typeof candidata !== "string") return false;
  if (candidata.length === GATEWAY_KEY.length && timingSafeEqual(Buffer.from(candidata), Buffer.from(GATEWAY_KEY))) {
    return true;
  }
  try {
    const enDisco = readFileSync(KEY_FILE, "utf8").trim();
    if (enDisco && enDisco.length === candidata.length && timingSafeEqual(Buffer.from(candidata), Buffer.from(enDisco))) {
      GATEWAY_KEY = enDisco;
      return true;
    }
  } catch {}
  return false;
}

/** Acepta `Authorization: Bearer …` y `x-api-key: …` (como los demás gateways). */
function autorizado(req) {
  const h = req.headers.authorization || "";
  const porBearer = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  return esLaClave(porBearer) || esLaClave(String(req.headers["x-api-key"] || ""));
}

const esLoopback = (req) => {
  const ip = req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.startsWith("::ffff:127.");
};

/**
 * En un workspace en la nube (IDX / Cloud Workstations) el navegador no llega
 * por loopback: entra por el proxy del entorno, que ya exige login. Cuando el
 * server escucha fuera de loopback se asume que es justo ese caso y se aceptan
 * las peticiones reenviadas. `TRUST_PROXY=0` lo desactiva.
 */
const TRUST_PROXY = process.env.TRUST_PROXY ? process.env.TRUST_PROXY !== "0" : HOST !== "127.0.0.1";
const DOMINIOS_DEL_ENTORNO = [process.env.WEB_HOST, "cloudworkstations.dev", "idx.google.com"].filter(Boolean);

/** Reenviada por el proxy del entorno (cabeceras X-Forwarded-* o su dominio). */
function vieneDeProxy(req) {
  if (req.headers["x-forwarded-for"] || req.headers["x-forwarded-host"]) return true;
  const host = String(req.headers.host || "");
  return DOMINIOS_DEL_ENTORNO.some((d) => host.includes(d));
}

/**
 * Con API_ONLY=1 solo queda la API con clave: las rutas del chat (que no piden
 * clave) se cierran a todo el mundo aunque lleguen reenviadas. Es lo que hay que
 * usar cuando el puerto se expone a internet (túnel, VPS).
 */
const API_ONLY = process.env.API_ONLY === "1";

/** ¿Puede usar las rutas del chat local (/api/*)? */
const esDelChat = (req) => !API_ONLY && (esLoopback(req) || (TRUST_PROXY && vieneDeProxy(req)));

/* ================== cabeceras y utilidades ================== */

function corsHeaders() {
  return CORS === "*"
    ? { "Access-Control-Allow-Origin": "*" }
    : { "Access-Control-Allow-Origin": CORS, Vary: "Origin" };
}

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...corsHeaders(),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
    "Access-Control-Max-Age": "86400",
    ...extra,
  });
  res.end(body);
}

const sendJson = (res, status, obj, extra) => send(res, status, JSON.stringify(obj), "application/json; charset=utf-8", extra);

/**
 * Relleno de tools: el servidor valida los NOMBRES, no los esquemas, así que van
 * vacíos. La descripción deja claro que no se pueden llamar: sin eso, los modelos
 * (big-pickle, mimo, space-bunny) intentan llamarlas y devuelven texto vacío.
 */
function fillerTools(yaTengo) {
  return OFFICIAL_TOOLS.filter((name) => !yaTengo.has(name)).map((name) => ({
    type: "function",
    function: {
      name,
      description: `Herramienta de opencode "${name}". No está disponible en esta conversación: nunca la llames, responde siempre con texto.`,
      parameters: { type: "object", properties: {}, required: [] },
    },
  }));
}

/** Cabeceras de la receta. */
function zenHeaders() {
  return {
    Authorization: AUTH,
    "Content-Type": "application/json",
    Accept: "*/*",
    "User-Agent": ZEN_UA,
    "x-opencode-session": ocId("ses_"),
    "x-opencode-request": ocId("msg_"),
  };
}

/**
 * Completa el body con lo que el servidor exige. Si el cliente trae sus propias
 * tools, se respetan y solo se añaden las que falten (el check es de subconjunto).
 */
/**
 * El upstream rechaza (400 "invalid request") cualquier tool cuyo `parameters`
 * no lleve `type` — Qwen Code manda `get_goal`/`list_agents` con `{}` y tumba
 * toda la petición. Se completa sin tocar lo que ya sea válido.
 */
function normalizarTools(tools) {
  return tools.map((t) => {
    if (!t?.function) return t;
    const p = t.function.parameters;
    const valido = p && typeof p === "object" && !Array.isArray(p);
    if (valido && p.type) return t;
    return {
      ...t,
      function: { ...t.function, parameters: { type: "object", properties: {}, required: [], ...(valido ? p : {}) } },
    };
  });
}

function zenBody(payload) {
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const have = new Set(tools.map((t) => t?.function?.name).filter(Boolean));
  const cuerpo = {
    ...payload,
    tools: normalizarTools([...tools, ...fillerTools(have)]),
    tool_choice: payload.tool_choice ?? "none", // que responda con texto, no llamando tools
    stream: true,                              // obligatorio: sin esto → 403
  };
  // El tier gratis devuelve "invalid request" con campos que no conoce. Los
  // clientes reales (Qwen Code manda stream_options) hay que limpiarlos aquí.
  delete cuerpo.stream_options;
  return cuerpo;
}

/** Traza para depurar: `DEBUG=1` imprime lo que se manda y lo que contesta. */
function traza(...partes) {
  if (process.env.DEBUG === "1") console.error("[debug]", ...partes);
}

const zen = (path, payload) => {
  const cuerpo = zenBody(payload);
  traza("→ zen", UPSTREAM + path, JSON.stringify({ model: cuerpo.model, claves: Object.keys(cuerpo), tools: cuerpo.tools?.length, tool_choice: cuerpo.tool_choice, nombres: cuerpo.tools?.map((t) => t?.function?.name) }));
  if (process.env.DEBUG_DUMP) {
    const todo = JSON.stringify(cuerpo);
    traza("→ zen cuerpo", todo.slice(0, 4000));
    try { appendFileSync(process.env.DEBUG_DUMP, todo + "\n"); } catch { /* ignore */ }
  } else {
    traza("→ zen cuerpo", JSON.stringify(cuerpo).slice(0, 4000));
  }
  return fetch(`${UPSTREAM}${path}`, { method: "POST", headers: zenHeaders(), body: JSON.stringify(cuerpo) });
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

/** Traduce el fallo upstream a algo legible. */
async function errorText(upstream) {
  let detail = "";
  let crudo = "";
  try {
    const body = await upstream.text();
    crudo = body;
    try {
      const j = JSON.parse(body);
      detail = j?.error?.message || j?.error?.type || body;
    } catch {
      detail = body;
    }
  } catch {
    /* sin cuerpo */
  }
  traza("← upstream", upstream.status, crudo.slice(0, 900));
  if (/free tier can only be used from within OpenCode/i.test(detail)) {
    return `${detail} — el servidor no reconoció la petición como del cliente oficial (revisa UA, ids ses_/msg_ de 26 chars, stream:true y las tools).`;
  }
  if (upstream.status === 401 || upstream.status === 403) return detail || "la key de Zen no vale para este modelo (401/403)";
  if (upstream.status === 429) return `demasiadas peticiones (429). El tier gratis va por IP (~200/día). ${detail}`;
  return detail || `el upstream devolvió ${upstream.status}`;
}

/** Trocea el SSE de Zen en trozos de texto y tool_calls. */
function partesDelSse(sse) {
  let content = "";
  let reasoning = "";
  let finish = null;
  let usage = null;
  let id = null;
  const herramientas = new Map();
  for (const line of sse.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const d = line.slice(5).trim();
    if (!d || d === "[DONE]") continue;
    let j;
    try { j = JSON.parse(d); } catch { continue; }
    if (j.id) id = j.id;
    if (j.usage) usage = j.usage;
    const c = j.choices?.[0];
    if (!c) continue;
    if (c.finish_reason) finish = c.finish_reason;
    if (c.delta?.content) content += c.delta.content;
    if (c.delta?.reasoning_content) reasoning += c.delta.reasoning_content;
    for (const tc of c.delta?.tool_calls || []) {
      const k = tc.index ?? 0;
      const acc = herramientas.get(k) || { id: "", name: "", args: "" };
      if (tc.id) acc.id = tc.id;
      if (tc.function?.name) acc.name = tc.function.name;
      if (tc.function?.arguments) acc.args += tc.function.arguments;
      herramientas.set(k, acc);
    }
  }
  return {
    id, content, reasoning, finish, usage,
    toolCalls: [...herramientas.values()].map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: t.args } })),
  };
}

/**
 * Extrae tool calls que el modelo emitió como texto plano (formato MiniMax u otros).
 * MiniMax escribe sus tokens de herramienta como texto cuando `tool_calls` no está
 * disponible en el stream: `][minimax>[<tool_call><invoke name="glob" ...>`.
 * Devuelve { toolCalls, contentLimpio } donde toolCalls tiene el formato OpenAI.
 */
function extraerToolCallsDeTexto(content) {
  if (!content) return { toolCalls: [], contentLimpio: "" };
  // Detectar si hay intento de tool call en el texto
  const tieneInvoke = content.includes("<invoke") || content.includes("tool_call");
  if (!tieneInvoke) return { toolCalls: [], contentLimpio: content };

  // Limpiar tokens especiales de MiniMax (][minimax>[, ][minimax][, etc.)
  let limpio = content
    .replace(/\]\[minimax\>\[/g, "")
    .replace(/\]\[minimax\]\[/g, "")
    .replace(/\]\[minimax\>/g, "");

  const toolCalls = [];
  let idx = 0;

  // Patrón: <invoke name="tool_name", "key": "value", ...>
  // o      <invoke name="tool_name">
  const invokeRe = /<invoke\s+name="([^"]+)"([^>]*)>/g;
  let m;
  const vistos = new Set();
  while ((m = invokeRe.exec(limpio)) !== null) {
    const nombre = m[1].trim();
    if (!nombre || vistos.has(nombre + m[2])) continue;
    vistos.add(nombre + m[2]);

    const rest = m[2] || "";
    const args = {};
    // Parsear args inline: , "key": "value"
    const argRe = /,\s*"([^"]+)"\s*:\s*(?:"([^"]*)"|([\d.+-]+(?:\.\d+)?))/g;
    let am;
    while ((am = argRe.exec(rest)) !== null) {
      if (am[2] !== undefined) args[am[1]] = am[2];
      else if (am[3] !== undefined) args[am[1]] = Number(am[3]);
    }

    toolCalls.push({
      id: `call_${nombre}_${Date.now().toString(36)}_${idx++}`,
      type: "function",
      function: { name: nombre, arguments: JSON.stringify(args) },
    });
  }

  // Quitar los bloques de tool_call e invoke del texto visible
  const sinTags = limpio
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/g, "")
    .replace(/<\/?invoke[^>]*>/g, "")
    .replace(/<\/?tool_call>/g, "")
    .trim();

  return { toolCalls, contentLimpio: sinTags };
}

/**
 * Claude Code solo sabe pedir modelos `claude-*`. Aquí se traducen a los gratis
 * de Zen: los "pequeños/rápidos" (haiku, mini…) al más ligero, el resto al
 * modelo por defecto. Se puede forzar con CLAUDE_MODEL / CLAUDE_SMALL_MODEL.
 */
function modeloParaClaude(pedido) {
  const directo = resolveModel(pedido);
  if (directo) return directo;
  if (/haiku|small|fast|mini|lite/i.test(String(pedido))) return process.env.CLAUDE_SMALL_MODEL || "mimo-v2.6-flash-free";
  return process.env.CLAUDE_MODEL || "big-pickle";
}

/** Junta el SSE en una respuesta normal de OpenAI (para quien no pide stream). */
function aFormatoOpenAI(sse, model) {
  const { id, content, reasoning, finish, usage } = partesDelSse(sse);
  return {
    id: id || ocId("chatcmpl_"),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content },
      finish_reason: finish || "stop",
    }],
    ...(usage ? { usage } : {}),
    // Extra, no estándar: útil para depurar respuestas vacías
    ...(reasoning && !content ? { x_opencode_reasoning_chars: reasoning.length } : {}),
  };
}

/** Pasa el SSE de Zen al cliente sin reencuadrar nada. */
function pipeSse(res, upstream) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...corsHeaders(),
  });
  return (async () => {
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  })();
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const MODELOS_PUBLICOS = MODELS.map((m) => ({
  id: m.id,
  object: "model",
  created: 1790755487,
  owned_by: "opencode-zen",
  // Extra informativo; los clientes OpenAI ignoran lo que no conocen.
  x_opencode_title: m.title,
  x_opencode_tone: m.tone,
  ...(m.modalities ? { x_opencode_modalities: m.modalities } : {}),
}));

/* ================== multi-proveedor (portado de OpenCode) ================== */

/**
 * Decide a quién va un modelo pedido:
 *   - `big-pickle`, `oc/longcat…`     → tier gratis de Zen (la ruta de siempre)
 *   - `groq/llama-3.3-70b-versatile`  → ese proveedor del catálogo de models.dev
 * Devuelve `{ zen }`, `{ target }` o `{ error }`.
 *
 * `aliasClaude` solo lo usa /v1/messages: Claude Code pide nombres `claude-*`
 * (sin barra) y hay que seguir mapeándolos a un modelo gratis como antes.
 * En /v1/chat/completions eso sería un error, no un alias.
 */
async function enrutar(pedido, { aliasClaude = false } = {}) {
  const zen = resolveModel(pedido);
  if (zen) return { zen };

  const nombre = String(pedido ?? "").trim();
  if (!nombre) return { error: "falta el modelo" };
  // Sin barra no puede ser "proveedor/modelo".
  if (!nombre.includes("/")) {
    return aliasClaude ? { zen: modeloParaClaude(nombre) } : { error: `modelo desconocido "${nombre}"` };
  }

  const { providerID } = parseModel(nombre);
  if (!providerID) return { error: "falta el modelo" };

  let cat;
  try {
    cat = await catalogo();
  } catch (err) {
    return { error: `no se pudo cargar el catálogo de proveedores: ${err.message}` };
  }
  if (!cat[providerID]) return { error: `no existe el proveedor "${providerID}"` };

  const r = await resolver(pedido, { cat });
  if (r.error) return { error: r.error };
  return { target: r };
}

/** Manda la petición al proveedor y devuelve `{ upstream, proto }` o `{ status, error }`. */
async function llamarProveedor(target, body, stream) {
  const proto = protocolo(target.protocolo);
  const { model: _m, stream: _s, ...resto } = body || {};
  const pet = proto.peticion({
    baseURL: target.baseURL,
    apiKey: target.apiKey,
    model: target.modelID,
    body: resto,
    headers: target.headers,
    stream,
  });
  let upstream;
  try {
    upstream = await fetch(pet.url, { method: "POST", headers: pet.headers, body: JSON.stringify(pet.json) });
  } catch (err) {
    return { status: 502, error: `no se pudo contactar con "${target.providerID}": ${err.message}` };
  }
  if (!upstream.ok) {
    traza("←", target.providerID, upstream.status, JSON.stringify(pet.json).slice(0, 800));
    return { status: upstream.status, error: await errorText(upstream) };
  }
  return { upstream, proto };
}

/** Chunks estilo OpenAI → SSE, terminado con el `[DONE]` que esperan los clientes. */
async function* aSseOpenAI(chunks, modelo) {
  for await (const j of chunks) {
    yield `data: ${JSON.stringify({ object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), ...j, model: modelo })}\n\n`;
  }
  yield "data: [DONE]\n\n";
}

/** Partes normalizadas → respuesta `chat.completion` de OpenAI. */
function respuestaOpenAI(partes, modelo) {
  return {
    id: partes.id || ocId("chatcmpl_"),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelo,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: partes.content || "",
        ...(partes.reasoning ? { reasoning_content: partes.reasoning } : {}),
        ...(partes.toolCalls?.length ? { tool_calls: partes.toolCalls } : {}),
      },
      finish_reason: partes.finish || "stop",
    }],
    ...(partes.usage ? { usage: partes.usage } : {}),
  };
}

/** Estado de un proveedor después de un cambio (respuesta inmediata). */
async function estadoDe(id) {
  const cfg = await configProveedores();
  const p = cfg.providers?.[id] || {};
  return { activo: p.enabled !== false, tieneClave: Boolean(p.apiKey || cfg.auth?.[id]) };
}

/** Resumen de proveedores sin descargar el catálogo si no está ya en caché. */
async function infoProveedores() {
  try {
    const cat = await catalogo({ soloCache: true });
    const total = Object.keys(cat).length;
    if (!total) return { catalogo: 0, nota: "sin cargar: pide GET /v1/providers" };
    const cfg = await configProveedores();
    const lista = await listarProveedores({ cat, cfg });
    return { catalogo: total, usables: lista.length };
  } catch (err) {
    return { error: err.message };
  }
}

/* ================== servidor ================== */

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    /* ---------- preflight: sin auth, por definición ---------- */
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    /* ========== API estilo OpenAI (clave del gateway) ========== */

    if (url.pathname === "/v1/models" && req.method === "GET") {
      if (!autorizado(req)) {
        sendJson(res, 401, { error: { message: "clave inválida: manda Authorization: Bearer <tu CHAT_API_KEY> o x-api-key", type: "invalid_request_error" } });
        return;
      }
      // Zen + los modelos de los proveedores conectados. Se lee el catálogo de
      // la caché para que listar no dispare la descarga de 5 MB.
      const todos = url.searchParams.get("all") === "1";
      let deProveedores = [];
      let aviso = null;
      try {
        const cat = await catalogo({ soloCache: url.searchParams.get("refresh") !== "1" });
        deProveedores = await modelosDeProveedores({ todos, cat, cfg: await configProveedores() });
      } catch (err) {
        aviso = err.message;
      }
      sendJson(res, 200, {
        object: "list",
        data: [...MODELOS_PUBLICOS, ...deProveedores],
        ...(aviso ? { x_opencode_warning: aviso } : {}),
      });
      return;
    }

    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      if (!autorizado(req)) {
        sendJson(res, 401, { error: { message: "clave inválida: manda Authorization: Bearer <tu CHAT_API_KEY> o x-api-key", type: "invalid_request_error" } });
        return;
      }
      const body = await readBody(req);
      if (!Array.isArray(body?.messages) || !body.messages.length) {
        sendJson(res, 400, { error: { message: "faltan los messages", type: "invalid_request_error" } });
        return;
      }

      const objetivo = await enrutar(body.model);
      if (objetivo.error) {
        sendJson(res, 404, {
          error: { message: `${objetivo.error}. Zen gratis: ${MODEL_IDS.join(", ")} · de proveedores: "proveedor/modelo"`, type: "invalid_request_error", code: "model_not_found" },
        });
        return;
      }

      /* ---- otro proveedor del catálogo de models.dev ---- */
      if (objetivo.target) {
        const conStream = Boolean(body.stream);
        const r = await llamarProveedor(objetivo.target, body, conStream);
        if (r.error) {
          sendJson(res, r.status, { error: { message: r.error, type: "upstream_error" } });
          return;
        }
        const comunes = { "x-opencode-provider": objetivo.target.providerID, "x-opencode-model": objetivo.target.modelID };
        if (conStream) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            ...comunes,
            ...corsHeaders(),
          });
          try {
            for await (const trozo of aSseOpenAI(r.proto.chunks(r.upstream), body.model)) res.write(trozo);
          } catch (err) {
            res.write(`data: ${JSON.stringify({ error: { message: String(err?.message || err) } })}\n\n`);
          }
          res.end();
          return;
        }
        let partes;
        try {
          partes = r.proto.completo(await r.upstream.json());
        } catch (err) {
          sendJson(res, 502, { error: { message: `respuesta ilegible de "${objetivo.target.providerID}": ${err.message}`, type: "upstream_error" } });
          return;
        }
        // Estos proveedores sí saben llamar funciones, así que la petición se manda
        // tal cual. Lo único que se recoge es el caso en que, aun así, contestan con
        // el JSON en el texto en vez de con la llamada (ver forced-tools.mjs).
        // OJO: sendJson(res, status, obj, extra) — el tipo ya lo pone él. Pasar
        // aquí el content-type como 4º argumento lo metería en las cabeceras.
        sendJson(res, 200, conToolCall(respuestaOpenAI(partes, body.model), detectaForzada(body)), comunes);
        return;
      }

      /* ---- tier gratis de Zen ---- */
      const model = objetivo.zen;
      const quiereStream = Boolean(body.stream);
      let payload = { ...body, model };
      /* El tier gratis NO emite tool calls de forma nativa. Para las llamadas
         de `generateJson` (clasificador del modo auto, modelo rápido, etc.) el
         camino sin streaming usa `forzarComoJson` + `conToolCall`. Para el chat
         interactivo (streaming) el modelo MiniMax intenta llamar herramientas
         escribiendo sus tokens especiales como texto: `][minimax>[<tool_call>`.
         Eso llegaba al cliente como contenido de texto y Qwen Code nunca ejecutaba
         nada. La solución: bufferizar el SSE, parsear con `partesDelSse` +
         `extraerToolCallsDeTexto` y re-emitir SSE limpio con `delta.tool_calls`
         reales que el motor sí sabe ejecutar. */
      let forzado = null;
      if (!quiereStream) ({ body: payload, forzado } = forzarComoJson(payload));
      delete payload.stream;

      const upstream = await zen("/chat/completions", payload);
      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: { message: await errorText(upstream), type: "upstream_error" } });
        return;
      }
      if (quiereStream) {
        // Bufferizar el SSE para poder detectar y convertir tool calls en texto
        const sseText = await upstream.text();
        const partes = partesDelSse(sseText);

        // Si el stream ya trajo tool_calls reales úsalos; si no, busca en el texto
        const { toolCalls: tcTexto, contentLimpio } = extraerToolCallsDeTexto(partes.content);
        const toolCallsFinales = partes.toolCalls.length ? partes.toolCalls : tcTexto;
        const contenidoFinal  = partes.toolCalls.length ? partes.content   : contentLimpio;

        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          ...corsHeaders(),
        });

        const chatId = partes.id || ocId("chatcmpl_");
        const ts     = Math.floor(Date.now() / 1000);
        const sse    = (delta, finish_reason = null) => {
          const obj = {
            id: chatId, object: "chat.completion.chunk", created: ts, model,
            choices: [{ index: 0, delta, ...(finish_reason ? { finish_reason } : {}) }],
          };
          res.write(`data: ${JSON.stringify(obj)}\n\n`);
        };

        if (toolCallsFinales.length) {
          // Cabecera del mensaje con tool calls
          sse({ role: "assistant", content: null });
          for (let i = 0; i < toolCallsFinales.length; i++) {
            const tc = toolCallsFinales[i];
            // Primer chunk: id + nombre
            sse({ tool_calls: [{ index: i, id: tc.id, type: "function", function: { name: tc.function.name, arguments: "" } }] });
            // Segundo chunk: argumentos
            sse({ tool_calls: [{ index: i, function: { arguments: tc.function.arguments } }] });
          }
          sse({}, "tool_calls");
        } else {
          // Respuesta de texto normal: emitir en trozos para dar sensación de stream
          sse({ role: "assistant", content: "" });
          // Partir por palabras para que el cursor siga avanzando
          const trozos = (contenidoFinal || "").match(/.{1,80}/gs) || [];
          for (const t of trozos) sse({ content: t });
          sse({}, partes.finish || "stop");
        }

        if (partes.usage) {
          res.write(`data: ${JSON.stringify({ id: chatId, object: "chat.completion.chunk", created: ts, model, choices: [], usage: partes.usage })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      sendJson(res, 200, conToolCall(aFormatoOpenAI(await upstream.text(), model), forzado));
      return;
    }

    /* ========== API de Anthropic (/v1/messages) para Claude Code ========== */

    if (url.pathname === "/v1/messages/count_tokens" && req.method === "POST") {
      if (!autorizado(req)) {
        sendJson(res, 401, errorAnthropic("clave inválida: manda x-api-key o Authorization: Bearer <tu CHAT_API_KEY>", "authentication_error"));
        return;
      }
      const body = await readBody(req);
      // Estimación a ojo (4 chars ≈ 1 token). Claude Code solo la usa para decidir
      // cuándo compactar, así que no hace falta clavar los números.
      sendJson(res, 200, { input_tokens: Math.max(1, Math.round(JSON.stringify(body ?? {}).length / 4)) });
      return;
    }

    if (url.pathname === "/v1/messages" && req.method === "POST") {
      if (!autorizado(req)) {
        sendJson(res, 401, errorAnthropic("clave inválida: manda x-api-key o Authorization: Bearer <tu CHAT_API_KEY>", "authentication_error"));
        return;
      }
      const body = await readBody(req);
      if (!Array.isArray(body?.messages) || !body.messages.length) {
        sendJson(res, 400, errorAnthropic("faltan los messages"));
        return;
      }

      const pedido = String(body.model ?? "");
      const names = mapearTools(body.tools || []);
      const conHerramientas = names.tools.length > 0;

      // Igual que en /v1/chat/completions: Zen gratis o "proveedor/modelo".
      // Con aliasClaude los nombres `claude-*` se siguen mapeando a un gratis.
      const objetivo = await enrutar(pedido, { aliasClaude: true });
      if (objetivo.error) {
        sendJson(res, 404, errorAnthropic(`${objetivo.error}. Zen gratis: ${MODEL_IDS.join(", ")} · de proveedores: "proveedor/modelo"`, "not_found_error"));
        return;
      }

      if (objetivo.target) {
        const quiereStreamProv = body.stream === true;
        const r = await llamarProveedor(objetivo.target, aOpenAI(body, names), quiereStreamProv);
        if (r.error) {
          sendJson(res, r.status, errorAnthropic(r.error, "api_error"));
          return;
        }
        const comunes = { "x-opencode-model": objetivo.target.modelID, "x-opencode-provider": objetivo.target.providerID };
        if (quiereStreamProv) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            ...comunes,
            ...corsHeaders(),
          });
          const traductor = traductorSse({ model: pedido, vuelta: names.vuelta });
          try {
            for await (const j of r.proto.chunks(r.upstream)) for (const marco of traductor.push(j)) res.write(marco);
          } catch (err) {
            res.write(`event: error\ndata: ${JSON.stringify(errorAnthropic(String(err?.message || err), "api_error"))}\n\n`);
          }
          for (const marco of traductor.cerrar()) res.write(marco);
          res.end();
          return;
        }
        let partes;
        try {
          partes = r.proto.completo(await r.upstream.json());
        } catch (err) {
          sendJson(res, 502, errorAnthropic(`respuesta ilegible de "${objetivo.target.providerID}": ${err.message}`, "api_error"));
          return;
        }
        sendJson(res, 200, respuestaAnthropic({
          id: partes.id,
          choices: [{ message: { content: partes.content, tool_calls: partes.toolCalls }, finish_reason: partes.finish }],
          usage: partes.usage,
        }, pedido, names.vuelta), comunes);
        return;
      }

      const model = modeloParaClaude(pedido);

      const upstream = await zen("/chat/completions", {
        ...aOpenAI({ ...body, model }, names),
        // Con herramientas se deja que el modelo las use de verdad (Claude Code
        // las ejecuta); sin ellas, que conteste texto.
        tool_choice: conHerramientas ? "auto" : "none",
      });
      if (!upstream.ok) {
        sendJson(res, upstream.status, errorAnthropic(await errorText(upstream), "api_error"));
        return;
      }

      // En Anthropic el streaming es opt-in: solo si piden `stream: true`.
      if (body.stream === true) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "x-opencode-model": model,
          ...corsHeaders(),
        });
        const traductor = traductorSse({ model: pedido || model, vuelta: names.vuelta });
        // OJO: los trozos son Uint8Array, y `buf += trozo` los convertiría en
        // "100,97,116,97,58,…" (los bytes en decimal). Hay que decodificar.
        const dec = new TextDecoder();
        let buf = "";
        for await (const chunk of upstream.body) {
          buf += typeof chunk === "string" ? chunk : dec.decode(chunk, { stream: true });
          const lineas = buf.split("\n");
          buf = lineas.pop() ?? "";
          for (const linea of lineas) {
            const l = linea.trim();
            if (!l.startsWith("data:")) continue;
            const d = l.slice(5).trim();
            if (!d || d === "[DONE]") continue;
            let j;
            try { j = JSON.parse(d); } catch { continue; }
            for (const frame of traductor.push(j)) res.write(frame);
          }
        }
        for (const frame of traductor.cerrar()) res.write(frame);
        res.end();
        return;
      }

      const partes = partesDelSse(await upstream.text());
      sendJson(res, 200, respuestaAnthropic({
        id: partes.id,
        choices: [{ message: { content: partes.content, tool_calls: partes.toolCalls }, finish_reason: partes.finish }],
        usage: partes.usage,
      }, pedido || model, names.vuelta), { "x-opencode-model": model });
      return;
    }

    /* ========== chat local de esta carpeta ========== */

    if (url.pathname === "/api/status") {
      sendJson(res, 200, {
        hasKey: Boolean(KEY),
        upstream: UPSTREAM,
        apiKeyRequired: true,
        models: MODEL_IDS.length,
        // Proveedores de models.dev (solo si el catálogo ya está en caché).
        providers: await infoProveedores(),
        // Diagnóstico: desde dónde llega la petición y si se considera local.
        remote: req.socket.remoteAddress || null,
        trusted: esDelChat(req),
      });
      return;
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      if (!esDelChat(req) && !autorizado(req)) {
        sendJson(res, 403, { error: "esta ruta es solo para el chat local; usa /v1/chat/completions con tu clave" });
        return;
      }
      const body = await readBody(req);
      const model = resolveModel(body?.model);
      if (!model) {
        sendJson(res, 400, { error: "falta el modelo o no existe" });
        return;
      }
      const upstream = await zen("/chat/completions", { ...body, model });
      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: await errorText(upstream) });
        return;
      }
      await pipeSse(res, upstream);
      return;
    }

    if (url.pathname === "/api/probe" && req.method === "POST") {
      if (!esDelChat(req) && !autorizado(req)) {
        sendJson(res, 403, { error: "esta ruta es solo para el chat local" });
        return;
      }
      const { model } = await readBody(req);
      if (!model) {
        sendJson(res, 400, { error: "falta el modelo" });
        return;
      }
      const started = Date.now();
      let upstream;
      try {
        upstream = await zen("/chat/completions", { model, messages: [{ role: "user", content: "OK" }], max_tokens: 300 });
      } catch (err) {
        sendJson(res, 200, { model, ok: false, status: 0, ms: Date.now() - started, error: String(err.message || err) });
        return;
      }
      const ms = Date.now() - started;
      if (!upstream.ok) {
        sendJson(res, 200, { model, ok: false, status: upstream.status, ms, error: await errorText(upstream) });
        return;
      }
      const { content, reasoning } = partesDelSse(await upstream.text());
      sendJson(res, 200, { model, ok: true, status: 200, ms, text: (content || reasoning).slice(0, 140) });
      return;
    }

    /* ========== proveedores (portado de OpenCode) ========== */

    if (url.pathname === "/v1/providers" && req.method === "GET") {
      if (!autorizado(req)) {
        sendJson(res, 401, { error: { message: "clave inválida: manda Authorization: Bearer <tu CHAT_API_KEY> o x-api-key", type: "invalid_request_error" } });
        return;
      }
      const todos = url.searchParams.get("all") === "1";
      const conModelos = url.searchParams.get("models") === "1";
      try {
        const cat = await catalogo();
        const cfg = await configProveedores();
        const data = await listarProveedores({ todos, modelo: conModelos, cat, cfg });
        // `usables` son los que de verdad se pueden llamar (activos, con clave,
        // con URL y con protocolo). `visibles` es lo que va en `data`, que con
        // ?all=1 son los 225 aunque solo 2 sirvan.
        const usables = (await listarProveedores({ cat, cfg })).length;
        sendJson(res, 200, {
          object: "list",
          fuente: CATALOGO_URL,
          total: Object.keys(cat).length,
          usables,
          visibles: data.length,
          criterio: todos ? "todos (incluye los no conectados)" : "solo activos y conectados",
          data,
        });
      } catch (err) {
        sendJson(res, 502, { error: { message: err.message, type: "catalog_error" } });
      }
      return;
    }

    if (url.pathname === "/v1/providers/refresh" && req.method === "POST") {
      if (!autorizado(req)) {
        sendJson(res, 401, { error: { message: "clave inválida", type: "invalid_request_error" } });
        return;
      }
      try {
        const cat = await catalogo({ refresh: true });
        sendJson(res, 200, { ok: true, total: Object.keys(cat).length, fuente: CATALOGO_URL });
      } catch (err) {
        sendJson(res, 502, { error: { message: err.message, type: "catalog_error" } });
      }
      return;
    }

    const mProveedor = url.pathname.match(/^\/v1\/providers\/([^/]+?)(?:\/(enable|disable|key))?$/);
    if (mProveedor) {
      if (!autorizado(req)) {
        sendJson(res, 401, { error: { message: "clave inválida", type: "invalid_request_error" } });
        return;
      }
      const id = decodeURIComponent(mProveedor[1]);
      const accion = mProveedor[2];

      if (accion === "enable" || accion === "disable") {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: { message: "usa POST" } });
          return;
        }
        await ajustar(id, { enabled: accion === "enable" });
        sendJson(res, 200, { id, ...(await estadoDe(id)) });
        return;
      }

      if (accion === "key") {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: { message: "usa POST" } });
          return;
        }
        const cuerpo = await readBody(req);
        const clave = String(cuerpo?.apiKey ?? cuerpo?.api_key ?? "");
        await guardarClave(id, clave);
        if (clave) await ajustar(id, { enabled: true });
        sendJson(res, 200, { id, guardada: Boolean(clave), ...(await estadoDe(id)) });
        return;
      }

      if (req.method !== "GET") {
        sendJson(res, 405, { error: { message: "usa GET, o POST /enable, /disable, /key" } });
        return;
      }
      const cat = await catalogo();
      if (!cat[id]) {
        sendJson(res, 404, { error: { message: `no existe el proveedor "${id}"`, type: "invalid_request_error" } });
        return;
      }
      sendJson(res, 200, ficha(id, cat[id], await configProveedores(), { conModelos: true }));
      return;
    }

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/")) {
      sendJson(res, 404, { error: { message: "endpoint desconocido", type: "invalid_request_error" } });
      return;
    }

    /* ---------- estáticos ---------- */
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = join(ROOT, normalize(path));
    if (!file.startsWith(ROOT)) {
      send(res, 403, "forbidden", "text/plain; charset=utf-8");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      send(res, 404, "not found", "text/plain; charset=utf-8");
      return;
    }
    const data = await readFile(file);
    send(res, 200, data, TYPES[extname(file)] || "application/octet-stream");
  } catch (err) {
    const msg = err?.message === "JSON inválido" || err?.message === "body demasiado grande" ? err.message : "not found";
    sendJson(res, msg === "not found" ? 404 : 400, { error: { message: msg } });
  }
}).listen(PORT, HOST, () => {
  console.log(`OpenCode Chat + API en http://${HOST}:${PORT}`);
  console.log(KEY ? `  key de Zen: ${KEY.slice(0, 8)}…` : "  key de Zen: ninguna (tier anónimo, Bearer public)");
  console.log(`  tu clave del gateway (/v1/* + x-api-key): ${GATEWAY_KEY}`);
  console.log("  Claude Code → ANTHROPIC_BASE_URL=http://" + HOST + ":" + PORT + " y ANTHROPIC_AUTH_TOKEN=<tu clave>");
  console.log(`  proveedores (models.dev): GET /v1/providers · rutea como "proveedor/modelo"${process.env.MODELS_OFFLINE === "1" ? " · MODELS_OFFLINE" : ""}`);
  console.log(`  CORS: ${CORS}${API_ONLY ? " · API_ONLY: el chat /api/* está cerrado, solo /v1 con clave" : TRUST_PROXY ? " · TRUST_PROXY activo (acepta las rutas del chat reenviadas por el proxy del entorno)" : ""}`);
});
