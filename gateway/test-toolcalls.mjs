import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { CAPTURA_0_2_13, CAPTURA_SIN_INVISIBLES, CAPTURA_0_2_14, CAPTURA_BUCLE, CAPTURA_SIN_CERRAR, CAPTURA_0_2_16 } from "./fixtures-toolcalls.mjs";

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

/* Y la decision de que se le manda al motor, que es donde estaba el fallo. */
const i3 = s.indexOf("function respuestaParaElMotor");
const j3 = s.indexOf("\n/**", i3 + 10);
writeFileSync("/tmp/jpcode-rpm.cjs", s.slice(i3, j3) + "\nmodule.exports={respuestaParaElMotor};");
const { respuestaParaElMotor } = require_("/tmp/jpcode-rpm.cjs");

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

/* --- memoria: el caso que acabó en "Fatal process out of memory" ---------- */
console.log("\nMemoria con el modelo en bucle:");
/* Reproduce lo que se ve cuando el modelo repite la misma llamada cientos de
 * veces: varios MB de texto con muchísimos <invoke>. La primera versión copiaba
 * el resto del texto entero por cada invocación y reventaba el proceso. */
const enBucle =
  "Voy a revisar. ][minimax][{<tool_call>" +
  '<invoke name="glob"><pattern>C:/Users/Usuario/Desktop/**</pattern></invoke>'.repeat(6000) +
  "][minimax>[</tool_call>";
const mb = (enBucle.length / 1024 / 1024).toFixed(1);
const antes = process.memoryUsage().heapUsed;
const t0 = Date.now();
const rBucle = E(enBucle);
const ms = Date.now() - t0;
const grew = Math.round((process.memoryUsage().heapUsed - antes) / 1024 / 1024);
check(
  `no revienta con ${mb} MB y 6000 invocaciones`,
  rBucle.toolCalls.length <= 24,
  `${rBucle.toolCalls.length} tool calls en ${ms} ms`,
);
check("y la memoria crece poco", grew < 200, `+${grew} MB de heap`);

/* Un cuerpo sin cerrar no debe comerse el texto entero: se acota, no se guarda
   medio megabyte como argumento (que es lo que dispara el OOM). */
const sinCerrar = "<tool_call><invoke name=\"grep\"><pattern>" + "a".repeat(500000);
const rSinCerrar = E(sinCerrar);
const argSinCerrar = rSinCerrar.toolCalls[0]?.function.arguments ?? "";
check(
  "una invocación sin cerrar no revienta ni guarda medio megabyte de argumento",
  rSinCerrar.toolCalls.length === 1 && argSinCerrar.length <= 4100,
  `${argSinCerrar.length} caracteres de argumento`,
);

/* ---- La captura del bucle tal cual, sin__(500000) de relleno sintético ---- */
console.log("\nLa captura del bucle de 0.2.14, con el texto literal de la pantalla:");
{
  const antesB = process.memoryUsage().heapUsed;
  const t0b = Date.now();
  const r = E(CAPTURA_BUCLE);
  const msb = Date.now() - t0b;
  const crecio = Math.round((process.memoryUsage().heapUsed - antesB) / 1024 / 1024);
  check(
    "no revienta y corta las llamadas",
    r.toolCalls.length <= 24,
    `${r.toolCalls.length} tool calls, ${msb} ms, +${crecio} MB`,
  );
  check(
    "y no queda ni un trozo del bucle en el texto visible",
    r.contentLimpio.length < 200 && !/invoke|tool_call|pattern|minimax/.test(r.contentLimpio),
    JSON.stringify(r.contentLimpio.slice(0, 120)),
  );
}

console.log("\nLa captura de 0.2.15: la llamada sin cerrar que se veía en crudo:");
{
  const r = E(CAPTURA_SIN_CERRAR);
  const cmd = r.toolCalls.find((t) => t.function.name === "cmd");
  check(
    "saca la llamada a cmd",
    Boolean(cmd) && /dir \/b/.test(JSON.parse(cmd.function.arguments).command || ""),
    cmd ? cmd.function.arguments : "no salió",
  );
  check(
    "y el XML desaparece COMPLETO del texto visible",
    !/[<>]/.test(r.contentLimpio) &&
      r.contentLimpio.startsWith("Primero reviso") &&
      !r.contentLimpio.includes("2>nul"),
    JSON.stringify(r.contentLimpio),
  );
}

/* ---- 0.2.16: el caso que hacia inutil toda la limpieza del texto ---- */
console.log("\nLa captura de 0.2.16: tool call nativa Y XML en el texto a la vez:");
{
  /* SSE como el que manda Zen: un tool_call nativo con nombre en un trozo de
     delta, y el XML en el contenido. Las dos cosas a la vez, que es lo que
     hacia el modelo. */
  const trozo = (obj) => "data: " + JSON.stringify(obj) + "\n\n";
  const argumentos = JSON.stringify({ pattern: "C:/x" });
  const sse =
    trozo({ id: "x", choices: [{ delta: { content: CAPTURA_0_2_16 } }] }) +
    trozo({ id: "x", choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "glob", arguments: "" } }] } }] }) +
    trozo({ id: "x", choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: argumentos } }] } }] }) +
    trozo({ id: "x", choices: [{ delta: {}, finish_reason: "tool_calls" }] }) +
    "data: [DONE]\n\n";

  const partes = partesDelSse(sse);
  check(
    "el SSE trae la tool call nativa",
    partes.toolCalls.length === 1 && partes.toolCalls[0].function.name === "glob",
    JSON.stringify(partes.toolCalls.map((t) => t.function.name)),
  );

  const { toolCalls: tcTexto, contentLimpio } = E(partes.content);
  const r = respuestaParaElMotor(partes, tcTexto, contentLimpio);

  check("se ejecuta la llamada nativa", r.toolCalls.length === 1 && r.toolCalls[0].function.name === "glob");
  check(
    "y el texto que se ve NO lleva el XML",
    !/[<>]/.test(r.contenido) && !/invoke|tool_call|pattern|clash|minimax|Desktop/.test(r.contenido),
    JSON.stringify(r.contenido),
  );
}

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : "\n✅ todos los formatos se convierten en tool calls reales");

process.exit(fallos ? 1 : 0);