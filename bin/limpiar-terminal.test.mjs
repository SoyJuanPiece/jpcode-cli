/**
 * Las guardas que deciden si jpcode limpia la terminal al abrir.
 *
 * Importa la función real de bin/limpiar-terminal.mjs, no una copia: si el
 * launcher cambia y la función no, esto falla.
 *
 *   node bin/limpiar-terminal.test.mjs
 */
import { limpiarTerminal, SECUENCIA } from "./limpiar-terminal.mjs";

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};

console.log("\nLimpiar la terminal al abrir:\n");

/* Lo que SÍ tiene que limpiar */
for (const [nombre, argv] of [
  ["sesión interactiva", []],
  ["con un prompt suelto", [""]],
  ["con opciones sueltas", ["--verbose"]],
]) {
  const r = limpiarTerminal({ isTTY: true, argv, env: {} });
  check(`${nombre} → limpia`, r.limpiar === true, r.motivo);
}

/* Lo que NO */
for (const [nombre, opts] of [
  ["stdout en un pipe", { isTTY: false, argv: [], env: {} }],
  ["stdout a fichero", { isTTY: false, argv: [], env: {} }],
  ["doctor", { isTTY: true, argv: ["doctor"], env: {} }],
  ["doctor --json", { isTTY: true, argv: ["doctor", "--json"], env: {} }],
  ["--json en cualquier sitio", { isTTY: true, argv: ["chat", "--json"], env: {} }],
  ["JPCODE_NO_CLEAR=1", { isTTY: true, argv: [], env: { JPCODE_NO_CLEAR: "1" } }],
  ["CI=true", { isTTY: true, argv: [], env: { CI: "true" } }],
]) {
  const r = limpiarTerminal(opts);
  check(`${nombre} → NO limpia`, r.limpiar === false, r.motivo);
}

/* Ojo: JPCODE_NO_CLEAR solo apaga con "1" exacto. Con "0" o "" se limpia, que
   es lo esperable de una variable de entorno y evita el susto de ponerla mal y
   que no haga nada. */
for (const valor of ["0", "", "true", "no"]) {
  const r = limpiarTerminal({ isTTY: true, argv: [], env: { JPCODE_NO_CLEAR: valor } });
  check(`JPCODE_NO_CLEAR=${JSON.stringify(valor)} → sí limpia`, r.limpiar === true, r.motivo);
}

/* La secuencia: pantalla + scrollback + origen. Sin el 3J, al scrollear hacia
   arriba aparecería la conversación anterior, que es justo lo que no queremos. */
check("la secuencia borra pantalla, scrollback y vuelve al origen",
  SECUENCIA === "\x1b[2J\x1b[3J\x1b[H", JSON.stringify(SECUENCIA));
check("no lleva el 1049 de pantalla alternativa (ese sí traía parpadeo)",
  !SECUENCIA.includes("1049"), JSON.stringify(SECUENCIA));

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : "\n✅ solo limpia cuando debe\n");
process.exit(fallos ? 1 : 0);
