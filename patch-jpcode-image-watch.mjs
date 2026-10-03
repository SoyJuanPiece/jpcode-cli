#!/usr/bin/env node
/**
 * Adjunta sola las imágenes que llegan por el puente del navegador.
 *
 * `img-bridge.mjs` guarda en `~/.jpcode/tmp/clipboard/` los ficheros
 * `bridge-<fecha>-<azar>.<ext>` que la página del puente manda desde el navegador.
 * Este parche mete en el prompt de la UI interactiva un vigilante que mira esa
 * carpeta cada 1,2 s y, cuando aparece un `bridge-*` nuevo, lo añade a los adjuntos
 * (`setAttachments`) — el mismo sitio donde acaban las imágenes pegadas o
 * arrastradas. Resultado: pegas la captura en la pestaña del puente y en jpcode
 * aparece como adjunto sin tocar el terminal.
 *
 * Solo mira `bridge-*`, así que no interfiere con `clipboard-*` (las que el propio
 * CLI copia de un pegado o un arrastre). Los `bridge-*` que ya existían al arrancar
 * se marcan como vistos y no se adjuntan: no queremos resucitar imágenes viejas.
 *
 *   node jpcode/patch-jpcode-image-watch.mjs
 *
 * Idempotente y re-aplicable tras `qwen update`. Se puede desactivar en caliente con
 * `JPCODE_IMG_WATCH=0`. Rutas: QWEN_PKG (autodetectado).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
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

/* Ancla: final de `handleClipboardImage`, justo antes de `promotePastedImagePaths`.
   Ahí `setAttachments`, `uiState`, `path8`, `fs12` y `Storage` ya están en ámbito y
   seguimos dentro del cuerpo del componente (donde un hook es legal). El ancla **no**
   incluye la declaración siguiente: se inserta entre las dos. */
const ANCLA = ",[reportClipboardUnavailable]);";
const MARCADOR = "jpcodePuenteImagenes";
/* Una primera versión de este script se comía el `const` de al lado y dejaba la
   declaración duplicada (el chunk no arranca). Se detecta y se repara. */
const ROTO = "const promotePastedImagePaths=(0,import_react92.useEffect)";
const ROTO_ARREGLO = [ROTO, "(0,import_react92.useEffect)"];

// Todo dentro del try: si el temp dir no existe todavía, no pasa nada.
const VIGILANTE = `(0,import_react92.useEffect)(()=>{if(process.env.JPCODE_IMG_WATCH==="0")return;const vistos=new Set();let primera=true;const jpcodePuenteImagenes=async()=>{try{const dir=path8.join(Storage.getGlobalTempDir(),"clipboard");const nombres=await fs12.readdir(dir);for(const n of nombres){if(n.indexOf("bridge-")!==0 && n.indexOf("clip-")!==0)continue;const ext=n.slice(n.lastIndexOf(".")+1).toLowerCase();if(!["png","jpg","jpeg","gif","webp","bmp"].includes(ext))continue;if(vistos.has(n))continue;vistos.add(n);if(primera)continue;const p=path8.join(dir,n);setAttachments(prev=>prev.some(a=>a.path===p)?prev:[...prev,{id:String(Date.now()),path:p,filename:n}]);uiState.historyManager?.addItem({type:"info",text:"Imagen pegada desde el portapapeles: "+n},Date.now())}primera=false}catch{}};jpcodePuenteImagenes();const t=setInterval(jpcodePuenteImagenes,800);return()=>clearInterval(t)},[]);`;

/* Fallback inmediato en handleClipboardImage: si el módulo nativo falla al pulsar Ctrl+V,
   revisa la carpeta de portapapeles donde clipboard-watch.mjs guarda las capturas. */
const HANDLE_VIEJO = 'const handleClipboardImage=(0,import_react92.useCallback)(async(validated=false)=>{try{const hasImage=validated||await clipboardHasImage(reportClipboardUnavailable);if(hasImage){const imagePath=await saveClipboardImage(Storage.getGlobalTempDir());if(imagePath){cleanupOldClipboardImages(Storage.getGlobalTempDir()).catch(()=>{});const filename=path8.basename(imagePath);const newAttachment={id:String(Date.now()),path:imagePath,filename};setAttachments(prev=>[...prev,newAttachment])}}}catch(error){debugLogger28.error("Error handling clipboard image:",error)}},[reportClipboardUnavailable]);';
const HANDLE_NUEVO = 'const handleClipboardImage=(0,import_react92.useCallback)(async(validated=false)=>{try{let attached=false;try{const hasImage=validated||await clipboardHasImage(()=>{});if(hasImage){const imagePath=await saveClipboardImage(Storage.getGlobalTempDir());if(imagePath){cleanupOldClipboardImages(Storage.getGlobalTempDir()).catch(()=>{});const filename=path8.basename(imagePath);setAttachments(prev=>[...prev,{id:String(Date.now()),path:imagePath,filename}]);attached=true}}}catch{}if(!attached){try{const dir=path8.join(Storage.getGlobalTempDir(),"clipboard");const nombres=await fs12.readdir(dir);const ahora=Date.now();let mejor=null;let mejorMtime=0;for(const n of nombres){if(n.indexOf("bridge-")!==0&&n.indexOf("clip-")!==0)continue;const p=path8.join(dir,n);const st=await fs12.stat(p);if(st.mtimeMs>mejorMtime&&ahora-st.mtimeMs<60000){mejor=p;mejorMtime=st.mtimeMs}}if(mejor){setAttachments(prev=>prev.some(a=>a.path===mejor)?prev:[...prev,{id:String(Date.now()),path:mejor,filename:path8.basename(mejor)}]);attached=true}}catch{}}if(!attached){reportClipboardUnavailable()}}catch(error){debugLogger28.error("Error handling clipboard image:",error)}},[reportClipboardUnavailable]);';

const PKG = paqueteQwen();
const chunks = join(PKG, "chunks");
console.log(`Qwen Code: ${PKG}`);

const candidatos = existsSync(chunks) ? readdirSync(chunks).filter((f) => f.endsWith(".js")) : [];

let hecho = false;
for (const f of candidatos) {
  const ruta = join(chunks, f);
  let s = readFileSync(ruta, "utf8");

  // Parchear handleClipboardImage para fallback en Ctrl+V
  if (s.includes(HANDLE_VIEJO)) {
    s = s.replace(HANDLE_VIEJO, HANDLE_NUEVO);
    writeFileSync(ruta, s);
    console.log(`• handleClipboardImage: añadido fallback a carpeta de portapapeles (${f})`);
  }

  if (s.includes(MARCADOR)) {
    let nuevo = s;
    if (nuevo.includes(ROTO)) {
      nuevo = nuevo.replace(ROTO, ROTO_ARREGLO[1]);
      console.log(`• vigilante de imágenes: reparado (${f})`);
    }
    if (nuevo.includes('if(n.indexOf("bridge-")!==0)continue;')) {
      nuevo = nuevo
        .replace('if(n.indexOf("bridge-")!==0)continue;', 'if(n.indexOf("bridge-")!==0 && n.indexOf("clip-")!==0)continue;')
        .replace("Imagen pegada desde el navegador:", "Imagen pegada desde el portapapeles:")
        .replace("setInterval(jpcodePuenteImagenes,1200)", "setInterval(jpcodePuenteImagenes,800)");
      console.log(`• vigilante de imágenes: actualizado con soporte clip-* (${f})`);
    } else {
      console.log(`• vigilante de imágenes: ya estaba al día (${f})`);
    }
    if (nuevo !== s) writeFileSync(ruta, nuevo);
    hecho = true;
    break;
  }

  if (s.split(ANCLA).length - 1 !== 1) continue; // ancla ausente o ambigua
  s = s.replace(ANCLA, ANCLA + VIGILANTE);
  writeFileSync(ruta, s);
  console.log(`• vigilante de imágenes: instalado (${f})`);
  hecho = true;
  break;
}

if (hecho) {
  console.log("\n✅ Listo. Levanta el puente (node jpcode/img-bridge.mjs), abre su URL en el");
  console.log("   navegador y pega ahí la imagen: aparecerá como adjunto en jpcode.");
  console.log("   Tras `qwen update`, vuelve a lanzar este script.");
} else {
  console.log("\n⚠️  No encontré dónde insertar el vigilante. ¿Cambió la versión de Qwen Code?");
  process.exitCode = 1;
}
process.exit(0);
