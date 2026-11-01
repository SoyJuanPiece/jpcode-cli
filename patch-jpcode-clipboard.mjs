#!/usr/bin/env node
/**
 * Mensaje honesto al pegar una imagen en un terminal sin portapapeles.
 *
 * Qwen avisa con
 *
 *   «Clipboard image paste is unavailable because the native clipboard module
 *     could not be loaded. Reinstall jpcode or use the npm installation method.»
 *
 * y **el mensaje miente**. En Linux ese camino ni toca el módulo nativo: en
 * `clipboardHasImage()` (chunk-J7U2XPDR.js) se llama a `getLinuxClipboardTool()`,
 * que solo devuelve `wl-paste` (Wayland) o `xclip` (X11). Si no hay ninguno —o no
 * hay `DISPLAY`/`WAYLAND_DISPLAY`, que es el caso de un Cloud Workstation o del
 * terminal web de VS Code— se dispara `onUnavailable()` → ese texto. La rama del
 * módulo nativo (`@teddyzhu/clipboard`) es solo para macOS/Windows.
 *
 * Aquí pasa lo mismo al revés: el módulo carga bien, pero al crear el contexto
 * falla con
 *
 *   Failed to create clipboard context: $DISPLAY variable not set
 *
 * Así que en un terminal headless **no hay forma de leer la imagen**: además el
 * terminal de VS Code Web solo manda `text/plain` al pegar (`TerminalInstance.paste()`
 * → `clipboardService.readText()`, sin rama de imagen), de modo que la imagen del
 * navegador nunca llega al CLI. Lo que sí funciona es arrastrar el fichero al
 * terminal —o pegar su ruta—: Qwen la reconoce por extensión
 * (`classifyPastedImagePaths` → `promotePastedImagePaths`) y la adjunta como imagen.
 *
 * Este parche cambia el texto por uno que dice la verdad y explica el atajo. Como la
 * clave de i18n **es** la frase en inglés, reescribirla en el sitio donde se llama
 * (`reportClipboardUnavailable`) basta: la búsqueda en los locales no encuentra la
 * clave nueva y se muestra el propio texto, en cualquier idioma.
 *
 *   node jpcode/patch-jpcode-clipboard.mjs
 *
 * Idempotente y re-aplicable tras `qwen update`. Rutas: QWEN_PKG (autodetectado).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

/* ---------- localizar el paquete de Qwen Code ---------- */
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

/* La clave de i18n es la frase entera; el parche de marca ya puede haber cambiado
   «Qwen Code» por «jpcode», así que se aceptan las dos. */
const VIEJO = /Clipboard image paste is unavailable because the native clipboard module could not be loaded\. Reinstall (?:Qwen Code|jpcode) or use the npm installation method\./;

const NUEVO =
  "Clipboard image paste is unavailable in this terminal (no system clipboard: on Linux it needs xclip or wl-paste with X11/Wayland). Drag the image file into the terminal, or paste its path (for example @imagen.png), and it is attached as an image.";

const MARCADOR = "no system clipboard: on Linux it needs xclip or wl-paste";

const PKG = paqueteQwen();
const chunks = join(PKG, "chunks");
console.log(`Qwen Code: ${PKG}`);

/* El mensaje se emite desde `reportClipboardUnavailable`, en el chunk de la UI. */
const candidatos = existsSync(chunks)
  ? readdirSync(chunks).filter((f) => f.endsWith(".js"))
  : [];

let hecho = false;
for (const f of candidatos) {
  const ruta = join(chunks, f);
  const s = readFileSync(ruta, "utf8");
  // Solo el sitio donde se avisa: los ficheros de locales también contienen la frase.
  if (!s.includes("reportClipboardUnavailable") || !s.includes("Clipboard image paste")) continue;

  if (s.includes(MARCADOR)) {
    console.log(`• aviso de pegado de imagen: ya estaba (${f})`);
    hecho = true;
    break;
  }
  if (!VIEJO.test(s)) {
    console.log(`  ⚠️  ${f}: tiene el aviso pero no lo reconozco (¿otra versión?)`);
    continue;
  }
  writeFileSync(ruta, s.replace(VIEJO, NUEVO));
  console.log(`• aviso de pegado de imagen: reescrito (${f})`);
  hecho = true;
  break;
}

/* Parche 2: Habilitar Ctrl+V en Windows.
   Qwen Code excluía ctrl:true en Windows:
     ["pasteClipboardImage"]:process.platform==="win32"?[{key:"v",command:true},{key:"v",meta:true}]:[{key:"v",ctrl:true},{key:"v",command:true}]
   dejando Ctrl+V inútil en PowerShell / Windows Terminal. Habilitamos ctrl:true en todas las plataformas. */
const KEY_VIEJO = '["pasteClipboardImage"]:process.platform==="win32"?[{key:"v",command:true},{key:"v",meta:true}]:[{key:"v",ctrl:true},{key:"v",command:true}]';
const KEY_NUEVO = '["pasteClipboardImage"]:[{key:"v",ctrl:true},{key:"v",command:true},{key:"v",meta:true}]';

for (const f of candidatos) {
  const ruta = join(chunks, f);
  const s = readFileSync(ruta, "utf8");
  if (s.includes(KEY_VIEJO)) {
    writeFileSync(ruta, s.replace(KEY_VIEJO, KEY_NUEVO));
    console.log(`• keybinding pasteClipboardImage: habilitado Ctrl+V en Windows (${f})`);
  } else if (s.includes(KEY_NUEVO)) {
    console.log(`• keybinding pasteClipboardImage: ya soportaba Ctrl+V (${f})`);
  }
}

if (hecho) {
  console.log("\n✅ Listo. Si el terminal no tiene portapapeles, el aviso ahora lo dice");
  console.log("   y explica el atajo: arrastra el fichero al terminal o pega su ruta.");
  console.log("   Tras `qwen update`, vuelve a lanzar este script.");
} else {
  console.log("\n⚠️  No encontré el aviso de pegado de imagen. ¿Ya estaba parcheado?");
  process.exitCode = 1;
}
process.exit(0);
