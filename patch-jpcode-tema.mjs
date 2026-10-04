#!/usr/bin/env node
/**
 * Que el terminal en modo claro no se vea con el tema oscuro de jpcode.
 * =============================================================
 *
 * ## Qué pasa
 *
 * El motor trae sus propios temas claros y oscuros, y detecta el fondo del
 * terminal para elegir entre ellos. El problema es que elige **los suyos**, no
 * los nuestros:
 *
 *     resolveAutoTheme(){ const detected=…detectTerminalTheme();
 *                         return detected==="light" ? QwenLight : QwenDark }
 *
 * Aunque `jpcode-claro` esté registrado en `ui.customThemes` y validado, esa
 * línea nunca lo mira. Con el terminal en claro se aplica el tema de Qwen, que
 * no es el de jpcode — de ahí la queja de que en modo blanco se ve feo, y de que
 * el oscuro tampoco: los dos son los del motor, no los nuestros.
 *
 * Medido con el `themeManager` real del motor (no a ojo), ver tools/tema.test.mjs:
 *
 *     COLORFGBG="0;15"   setActiveTheme("auto")  ->  "Qwen Light"
 *     COLORFGBG="15;0"   setActiveTheme("auto")  ->  "Qwen Dark"
 *     COLORFGBG="0;15"   setActiveTheme("jpcode-claro") -> "jpcode-claro"  ✓
 *
 * ## Qué hace
 *
 * Cambia esa ternaria por una que busca los temas de jpcode entre los
 * registrados y, si no están, cae a los del motor. O sea: el mecanismo de
 * detección que ya existía y funcionaba, pero apuntando a nuestra paleta.
 *
 * Los nombres (`jpcode` y `jpcode-claro`) se leen de los ficheros de tema, no
 * están escritos aquí: si mañana se renombran, el parche los sigue.
 *
 * ## Qué NO hace
 *
 * No toca la detección (sigue siendo la del motor: COLORFGBG, macOS, y si no
 * pues oscuro), ni el diálogo de temas, ni los colores. Solo a quién se le
 * pregunta por el tema.
 *
 *   node patch-jpcode-tema.mjs
 *
 * Idempotente y re-aplicable tras `bash vendor-engine.sh`. Rutas: JPCODE_ENGINE.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";

const AQUI = dirname(fileURLToPath(import.meta.url));

function paqueteQwen() {
  /* JPCODE_ENGINE es el nombre propio; QWEN_PKG se sigue leyendo por si alguien
     llama a este parche a mano con el nombre viejo. */
  const rutaMotor = process.env.JPCODE_ENGINE ?? process.env.QWEN_PKG;
  if (rutaMotor) return rutaMotor;
  const candidatos = [];
  try {
    candidatos.push(execSync("npm root -g", { encoding: "utf8" }).trim());
  } catch { /* sin npm */ }
  candidatos.push(
    join(process.env.HOME || "", ".global_modules/lib/node_modules"),
    join(process.env.HOME || "", ".npm-global/lib/node_modules"),
    "/usr/lib/node_modules",
  );
  for (const base of candidatos) {
    const p = join(base, "@qwen-code/qwen-code");
    if (existsSync(join(p, "package.json"))) return p;
  }
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa JPCODE_ENGINE=/ruta/al/paquete");
}

/** Los nombres vienen de los ficheros, no de aquí. */
function nombresTema() {
  const oscuro = JSON.parse(readFileSync(join(AQUI, "theme.json"), "utf8"));
  let claro = null;
  try {
    claro = JSON.parse(readFileSync(join(AQUI, "theme-light.json"), "utf8"));
  } catch { /* sin tema claro se queda el oscuro para los dos */ }
  return { oscuro: oscuro.name, claro: claro?.name || oscuro.name };
}

const PKG = paqueteQwen();
const { oscuro: NOMBRE_OSCURO, claro: NOMBRE_CLARO } = nombresTema();

/* El trozo que decide a quién se le pregunta.
 *
 * OJO: recibe el themeManager como PARÁMETRO, no como `this`. La llamada es
 * `__jpcodeAuto(this)`, sin receptor, y los módulos ESM van en modo estricto:
 * dentro de la función `this` sale `undefined` y peta al leer
 * `cachedAutoDetection`. Ya pasó una vez — de ahí que sea un argumento. */
const BUSCADOR =
  `(function(nOsc,nCls){return function(m){` +
  `var d=m.cachedAutoDetection??detectTerminalTheme();` +
  `var t=m.customThemes;` +
  `var cand=d==="light"?nCls:nOsc;` +
  `if(t&&t.get(cand))return t.get(cand);` +
  `return d==="light"?QwenLight:QwenDark}})("${NOMBRE_OSCURO}","${NOMBRE_CLARO}")`;

const REEMPLAZOS = [
  {
    antes:
      `resolveAutoTheme(){const detected=this.cachedAutoDetection??detectTerminalTheme();` +
      `return detected==="light"?QwenLight:QwenDark}`,
    despues: `resolveAutoTheme(){return __jpcodeAuto(this)}`,
  },
  {
    antes:
      `resolveAutoThemeAsync(){const detected=await detectTerminalThemeAsync();` +
      `this.cachedAutoDetection=detected;this.activeTheme=detected==="light"?QwenLight:QwenDark;`,
    despues:
      `resolveAutoThemeAsync(){const detected=await detectTerminalThemeAsync();` +
      `this.cachedAutoDetection=detected;this.activeTheme=__jpcodeAuto(this);`,
  },
];

const MARCA = "__jpcodeAuto";

function parchear(ruta) {
  let s = readFileSync(ruta, "utf8");
  const antes = s;
  let cambios = 0;

  for (const { antes: a, despues: d } of REEMPLAZOS) {
    if (!s.includes(a)) continue;
    s = s.replaceAll(a, d);
    cambios++;
  }

  if (cambios === 0) {
    if (s.includes(MARCA)) {
      console.log(`  · ya parcheado: ${ruta}`);
      return false;
    }
    console.log(`  · sin cambios: ${ruta}`);
    return false;
  }

  /* La definición va FUERA de la clase, justo antes de declararla.
   *
   * La primera versión la metia justo antes de `resolveAutoTheme(){`, que esta
   * DENTRO del cuerpo de la clase — y ahi `var` es un error de sintaxis, asi
   * que el chunk dejaba de arrancar. `node --check` lo cazó; sin él, esto se
   * habría publicado roto. */
  if (!s.includes("var ThemeManager=class{") && !s.includes("var ThemeManager = class {")) {
    console.error("  ✗ no encuentro la declaración de ThemeManager; no toco nada");
    process.exit(1);
  }

  const definicion = `var ${MARCA}=${BUSCADOR};`;
  if (!s.includes(definicion)) {
    s = s.replace(/(var ThemeManager\s*=\s*class\s*\{)/, `${definicion}$1`);
  }

  /* Última comprobación antes de escribir: el chunk tiene que seguir siendo JS
     válido. Un parche que rompe el arranque es peor que no parchear, y ya pasó
     una vez (definir la variable dentro de la clase). Se comprueba con el
     parser de verdad, `node --check`, no a ojo. */
  const temporal = `${ruta}.jpcode-check.mjs`;
  try {
    writeFileSync(temporal, s);
    const r = spawnSync(process.execPath, ["--check", temporal], { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(`  ✗ el parche deja el chunk con sintaxis rota; no toco nada\n${r.stderr.trim().split("\n").slice(0, 4).join("\n")}`);
      process.exit(1);
    }
  } finally {
    try { rmSync(temporal, { force: true }); } catch { /* da igual */ }
  }

  writeFileSync(ruta, s);
  console.log(`  ✓ parcheado: ${ruta} (${cambios} sitio(s)) — oscuro=${NOMBRE_OSCURO} claro=${NOMBRE_CLARO}`);
  return true;
}

const chunk = join(PKG, "chunks");
if (!existsSync(chunk)) {
  console.error(`✗ no encuentro ${chunk}`);
  process.exit(1);
}

/* El chunk que tiene el themeManager. Se busca por contenido, no por nombre:
   los nombres de los chunks cambian con cada versión del motor. */
let destino = null;
for (const f of ["chunk-UOLLXC6M.js"]) {
  const p = join(chunk, f);
  if (existsSync(p)) {
    const s = readFileSync(p, "utf8");
    if (s.includes("resolveAutoTheme") && s.includes("QwenLight")) { destino = p; break; }
  }
}
if (!destino) {
  for (const f of readdirSync(chunk)) {
    if (!f.endsWith(".js")) continue;
    const p = join(chunk, f);
    let s;
    try { s = readFileSync(p, "utf8"); } catch { continue; }
    if (s.includes("resolveAutoTheme(){") && s.includes("QwenLight")) { destino = p; break; }
  }
}
if (!destino) {
  console.error("✗ no encuentro el chunk con el themeManager (busco resolveAutoTheme + QwenLight)");
  process.exit(1);
}

console.log(`tema: ${NOMBRE_OSCURO} · claro: ${NOMBRE_CLARO}`);
parchear(destino);
