#!/usr/bin/env node
/**
 * Rebrandea el motor de jpcode (parchea `engine/` en la construcción).
 *
 * El banner, tema y subtítulo ya son config (ver sync-jpcode.mjs). Aquí solo
 * quedan las cosas que el motor escribe en código: el título de la ventana del
 * terminal, las cadenas "Qwen Code" de la UI (help, status, diálogos), el color
 * del spinner del indicador de trabajo y **la versión que se anuncia**.
 *
 * Eso último era un bug de marca: el motor trae su versión (la suya) escrita a
 * fuego en el código, así que la cabecera decía `jpcode (v0.24.7)` y `jpcode
 * --version` decía `0.24.7`: jpcode 0.1.9 se anunciaba con el número de otro
 * programa. No hay ningún ajuste que lo arregle (las 41 claves de la categoría
 * UI del esquema no tocan la versión, y la propia documentación de
 * `customBannerTitle` dice que "the version suffix is always appended"), así que
 * la cosa va por parche.
 *
 * El motor es Apache-2.0: se puede modificar, pero hay que dejar constancia de
 * qué se cambió, y eso está en `engine/NOTICE-jpcode.md`, que genera
 * `vendor-engine.sh`. La versión del MOTOR se deja viva en
 * `engine/package.json` —de ella salen `sandboxImageUri` y los pines de
 * `optionalDependencies`, así que ni se toca— por si hay que reportar un bug
 * contra él.
 *
 *   node patch-jpcode-brand.mjs
 *
 * Idempotente y re-aplicable tras re-vendorizar el motor (`bash vendor-engine.sh`
 * ya lo llama con QWEN_PKG=engine). NO toca marca de Anthropic ni código ajeno:
 * solo renombra y retoca la app que estamos re-marcando.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

function paqueteQwen() {
  if (process.env.QWEN_PKG) return process.env.QWEN_PKG;
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

/* Título de ventana del terminal: `Qwen - <carpeta>` → `jpcode - <carpeta>` */
const TITULO = "chunk-GIRTFMVS.js";
const TITULO_CAMBIOS = [
  ['DEFAULT_WINDOW_TITLE="qwen"', 'DEFAULT_WINDOW_TITLE="jpcode"'],
  ["`Qwen - ${folderName||DEFAULT_WINDOW_TITLE}`", "`jpcode - ${folderName||DEFAULT_WINDOW_TITLE}`"],
];

/* Cadenas visibles de la app en los chunks principales + locale inglés. */
const TEXTOS = [
  "startInteractiveUI-ZKYQSLKT.js",
  "start-opentui-ui-U4KEWT3A.js",
  "en-PWGNWPOM.js",
  "chunk-T54GQIC4.js",
];

/* Spinner del indicador de trabajo: el motor lo dibuja en el color de texto
 * primario (blanco) mientras la frase de al lado va en el de acento. Poniéndolo
 * en el acento, glifo y texto son una sola pieza naranja, como la línea de
 * trabajo de Claude Code.
 *
 * Y los frames: de fábrica son braille (U+280B…U+280F) y el rango Braille
 * Patterns NO está en Cascadia Mono ni en Consolas, las fuentes por defecto de
 * Windows Terminal: la línea de trabajo sale con un cuadro con un interrogante
 * en lugar del spinner. Los que se ponen aquí son del bloque Geometric Shapes
 * (U+25D0…U+25D3), el mismo del que salen el ◆/●/○ que la UI ya dibuja bien en
 * esas fuentes (la cabecera y el estado de las herramientas los usan).
 *
 * Aun así queda la consola de Windows clásica (conhost, la que abre
 * `powershell.exe`): su fuente por defecto tampoco tiene *Geometric Shapes*, así
 * que ahí hasta el ◐ sale en cuadro. Cuando no haya Windows Terminal
 * (`WT_SESSION`) ni el terminal de VS Code (`TERM_PROGRAM`) se degrada a frames
 * ASCII puros — `| / -` — que dibuja cualquier fuente del mundo. */
const SPINNER = "chunk-PE7HFQGZ.js";
const SPINNER_NUEVO =
  "color:theme.text.accent,children:(0,import_jsx_runtime.jsx)(build_default,{type:spinnerType})";

/** Texto de un array de strings tal como viaja en el chunk: ["\uXXXX",…]. */
const frames = (hex) => `["${hex.map((h) => "\\u" + h).join('\",\"')}"]`;
const BRAILLE_DOTS = [
  "280B", "2819", "2839", "2838", "283C",
  "2834", "2826", "2827", "2807", "280F",
];
const FRAMES_VISIBLES = ["25D0", "25D3", "25D1", "25D2"]; // ◐ ◓ ◑ ◒

// Consola de Windows clásica = Windows, pero sin Windows Terminal, sin el
// terminal de VS Code y sin mintty (Git Bash). Ahí la fuente no tiene ni braille
// ni formas geométricas y cualquier glifo raro sale en cuadro.
const WIN_LEGACY =
  '(process.platform==="win32"&&!process.env.WT_SESSION&&!process.env.TERM_PROGRAM&&!process.env.MSYSTEM)';
const ASCII_FRAMES = '["|","/","-"]';
const ASCII_TOGGLE = '["*","+"]';

/** Frames del motor: los bonitos, y los ASCII solo en la consola de Windows. */
const FRAMES_TRABAJO = `(${WIN_LEGACY}?${ASCII_FRAMES}:${frames(FRAMES_VISIBLES)})`;

/* La versión que anuncia la interfaz (cabecera, /about, /bug, el item
 * `qwen-version` de la línea de estado) salía del MOTOR: un literal en
 * `getCliVersion()`, la única definición del motor, importada desde 7 chunks. El
 * `await getPackageJson()` de al lado es código muerto.
 *
 * Ahora sale de `JPCODE_CLI_VERSION`, que `bin/jpcode.mjs` le pasa al motor con
 * la versión de jpcode. Sin la variable sale la del motor, o sea lo de antes: quien
 * arranque el motor sin el envoltorio sigue siendo coherente consigo mismo. Los
 * dos renderizadores (ink y opentui) y `config.getCliVersion()` leen esta misma
 * función, así que este único cambio los arregla todos. */
const VERSION = "chunk-NJBU56UO.js";
const VERSION_CAMBIOS = [
  [
    'async function getCliVersion(){const pkgJson=await getPackageJson();return"0.24.7"}',
    'async function getCliVersion(){const pkgJson=await getPackageJson();return process.env.JPCODE_CLI_VERSION??"0.24.7"}',
  ],
];

const SPINNER_CAMBIOS = [
  [
    "color:theme.text.primary,children:(0,import_jsx_runtime.jsx)(build_default,{type:spinnerType})",
    SPINNER_NUEVO,
  ],
  // Los mismos 10 frames braille están dos veces: los del paquete cli-spinners
  // (spinner "dots", el de la línea de trabajo) y los del propio motor.
  [frames(BRAILLE_DOTS), FRAMES_TRABAJO],
  // Frame fijo de "esperando tu respuesta": el braille también se veía en cuadro.
  [
    'WAITING_SPINNER_FRAME="\\u280F"',
    `WAITING_SPINNER_FRAME=(${WIN_LEGACY}?"o":"\\u25CB")`,
  ],
  // Spinner "toggle" (columna de estado cuando una herramienta se está
  // ejecutando): ⊶⊷ (U+22B6/U+22B7) tampoco está garantizado en esas fuentes.
  [
    `toggle:{interval:250,frames:${frames(["22B6", "22B7"])}}`,
    `toggle:{interval:250,frames:(${WIN_LEGACY}?${ASCII_TOGGLE}:${frames(["25CF", "25CB"])})}`,
  ],
];

let cambios = 0;
let yaEstaba = 0;

function aplicar(fichero, reemplazos, marcador) {
  const ruta = join(chunks, fichero);
  if (!existsSync(ruta)) {
    console.log(`  ⚠️  no existe ${fichero}`);
    return;
  }
  let s = readFileSync(ruta, "utf8");
  let n = 0;
  for (const [viejo, nuevo] of reemplazos) {
    if (s.includes(viejo)) {
      s = s.replaceAll(viejo, nuevo);
      n++;
    }
  }
  if (n === 0) {
    if (s.includes(marcador)) {
      console.log(`• ${fichero}: ya estaba rebrandeado`);
      yaEstaba++;
    } else {
      console.log(`  ⚠️  ${fichero}: no encontré nada que cambiar (¿otra versión?)`);
    }
    return;
  }
  writeFileSync(ruta, s);
  console.log(`• ${fichero}: ${n} reemplazo(s) → jpcode`);
  cambios++;
}

console.log(`Motor: ${PKG}`);
aplicar(TITULO, TITULO_CAMBIOS, 'DEFAULT_WINDOW_TITLE="jpcode"');
for (const f of TEXTOS) aplicar(f, [["Qwen Code", "jpcode"]], "jpcode");
aplicar(SPINNER, SPINNER_CAMBIOS, SPINNER_NUEVO);
aplicar(VERSION, VERSION_CAMBIOS, "JPCODE_CLI_VERSION");

if (cambios) {
  console.log(`\n✅ jpcode: ${cambios} fichero(s) rebrandeados.`);
} else {
  console.log(`\n✅ jpcode: ya estaba todo rebrandeado (${yaEstaba}).`);
}
process.exit(0);
