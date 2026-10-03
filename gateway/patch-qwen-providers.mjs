#!/usr/bin/env node
/**
 * Añade los proveedores de models.dev (los mismos que usa OpenCode) a la lista
 * nativa de `/auth` de Qwen Code.
 *
 * Qwen trae ~12 proveedores "Third-party" hardcodeados. Esto parchea el array
 * `ALL_PROVIDERS` del chunk instalado para inyectar el resto del catálogo, de
 * forma que `/auth` → Third-party Providers muestre todos, con su baseUrl y su
 * variable de entorno (envKey) para pegar la API key.
 *
 *     node opencode-chat/patch-qwen-providers.mjs
 *
 * Es idempotente y re-aplicable: tras `qwen update` (que reemplaza los chunks)
 * hay que volver a lanzarlo. El catálogo se lee de models.dev a través de los
 * módulos del gateway (misma caché que el servidor).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const AQUI = dirname(fileURLToPath(import.meta.url));
process.env.OPENCODE_CHAT_DIR ||= AQUI;
if (!process.env.OPENCODE_API_KEY) {
  try {
    const k = readFileSync(join(AQUI, ".zen-key"), "utf8").trim();
    if (k) process.env.OPENCODE_API_KEY = k;
  } catch { /* tier anónimo */ }
}

const { catalogo, config, baseURL, protocoloDe, NO_SOPORTADOS, esModeloGratis } = await import("./providers.mjs");

/* ---------- paquete de Qwen ---------- */
function paqueteQwen() {
  if (process.env.QWEN_PKG) return process.env.QWEN_PKG;
  const bases = [];
  try { bases.push(execSync("npm root -g", { encoding: "utf8" }).trim()); } catch { /* sin npm */ }
  bases.push(
    join(process.env.HOME || "", ".global_modules/lib/node_modules"),
    join(process.env.HOME || "", ".npm-global/lib/node_modules"),
    "/usr/lib/node_modules",
  );
  for (const b of bases) {
    const p = join(b, "@qwen-code/qwen-code");
    if (existsSync(join(p, "package.json"))) return p;
  }
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa QWEN_PKG=/ruta/al/paquete");
}

/* ---------- catálogo → entradas de proveedor ---------- */
const cat = await catalogo();
const cfg = await config();

const MARCA = "models.dev · ";
const entradas = [];
for (const [id, prov] of Object.entries(cat)) {
  if (NO_SOPORTADOS[id]) continue;
  // Qwen revienta si un id lleva punto u otro carácter raro (p. ej. "wafer.ai").
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) continue;
  const env = Array.isArray(prov.env) ? prov.env[0] : prov.env;
  if (typeof env !== "string" || !env || env.includes("${")) continue;
  const url = baseURL(id, prov, cfg);
  if (typeof url !== "string" || !/^https?:/.test(url) || url.includes("${")) continue;
  const crudo = protocoloDe(prov);
  const protocol = crudo === "google" ? "gemini" : crudo;
  if (!["openai", "anthropic", "gemini"].includes(protocol)) continue;
  // OJO con la versión en la URL: Qwen añade la suya a los proveedores gemini
  // (`{base}/v1beta/models/{m}:generateContent`), así que la baseUrl NO puede
  // llevarla. models.dev la trae puesta (`…/v1beta`) y con las dos la petición
  // sale a `/v1beta/v1beta/…`, donde Google responde 404 con un HTML que el CLI
  // no sabe leer →«message:""». Se quita aquí.
  const base = protocol === "gemini" ? url.replace(/\/(v1beta\d*|v1alpha\d*|v1)\/?$/, "") : url;
  if (protocol === "gemini" && base !== url) {
    console.log(`  · ${id}: baseUrl sin la versión (${base})`);
  }
  if (!/^https?:\/\/./.test(base)) continue;
  const label = prov.name || id;
  entradas.push({
    id,
    label,
    description: `${MARCA}${id}`,
    protocol,
    baseUrl: base,
    envKey: env,
    // Modelos de referencia: ordenados con los gratis primero (glm-4.7-flash, glm-4.5-flash, etc.).
    // Al conectar, los que soportan discovery los refrescan del propio endpoint ({baseUrl}/models);
    // si falla, se quedan estos.
    models: (() => {
      const keys = Object.keys(prov.models || {});
      keys.sort((a, b) => {
        const ga = esModeloGratis(id, a, prov.models?.[a]) ? 1 : 0;
        const gb = esModeloGratis(id, b, prov.models?.[b]) ? 1 : 0;
        return gb - ga;
      });
      return keys.slice(0, 10).map((m) => ({ id: m }));
    })(),
    modelsEditable: true,
    // Descubrir en vivo solo con protocolo openai: `discoverProviderModels`
    // manda `Authorization: Bearer`, que es lo que esperan estos endpoints.
    // Anthropic (x-api-key) y Gemini (?key=) no lo entienden: se quedan con la
    // lista estática.
    supportsModelDiscovery: protocol === "openai",
    modelNamePrefix: label,
    uiGroup: "third-party",
  });
}

/* ---------- inyectar ---------- */
const ficheros = [];
for (const dir of ["chunks", "bundled"]) {
  const d = join(paqueteQwen(), dir);
  if (!existsSync(d)) continue;
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isFile() && p.endsWith(".js")) ficheros.push(p);
  }
}

const literal = (e) =>
  "{" +
  `id:${JSON.stringify(e.id)},label:${JSON.stringify(e.label)},description:${JSON.stringify(e.description)},` +
  `protocol:${JSON.stringify(e.protocol)},baseUrl:${JSON.stringify(e.baseUrl)},envKey:${JSON.stringify(e.envKey)},` +
  `models:${JSON.stringify(e.models)},modelsEditable:true,` +
  (e.supportsModelDiscovery ? "supportsModelDiscovery:true," : "") +
  `modelNamePrefix:${JSON.stringify(e.modelNamePrefix)},` +
  `uiGroup:"third-party",ownsModel:__name(m=>m.envKey===${JSON.stringify(e.envKey)},"ownsModel")}`;

let hecho = false;
for (const f of ficheros) {
  let s = readFileSync(f, "utf8");
  if (!s.includes("var ALL_PROVIDERS=[")) continue;

  // Actualizar zaiProvider nativo con los modelos gratis (glm-4.7-flash, glm-4.5-flash) primero
  const zaiViejo = 'models:[{id:"GLM-5.2",contextWindowSize:1e6,enableThinking:true},{id:"GLM-5.1",contextWindowSize:204800,enableThinking:true},{id:"GLM-5",contextWindowSize:204800},{id:"GLM-5-Turbo",contextWindowSize:204800}]';
  const zaiNuevo = 'models:[{id:"glm-4.7-flash",contextWindowSize:128000,enableThinking:true},{id:"glm-4.5-flash",contextWindowSize:128000,enableThinking:true},{id:"glm-4.6v-flash",contextWindowSize:128000},{id:"GLM-5.3",contextWindowSize:204800,enableThinking:true},{id:"GLM-5.2",contextWindowSize:1e6,enableThinking:true},{id:"GLM-5.1",contextWindowSize:204800,enableThinking:true},{id:"GLM-5",contextWindowSize:204800},{id:"GLM-5-Turbo",contextWindowSize:204800}]';
  if (s.includes(zaiViejo)) {
    s = s.replace(zaiViejo, zaiNuevo);
    console.log(`• zaiProvider nativo: modelos gratis (glm-4.7-flash, glm-4.5-flash) inyectados (${f})`);
  }

  const yaEstaba = s.includes(MARCA);
  if (!yaEstaba && !s.includes("customProvider];")) continue;

  // Nuestra lista se inyecta SIEMPRE al final del array, justo después de
  // `customProvider`, así que se puede refrescar entera sin tocar lo de Qwen.
  const corte = s.indexOf("customProvider,");
  const fin = yaEstaba ? s.indexOf("];", corte) : s.indexOf("customProvider];") + "customProvider".length;
  const previo = yaEstaba ? s.slice(0, corte) : s;

  // Ids que ya trae Qwen (no los duplicamos).
  const m = s.match(/var ALL_PROVIDERS=\[([^\]]*)\]/);
  const existentes = m ? new Set([...m[1].matchAll(/([A-Za-z0-9_$]+)Provider/g)].map((x) => x[1])) : new Set();
  const nuevas = entradas.filter((e) => !existentes.has(e.id) && !previo.includes(`id:"${e.id}"`));
  const inyectar = nuevas.map(literal).join(",");

  s = yaEstaba
    ? s.slice(0, corte) + "customProvider," + inyectar + s.slice(fin)
    : s.replace("customProvider];", `customProvider,${inyectar}];`);
  writeFileSync(f, s);
  console.log(
    yaEstaba
      ? `• ${nuevas.length} proveedores de models.dev actualizados (${f})`
      : `• ${nuevas.length} proveedores de models.dev inyectados (${f})`,
  );
  hecho = true;
  break;
}

if (hecho) {
  console.log("\n✅ Abre `qwen -i`, pulsa /connect (o /provider): el catálogo completo está ahí.");
  console.log("   Tras `qwen update`, vuelve a lanzar este script.");
} else {
  console.log("\n⚠️  No se pudo aplicar. Revisa la versión de Qwen Code.");
  process.exitCode = 1;
}
process.exit(0);
