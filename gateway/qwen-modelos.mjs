#!/usr/bin/env node
/**
 * `/modelos` para Qwen Code: el catálogo del gateway, ordenado y agrupado por
 * proveedor, con el estado de conexión de cada uno — el equivalente de lo que
 * OpenCode muestra en su lista de modelos.
 *
 *   node qwen-modelos.mjs                 # todo, Zen gratis primero y luego los conectados
 *   node qwen-modelos.mjs grok            # solo lo que case con "grok" (buscador)
 *   node qwen-modelos.mjs --count         # solo los totales
 *   node qwen-modelos.mjs sync            # regenera ~/.qwen/settings.json
 *
 * Habla con los módulos directamente: funciona aunque el servidor no esté arriba.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
process.env.OPENCODE_CHAT_DIR ||= HERE;
if (!process.env.OPENCODE_API_KEY) {
  try {
    const k = readFileSync(join(HERE, ".zen-key"), "utf8").trim();
    if (k) process.env.OPENCODE_API_KEY = k;
  } catch { /* tier anónimo */ }
}

const { catalogo, config, listar } = await import("./providers.mjs");
const { MODELS } = await import("./models.mjs");

const negrita = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amari = (s) => `\x1b[33m${s}\x1b[0m`;

const args = process.argv.slice(2);
const soloCuenta = args.includes("--count");
const filtro = args.find((a) => a !== "--count" && a !== "sync") || "";

/* El comando `sync` delega en el generador de ajustes. */
if (args.includes("sync")) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [join(HERE, "sync-qwen-models.mjs"), "--repo"], { stdio: "inherit" });
  process.exit(r.status ?? 0);
}

const cat = await catalogo();
const cfg = await config();
const todos = await listar({ todos: true, modelo: true, cat, cfg });
const usables = todos.filter((p) => p.usable);

const casa = (txt) => !filtro || String(txt).toLowerCase().includes(filtro.toLowerCase());

/* --- Zen gratis primero (el orden curado, que es el que esperas ver) --- */
const zen = MODELS.filter((m) => casa(m.id) || casa(m.title));
let total = 0;

if (!soloCuenta) {
  if (zen.length) {
    console.log(negrita(`Zen gratis  ${dim("(gratis, sin cuenta)")}`));
    for (const m of zen) {
      const marca = m.tone === "ok" ? verde("●") : m.tone === "warn" ? amari("○") : amari("○");
      console.log(`  ${marca} ${m.id.padEnd(34)} ${dim(m.note)}`);
    }
  }
}

/* --- proveedores conectados, cada uno con sus modelos --- */
for (const p of usables) {
  const modelos = (p.models || []).filter((m) => casa(m.id) || casa(p.id) || casa(p.name));
  if (!modelos.length) continue;
  total += modelos.length;
  if (soloCuenta) continue;
  console.log("\n" + negrita(`${p.name || p.id}  ${dim("(conectado · " + p.protocolo + ")")}`));
  for (const m of modelos) {
    const ctx = m.limit?.context ? `${Math.round(m.limit.context / 1000)}k` : "";
    const flags = [m.tool_call ? "tools" : "", m.reasoning ? "razona" : "", m.attachment ? "imágenes" : ""].filter(Boolean).join(",");
    console.log(`  ${dim("•")} ${m.id.padEnd(34)} ${dim(`${ctx.padStart(6)}  ${flags}`)}`);
  }
}

const nZen = zen.length;
total += nZen;
if (soloCuenta) {
  console.log(`${nZen} gratis de Zen · ${total} en total (${usables.length} proveedores conectados)`);
} else {
  console.log(
    "\n" +
      negrita(`${nZen} gratis de Zen + ${total - nZen} de ${usables.length} proveedores conectados = ${total} modelos`) +
      (filtro ? dim(`  (filtro: "${filtro}")`) : ""),
  );
  console.log(dim("Cámbialo con /model y escribe para filtrar (el buscador que parcheamos)."));
}

// Sin esto, el keep-alive de fetch puede dejar el proceso colgado al llamarlo
// desde un comando de Qwen.
process.exit(0);
