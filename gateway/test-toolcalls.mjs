import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

/* Se extrae la función tal cual está en server.mjs —copiada, no reimplementada—
   para que la prueba falle si el server deja de soportarlo. */
const s = readFileSync(new URL("./server.mjs", import.meta.url), "utf8");
const i = s.indexOf("function extraerToolCallsDeTexto");
const j = s.indexOf("\n/**", i + 10);
writeFileSync("/tmp/jpcode-tc.cjs", `${s.slice(i, j)}\nmodule.exports={extraerToolCallsDeTexto};`);
const require_ = createRequire(import.meta.url);
const { extraerToolCallsDeTexto: E } = require_("/tmp/jpcode-tc.cjs");

const CASOS = [
  ["el de la captura (array JSON)",
    '<tool_call>[{"name":"glob","arguments":{"pattern":"C:\\\\Users\\\\Usuario\\\\Desktop\\\\*"}}]</tool_call>',
    ["glob"]],
  ["el de la captura, pero con barras sueltas",
    '<tool_call>[{"name":"glob","arguments":{"pattern":"C:\\Users\\Usuario\\Desktop\\*"}}]</tool_call>',
    ["glob"]],
  ["array con dos llamadas",
    '<tool_call>[{"name":"glob","arguments":{"pattern":"*"}},{"name":"read_file","arguments":{"path":"a.ts"}}]</tool_call>',
    ["glob", "read_file"]],
  ["objeto suelto, sin array",
    '<tool_call>{"name":"list_files","arguments":{"path":"."}}</tool_call>',
    ["list_files"]],
  ["arguments como string JSON",
    '<tool_call>[{"name":"grep","arguments":"{\\"pattern\\":\\"x\\"}"}]</tool_call>',
    ["grep"]],
  ["envuelto en bloque de código",
    "<tool_call>```json\n[{\"name\":\"glob\",\"arguments\":{}}]\n```</tool_call>",
    ["glob"]],
  ["el formato viejo, <invoke>",
    '<tool_call><invoke name="glob", "pattern": "C:/Users/*">',
    ["glob"]],
  ["sin el espacio de ancho cero",
    '<tool_call>[{"name":"glob","arguments":{}}]</tool_call>',
    ["glob"]],
  ["razonamiento alrededor",
    'Voy a mirar. ][minimax>[<tool_call>[{"name":"glob","arguments":{"pattern":"*"}}]</tool_call>',
    ["glob"]],
  ["nombres con espacios (function.name)",
    '<tool_call>[{"function":{"name":"read_file","arguments":"{\\"path\\":\\"b.ts\\"}"}}]</tool_call>',
    ["read_file"]],
];

let fallos = 0;
for (const [nombre, texto, esperados] of CASOS) {
  const r = E(texto);
  const obtenidos = r.toolCalls.map((t) => t.function.name);
  const ok = JSON.stringify(obtenidos) === JSON.stringify(esperados);
  if (!ok) fallos++;
  console.log(
    `${ok ? "  ✅" : "  ❌"} ${nombre.padEnd(34)} → ${obtenidos.join(", ") || "(nada)"}`,
  );
  if (ok && r.contentLimpio === "") {
    console.log(`        y el bloque desaparece del texto visible ✓`);
  }
}

/* Y lo que no es una tool call no se toca. */
const normal = E("Hola, ¿qué tal? Hoy hace buen día.");
const intacto = normal.toolCalls.length === 0 && normal.contentLimpio === "Hola, ¿qué tal? Hoy hace buen día.";
if (!intacto) fallos++;
console.log(`${intacto ? "  ✅" : "  ❌"} texto normal intacto`);

/* Un JSON roto dentro del bloque no debe inventarse una llamada. */
const roto = E('<tool_call>[{"name":"glob","arguments":</tool_call>');
if (roto.toolCalls.length !== 0) {
  fallos++;
  console.log("  ❌ JSON roto dentro del bloque no genera llamadas");
} else {
  console.log("  ✅ JSON roto dentro del bloque no genera llamadas");
}

console.log(fallos ? `\n❌ ${fallos} fallo(s)` : "\n✅ todas las formas de tool call en texto se convierten");
process.exit(fallos ? 1 : 0);