#!/usr/bin/env node
/**
 * Ajusta la lista de modelos de Qwen Code para el gateway de opencode-chat.
 *
 * Qwen Code NO lee models.dev: su `/model` es una lista estática de
 * `~/.qwen/settings.json`. Esto la rellena con lo que el gateway tenga usable
 * —los gratis de Zen y los proveedores conectados— etiquetando cada modelo con
 * su proveedor, como la lista de OpenCode. Los proveedores que añadas con
 * `/auth` los gestiona Qwen él mismo y **no se tocan**: aquí se fusiona, nunca
 * se borra lo que ya hubiera.
 *
 *     node opencode-chat/sync-qwen-models.mjs           # Zen + los proveedores conectados (como OpenCode)
 *     node opencode-chat/sync-qwen-models.mjs --zen     # solo los gratis de Zen
 *     OPENCODE_ZEN_PLAN=1 node opencode-chat/sync-qwen-models.mjs   # + el catálogo de pago de Zen
 *     node opencode-chat/sync-qwen-models.mjs --print   # ver el resultado sin escribir
 *     node opencode-chat/sync-qwen-models.mjs --repo    # copia también a qwen-settings.json
 *
 * Cada modelo se etiqueta como en OpenCode: «Modelo · Proveedor». Por defecto
 * entran los gratis de Zen y los modelos de los proveedores conectados al
 * gateway (`/v1/models` solo devuelve los que tienen clave), no los 225 del
 * catálogo: para conectar uno se usa /connect dentro del CLI.
 *
 * Para CONECTAR proveedores nuevos (poner API key, elegir modelos) usa
 * `/connect` (o `/provider`) dentro del CLI: abre el catálogo con buscador.
 *
 * Variables: OPENCODE_GATEWAY_URL (por defecto http://127.0.0.1:8096/v1),
 *            OPENCODE_GATEWAY_KEY (si no, se lee opencode-chat/.api-key).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || "";
// QWEN_HOME/QWEN_SETTINGS permiten apuntar la config a otro sitio (jpcode usa ~/.jpcode).
const QWEN_BASE = process.env.QWEN_HOME || join(HOME, ".qwen");
const BASE = (process.env.OPENCODE_GATEWAY_URL || "http://127.0.0.1:8096/v1").replace(/\/+$/, "");
const ENVKEY = process.env.OPENCODE_GATEWAY_ENVKEY || "OPENCODE_GATEWAY_KEY";
// Clave propia (no `openai`) para no chocar con el OpenAI de verdad que alguien
// conecte por /auth. Se mapea a protocolo openai con providerProtocol.
const CLAVE = "opencode-zen";

function claveGateway() {
  if (process.env.OPENCODE_GATEWAY_KEY) return process.env.OPENCODE_GATEWAY_KEY;
  if (process.env.CHAT_API_KEY) return process.env.CHAT_API_KEY;
  const f = join(AQUI, ".api-key");
  if (existsSync(f)) return readFileSync(f, "utf8").trim();
  return "";
}

const KEY = claveGateway();
const cabeceras = KEY ? { Authorization: `Bearer ${KEY}` } : {};

async function get(ruta) {
  const r = await fetch(`${BASE}${ruta}`, { headers: cabeceras });
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
  return r.json();
}

// `--all` era «incluye los conectados»; ahora es lo de serie, así que se acepta
// como alias para no romper a quien lo llamaba. `--zen` recupera el modo antiguo.
const soloZen = process.argv.includes("--zen");

// El catálogo propio de OpenCode Zen (`opencode`, `opencode-go`) cuelga de la
// misma clave de Zen que el tier gratis: sin plan de pago sus 100+ modelos (Sol,
// Opus…) no responden y solo estorban en la lista. Por defecto quedan fuera;
// con OPENCODE_ZEN_PLAN=1 (o --zen-plan) entran.
const ZEN_PLAN = new Set(["opencode", "opencode-go"]);
const conZenPlan = process.argv.includes("--zen-plan") || process.env.OPENCODE_ZEN_PLAN === "1";

/* ---------- catálogo ---------- */
// `/v1/models` = los gratis de Zen + los modelos de los proveedores conectados
// (sin `?all=1` el gateway no devuelve los 225 del catálogo, solo los usables).
const lista = (await get("/models")).data;
let nombres = {};
try {
  const provs = await get("/providers?all=1");
  for (const p of provs.data || []) nombres[p.id] = p.name || p.id;
} catch {
  /* sin catálogo: ids en crudo */
}
nombres = { ...nombres, __zen: "OpenCode Zen" };

// Ids tal cual los pide la API (los de proveedor llevan "proveedor/modelo").
const ids = lista.map((m) => String(m.id));

const ORDEN = ["__zen", "opencode", "opencode-go"];
const grupos = new Map();
for (const m of lista) {
  const id = String(m.id);
  const prov = m.x_opencode_provider || "__zen";
  // Etiqueta como en OpenCode: «Modelo · Proveedor» (el nombre corto del modelo
  // primero y el proveedor detrás, para que se lea en la lista del /model).
  const corto = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  const titulo = m.x_opencode_title || m.name || corto;
  if (prov !== "__zen" && soloZen) continue;
  if (ZEN_PLAN.has(prov) && !conZenPlan) continue;
  if (!grupos.has(prov)) grupos.set(prov, []);
  grupos.get(prov).push({ id, titulo, protocolo: m.x_opencode_protocol || "openai" });
}
const ordenados = [...grupos.keys()].sort((a, b) => {
  const ia = ORDEN.indexOf(a), ib = ORDEN.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b);
});

/* ---------- entradas ---------- */
const entrada = [];
for (const prov of ordenados) {
  const etiqueta = nombres[prov] || prov;
  for (const { id, titulo, protocolo } of grupos.get(prov)) {
    entrada.push({
      id,
      name: `${titulo} · ${etiqueta}`,
      description: prov === "__zen" ? "Gratis, sin cuenta" : `Conectado en el gateway (${protocolo})`,
      baseUrl: BASE,
      envKey: ENVKEY,
    });
  }
}

/* ---------- fusionar (sin borrar lo que añadiste con /auth) ---------- */
const destino = process.env.QWEN_SETTINGS || join(QWEN_BASE, "settings.json");
let actual = {};
try {
  actual = JSON.parse(readFileSync(destino, "utf8"));
} catch {
  /* sin ajustes previos */
}
const otros = { ...(actual.modelProviders || {}) };
delete otros[CLAVE]; // refrescamos solo el nuestro
// Y quitamos restos de versiones anteriores del propio script (un grupo entero
// que apunta a nuestro gateway), para no dejar duplicados. Lo que venga de
// /auth apunta a otros sitios y se conserva intacto.
const esNuestro = (lista) =>
  Array.isArray(lista) && lista.length > 0 &&
  lista.every((m) => m && (m.envKey === ENVKEY || /^http:\/\/(127\.0\.0\.1|localhost):\d+\/v1\/?$/.test(m.baseUrl || "")));
for (const k of Object.keys(otros)) if (esNuestro(otros[k])) delete otros[k];

// Quitamos `Bash(node *)` de las reglas automáticas: el motor en Auto Mode saca un
// aviso gigante advirtiendo que deshabilita esa regla. Sin ella el auto mode no imprime ningún cartel.
const allow = (actual.permissions?.allow || []).filter((r) => r !== "Bash(node *)");

const ajustes = {
  ...actual,
  security: actual.security || { auth: { selectedType: "openai" } },
  model: actual.model || { name: ids.includes("big-pickle") ? "big-pickle" : ids[0] },
  tools: { approvalMode: "default", ...(actual.tools || {}) },
  permissions: { ...(actual.permissions || {}), allow },
  modelProviders: { [CLAVE]: entrada, ...otros },
  providerProtocol: { ...(actual.providerProtocol || {}), [CLAVE]: "openai" },
};

const json = JSON.stringify(ajustes, null, 2) + "\n";
const ajenos = Object.keys(otros).length;

if (process.argv.includes("--print")) {
  console.log(json);
} else {
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, json);
  console.log(`✅ ${entrada.length} modelos (${ordenados.length} proveedores) → ${destino}`);
  if (ajenos) console.log(`   (conservo ${ajenos} proveedor(es) que tenías de /auth)`);
  if (soloZen) console.log("   modo --zen: solo los gratis de Zen");
  if (process.argv.includes("--repo")) {
    writeFileSync(join(AQUI, "qwen-settings.json"), json);
    console.log(`✅ copia del repo → ${join(AQUI, "qwen-settings.json")}`);
  }
  console.log("   `/model` para cambiarlo · `/connect` (o `/provider`) para conectar más proveedores.");
}

// `fetch` deja viva la conexión keep-alive de undici: sin esto el proceso no
// termina solo (y bloquea a quien lo llame, como test.mjs).
process.exit(0);
