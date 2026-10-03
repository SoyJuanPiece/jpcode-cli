/**
 * Registro de proveedores, portado de OpenCode.
 *
 * OpenCode saca la lista de proveedores y modelos de **models.dev** y monta un
 * cliente por proveedor con el paquete npm `@ai-sdk/*` que toque. Aquí no se
 * cargan paquetes npm: se implementan los tres protocolos que cubren a casi
 * todos (`protocols.mjs`) y se elige según el `npm` que declare models.dev.
 *
 * Estado del catálogo (2026-09-30): 225 proveedores, 199 con URL base en el
 * propio catálogo, 184 hablando `@ai-sdk/openai-compatible`.
 *
 * Reglas que pedía el port:
 *   - un proveedor está **conectado** si tiene credencial (env → config → auth.json)
 *   - está **activo** si no se ha desactivado a mano
 *   - se **muestran sus modelos** solo si está activo Y conectado, salvo que se
 *     pida explícitamente lo contrario (`?all=1`)
 */

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ZEN_UA, ocId } from "./ids.mjs";

/* ================== rutas y ajustes ================== */

export const ROOT = process.env.OPENCODE_CHAT_DIR || process.cwd();
// Rutas configurables por entorno para que los tests sean herméticos (sin
// escribir en el repo) y para poder mover la caché a otro disco.
const CACHE_FILE = process.env.MODELS_CACHE_FILE || join(ROOT, ".cache", "models.json");
const ESTADO_FILE = process.env.PROVIDERS_FILE || join(ROOT, "providers.json");
const AUTH_FILE = process.env.PROVIDERS_AUTH_FILE || join(ROOT, "auth.json");

export const CATALOGO_URL = process.env.MODELS_URL || "https://models.dev/api.json";
const TTL_MS = Number(process.env.MODELS_TTL_MS || 6 * 60 * 60 * 1000); // 6 h

/**
 * URL base de los proveedores que models.dev no la trae. Son 26 de 225; el
 * resto viene con `api` en el catálogo (a veces con plantillas `${VAR}`).
 */
export const BASES_CONOCIDAS = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  cerebras: "https://api.cerebras.ai/v1",
  togetherai: "https://api.together.xyz/v1",
  deepinfra: "https://api.deepinfra.com/v1/openai",
  perplexity: "https://api.perplexity.ai",
  cohere: "https://api.cohere.ai/compatibility/v1",
  venice: "https://api.venice.ai/api/v1",
  v0: "https://api.v0.dev/v1",
  vercel: "https://ai-gateway.vercel.sh/v1",
  aihubmix: "https://aihubmix.com/v1",
  "cloudflare-ai-gateway": "https://gateway.ai.cloudflare.com/v1/${CLOUDFLARE_ACCOUNT_ID}/${CLOUDFLARE_GATEWAY_ID}",
};

/*
 * Los que ni models.dev ni la tabla de arriba resuelven (p. ej. `qvac`, que es
 * IA local y cada uno la levanta en su puerto) quedan con la URL vacía y el
 * motivo "no hay URL base conocida". Se arreglan poniéndosela en providers.json:
 *
 *   { "providers": { "qvac": { "enabled": true, "baseURL": "http://127.0.0.1:8080/v1" } } }
 */

/**
 * Proveedores cuyo protocolo no es ninguno de los tres: necesitan firma o
 * federación propia. Se listan con el motivo en vez de fingir que funcionan.
 */
export const NO_SOPORTADOS = {
  "amazon-bedrock": "necesita firma AWS SigV4",
  "google-vertex": "necesita credenciales de cuenta de servicio",
  "google-vertex-anthropic": "necesita credenciales de cuenta de servicio",
  azure: "necesita el nombre del deployment y api-version",
  "azure-cognitive-services": "necesita el nombre del deployment y api-version",
  watsonx: "necesita token IAM de IBM",
  gitlab: "necesita OAuth propio de GitLab",
  "salad-cloud": "necesita su esquema de organización/proyecto",
  "sap-ai-core": "necesita OAuth de SAP",
};

export const SIN_URL_BASE = "no hay URL base conocida para este proveedor (ponle `baseURL` en providers.json)";

/**
 * Cabeceras que algunos proveedores exigen sí o sí. Los dos endpoints de Zen que
 * salen en el catálogo (`opencode` y `opencode-go`) rechazan la petición si no
 * ven la sesión, con este error literal:
 *
 *   Request is missing x-opencode-session and cannot be routed efficiently.
 *
 * Son las mismas que ya usa el camino del tier gratis en `server.mjs`.
 */
const CABECERAS_BASE = {
  opencode: () => ({
    "User-Agent": ZEN_UA,
    "x-opencode-session": ocId("ses_"),
    "x-opencode-request": ocId("msg_"),
  }),
  "opencode-go": () => ({
    "User-Agent": ZEN_UA,
    "x-opencode-session": ocId("ses_"),
    "x-opencode-request": ocId("msg_"),
  }),
};

/** Cabeceras por defecto de un proveedor (las del usuario tienen la última palabra). */
export function cabecerasBase(id) {
  return CABECERAS_BASE[id] ? CABECERAS_BASE[id]() : {};
}

/** npm → protocolo. Lo que no esté aquí habla OpenAI, que es lo correcto para
 *  `@ai-sdk/openai-compatible` y para los wrappers tipo `@openrouter/ai-sdk-provider`. */
const PROTO_POR_NPM = {
  "@ai-sdk/anthropic": "anthropic",
  "@ai-sdk/google": "google",
  "@ai-sdk/google-vertex": "google",
  "@ai-sdk/google-vertex/anthropic": "anthropic",
};

export function protocoloDe(prov) {
  return PROTO_POR_NPM[prov?.npm] || "openai";
}

/* ================== utilidades ================== */

/** Sustituye `${VAR}` por variables de entorno o de la config. Deja el hueco si no hay valor. */
export function plantilla(texto, vars = {}) {
  return String(texto ?? "").replace(/\$\{([A-Z0-9_]+)\}/gi, (m, nombre) => {
    const v = vars[nombre] ?? process.env[nombre];
    return v === undefined ? m : String(v);
  });
}

/** JSON con comentarios (opencode.jsonc): se los quita antes de parsear. */
function jsonc(texto) {
  const sinBloques = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(sinBloques.replace(/(^|[^:"'\\])\/\/.*$/gm, "$1"));
}

async function leerJson(ruta, conComentarios = false) {
  try {
    const texto = await readFile(ruta, "utf8");
    return conComentarios ? jsonc(texto) : JSON.parse(texto);
  } catch {
    return null;
  }
}

async function escribirJson(ruta, obj) {
  await mkdir(dirname(ruta), { recursive: true });
  const tmp = `${ruta}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(obj, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, ruta);
}

/* ================== catálogo de models.dev ================== */

let memoria = null;

/**
 * Devuelve `Record<providerId, Provider>` de models.dev. Usa la caché en disco
 * salvo que esté caducada o se fuerce con `refresh`.
 */
export async function catalogo({ refresh = false, soloCache = false } = {}) {
  if (memoria && !refresh) return memoria;

  if (!refresh && existsSync(CACHE_FILE)) {
    try {
      const info = JSON.parse(await readFile(CACHE_FILE, "utf8"));
      if (Date.now() - info.ts < TTL_MS && info.data) {
        memoria = info.data;
        return memoria;
      }
    } catch {
      /* caché corrupta: se vuelve a bajar */
    }
  }

  // `soloCache` lo usa /v1/models: listar no debe disparar una descarga de 5 MB.
  if (soloCache || process.env.MODELS_OFFLINE === "1") {
    const viejo = await leerJson(CACHE_FILE);
    memoria = viejo?.data || memoria || {};
    return memoria;
  }

  try {
    const res = await fetch(CATALOGO_URL, {
      headers: { "User-Agent": process.env.MODELS_UA || "opencode-chat/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`models.dev devolvió ${res.status}`);
    const data = await res.json();
    memoria = data;
    await escribirJson(CACHE_FILE, { ts: Date.now(), url: CATALOGO_URL, data });
    return memoria;
  } catch (err) {
    // Sin red: se tira de lo que haya en disco, aunque esté caducado.
    const viejo = await leerJson(CACHE_FILE);
    if (viejo?.data) {
      memoria = viejo.data;
      return memoria;
    }
    if (soloCache) return (memoria = {});
    throw new Error(`no se pudo cargar el catálogo de models.dev (${err.message})`);
  }
}

/** Solo para tests: inyecta un catálogo sin tocar la red ni el disco. */
export function _fijarCatalogo(data) {
  memoria = data;
}

export function _rutaEstado() {
  return ESTADO_FILE;
}

/* ================== configuración y credenciales ================== */

/**
 * Junta la config de proveedores de todas las fuentes que pedía el port:
 *   1. `opencode.json` / `opencode.jsonc` del proyecto
 *   2. `~/.config/opencode/opencode.json`
 *   3. `providers.json` propio (tiene la última palabra y es donde se guarda el estado)
 * Acepta tanto `provider` (formato v1 de OpenCode) como `providers` (v2).
 */
export async function config() {
  const fuentes = [
    join(ROOT, "opencode.json"),
    join(ROOT, "opencode.jsonc"),
    join(homedir(), ".config", "opencode", "opencode.json"),
  ];

  const provs = {};
  for (const ruta of fuentes) {
    const j = await leerJson(ruta, ruta.endsWith(".jsonc"));
    const trozo = j?.providers || j?.provider; // v2 y v1
    if (trozo && typeof trozo === "object") Object.assign(provs, trozo);
  }

  const propio = (await leerJson(ESTADO_FILE)) || {};
  const auth = (await leerJson(AUTH_FILE)) || {};
  if (propio.providers) Object.assign(provs, propio.providers);

  return { providers: provs, auth, propio };
}

/** Credencial de un proveedor: variables de entorno → auth.json → config. */
export function credencial(id, prov, cfg) {
  for (const nombre of prov?.env || []) {
    const v = process.env[nombre];
    if (v) return { key: v, source: `env:${nombre}` };
  }
  if (cfg?.auth?.[id] && typeof cfg.auth[id] === "string") return { key: cfg.auth[id], source: "auth.json" };
  const propio = cfg?.providers?.[id];
  if (propio?.apiKey) return { key: plantilla(propio.apiKey, cfg.providers), source: "providers.json" };
  if (propio?.api_key) return { key: plantilla(propio.api_key, cfg.providers), source: "providers.json" };
  return null;
}

/** URL base: config del usuario → `api` del catálogo → tabla conocida. */
export function baseURL(id, prov, cfg) {
  const deConfig = cfg?.providers?.[id]?.baseURL || cfg?.providers?.[id]?.api;
  const cruda = deConfig || prov?.api || BASES_CONOCIDAS[id] || "";
  return plantilla(cruda, cfg?.providers);
}

/** Ficha de un proveedor con su estado. */
export function ficha(id, prov, cfg, { conModelos = false } = {}) {
  const cfgProv = cfg.providers?.[id] || {};
  const cred = credencial(id, prov, cfg);
  const sinSoporte = NO_SOPORTADOS[id] || null;
  const claveExenta = cfgProv.keyless === true;
  const conectado = Boolean(cred) || claveExenta;
  const activo = cfgProv.enabled !== false;
  const urlBase = baseURL(id, prov, cfg);
  // En la config puedes vetar modelos concretos: { models: { "x": { disabled: true } } }
  const vetados = new Set(
    Object.entries(cfgProv.models || {}).filter(([, m]) => m?.disabled).map(([k]) => k),
  );
  const modelos = Object.values(prov.models || {}).filter((m) => !m.disabled && !vetados.has(m.id));

  return {
    id,
    name: cfgProv.name || prov.name || id,
    npm: prov.npm || null,
    protocolo: protocoloDe(prov),
    baseURL: urlBase,
    activo,
    conectado,
    // "usable" = se le puede llamar de verdad: activo, con clave, con URL y
    // con un protocolo implementado. Es lo que filtra la lista por defecto.
    usable: activo && conectado && !sinSoporte && Boolean(urlBase),
    credencial: cred?.source || (claveExenta ? "keyless" : null),
    // Motivo por el que no puede usarse todavía (null si todo bien).
    motivo: sinSoporte
      ? sinSoporte
      : !conectado
        ? `falta la clave (${(prov.env || []).join(" o ") || "ninguna variable"})`
        : !urlBase
          ? SIN_URL_BASE
          : null,
    modelos: modelos.length,
    ...(conModelos ? { models: modelos.map((m) => modeloResumen(m)) } : {}),
  };
}

function modeloResumen(m) {
  return {
    id: m.id,
    name: m.name || m.id,
    family: m.family ?? null,
    tool_call: m.tool_call !== false,
    reasoning: Boolean(m.reasoning),
    attachment: Boolean(m.attachment),
    temperature: m.temperature !== false,
    limit: m.limit ? { context: m.limit.context, output: m.limit.output } : null,
    cost: m.cost ? { input: m.cost.input, output: m.cost.output } : null,
    status: m.status ?? null,
  };
}

/**
 * Lista de proveedores. Por defecto solo los usables (activos y conectados),
 * que es lo que pedía el port: nada de enseñar lo que no puedes llamar.
 */
export async function listar({ todos = false, modelo = false, cat = null, cfg = null } = {}) {
  const c = cat || (await catalogo());
  const conf = cfg || (await config());
  const fuera = [];
  for (const [id, prov] of Object.entries(c)) {
    const f = ficha(id, prov, conf, { conModelos: modelo });
    if (todos || f.usable) fuera.push(f);
  }
  fuera.sort((a, b) => b.modelos - a.modelos || a.id.localeCompare(b.id));
  return fuera;
}

/**
 * Identifica si un modelo de proveedor es gratuito (sin coste por token).
 * Los gratis de Zen lo son siempre. En Z.AI/Zhipu son glm-4.7-flash, glm-4.5-flash y glm-4.6v-flash.
 * En otros proveedores, si cost.input === 0 && cost.output === 0 (salvo en planes de suscripción).
 */
export function esModeloGratis(provId, modelId, modelObj) {
  const mid = String(modelId || "").toLowerCase();
  const pid = String(provId || "").toLowerCase();
  if (pid === "__zen" || mid.includes("-free") || mid.includes("free-") || mid.includes("/free")) return true;
  if (pid.includes("zai") || pid.includes("zhipu")) {
    if (mid === "glm-4.7-flash" || mid === "glm-4.5-flash" || mid === "glm-4.6v-flash") return true;
    if (mid.includes("4.7-flash") || mid.includes("4.5-flash") || mid.includes("4.6v-flash")) return true;
    return false;
  }
  if (modelObj?.cost && modelObj.cost.input === 0 && modelObj.cost.output === 0) {
    if (!pid.includes("plan")) return true;
  }
  return false;
}

/** Todos los modelos de los proveedores usables, en formato `/v1/models`. */
export async function modelos({ todos = false, cat = null, cfg = null } = {}) {
  const lista = await listar({ todos, modelo: true, cat, cfg });
  const salida = [];
  for (const p of lista) {
    const mods = [...(p.models || [])];
    mods.sort((a, b) => {
      const ga = esModeloGratis(p.id, a.id, a) ? 1 : 0;
      const gb = esModeloGratis(p.id, b.id, b) ? 1 : 0;
      return gb - ga;
    });
    for (const m of mods) {
      salida.push({
        id: `${p.id}/${m.id}`,
        object: "model",
        created: 0,
        owned_by: p.id,
        name: m.name,
        x_opencode_provider: p.id,
        x_opencode_protocol: p.protocolo,
        x_opencode_free: esModeloGratis(p.id, m.id, m),
        ...(m.limit ? { x_opencode_limit: m.limit } : {}),
      });
    }
  }
  return salida;
}

/* ================== activar / desactivar / claves ================== */

/** Cambia el estado de un proveedor en `providers.json` (lo crea si no existe). */
export async function ajustar(id, cambios) {
  const actual = (await leerJson(ESTADO_FILE)) || {};
  actual.providers = actual.providers || {};
  actual.providers[id] = { ...(actual.providers[id] || {}), ...cambios };
  if (cambios.apiKey === null) delete actual.providers[id].apiKey;
  await escribirJson(ESTADO_FILE, actual);
  return actual.providers[id];
}

export const activar = (id) => ajustar(id, { enabled: true });
export const desactivar = (id) => ajustar(id, { enabled: false });

/** Guarda una clave de proveedor en `auth.json` con permisos 600. */
export async function guardarClave(id, key) {
  const auth = (await leerJson(AUTH_FILE)) || {};
  if (key) auth[id] = key;
  else delete auth[id];
  await escribirJson(AUTH_FILE, auth);
  return Boolean(key);
}

/* ================== resolución de un modelo pedido ================== */

/**
 * `proveedor/modelo` (como `parseModel` de OpenCode: se parte por la PRIMERA
 * barra, porque los ids de modelo también llevan barras).
 */
export function parseModel(pedido) {
  const [providerID, ...resto] = String(pedido ?? "").split("/");
  return { providerID, modelID: resto.join("/") };
}

/**
 * Resuelve `proveedor/modelo` a todo lo necesario para llamar al upstream.
 * Devuelve `{ error }` con un mensaje claro cuando no se puede.
 */
export async function resolver(pedido, { cat = null, cfg = null } = {}) {
  const c = cat || (await catalogo());
  const conf = cfg || (await config());
  const { providerID, modelID } = parseModel(pedido);

  const prov = c[providerID];
  if (!prov) return { error: `no existe el proveedor "${providerID}"` };
  if (NO_SOPORTADOS[providerID]) return { error: `"${providerID}" no está soportado: ${NO_SOPORTADOS[providerID]}` };
  if (!modelID) return { error: `falta el modelo: usa "${providerID}/<modelo>"` };
  if (!prov.models?.[modelID]) return { error: `"${providerID}" no tiene el modelo "${modelID}"` };

  const cfgProv = conf.providers?.[providerID] || {};
  if (cfgProv.enabled === false) return { error: `el proveedor "${providerID}" está desactivado` };
  const cred = credencial(providerID, prov, conf);
  const claveExenta = cfgProv.keyless === true;
  if (!cred && !claveExenta) {
    return { error: `el proveedor "${providerID}" no está conectado: define ${(prov.env || []).join(" o ") || "una clave"}` };
  }

  const base = baseURL(providerID, prov, conf);
  if (!base) return { error: `no sé la URL base de "${providerID}"` };

  return {
    providerID,
    modelID,
    prov,
    protocolo: protocoloDe(prov),
    baseURL: base,
    apiKey: cred?.key || "",
    headers: { ...cabecerasBase(providerID), ...(conf.providers?.[providerID]?.headers || {}) },
  };
}

/** Modelo "pequeño" de un proveedor, para tareas de fondo (como getSmallModel de OpenCode). */
export async function modeloPequeno({ cat = null, cfg = null } = {}) {
  const lista = await listar({ modelo: true, cat, cfg });
  const prioridad = ["flash", "haiku", "mini", "nano", "small", "8b", "lite"];
  for (const prefijo of prioridad) {
    for (const p of lista) {
      const m = (p.models || []).find((x) => x.id.toLowerCase().includes(prefijo));
      if (m) return `${p.id}/${m.id}`;
    }
  }
  return null;
}
