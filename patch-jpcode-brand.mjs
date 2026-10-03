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
 * ya lo llama con JPCODE_ENGINE=engine). NO toca marca de Anthropic ni código ajeno:
 * solo renombra y retoca la app que estamos re-marcando.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
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
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa JPCODE_ENGINE=/ruta/al/paquete");
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

/* Silenciar la advertencia feo-amarilla `Persisted model.baseUrl` cuando cambia el puerto del gateway */
const candidatoWarning = readdirSync(chunks).find((f) => f.endsWith(".js") && readFileSync(join(chunks, f), "utf8").includes("Persisted model.baseUrl"));
if (candidatoWarning) {
  aplicar(candidatoWarning, [
    ['disambiguationWarning=`Persisted model.baseUrl', 'disambiguationWarning=void 0;let _oldWarn=`Persisted model.baseUrl']
  ], "disambiguationWarning=void 0");
}

/* ---- barrido de la marca por todo el motor ----------------------------------
 * Lo de arriba toca ocho ficheros, los que se eligieron a mano. Pero el motor
 * tiene la marca repartida por casi todos: en 0.24.7 quedaban unas 250 apariciones
 * de "Qwen Code" fuera de esos ocho, y casi todas se leen — la ayuda, las
 * descripciones de /settings, los mensajes de error, el /about, la exportación
 * de la transcripción. Una lista escrita a mano se queda corta en la siguiente
 * actualización del motor, así que aquí se barre el directorio entero.
 *
 * Se sustituye solo la frase exacta "Qwen Code", nunca la palabra suelta "Qwen":
 * el login contra la cuenta de Qwen, los modelos qwen3.5 y el paquete npm
 * `@qwen-code/audio-capture` son de otro programa y seguir llamándose así es lo
 * correcto. Por lo mismo `engine/package.json` no se toca (ahí el nombre es la
 * clave de la que salen `sandboxImageUri` y los pines de optionalDependencies).
 *
 * Cada fichero se valida con node --check y se devuelve como estaba si el cambio
 * lo dejara sin ser JavaScript. */
const BARRIDO = "jpcode";

function barrerMarca() {
  /* Todos los .js del motor, no una lista: el mismo "Qwen Code" aparece en
   * chunks/, en cli.js, en export-transcript-document.js y también en
   * cli-entry.js y sandboxFileWorker.js, que seengingolpearon al principio. */
  const objetivos = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (entrada.name.endsWith(".js")) objetivos.push(ruta);
    }
  };
  recorrer(PKG);

  let barridos = 0;
  let repuestos = 0;
  for (const ruta of objetivos) {
    const antes = readFileSync(ruta, "utf8");
    if (!antes.includes("Qwen Code")) continue;
    const despues = antes.replaceAll("Qwen Code", BARRIDO);
    writeFileSync(ruta, despues);
    try {
      execSync(`node --check "${ruta}"`, { stdio: ["ignore", "ignore", "pipe"] });
    } catch {
      writeFileSync(ruta, antes);
      console.error(`  ⚠️  ${ruta.split("/").pop()}: el barrido rompe la sintaxis; revertido`);
      process.exit(1);
    }
    repuestos += (antes.match(/Qwen Code/g) || []).length;
    barridos++;
  }
  if (barridos) {
    console.log(`• barrido: "Qwen Code" → ${BARRIDO} en ${barridos} fichero(s), ${repuestos} aparición(es)`);
    cambios++;
  } else {
    console.log('• barrido: no queda ninguna aparición de "Qwen Code" en el motor');
  }
}

/* ---- el español tiene que existir para el motor ---------------------------
 * El motor trae sus locales empaquetados (de, en, fr, ja, pt, ru, zh, zh-TW), pero
 * el catálogo de jpcode va aparte, en `~/.jpcode/locales/es.js`, y se instala con el
 * postinstall. Ese fichero lo encuentra el motor… pero solo si el idioma está en
 * `SUPPORTED_LANGUAGES` (chunk-MWABT6CH.js): es la lista blanca que decide qué se
 * considera un idioma y cuál cae a inglés. Sin añadir `es` ahí, el catálogo se
 * queda en el disco sin leer nunca.
 *
 * Por eso esta parte sí es un parche —tiene que reaplicarse en cada
 * `vendor-engine.sh`— y lo otro no: el catálogo se regenera sin tocar el motor.
 *
 * El `strictParity` de los chinos avisa cuando el catálogo no cubre todas las
 * claves; en español no hace falta porque `check-locale-es.mjs` lo verifica antes
 * de publicar. */
const IDIOMAS = "chunk-MWABT6CH.js";
const ANCLA_IDIOMA = 'var SUPPORTED_LANGUAGES=[{code:"en"';
const ESPANOL = '{code:"es",id:"es-ES",fullName:"Spanish",nativeName:"Español"},';

const rutaIdiomas = join(chunks, IDIOMAS);
if (!existsSync(rutaIdiomas)) {
  console.error(`  ⚠️  no existe ${IDIOMAS}: el motor no trae la lista de idiomas`);
  process.exit(1);
} else {
  const antesIdiomas = readFileSync(rutaIdiomas, "utf8");
  if (antesIdiomas.includes(ESPANOL)) {
    console.log("• español: ya está en la lista de idiomas del motor");
  } else if (!antesIdiomas.includes(ANCLA_IDIOMA)) {
    console.error(`  ⚠️  ${IDIOMAS}: no encuentro SUPPORTED_LANGUAGES (¿otra versión?)`);
    process.exit(1);
  } else {
    const s = antesIdiomas.replace(ANCLA_IDIOMA, `var SUPPORTED_LANGUAGES=[${ESPANOL}{code:"en"`);
    writeFileSync(rutaIdiomas, s);
    try {
      execSync(`node --check "${rutaIdiomas}"`, { stdio: ["ignore", "ignore", "pipe"] });
    } catch {
      writeFileSync(rutaIdiomas, antesIdiomas);
      console.error(`  ⚠️  ${IDIOMAS}: el parche rompe la sintaxis; revertido`);
      process.exit(1);
    }
    console.log("• español: añadido a la lista de idiomas del motor");
    cambios++;
  }
}

barrerMarca();

/* ---- el directorio de configuración dentro de cada proyecto ----------------
 * El home global ya era `~/.jpcode`: el envoltorio arranca el motor con
 * `QWEN_HOME`. Pero `QWEN_DIR` seguía valiendo `.qwen`, y ese mismo valor lo usa el
 * motor para la configuración **de cada proyecto**: `<proyecto>/.qwen/`.
 *
 * O sea que la mitad global era de jpcode y la de cada repositorio seguía siendo
 * de otro programa — que es justo lo que se nota al hacer `ls -a` en un proyecto.
 *
 * Con las dos a `.jpcode` no se pisan: el global viene de `QWEN_HOME` y el de
 * proyecto cuelga de la raíz del repo. Lo único que se deja atrás es el
 * `<proyecto>/.qwen/` que alguien tuviera hecho a mano, que pasa a ignorarse; con
 * moverlo a `<proyecto>/.jpcode/` sigue funcionando. */
const QWEN_DIR = /var QWEN_DIR="\.qwen"/g;
let qwenDirVistos = 0;
for (const nombre of readdirSync(chunks)) {
  if (!nombre.endsWith(".js")) continue;
  const ruta = join(chunks, nombre);
  const antes = readFileSync(ruta, "utf8");
  QWEN_DIR.lastIndex = 0;
  if (!QWEN_DIR.test(antes)) continue;
  QWEN_DIR.lastIndex = 0;
  const despues = antes.replace(QWEN_DIR, 'var QWEN_DIR=".jpcode"');
  writeFileSync(ruta, despues);
  try {
    execSync(`node --check "${ruta}"`, { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    writeFileSync(ruta, antes);
    console.error(`  ⚠️  ${nombre}: el cambio de QWEN_DIR rompe la sintaxis; revertido`);
    process.exit(1);
  }
  qwenDirVistos++;
}
if (qwenDirVistos) {
  console.log(`• QWEN_DIR: ".qwen" → ".jpcode" (${qwenDirVistos} fichero(s))`);
  cambios++;
} else {
  console.log('• QWEN_DIR: ya es ".jpcode"');
}

if (cambios) {
  console.log(`\n✅ jpcode: ${cambios} fichero(s) rebrandeados.`);
} else {
  console.log(`\n✅ jpcode: ya estaba todo rebrandeado (${yaEstaba}).`);
}
process.exit(0);
