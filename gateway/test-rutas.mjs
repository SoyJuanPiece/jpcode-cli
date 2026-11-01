/**
 * Las SEIS rutas por las que el texto del modelo puede llegar al motor.
 * ===============================================================
 *
 * test-e2e.mjs solo probaba UNA: /v1/chat/completions con stream. Y esa era la
 * unica que limpiaba el XML. Las otras cinco lo pasaban tal cual, y por eso el
 * usuario seguia viendo el XML crudo en pantalla despues de un arreglo que en
 * local daba verde.
 *
 * Aqui se prueban todas, por HTTP de verdad, con un upstream mock que devuelve
 * el texto de la captura de 0.2.21. El criterio es el mismo en las seis: al
 * motor NO le puede llegar ni un `<`, ni la palabra "invoke", ni la ruta del
 * escritorio.
 *
 * No hace falta API key ni conexion: el upstream es local.
 *
 *   node gateway/test-rutas.mjs
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const { CAPTURA_0_2_21 } = await import("./fixtures-toolcalls.mjs");

const PUERTO_MOCK = 8098;
const PUERTO_GW = 8198;
const CLAVE = "clave-del-test-rutas";

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};
const trozo = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

/* Lo que NO puede aparecer en el texto que ve el motor: rastro de tool call.
 * Ojo: "Escritorio" y "glob" salen en la frase legitima del modelo
 * ("mira qué hay en el Escritorio"), asi que no pueden ser criterios — si no,
 * la prueba falla por la conversacion y no por el XML. */
const RASTRO = /<\s*\/?\s*(?:invoke|tool_call|tool_reflect|parameter|placeholder)|[\[\{]\s*(?:invoke|tool_call)|minimax|run_shell_command|Desktop/i;
const sucio = (t) => RASTRO.test(t || "") || /[<>]/.test(t || "");

/* ---- upstream mock: el SSE de la captura de 0.2.21 --------------------- */
const mock = createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (d) => (cuerpo += d));
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8" });
    for (const t of CAPTURA_0_2_21.match(/[\s\S]{1,40}/g) || []) {
      res.write(trozo({ id: "x", choices: [{ delta: { content: t } }] }));
    }
    res.write(trozo({ id: "x", choices: [{ delta: {}, finish_reason: "stop" }] }));
    res.write("data: [DONE]\n\n");
    res.end();
  });
});
await new Promise((r) => mock.listen(PUERTO_MOCK, r));

const SERVIDOR = process.env.JPCODE_SERVER || join(HERE, "server.mjs");
const gw = spawn(process.execPath, [SERVIDOR, String(PUERTO_GW)], {
  env: { ...process.env, OPENCODE_BASE: `http://127.0.0.1:${PUERTO_MOCK}`, OPENCODE_GATEWAY_KEY: CLAVE, DEBUG: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrGW = "";
gw.stderr.on("data", (d) => (stderrGW += d));

for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PUERTO_GW}/api/status`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
const limpiar = () => { try { gw.kill(); } catch {} mock.close(); };
process.on("exit", limpiar);

console.log(`\nLas seis rutas, por HTTP de verdad`);
console.log(`  servidor: ${SERVIDOR}\n`);

/* ---- 1 y 2: /v1/chat/completions, con stream y sin stream ---------------- */
for (const stream of [true, false]) {
  const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLAVE}` },
    body: JSON.stringify({
      model: "space-bunny-free",
      stream,
      messages: [{ role: "user", content: "mira qué hay en el Escritorio" }],
      tools: [{ type: "function", function: { name: "glob", description: "busca", parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } } }],
    }),
  });
  const crudo = await r.text();
  let texto = "";
  let calls = [];
  if (stream) {
    for (const l of crudo.split("\n")) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
      let j; try { j = JSON.parse(d); } catch { continue; }
      const c = j.choices?.[0]; if (!c) continue;
      if (c.delta?.content) texto += c.delta.content;
      for (const tc of c.delta?.tool_calls || []) {
        const k = tc.index ?? 0; calls[k] = calls[k] || { name: "", args: "" };
        if (tc.function?.name) calls[k].name = tc.function.name;
        if (tc.function?.arguments) calls[k].args += tc.function.arguments;
      }
    }
  } else {
    let j; try { j = JSON.parse(crudo); } catch {}
    texto = j?.choices?.[0]?.message?.content || "";
    calls = (j?.choices?.[0]?.message?.tool_calls || []).map((t) => ({ name: t.function?.name, args: t.function?.arguments }));
  }
  const etiqueta = `POST /v1/chat/completions (stream=${stream})`;
  console.log(`\n${etiqueta}`);
  console.log(`  texto : ${JSON.stringify(texto)}`);
  console.log(`  calls : ${JSON.stringify(calls)}`);
  check("el XML no llega al motor", !sucio(texto), JSON.stringify(texto));
  check("y la llamada sí", calls.length > 0 && calls[0].name === "glob", JSON.stringify(calls));
  check("con la frase de conversación", /Escritorio/.test(texto), JSON.stringify(texto));
}

/* ---- 3 y 4: /v1/messages (Anthropic), con stream y sin stream ------------ */
for (const stream of [true, false]) {
  const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/v1/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": CLAVE, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "space-bunny-free",
      stream,
      max_tokens: 2048,
      messages: [{ role: "user", content: "mira qué hay en el Escritorio" }],
      tools: [{ name: "glob", description: "busca", input_schema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] } }],
    }),
  });
  const crudo = await r.text();
  let texto = "";
  let calls = [];
  if (stream) {
    for (const l of crudo.split("\n")) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim(); if (!d) continue;
      let j; try { j = JSON.parse(d); } catch { continue; }
      if (j.type === "content_block_start" && j.content_block?.type === "text") texto += j.content_block.text || "";
      if (j.type === "content_block_delta" && j.delta?.type === "text_delta") texto += j.delta.text || "";
      if (j.type === "content_block_start" && j.content_block?.type === "tool_use") calls[j.content_block.name] = calls[j.content_block.name] || j.content_block.input || {};
    }
  } else {
    let j; try { j = JSON.parse(crudo); } catch {}
    for (const b of j?.content || []) {
      if (b.type === "text") texto += b.text || "";
      if (b.type === "tool_use") calls[b.name] = b.input || {};
    }
  }
  const etiqueta = `POST /v1/messages (stream=${stream})`;
  console.log(`\n${etiqueta}`);
  console.log(`  texto : ${JSON.stringify(texto)}`);
  console.log(`  calls : ${JSON.stringify(calls)}`);
  check("el XML no llega al motor", !sucio(texto), JSON.stringify(texto));
  check("y la llamada sí", Object.keys(calls).length > 0, JSON.stringify(calls));
  check("con la frase de conversación", /Escritorio/.test(texto), JSON.stringify(texto));
}

/* ---- 5: /api/chat (el chat local de la carpeta) ------------------------- */
{
  const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "space-bunny-free", messages: [{ role: "user", content: "mira qué hay en el Escritorio" }] }),
  });
  const crudo = await r.text();
  let texto = "";
  for (const l of crudo.split("\n")) {
    if (!l.startsWith("data:")) continue;
    const d = l.slice(5).trim(); if (!d || d === "[DONE]") continue;
    let j; try { j = JSON.parse(d); } catch { continue; }
    texto += j.choices?.[0]?.delta?.content || "";
  }
  console.log(`\nPOST /api/chat`);
  console.log(`  texto : ${JSON.stringify(texto)}`);
  check("el XML no llega al motor", !sucio(texto), JSON.stringify(texto));
}

/* ---- 6: /v1/chat/completions sin herramientas (generateJson) ----------- */
{
  const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLAVE}` },
    body: JSON.stringify({ model: "space-bunny-free", messages: [{ role: "user", content: "mira qué hay en el Escritorio" }] }),
  });
  const crudo = await r.text();
  let texto = "";
  try { texto = JSON.parse(crudo)?.choices?.[0]?.message?.content || ""; } catch {}
  console.log(`\nPOST /v1/chat/completions (sin herramientas)`);
  console.log(`  texto : ${JSON.stringify(texto)}`);
  check("el XML no llega al motor", !sucio(texto), JSON.stringify(texto));
}

limpiar();
console.log(fallos ? `\n❌ ${fallos} fallo(s): hay rutas por las que el XML todavía se ve\n` : `\n✅ las seis rutas entregan el texto limpio\n`);
process.exit(fallos ? 1 : 0);