#!/usr/bin/env node
/**
 * Renderizado incremental de ink: apagado por defecto, con guarda, y aun así
 * experimental. Lo que está aquí abajo son las tres cosas que hace.
 *
 * ## Qué pasa
 *
 * Cuando el modelo está pensando, la línea de trabajo cambia **mucho**: el spinner
 * gira cada `SPINNER_INTERVAL_MS` (80 ms) y, mientras llega la respuesta, el contador
 * de tokens se anima cada 100 ms. Es decir, entre 10 y 12 cuadros por segundo.
 *
 * Cada cuadro lo pinta el renderizador **estándar** de ink, que no diffing: borra
 * todas las líneas del cuadro anterior y las vuelve a escribir enteras
 * (`createStandard` → `eraseLines(previousLineCount) + str`). Con el viewport
 * virtual (el de por defecto) el cuadro incluye el **banner entero de 6 líneas con
 * degradado**, así que a 12 Hz se borra y se reconstruye la mitad de la pantalla
 * docenas de veces por segundo.
 *
 * En un terminal local eso casi ni se nota. En el terminal web de VS Code o en un
 * Cloud Workstations, donde el pintado va por la red y no hay salida atómica, se ve
 * **el parpadeo**: la pantalla se queda en negro un instante y se vuelve a pintar.
 *
 * ## El motor trae otro renderizador, y por qué no es el predeterminado
 *
 * `createIncremental` (`chunk-XZQH4UBR.js`) **sí** compara línea a línea con el
 * cuadro anterior y solo reescribe las que han cambiado. Medido en la misma sesión,
 * con el mismo modelo: 128 KB → 8 KB escritos y 343 borrados de línea → 3. Un giro
 * del spinner reescribe **una** línea (`  ◐ Thinking… (1s · esc to cancel)`) en vez
 * de once. El problema es que **ese ahorro sale a costa de la pantalla**.
 *
 * El incremental empieza cada cuadro posicionándose **desde el cursor** y luego se
 * salta con `ESC[E` toda línea cuyo texto no ha cambiado. Eso da por supuesto que el
 * cuadro anterior sigue estando físicamente donde se pintó, y con el viewport
 * virtual sobre la *alternate screen* no siempre es verdad: en cuanto el chat crece
 * más que la ventana, escribir el cuadro **desplaza la pantalla**, las filas físicas
 * dejan de coincidir con `previousLines`, el diff da por "igual" líneas que ya no lo
 * son y —como solo reescribe lo que cambia— **el error no se cura solo**. Sale una
 * fila duplicada de la de arriba, una línea de estado vieja que nunca se borra
 * (`◐ Thinking…` y `◓ Pondering…` a la vez) o líneas cortadas a medias.
 *
 * Medido con un emulador VT que reconstruye la pantalla cuadro a cuadro (100×30,
 * cuatro mensajes largos seguidos, para que el chat crezca y haya scroll), contando
 * solo filas enfermas de verdad —dos filas de texto idénticas seguidas, o una fila
 * que es un fragmento recortado de la de arriba—:
 *
 * | variante                                | cuadros | con filas enfermas | racha máx. | último cuadro |
 * | --------------------------------------- | ------- | -------- | ---------- | ------------- |
 * | estándar (lo que hay por defecto)       |   1798  |    **0** |     **0**  | limpio        |
 * | incremental sin guarda                  |   1659  |  **706** |    **294** | **roto**      |
 * | incremental con esta guarda             | 1545/1788 | **0 / 118** | 0 / 40 | limpio        |
 *
 * ## Las tres cosas que hace este parche
 *
 * 1. **La opción, apagada por defecto.** Añade `incrementalRendering` al objeto de
 *    opciones que el motor pasa a `render()`, con **la condición invertida**: solo
 *    se enciende si se pide a mano.
 *
 *      - por defecto → `false`: el renderizador estándar, el que no se rompe. Puede
 *        parpadear al pensar en un terminal lento; es el precio de que la pantalla
 *        sea siempre la correcta.
 *      - `JPCODE_INCREMENTAL_RENDER=1` → el incremental, que escribe 7-10 veces
 *        menos. **Experimental, y todavía no se puede usar a diario.**
 *
 * 2. **La guarda de desplazamiento** dentro de `createIncremental`, para que el modo
 *    experimental se rompa lo menos posible. Antes de diffear cuadro a cuadro se
 *    comprueba si ese diff es válido; si no lo es, ese cuadro se borra y se reescribe
 *    entero (lo que haría el estándar). Se cae en la reescritura entera cuando:
 *
 *      - **el cuadro no cabe en la pantalla** (`stream.rows`). Es el caso real: se
 *        han medido cuadros de 37 líneas en un terminal de 30. Escribirlos
 *        desplaza la pantalla, y a partir de ahí cada `ESC[E` se salta una línea
 *        que no era.
 *      - **el contenido se ha desplazado** respecto al cuadro anterior: se busca el
 *        mayor desplazamiento *k* (en los dos sentidos) con el que el cuadro nuevo
 *        encaja sobre el anterior, y si encaja con claridad el diff posicional ya
 *        no vale. No se mira si la última línea cambia: el spinner la cambia en
 *        todos los cuadros, así que eso no distingue nada.
 *
 * 3. **Nada más.** La guarda va dentro de la rama del incremental, así que el modo
 *    por defecto (el estándar) no la toca en absoluto.
 *
 * ## Por qué, con la guarda, el incremental no vuelve a ser el predeterminado
 *
 * Porque la guarda **reduce** el desastre pero no lo quita. En la primera sesión de
 * comprobación salió limpia (0 filas enfermas); en la segunda, con el mismo guion,
 * quedaron 118 cuadros con filas enfermas y una racha de 40. Es decir: la causa
 * principal (los cuadros que no caben) estátapada, pero queda otra que no lo está —
 * y el incremental solo reescribe lo que cambia, así que en cuanto se equivoca una
 * vez la pantalla se queda mal hasta que el cuadro vuelve a caber.
 *
 * Un parpadeo leve se tolera; una pantalla corrupta no. Con un fotograma por debajo
 * del estándar en una de las dos sesiones, el predeterminado se queda en el
 * estándar. La guarda se queda igualmente, porque el modo experimental con ella es
 * unas seis veces menos malo y no cuesta nada cuando está apagado.
 *
 *   node jpcode/patch-jpcode-render.mjs
 *
 * Idempotente y re-aplicable tras `bash vendor-engine.sh`. Rutas: QWEN_PKG.
 *
 * ## Deshacer
 *
 * Las dos piezas son reversibles por separado, sin reescribir el chunk:
 *
 *   - opción: `incrementalRendering:process.env.JPCODE_INCREMENTAL_RENDER==="1",`
 *             → borrar esa propiedad del objeto de opciones de `render()`.
 *   - guarda: `if(str==="\n"||previousOutput.length===0||!jpcodeDiffUtil(…)){`
 *             → volver a `if(str==="\n"||previousOutput.length===0){` y borrar el
 *             `var jpcodeDiffUtil=…` que precede a `var createIncremental=`.
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
const RUNTIME = "chunk-XZQH4UBR.js";

/* El motor pasa las opciones a `render()` con este objeto. El nombre de la función
   minificada cambia entre versiones, así que no se busca `render(`: se ancla en
   `alternateScreen`, que es el nombre de la opción y sí es estable. */
const ANCLA = /alternateScreen:([A-Za-z_$][\w$]*),/g;
const AÑADIDO = 'incrementalRendering:process.env.JPCODE_INCREMENTAL_RENDER==="1",';
const MARCADOR = "JPCODE_INCREMENTAL_RENDER";
/* Cualquier condición que hubiera puesto este parche antes (p. ej. `!== "0"`), para
   poder reaplicarlo y dejar siempre la misma. */
const CUALQUIERA = new RegExp(`incrementalRendering:[^,]*${MARCADOR}[^,]*,`, "g");

/* ---- parte 1: la opción de render, apagada salvo que se pida ---- */
const ruta = join(chunks, UI);
if (!existsSync(ruta)) {
  console.error(`  ⚠️  no existe ${UI}`);
  process.exit(1);
}

const antes = readFileSync(ruta, "utf8");

if (antes.includes(AÑADIDO)) {
  console.log(`• ${UI}: la opción de render ya está en su forma final (incremental apagado salvo =1)`);
} else {
  let n = 0;
  let despues = antes.replace(CUALQUIERA, AÑADIDO);
  if (despues !== antes) {
    n = (antes.match(CUALQUIERA) || []).length;
  } else {
    despues = antes.replace(ANCLA, (todo) => {
      n++;
      return `${todo}${AÑADIDO}`;
    });
  }
  if (n === 0) {
    console.error(`  ⚠️  ${UI}: no encuentro el objeto de opciones de render (¿otra versión?)`);
    process.exit(1);
  }
  writeFileSync(ruta, despues);
  console.log(`• ${UI}: opción de render puesta, incremental apagado salvo =1 (${n} sitio(s))`);
}

/* Comprobación mínima: que la opción llegue de verdad al renderizador. Si el motor
   cambiara la firma, el parche no serviría de nada y es mejor enterarse aquí que
   en un parpadeo que nadie sabe de dónde sale. */
const runtime = join(chunks, RUNTIME);
if (!existsSync(runtime)) {
  console.error(`  ⚠️  no existe ${RUNTIME}: el motor no trae el renderizador de ink`);
  process.exit(1);
}
if (!readFileSync(runtime, "utf8").includes("incremental:options.incrementalRendering")) {
  console.error("  ⚠️  el motor ya no encadena options.incrementalRendering al renderizador: el parche no hace nada");
  process.exit(1);
}

/* ---- parte 2: la guarda de desplazamiento dentro de createIncremental ----
   El incremental se posiciona desde el cursor y se salta con ESC[E toda línea cuyo
   texto no ha cambiado: da por supuesto que el cuadro anterior sigue físicamente
   donde se pintó. Se comprueba si el diff es válido y, si no lo es, ese cuadro se
   borra y se reescribe entero, que es lo que haría el renderizador estándar. */
const ANCLA_GUARDA = "var createIncremental=__name(";
const CONDICION = 'if(str==="\\n"||previousOutput.length===0){';
const CONDICION_GUARDADA =
  'if(str==="\\n"||previousOutput.length===0||!jpcodeDiffUtil(stream,previousLines,nextLines,visibleCount,previousVisible)){';
const MARCADOR_GUARDA = "jpcodeDiffUtil";
const GUARDA =
  'var jpcodeDiffUtil=__name((stream,prev,next,vis,visPrev)=>{' +
  'const alto=stream&&typeof stream.rows==="number"?stream.rows:0;' +
  "if(alto>0&&(vis>alto||visPrev>alto))return false;" +
  "const a=prev.length,b=next.length;if(a<4||b<4)return true;const lim=Math.min(a,b)-2;" +
  "for(let k=1;k<=lim;k++){const need=a-k;if(need<3)break;let m=0;for(let i=0;i<need;i++){if(next[i+k]===prev[i])m++}if(m>=3&&m*10>=need*7)return false}" +
  "for(let k=1;k<=lim;k++){const need=b-k;if(need<3)break;let m=0;for(let i=0;i<need;i++){if(next[i]===prev[i+k])m++}if(m>=3&&m*10>=need*7)return false}" +
  'return true},"jpcodeDiffUtil");';

const rt = readFileSync(runtime, "utf8");
if (rt.includes(MARCADOR_GUARDA)) {
  console.log(`• ${RUNTIME}: la guarda de desplazamiento ya está puesta`);
} else {
  if (!rt.includes(ANCLA_GUARDA) || !rt.includes(CONDICION)) {
    console.error(`  ⚠️  ${RUNTIME}: no encuentro el diff de createIncremental (¿otra versión?)`);
    process.exit(1);
  }
  const nuevo = rt.replace(ANCLA_GUARDA, `${GUARDA}${ANCLA_GUARDA}`).replace(CONDICION, CONDICION_GUARDADA);
  if (!nuevo.includes(MARCADOR_GUARDA) || !nuevo.includes(CONDICION_GUARDADA) || nuevo.includes(CONDICION)) {
    console.error(`  ⚠️  ${RUNTIME}: la guarda no ha quedado bien puesta`);
    process.exit(1);
  }
  writeFileSync(runtime, nuevo);
  console.log(`• ${RUNTIME}: guarda de desplazamiento puesta en createIncremental`);
}

/* Y que los chunks sigan siendo JavaScript, claro. */
for (const c of [ruta, runtime]) {
  try {
    execSync(`node --check "${c}"`, { stdio: ["ignore", "ignore", "pipe"] });
  } catch {
    console.error(`  ⚠️  ${c.split("/").pop()}: el chunk no pasa node --check; el parche queda mal`);
    process.exit(1);
  }
}

console.log("\n✅ Listo. La pantalla va con el renderizador estándar: no se rompe al");
console.log("   desplazar el chat, aunque pueda parpadear al pensar en un terminal lento.");
console.log("   El incremental queda como experimento: JPCODE_INCREMENTAL_RENDER=1");
console.log("   (escribe 7-10 veces menos; la guarda le quita la causa principal de que");
console.log("   se rompa, pero no todas: sigue sin ser usable a diario).");
process.exit(0);
