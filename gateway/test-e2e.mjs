/**
 * Prueba de extremo a extremo del gateway, por HTTP de verdad.
 * =========================================================
 *
 * Hasta ahora los tests de tool calls·sacan las funciones de server.mjs y las
 * llaman sueltas. Eso prueba la lógica, pero NO prueba el servidor: que el
 * camino correcto sea el que se ejecuta, que las cabeceras valgan y que lo que
 * sale de verdad por el socket sea lo que cree el motor.
 *
 * Aquí se levanta el server.mjs de verdad, con un upstream mock que devuelve
 * el SSE que manda Space Bunny (nativa + XML a la vez), se le hace una petición
 * como la que hace el motor, y se mira byte a byte lo que sale.
 *
 * No hace falta ninguna API key ni conexión: el upstream es local.
 *
 *   node gateway/test-e2e.mjs
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURA = readFileSync(join(HERE, "fixtures-toolcalls.mjs"), "utf8");

/* El texto literal del usuario se importa de verdad, no se reescribe aquí. */
const { CAPTURA_0_2_16 } = await import("./fixtures-toolcalls.mjs");

const PUERTO_MOCK = 8099;
const PUERTO_GW = 8199;
const CLAVE = "clave-del-e2e";

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};

const trozo = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

/* ---- upstream mock: responde como Space Bunny ------------------------- */
const mock = createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (d) => (cuerpo += d));
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8" });
    /* Contenido troceado, como llega de verdad. */
    for (const trozoTexto of CAPTURA_0_2_16.match(/[\s\S]{1,40}/g) || []) {
      res.write(trozo({ id: "x", choices: [{ delta: { content: trozoTexto } }] }));
    }
    /* Y la tool call nativa, que es la que hacia que el gateway mandara el
       texto crudo y se viera el XML en la consola del usuario. */
    res.write(trozo({ id: "x", choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "glob", arguments: "" } }] } }] }));
    res.write(trozo({ id: "x", choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify({ pattern: "C:/Users/*/Desktop/*" }) } }] } }] }));
    res.write(trozo({ id: "x", choices: [{ delta: {}, finish_reason: "tool_calls" }] }));
    res.write("data: [DONE]\n\n");
    res.end();
  });
});

await new Promise((r) => mock.listen(PUERTO_MOCK, r));

/* ---- el gateway de verdad ---------------------------------------------- */
/* Se puede apuntar a OTRO server.mjs con JPCODE_SERVER. Sirve para probar el
   que queda instalado en node_modules, que no es el mismo fichero que el de
   aquí: es el minificado y el que de verdad ve la gente. */
const SERVIDOR = process.env.JPCODE_SERVER || join(HERE, "server.mjs");
const gw = spawn(process.execPath, [SERVIDOR, String(PUERTO_GW)], {
  env: {
    ...process.env,
    OPENCODE_BASE: `http://127.0.0.1:${PUERTO_MOCK}`,
    /* Clave propia del test, para no depender del .api-key de la maquina. */
    OPENCODE_GATEWAY_KEY: CLAVE,
    DEBUG: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderrGW = "";
gw.stderr.on("data", (d) => (stderrGW += d));

async function esperarArranque() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/api/status`);
      if (r.ok) return true;
    } catch { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

const limpiar = () => { try { gw.kill(); } catch {} mock.close(); };
process.on("exit", limpiar);

console.log(`\nProbando el gateway de verdad por HTTP`);
console.log(`  servidor: ${SERVIDOR}`);
console.log(`  upstream: mock local en ${PUERTO_MOCK}\n`);

if (!(await esperarArranque())) {
  console.log(`  ❌ el gateway no arrancó. stderr:\n${stderrGW}`);
  limpiar();
  process.exit(1);
}

const cuerpo = {
  model: "mimo-v2.6-flash-free",
  stream: true,
  messages: [{ role: "user", content: "mira qué hay en el Escritorio" }],
  tools: [
    {
      type: "function",
      function: {
        name: "glob",
        description: "busca ficheros",
        parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
      },
    },
  ],
  tool_choice: "auto",
};

const r = await fetch(`http://127.0.0.1:${PUERTO_GW}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${CLAVE}` },
  body: JSON.stringify(cuerpo),
});
const sse = await r.text();

check("el gateway responde 200", r.status === 200, `HTTP ${r.status}`);
check("responde como event-stream", /text\/event-stream/.test(r.headers.get("content-type") || ""), r.headers.get("content-type") || "");

/* Se reensambla lo que el motor leería. */
let contenido = "";
let llamadas = [];
let finish = null;
for (const linea of sse.split("\n")) {
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

console.log("\nLo que el motor recibe de verdad por el socket:");
console.log(`  contenido : ${JSON.stringify(contenido)}`);
console.log(`  tool_calls: ${JSON.stringify(llamadas)}`);
console.log(`  finish    : ${finish}\n`);

check("el motor recibe la tool call", llamadas.length === 1 && llamadas[0].name === "glob");
check("con los argumentos", /Desktop/.test(llamadas[0]?.args || ""), llamadas[0]?.args || "");
check("y finish_reason tool_calls", finish === "tool_calls", String(finish));
check(
  "NO le llega el XML por el socket",
  !/[<>]/.test(contenido) && !/invoke|tool_call|Desktop|clash|minimax/.test(contenido),
  JSON.stringify(contenido),
);
check(
  "pero sí llega la parte de conversación",
  /Escritorio/.test(contenido),
  JSON.stringify(contenido),
);

limpiar();
console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : "\n✅ el gateway entrega limpio por HTTP\n");
process.exit(fallos ? 1 : 0);
