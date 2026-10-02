#!/usr/bin/env node
/**
 * Que la terminal deje de parpadear mientras el modelo "piensa".
 *
 * ## Qué pasa
 *
 * Cuando el modelo está pensando, la línea de trabajo cambia **mucho**: el spinner
 * gira cada `SPINNER_INTERVAL_MS` (80 ms) y, mientras llega la respuesta, el contador
 * de tokens se anima cada 100 ms. Es decir, entre 10 y 12 cuadros por segundo.
 *
 * Cada cuadro lo pinta el renderizador **estándar** de ink, que no diffing: borra
 * todas las líneas del cuadro anterior y las vuelve a escribir enteras
 * (`createStandard` → `eraseLines(previousLines.length) + str`). Con el viewport
 * virtual (el de por defecto) el cuadro incluye la **banner entera de 6 líneas con
 * degradado**, así que a 12 Hz se borra y se reconstruye la mitad de la pantalla
 * docenas de veces por segundo.
 *
 * En un terminal local eso casi ni se nota. En el terminal web de VS Code o en un
 * Cloud Workstations, donde el pintado va por la red y no hay salida atómica, se ve
 * **el parpadeo**: la pantalla se queda en negro un instante y se vuelve a pintar.
 *
 * ## Qué hace el motor para evitarlo
 *
 * Dos cosas, y las dos están ya escritas:
 *
 *   1. Envolver cada cuadro en *synchronized output* (`ESC[?2026h` … `ESC[?2026l`),
 *      que le dice al terminal "no ensayes hasta que te lo diga". Sirve donde el
 *      terminal lo soporta (iTerm2, WezTerm, kitty, Windows Terminal); en el resto no.
 *   2. Un segundo renderizador, `createIncremental`, que **sí** compara línea a línea
 *      con el cuadro anterior y solo reescribe las que han cambiado
 *      (`chunk-XZQH4UBR.js`).
 *
 * El segundo está implemented pero apagado: `render()` pasa
 * `incrementalRendering:false` por defecto, así que nunca se usa. Con él, un giro del
 * spinner reescribe **una** línea (`  ◐ Thinking… (1s · esc to cancel)`) en vez de
 * once, y no borra nada.
 *
 * Medido en la misma sesión, con el mismo modelo: 128 KB → 8 KB escritos y 343
 * borrados de línea → 3.
 *
 * ## El parche
 *
 * Enciende ese renderizador en el punto donde la UI arranca
 * (`render_default(appTree, { …, alternateScreen: useVP, … })`): una propiedad más en
 * un objeto literal.
 *
 * Con `JPCODE_INCREMENTAL_RENDER=0` se deja como estaba (por si en algún terminal
 * concreto saliera mal; el resto de jpcode sigue igual).
 *
 *   node jpcode/patch-jpcode-render.mjs
 *
 * Idempotente y re-aplicable tras `bash vendor-engine.sh`. Rutas: QWEN_PKG.
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
const UI = "startInteractiveUI-ZKYQSLKT.js";

/* El motor pasa las opciones a `render()` con este objeto. El nombre de la función
   minificada cambia entre versiones, así que no se busca `render(`: se ancla en
   `alternateScreen`, que es el nombre de la opción y sí es estable. */
const ANCLA = /alternateScreen:([A-Za-z_$][\w$]*),/g;
const AÑADIDO = 'incrementalRendering:process.env.JPCODE_INCREMENTAL_RENDER!=="0",';
const MARCADOR = "JPCODE_INCREMENTAL_RENDER";

const ruta = join(chunks, UI);
if (!existsSync(ruta)) {
  console.error(`  ⚠️  no existe ${UI}`);
  process.exit(1);
}

const antes = readFileSync(ruta, "utf8");

if (antes.includes(MARCADOR)) {
  console.log("• renderizado incremental: ya estaba encendido");
  console.log("\n✅ Listo. La terminal deja de parpadear al pensar.");
  console.log("   (JPCODE_INCREMENTAL_RENDER=0 lo vuelve a apagar.)");
  process.exit(0);
}

let n = 0;
const despues = antes.replace(ANCLA, (todo, ident) => {
  n++;
  return `${todo}${AÑADIDO}`;
});

if (n === 0) {
  console.error(`  ⚠️  ${UI}: no encuentro el objeto de opciones de render (¿otra versión?)`);
  process.exit(1);
}

writeFileSync(ruta, despues);
console.log(`• ${UI}: renderizado incremental encendido (${n} sitio(s))`);

/* Comprobación mínima: que la opción llegue de verdad al renderizador. Si el motor
   cambiara la firma, el parche no serviría de nada y es mejor enterarse aquí que
   en un parpadeo que nadie sabe de dónde sale. */
const runtime = join(chunks, "chunk-XZQH4UBR.js");
if (!existsSync(runtime) || !readFileSync(runtime, "utf8").includes("incremental:options.incrementalRendering")) {
  console.error("  ⚠️  el motor ya no encadena options.incrementalRendering al renderizador: el parche no hace nada");
  process.exit(1);
}

console.log("\n✅ Listo. La terminal deja de parpadear al pensar: ahora se reescribe");
console.log("   solo la línea que cambia, en vez de borrar y repintar la pantalla 12 veces/s.");
console.log("   (JPCODE_INCREMENTAL_RENDER=0 lo deja como estaba.)");
process.exit(0);
