#!/usr/bin/env node
/**
 * Estética Antigravity CLI: un solo punto de color para el estado de las
 * herramientas, y triángulos para el razonamiento. Lo que hay aquí son las tres
 * cosas que hace.
 *
 * ## Qué pasa
 *
 * El motor trae un juego de glifos heterogeneouso que cambia de forma según la
 * fuente del terminal: `✓` para éxito, `o` para pendiente, `⊷` ejecutando, `?`
 * confirmando, `-` cancelado, `x` error, y `∴` / `∵` para el razonamiento.
 *
 * En Windows eso es un problema de verdad, no estético. La consola clásica
 * (ConHost, PowerShell sin Windows Terminal) va en la página de códigos del
 * sistema — CP850 o Windows-1252 — y muchos de esos caracteres no existen ahí:
 * el motor pinta un `?` o una cajita vacía donde debería ir el estado de la
 * herramienta. El resultado es una columna de iconos donde no se distingue un
 * éxito de un error, que es justo lo único para lo que está.
 *
 * ## Las tres cosas que hace este parche
 *
 * 1. **Un punto, y el color dice todo.** Todos los estados pasan a `●`
 *    (U+25CF, bloque *Geometric Shapes*): verde si la herramienta fue, rojo si
 *    falló o se canceló, ámbar si está esperando al usuario. Es lo que hace
 *    Antigravity y funciona en cualquier consola: `●` está en todas las fuentes
 *    de monoespaciado desde hace treinta años, y además ya lo usa el propio
 *    motor de spinner, así que no sale nada nuevo al dibujo.
 *
 *    De paso se corrigen dos colores que no cuadraban con esa lectura:
 *    `Pending` salía en **verde** —se leía como "hecho" antes de hacerse— y
 *    `Canceled` heredaba el color del shell en vez de ser rojo.
 *
 * 2. **Triángulos para el razonamiento.** `∴` y `∵` son símbolos matemáticos
 *    ("por tanto" / "porque"): en una línea de chat no significan nada, y en
 *    consola clásica tampoco existen. `▶` colapsado y `▼` expandido dicen lo
 *    mismo que el glifo pero se leen solos, y están en el mismo bloque que `●`.
 *
 * 3. **Nada más.** No se toca el prompt, los separadores, la barra de estado ni
 *    el formateo de los argumentos: eso es otro parche y este no lo mezcla.
 *
 *   node jpcode/patch-jpcode-aesthetics.mjs
 *
 * Idempotente y re-aplicable tras `bash vendor-engine.sh`. Rutas: QWEN_PKG.
 *
 * ## Deshacer
 *
 * Las tres cosas son reversibles por separado, sin reescribir el chunk:
 *
 *   - `var TOOL_STATUS={SUCCESS:"\u25CF",…}` → los glifos de antes (`\u2713`,
 *     `o`, `\u22B7`, `?`, `-`, `x`).
 *   - `var THINKING_ICON="\u25B6 ";var THINKING_ICON_EXPANDED="\u25BC ";…` →
 *     ``var THINKING_ICON=`${ICON.THEREFORE} `;`` y lo de ``ICON.BECAUSE``.
 *   - los tres `color:` de `ToolStatusIndicator` → `color:statusColor`.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

function paqueteQwen() {
  /* JPCODE_ENGINE es el nombre propio; QWEN_PKG se sigue leyendo por si alguien
     llama a estos parches a mano con el nombre viejo. */
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
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa QWEN_PKG=/ruta/al/paquete");
}

const PKG = paqueteQwen();
const chunks = join(PKG, "chunks");
const ESTADOS = "chunk-PE7HFQGZ.js";
const PENSAMIENTO = "chunk-DS7L2SVR.js";

/* Se escribe, se comprueba con node --check y, si el chunk ya no es JavaScript,
   se devuelve lo que había. El orden importa: nunca se deja a medias un motor. */
function escribirSiEsValido(ruta, anterior, nuevo) {
  writeFileSync(ruta, nuevo);
  try {
    execSync(`node --check "${ruta}"`, { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    writeFileSync(ruta, anterior);
    console.error(`  ⚠️  ${ruta.split("/").pop()}: el parche rompe la sintaxis; revertido`);
    process.exit(1);
  }
}

/* ---- parte 1: los estados de las herramientas, un punto y color ---- */

/* Los glifos de antes, tal cual venían, para poder reconocerlos. */
const GLIFOS_VIEJOS =
  'var TOOL_STATUS={SUCCESS:"\\u2713",PENDING:"o",EXECUTING:"\\u22B7",CONFIRMING:"?",CANCELED:"-",ERROR:"x"};';
/* `●` en los cinco estados que se dibujan: pendiente, ejecutando (el frame que
   no gira), confirmando, cancelado y error. El éxito ya era `●` en el engine
   nuevo, pero se pone aquí también para que el objeto quede homogéneo. */
const GLIFOS_NUEVOS =
  'var TOOL_STATUS={SUCCESS:"\\u25CF",PENDING:"\\u25CF",EXECUTING:"\\u25CF",CONFIRMING:"\\u25CF",CANCELED:"\\u25CF",ERROR:"\\u25CF"};';
/* Va como comentario, no como identificador: se pega delante de lo que se cambia y
   así se reconoce el motor ya parcheado con un simple `includes`. */
const MARCADOR_ESTADOS = "/* __JPCODE_ANTIGRAVITY_STATUS__ */";

const rutaEstados = join(chunks, ESTADOS);
if (!existsSync(rutaEstados)) {
  console.error(`  ⚠️  no existe ${ESTADOS}`);
  process.exit(1);
}

const antesEstados = readFileSync(rutaEstados, "utf8");
if (antesEstados.includes(MARCADOR_ESTADOS)) {
  console.log(`• ${ESTADOS}: los estados ya están con punto y color`);
} else {
  if (!antesEstados.includes(GLIFOS_VIEJOS)) {
    console.error(`  ⚠️  ${ESTADOS}: no encuentro TOOL_STATUS (¿otra versión?)`);
    process.exit(1);
  }
  let s = antesEstados.replace(GLIFOS_VIEJOS, `${MARCADOR_ESTADOS}${GLIFOS_NUEVOS}`);

  /* Los tres colores. Se cambian solo los de los estados que doivent ser ámbar o
     rojo; el de éxito y el de error ya lo eran y se dejan como estaban, porque
     `theme.status.success` / `theme.status.error` losbring el tema y no el parche. */
  const RECOLORES = [
    // Pendiente salía en verde: se leía como hecho antes de estarlo.
    [
      'status==="Pending"&&(0,import_jsx_runtime2.jsx)(Text,{color:theme.status.success,children:TOOL_STATUS.PENDING})',
      'status==="Pending"&&(0,import_jsx_runtime2.jsx)(Text,{color:theme.status.warning,children:TOOL_STATUS.PENDING})',
    ],
    // Confirmando: ámbar siempre, no el color del shell.
    [
      'status==="Confirming"&&(0,import_jsx_runtime2.jsx)(Text,{color:statusColor,"aria-label":"Confirming:",children:TOOL_STATUS.CONFIRMING})',
      'status==="Confirming"&&(0,import_jsx_runtime2.jsx)(Text,{color:theme.status.warning,"aria-label":"Confirming:",children:TOOL_STATUS.CONFIRMING})',
    ],
    // Cancelado: rojo, y sin negrita (la negrita era para que el `-` se viera).
    [
      'status==="Canceled"&&(0,import_jsx_runtime2.jsx)(Text,{color:statusColor,"aria-label":"Canceled:",bold:true,children:TOOL_STATUS.CANCELED})',
      'status==="Canceled"&&(0,import_jsx_runtime2.jsx)(Text,{color:theme.status.error,"aria-label":"Canceled:",children:TOOL_STATUS.CANCELED})',
    ],
  ];

  let recoloreados = 0;
  for (const [viejo, nuevo] of RECOLORES) {
    if (!s.includes(viejo)) {
      console.error(`  ⚠️  ${ESTADOS}: no encuentro el estado para recolorear`);
      console.error(`     ${viejo.slice(0, 70)}…`);
      process.exit(1);
    }
    s = s.replace(viejo, nuevo);
    recoloreados++;
  }
  if (!s.includes(MARCADOR_ESTADOS) || s.includes(GLIFOS_VIEJOS)) {
    console.error(`  ⚠️  ${ESTADOS}: los estados no han quedado bien puestos`);
    process.exit(1);
  }
  escribirSiEsValido(rutaEstados, antesEstados, s);
  console.log(
    `• ${ESTADOS}: punto \u25CF con color en los estados (${recoloreados} recoloreados: pendiente y confirmando en ámbar, cancelado en rojo)`,
  );
}

/* ---- parte 2: el razonamiento, con triángulos ---- */

/* Icono no pendiente: `∴` (por tanto). Icono pendiente: `∵` (porque). */
const ICONOS_VIEJOS =
  "var THINKING_ICON=`${ICON.THEREFORE} `;var THINKING_ICON_PENDING=`${ICON.BECAUSE} `;";
/* Colapsado `▶`, expandido `▼`. El pendiente se queda en `▶`: mientras el modelo
   razona todavía no hay nada que desplegar, así que no hay nada que señalar. */
const ICONOS_NUEVOS =
  'var THINKING_ICON="\\u25B6 ";var THINKING_ICON_EXPANDED="\\u25BC ";var THINKING_ICON_PENDING="\\u25B6 ";';
const MARCADOR_PENSAMIENTO = "/* __JPCODE_ANTIGRAVITY_THINK__ */";

const rutaPensamiento = join(chunks, PENSAMIENTO);
if (!existsSync(rutaPensamiento)) {
  console.error(`  ⚠️  no existe ${PENSAMIENTO}`);
  process.exit(1);
}

const antesPensamiento = readFileSync(rutaPensamiento, "utf8");
if (antesPensamiento.includes(MARCADOR_PENSAMIENTO)) {
  console.log(`• ${PENSAMIENTO}: el razonamiento ya va con triángulos`);
} else {
  if (!antesPensamiento.includes(ICONOS_VIEJOS)) {
    console.error(`  ⚠️  ${PENSAMIENTO}: no encuentro THINKING_ICON (¿otra versión?)`);
    process.exit(1);
  }
  const s = antesPensamiento.replace(ICONOS_VIEJOS, `${MARCADOR_PENSAMIENTO}${ICONOS_NUEVOS}`);
  if (!s.includes(MARCADOR_PENSAMIENTO) || s.includes(ICONOS_VIEJOS)) {
    console.error(`  ⚠️  ${PENSAMIENTO}: los iconos no han quedado bien puestos`);
    process.exit(1);
  }
  escribirSiEsValido(rutaPensamiento, antesPensamiento, s);
  console.log(`• ${PENSAMIENTO}: razonamiento con \u25B6 / \u25BC en vez de \u2234 / \u2235`);
}

/* Y que lo nuevo esté de verdad, no solo escrito. */
if (!readFileSync(rutaEstados, "utf8").includes(MARCADOR_ESTADOS)) {
  console.error("  ⚠️  los estados no se han aplicado");
  process.exit(1);
}
if (!readFileSync(rutaPensamiento, "utf8").includes(MARCADOR_PENSAMIENTO)) {
  console.error("  ⚠️  los triángulos no se han aplicado");
  process.exit(1);
}

console.log("\n✅ Listo. Las herramientas se leen por color, no por glifo:");
console.log("   \u25CF verde  hecho        \u25CF rojo   falló o se canceló");
console.log("   \u25CF ámbar  esperando      \u25B6/\u25BC razonamiento (Ctrl+O despliega)");
console.log("   Tras `qwen update` o `vendor-engine.sh`, relanza este script.");
process.exit(0);
