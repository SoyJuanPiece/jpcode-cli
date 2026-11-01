/**
 * Prueba contra el tier público DE VERDAD. Nada de mocks.
 *
 * Levanta el gateway de verdad, le pide al modelo que use una herramienta y mira
 * qué sale por el socket. Es la prueba que faltaba: todas las anteriores usaban
 * un upstream simulado, así que no decían nada sobre si los modelos gratis
 * emiten tool_calls nativas o solo texto.
 *
 *   node gateway/probar-real.mjs                 # big-pickle
 *   node gateway/probar-real.mjs big-pickle      # otro modelo
 *   node gateway/probar-real.mjs todos           # los 7 que respondieron
 *
 * No necesita API key de Zen: usa el tier anónimo (Bearer public).
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUERTO = 8199;

/* La clave del gateway es solo para poder hablar con localhost. */
let CLAVE = process.env.OPENCODE_GATEWAY_KEY || "";
if (!CLAVE) { try { CLAVE = readFileSync(join(HERE, ".api-key"), "utf8").trim(); } catch {} }
if (!CLAVE) {
  console.error("No encuentro la clave del gateway. Pon OPENCODE_GATEWAY_KEY o gateway/.api-key");
  process.exit(1);
}

const gw = spawn(process.execPath, [join(HERE, "server.mjs"), String(PUERTO)], {
  env: { ...process.env, OPENCODE_GATEWAY_KEY: CLAVE },
  stdio: ["ignore", "ignore", "pipe"],
});
let errores = "";
gw.stderr.on("data", (d) => (errores += d));
process.on("exit", () => { try { gw.kill(); } catch {} });

for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PUERTO}/api/status`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const cuerpo = (model) => ({
  model,
  stream: true,
  messages: [{ role: "user", content: "Usa la herramienta glob para listar los ficheros del Escritorio" }],
  tool_choice: "auto",
  tools: [
    { type: "function", function: { name: "glob", description: "Busca ficheros por patron", parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } } },
    { type: "function", function: { name: "read_file", description: "Lee un fichero", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  ],
});

async function probar(modelo) {
  const r = await fetch(`http://127.0.0.1:${PUERTO}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLAVE}` },
    body: JSON.stringify(cuerpo(modelo)),
  });
  const bruto = await r.text();
  if (!r.ok) return { error: `HTTP ${r.status} — ${bruto.slice(0, 120)}` };

  let contenido = "";
  const llamadas = [];
  let finish = null;
  for (const linea of bruto.split("\n")) {
    if (!linea.startsWith("data:")) continue;
    const d = linea.slice(5).trim();
    if (!d || d === "[DONE]") continue;
    let j; try { j = JSON.parse(d); } catch { continue; }
    const c = j.choices?.[0];
    if (!c) continue;
    if (c.delta?.content) contenido += c.delta.content;
    for (const tc of c.delta?.tool_calls || []) {
      const k = tc.index ?? 0;
      llamadas[k] = llamadas[k] || { name: "", args: "" };
      if (tc.function?.name) llamadas[k].name = tc.function.name;
      if (tc.function?.arguments) llamadas[k].args += tc.function.arguments;
    }
    if (c.finish_reason) finish = c.finish_reason;
  }
  return { contenido, llamadas, finish };
}

const TODOS = [
  "big-pickle", "deepseek-v4.1-flash-free", "glm-5.3-flash-free",
  "mimo-v2.6-flash-free", "beam-free", "flint-40b-free",
  "nemotron-3.5-super-vl-free", "nemotron-3.5-lightning-free",
];
const args = process.argv.slice(2);
const objetivos = args.includes("todos") ? TODOS : args.length ? args : ["big-pickle"];

console.log(`\nProbando contra el tier público de verdad (${objetivos.join(", ")})\n`);

let native = 0;
for (const modelo of objetivos) {
  process.stdout.write(`… ${modelo}`);
  let r;
  try { r = await probar(modelo); } catch (e) { console.log(`\r✗ ${modelo.padEnd(28)} ${e.message}`); continue; }
  if (r.error) { console.log(`\r✗ ${modelo.padEnd(28)} ${r.error}`); continue; }

  const nombres = r.llamadas.map((c) => c.name);
  const hayXml = /[<]|tool_call|minimax/.test(r.contenido);
  const bien = nombres.length > 0 && !hayXml;
  if (bien) native++;
  console.log(`\r${bien ? "✅" : "⚠"} ${modelo.padEnd(28)} ${nombres.length ? "nativas: " + nombres.join(",") : "solo texto"}${hayXml ? "  ¡XML EN PANTALLA!" : ""}`);
  if (r.contenido) console.log(`   texto: ${JSON.stringify(r.contenido.slice(0, 160))}`);
  if (nombres.length) console.log(`   args : ${r.llamadas[0].args}`);
}

console.log(`\n${"─".repeat(60)}`);
console.log(native === objetivos.length
  ? `\n✅ ${native}/${objetivos.length} emiten tool calls NATIVAS y sin XML en pantalla.`
  : `\n${native}/${objetivos.length} emiten nativas. Las demas siguen yendo por texto.`);

try { gw.kill(); } catch {}
process.exit(0);
