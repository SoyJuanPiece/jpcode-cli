import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { CAPTURA_0_2_13, CAPTURA_SIN_INVISIBLES, CAPTURA_0_2_14 } from "./fixtures-toolcalls.mjs";

/* Se extrae la función tal cual está en server.mjs —copiada, no reimplementada—
   para que la prueba falle si el servidor deja de soportarlo. */
const s = readFileSync(new URL("./server.mjs", import.meta.url), "utf8");
const i = s.indexOf("function extraerToolCallsDeTexto");
const j = s.indexOf("\n/**", i + 10);
writeFileSync("/tmp/jpcode-tc.cjs", `${s.slice(i, j)}\nmodule.exports={extraerToolCallsDeTexto};`);
const require_ = createRequire(import.meta.url);
const { extraerToolCallsDeTexto: E } = require_("/tmp/jpcode-tc.cjs");

/* La otra mitad del problema: cómo se lee el SSE de Zen antes de mirar el texto. */
const i2 = s.indexOf("function partesDelSse");
const j2 = s.indexOf("\n/**", i2 + 10);
writeFileSync("/tmp/jpcode-pds.cjs", `${s.slice(i2, j2)}\nmodule.exports={partesDelSse};`);
const { partesDelSse } = require_("/tmp/jpcode-pds.cjs");

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};

/* --- el caso de la captura, que es el que fallaba ------------------------- */
console.log("La captura de 0.2.14 (el formato limpio, con DOS llamadas de glob):");
{
  const r = E(CAPTURA_0_2_14);
  const patrones = r.toolCalls.map((t) => JSON.parse(t.function.arguments).pattern);
  check(
    "saca las dos llamadas",
    r.toolCalls.length === 2 &&
      r.toolCalls.every((t) => t.function.name === "glob") &&
      patrones[0] === "C:/Users/Usuario/Desktop/*" &&
      patrones[1] === "C:/Users/Usuario/Desktop/**/index.html",
    `${r.toolCalls.length} → ${JSON.stringify(patrones)}`,
  );
  check("y no queda rastro del XML", !r.contentLimpio.includes("invoke"), JSON.stringify(r.contentLimpio));
}

console.log("\nLa captura de 0.2.13 (el caso que NO se arregló):");
for (const [nombre, texto] of [
  ["literal de la pantalla", CAPTURA_0_2_13],
  ["sin caracteres invisibles", CAPTURA_SIN_INVISIBLES],
]) {
  const r = E(texto);
  const glob = r.toolCalls.find((t) => t.function.name === "glob");
  // `arguments` llega como string con el JSON serializado, que es el formato
  // OpenAI; hay que parsearlo para comparar.
  const args = glob ? JSON.parse(glob.function.arguments) : null;
  check(
    nombre,
    args?.pattern === "C:/Users/Usuario/Desktop/*",
    JSON.stringify(args),
  );
  check("  y el XML desaparece del texto visible", r.contentLimpio.length > 0 && !r.contentLimpio.includes("invoke"),
    JSON.stringify(r.contentLimpio.slice(0, 60) + "…"));
}

/* --- los otros formatos que se han visto --------------------------------- */
console.log("\nLos demás formatos:");
const CASOS = [
  ["el de 0.2.9, name=\"x\" con pares sueltos",
    '<tool_call><invoke name="glob", "pattern": "C:/Users/*">',
    { glob: { pattern: "C:/Users/*" } }],
  ["<invoke name con salto de línea",
    "<tool_call>\n<invoke name\ngrep\n><pattern>x</pattern>\n</invoke\n></tool_call>",
    { grep: { pattern: "x" } }],
  ["<invoke name=\"x\"> con comillas",
    '<tool_call><invoke name="read_file"><path>a.ts</path></invoke></tool_call>',
    { read_file: { path: "a.ts" } }],
  ["array JSON",
    '<tool_call>[{"name":"glob","arguments":{"pattern":"*"}}]</tool_call>',
    { glob: { pattern: "*" } }],
  ["array JSON con barras sueltas de Windows",
    '<tool_call>[{"name":"glob","arguments":{"pattern":"C:\\Users\\*"}}]</tool_call>',
    { glob: { pattern: "C:\\Users\\*" } }],
  ["objeto suelto",
    '<tool_call>{"name":"list_files","arguments":{"path":"."}}</tool_call>',
    { list_files: { path: "." } }],
];
for (const [nombre, texto, esperado] of CASOS) {
  const r = E(texto);
  const porNombre = Object.fromEntries(r.toolCalls.map((t) => [t.function.name, JSON.parse(t.function.arguments)]));
  check(nombre, JSON.stringify(porNombre) === JSON.stringify(esperado), JSON.stringify(porNombre));
}

/* --- lo que no es una tool call no se toca ------------------------------- */
console.log("\nLo que no debe tocarse:");
const normal = E("Hola, ¿qué tal? Hoy hace buen día.");
check("texto normal intacto", normal.toolCalls.length === 0 && normal.contentLimpio === "Hola, ¿qué tal? Hoy hace buen día.");
const roto = E('<tool_call>[{"name":"glob","arguments":</tool_call>');
check("JSON roto dentro del bloque no inventa llamadas", roto.toolCalls.length === 0);
const sinNombre = E("<tool_call><invoke name\n></invoke></tool_call>");
check("invoke sin nombre no genera llamada", sinNombre.toolCalls.length === 0);

/* --- SSE con trozos de relleno: no pueden pisar lo que sale del texto ------- */
console.log("\nEl SSE de Zen antes de mirar el texto:");
const relleno = [
  "data: " + JSON.stringify({ choices: [{ delta: { content: "hola" } }] }),
  "data: " + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: "call_x" }] } }] }),
  "data: " + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "{}" } }] } }] }),
  "data: [DONE]",
].join("\n\n");
const p = partesDelSse(relleno);
check(
  "un tool_call sin nombre no cuenta como tool_call",
  p.toolCalls.length === 0,
  JSON.stringify(p.toolCalls),
);
check("y el texto del stream se conserva", p.content === "hola", JSON.stringify(p.content));

const bueno = [
  "data: " + JSON.stringify({ choices: [{ delta: { content: "voy" } }] }),
  "data: " + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "glob" } }] } }] }),
  "data: " + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"pattern":"x"}' } }] } }] }),
  "data: [DONE]",
].join("\n\n");
const p2 = partesDelSse(bueno);
check(
  "uno con nombre y sus argumentos sí se guarda",
  p2.toolCalls.length === 1 &&
    p2.toolCalls[0].function.name === "glob" &&
    p2.toolCalls[0].function.arguments === '{"pattern":"x"}',
  JSON.stringify(p2.toolCalls),
);

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : "\n✅ todos los formatos se convierten en tool calls reales");

process.exit(fallos ? 1 : 0);