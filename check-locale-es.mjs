#!/usr/bin/env node
/**
 * Cuánto español hay realmente en `locales/es.js`, y si lo que hay está bien.
 *
 * ## Por qué hace falta
 *
 * El motor, cuando no encuentra una clave en el idioma activo, cae al inglés sin
 * avisar: la pantalla sale mezclada y no se ve a simple vista qué falta. Aquí se
 * mide eso, y además se comprueba lo único que puede salir mal de verdad —que una
 * traducción pierda un `{{algo}}` o se coma una llave— porque eso **sí** se ve en
 * pantalla, como un `{{count}}` en crudo o un `Error` sin su mensaje.
 *
 *   node jpcode/check-locale-es.mjs            # resumen y avisos
 *   node jpcode/check-locale-es.mjs --faltan  # lista de las que faltan
 *   node jpcode/check-locale-es.mjs --grupo   # agrupa por prefijo, para por dónde seguir
 *
 * Sale con código 1 si hay una traducción rota, para poder ponerlo en un `&&`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const motor = process.env.JPCODE_ENGINE ?? process.env.QWEN_PKG ?? join(AQUI, "engine");

const CATALOGO_ES = join(AQUI, "locales", "es.js");
if (!existsSync(CATALOGO_ES)) {
  console.error(`No existe ${CATALOGO_ES}`);
  process.exit(1);
}

/* El catálogo inglés vive en un chunk con el hash en el nombre, así que se
   busca en vez de escribirlo: cambia en cada versión del motor. */
function catalogoIngles() {
  const dir = join(motor, "chunks");
  if (!existsSync(dir)) {
    throw new Error(
      `No está el motor en ${motor}. Traelo con \`bash vendor-engine.sh\` o pasa JPCODE_ENGINE=/ruta.`,
    );
  }
  const english = readdirSync(dir).find((f) => /^en-[A-Z0-9]+\.js$/.test(f));
  if (!english) throw new Error(`No encuentro el locale inglés en ${dir}`);
  return { fichero: english, ruta: join(dir, english) };
}

const { fichero: ficheroEn, ruta: rutaEn } = catalogoIngles();
const en = (await import(`file://${rutaEn}`)).default;
const es = (await import(`file://${CATALOGO_ES}`)).default;

const soloTexto = (d) => Object.keys(d).filter((k) => typeof d[k] === "string");
const clavesEn = soloTexto(en);
const clavesEs = soloTexto(es);

/* Una traducción está mal si no conserva los mismos huecos que el inglés. Es el
   fallo que más se nota: sale el `{{...}}` en pantalla tal cual. */
const huecos = (s) => (s.match(/\{\{\w+\}\}/g) || []).sort();
const rotas = clavesEs.filter((k) => k in en && huecos(es[k]).join("|") !== huecos(en[k]).join("|"));

/* Las que no existen en el inglés pueden ser dos cosas muy distintas:
 *
 *  a) El motor llama a `t("...")` con una clave que el catálogo inglés no define
 *     (en 0.24.7 eran 456). Esas también se traducen aquí: si no, se verían en
 *     inglés porque `t()` devuelve la propia clave cuando no encuentra nada.
 *  b) Alguien escribió una clave que el motor nunca pide. Eso es un error de
 *     dedo y hay que verlo.
 *
 * Para distinguirlas se rastrea el motor. Es lo que hace `pedidasPorElMotor()`. */
function pedidasPorElMotor() {
  const dir = join(motor, "chunks");
  const pedidas = new Set();
  if (!existsSync(dir)) return pedidas;
  for (const f of readdirSync(dir)) {
    // Los catálogos de idioma son los únicos ficheros donde `t("...")` es una
    // traducción literal y no una llamada; si no, cada idioma se contaría a sí mismo.
    if (!f.endsWith(".js") || /^[a-z]{2}(-[A-Za-z]{2,4})?-[A-Z0-9]+\.js$/.test(f)) continue;
    const s = readFileSync(join(dir, f), "utf8");
    for (const m of s.matchAll(/\bt\("((?:[^"\\]|\\.){2,90})"/g)) {
      try {
        pedidas.add(JSON.parse(`"${m[1]}"`));
      } catch { /* literal que no es JSON válido */ }
    }
  }
  return pedidas;
}

const pedidas = pedidasPorElMotor();
const huerfanas = clavesEs.filter((k) => !(k in en) && !pedidas.has(k));
const soloEnElMotor = clavesEs.filter((k) => !(k in en) && pedidas.has(k));

const faltan = clavesEn.filter((k) => !(k in es));
const pct = ((clavesEn.filter((k) => k in es).length / clavesEn.length) * 100).toFixed(1);

console.log(`inglés: ${ficheroEn} (${clavesEn.length} claves)`);
console.log(`español: locales/es.js (${clavesEs.length} claves)\n`);
console.log(`cobertura del catálogo: ${pct}%  (${clavesEn.filter((k) => k in es).length}/${clavesEn.length})`);
console.log(`extra para el motor: ${soloEnElMotor.length} clave(s) que el motor pide y el`);
console.log(`catálogo inglés no define (también traducidas)\n`);

if (rotas.length) {
  console.log(`❌ ${rotas.length} traducción(es) con los huecos cambiados:`);
  for (const k of rotas) {
    console.log(`   ${JSON.stringify(k)}`);
    console.log(`     en: ${JSON.stringify(en[k])}`);
    console.log(`     es: ${JSON.stringify(es[k])}`);
  }
  console.log();
}
if (huerfanas.length) {
  console.log(`⚠️  ${huerfanas.length} clave(s) que no existen en el inglés:`);
  for (const k of huerfanas.slice(0, 20)) console.log(`   ${JSON.stringify(k)}`);
  if (huerfanas.length > 20) console.log(`   … y ${huerfanas.length - 20} más`);
  console.log();
}

if (process.argv.includes("--faltan")) {
  for (const k of faltan) console.log(JSON.stringify(k));
} else if (process.argv.includes("--grupo")) {
  const grupos = new Map();
  for (const k of faltan) {
    const g = k.includes(".") ? k.slice(0, k.indexOf(".")) : "(suelto)";
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(k);
  }
  const orden = [...grupos.entries()].sort((a, b) => a[1].length - b[1].length);
  for (const [g, ks] of orden) console.log(`${String(ks.length).padStart(5)}  ${g}`);
} else if (faltan.length) {
  console.log(`Faltan ${faltan.length}. Para ver cuáles: --faltan`);
  console.log(`Para ver por dónde seguir (de menos a más común): --grupo`);
}

process.exit(rotas.length || huerfanas.length ? 1 : 0);