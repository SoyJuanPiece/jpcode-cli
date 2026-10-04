/* Prueba candidatos de paleta para el tema oscuro de jpcode y dice cuáles
 * pasan. No escribe nada: solo informa, para no ir a ciegas.
 *
 *   node herramientas/probar-paleta.mjs
 */
import { ratio, veredicto, comprobar, repetidos } from "./calcular-tema.mjs";

const FONDO = "#0d1117"; // negro suave, elegido por el usuario

/* Candidatos para cada campo problemático. Se prueban varios y se queda el
 * que cumple, no el que "me parece bien": es lo unico que separa un tema
 * legible de uno que no lo es. */
const CANDIDATOS = {
  AccentCyan:   ["#e5c07b", "#dfb95c", "#d9b26a"],           // ámbar cálido, distinto del naranja Claude
  Comment:      ["#8b949e", "#7d8590", "#9198a1"],
  Gray:         ["#a8b3bd", "#9aa5b1", "#b0bac4"],
  DiffAdded:    ["#2ea043", "#3fb950", "#388e3c"],
  DiffRemoved:  ["#f85149", "#e5534b", "#db6d68"],
  DiffModified: ["#6e7681", "#7d8590", "#586069"],
  AccentPurple: ["#e08a6a", "#d77757"],                        // se mantiene el naranja Claude
  AccentGreen:  ["#56d364", "#4eba65"],
  AccentRed:    ["#ff7b72", "#ff6b80"],
  AccentYellow: ["#e3b341", "#ffc107"],
  LightBlue:    ["#a5d6ff", "#93a5ff"],
  AccentBlue:   ["#bc8cff", "#b1b9f9"],
  Foreground:   ["#f0f6fc", "#ffffff"],
};

const BASE = {
  Background: FONDO,
  Foreground: "#f0f6fc",
  LightBlue: "#a5d6ff",
  AccentBlue: "#bc8cff",
  AccentPurple: "#d77757",
  AccentCyan: "#e5c07b",
  AccentGreen: "#56d364",
  AccentYellow: "#e3b341",
  AccentRed: "#ff7b72",
  Comment: "#8b949e",
  Gray: "#a8b3bd",
  DiffAdded: "#2ea043",
  DiffRemoved: "#f85149",
  DiffModified: "#6e7681",
  GradientColors: ["#d77757", "#eb9f7f"],
};

console.log(`\nCandidatos sobre ${FONDO}:\n`);
for (const [campo, opciones] of Object.entries(CANDIDATOS)) {
  console.log(`  ${campo}:`);
  for (const c of opciones) {
    const r = ratio(c, FONDO);
    const v = veredicto(r);
    console.log(`    ${c}  ${r.toFixed(2).padStart(6)}  ${v}`);
  }
}

const problemas = comprobar(BASE);
const rep = repetidos(BASE);
console.log(`\nPaleta candidata completa: ${problemas.length === 0 && rep.length === 0 ? "PASA" : "FALLA"}`);
for (const p of problemas) console.log(`  FALLA ${p.campo} ${p.valor} ${p.ratio} < ${p.min}`);
for (const r of rep) console.log(`  FALLA ${r.color} repetido en ${r.campos.join(", ")}`);

console.log(`\nTabla final:\n`);
for (const [k, v] of Object.entries(BASE)) {
  if (k === "GradientColors") continue;
  const r = ratio(v, FONDO);
  console.log(`  ${r >= 7 ? "  ok " : r >= 4.5 ? " justo" : " FALLA"}  ${k.padEnd(14)} ${v}  ${r.toFixed(2)}`);
}
