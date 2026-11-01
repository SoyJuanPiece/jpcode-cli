#!/usr/bin/env node
/**
 * Añade los modelos de visión de Zen al registro de modalidades del motor.
 *
 * El motor (chunk-DJLLLYKC.js) tiene un array `MODALITY_PATTERNS` que
 * decide si un modelo soporta imagen/vídeo. Los modelos libres de Zen
 * (mimo-v2.6-flash-free, glm-5.3-flash-free, nemotron-3.5-super-vl-free, …)
 * no estaban en ese array y el motor los trataba como texto, con lo que:
 *   - `getEffectiveInputModalities().image` devolvía `false`.
 *   - `zoom_image` rechazaba: "requires a model that accepts image inputs".
 *   - Las imágenes pegadas (Ctrl+V) se omitían al mandar la petición.
 *
 * Además el `MAX_BODY` del gateway era 2 MB: demasiado pequeño para
 * imágenes en base64. Eso lo corrige el gateway/server.mjs directamente.
 *
 *   node jpcode/patch-jpcode-vision.mjs
 *
 * Idempotente y re-aplicable tras `bash vendor-engine.sh`. Rutas: QWEN_PKG.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
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
console.log(`Qwen Code: ${PKG}`);

if (!existsSync(chunks)) {
  console.error("  ⚠️  no existe el directorio chunks");
  process.exit(1);
}

// El marcador para detectar que ya se aplicó el parche
const MARKER = "/^mimo[-v]/";

// La pieza que queremos insertar al principio de MODALITY_PATTERNS
const INSERT = "[/^mimo[-v]/,{image:true,video:true}],[/^glm-5\\.3/,{image:true,video:true}],[/^deepseek-v4\\.1/,{image:true}],[/^nemotron-3\\.5-super-vl/,{image:true}],";

// El ancla estable: el primer patrón del array original
const ANCHOR = "MODALITY_PATTERNS=[[/^gemini-3/,FULL_MULTIMODAL]";
const NEW_ANCHOR = `MODALITY_PATTERNS=[[${INSERT}[/^gemini-3/,FULL_MULTIMODAL]`;

const candidatos = readdirSync(chunks).filter((f) => f.endsWith(".js"));

let hecho = false;
for (const f of candidatos) {
  const ruta = join(chunks, f);
  const s = readFileSync(ruta, "utf8");
  if (!s.includes("MODALITY_PATTERNS")) continue;
  if (!s.includes("defaultModalities")) continue;

  if (s.includes(MARKER)) {
    console.log(`• MODALITY_PATTERNS: ya parcheado (${f})`);
    hecho = true;
    break;
  }

  if (!s.includes(ANCHOR)) {
    console.log(`  ⚠️  ${f}: tiene MODALITY_PATTERNS pero el ancla cambió (¿otra versión?)`);
    continue;
  }

  const nuevo = s.replace(ANCHOR, NEW_ANCHOR);
  writeFileSync(ruta, nuevo);

  // Verificar sintaxis
  try {
    execSync(`node --check "${ruta}"`, { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    // Revertir
    writeFileSync(ruta, s);
    console.error(`  ⚠️  ${f}: el parche rompe la sintaxis; revertido`);
    process.exit(1);
  }

  console.log(`• MODALITY_PATTERNS: mimo/glm/deepseek/nemotron añadidos (${f})`);
  hecho = true;
  break;
}

if (!hecho) {
  console.log("  ⚠️  No se encontró MODALITY_PATTERNS. ¿Versión distinta del motor?");
  process.exitCode = 1;
} else {
  console.log("\n✅ Listo. Los modelos de visión de Zen ahora se declaran como multimodales.");
  console.log("   mimo-v2.6-flash-free, glm-5.3-flash-free, nemotron-3.5-super-vl-free");
  console.log("   y deepseek-v4-flash-vision-exp aceptan imágenes desde el motor.");
  console.log("   Tras `qwen update` o `vendor-engine.sh`, relanza este script.");
}
process.exit(0);
