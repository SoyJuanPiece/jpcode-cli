#!/usr/bin/env node
/**
 * Rebrandea el motor de jpcode (parchea `engine/` en la construcción).
 *
 * El banner, tema y subtítulo ya son config (ver sync-jpcode.mjs). Aquí solo
 * quedan las cosas que el motor escribe en código: el título de la ventana del
 * terminal, las cadenas "Qwen Code" de la UI (help, status, diálogos) y el color
 * del spinner del indicador de trabajo.
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
 * trabajo de Claude Code. */
const SPINNER = "chunk-PE7HFQGZ.js";
const SPINNER_NUEVO =
  "color:theme.text.accent,children:(0,import_jsx_runtime.jsx)(build_default,{type:spinnerType})";
const SPINNER_CAMBIOS = [
  [
    "color:theme.text.primary,children:(0,import_jsx_runtime.jsx)(build_default,{type:spinnerType})",
    SPINNER_NUEVO,
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

if (cambios) {
  console.log(`\n✅ jpcode: ${cambios} fichero(s) rebrandeados.`);
} else {
  console.log(`\n✅ jpcode: ya estaba todo rebrandeado (${yaEstaba}).`);
}
process.exit(0);
