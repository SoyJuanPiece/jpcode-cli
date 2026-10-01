#!/usr/bin/env node
/**
 * Deja `/connect` (y `/provider`) como el «Connect a provider» de OpenCode:
 * un solo paso, catálogo completo y buscador a mano.
 *
 * Qwen ya trae el diálogo y su alias `/connect`, pero arranca en un menú de tres
 * opciones (Alibaba / Third-party / Custom) y hay que bajar a la lista. Aquí se
 * hace que:
 *
 *   1. `/provider` sea otro alias del diálogo de conexión (antes era un comando
 *      de texto; ese sigue existiendo como `/providers`).
 *   2. El diálogo abra DIRECTAMENTE en el catálogo de proveedores —con el
 *      buscador que añade patch-qwen-auth.mjs—, con Esc para volver al menú.
 *   3. El título de esa pantalla sea «Connect a Provider», como en OpenCode.
 *   4. El «Custom Provider» (el de pegar tu propia Base URL + API key) salga
 *      también en esa lista. Qwen lo deja en el menú principal y la lista de
 *      terceros solo filtra `uiGroup==="third-party"`, así que sin esto no se
 *      llega a él sin volver atrás con Esc.
 *
 *     node opencode-chat/patch-qwen-connect.mjs
 *
 * Idempotente y re-aplicable tras `qwen update` (que reemplaza los chunks).
 * Requiere patch-qwen-providers.mjs (el catálogo) y patch-qwen-auth.mjs (el
 * buscador) para que la pantalla tenga contenido que buscar.
 *
 * Rutas: QWEN_PKG (por defecto, autodetección).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

/* ---------- localizar el paquete de Qwen Code ---------- */
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

/* ---------- 1) `/provider` → alias del diálogo de conexión ---------- */
const AUTH = "chunk-CTFVQBHD.js";
const ALT_VIEJO = 'altNames:["connect","login"]';
const ALT_NUEVO = 'altNames:["connect","login","provider"]';

/* ---------- 2) el diálogo abre directo en el catálogo ---------- */
// El alias del import de React cambia entre variantes (import_react28, import_react41…),
// así que se captura en vez de fijarlo.
const VISTA_RE = /\[viewLevel,setViewLevel\]=\(0,([A-Za-z0-9_$.]+)useState\)\("main"\)/;
const VISTA_MARCADOR = '.useState)("thirdparty-select")';
const VISTA_NUEVO = '[viewLevel,setViewLevel]=(0,$1useState)("thirdparty-select")';

/* ---------- 3) título de esa pantalla, como en OpenCode ---------- */
// En el fichero es el escape \xB7, no el carácter · (minificado).
const TITULO_VIEJO = '"thirdparty-select":t("Third-party Providers \\xB7 Provider")';
const TITULO_NUEVO = '"thirdparty-select":t("Connect a Provider")';

/* ---------- 4) el Custom Provider, dentro de la lista de terceros ---------- */
// Así se llega a «custom» escribiendo su nombre en el buscador, sin Esc.
const PROV_CHUNK = "chunk-NCUN26F4.js";
const LISTA_VIEJA = 'var THIRD_PARTY_PROVIDERS=ALL_PROVIDERS.filter(p=>p.uiGroup==="third-party");';
const LISTA_NUEVA =
  'var THIRD_PARTY_PROVIDERS=ALL_PROVIDERS.filter(p=>p.uiGroup==="third-party"||p.uiGroup==="custom");';

const DIALOGOS = ["startInteractiveUI-ZKYQSLKT.js", "start-opentui-ui-U4KEWT3A.js"];

let cambios = 0;

/** Reemplazo literal, idempotente, sobre un fichero de `chunks/`. */
function literal(fichero, viejo, nuevo, marcador, etiqueta) {
  const ruta = join(chunks, fichero);
  if (!existsSync(ruta)) {
    console.log(`  ⚠️  no existe ${fichero}`);
    return false;
  }
  const s = readFileSync(ruta, "utf8");
  if (s.includes(marcador)) {
    console.log(`• ${etiqueta}: ya estaba`);
    return true;
  }
  if (!s.includes(viejo) || s.split(viejo).length - 1 !== 1) {
    console.log(`  ⚠️  ${etiqueta}: no encontré el fragmento una sola vez (¿otra versión?)`);
    return false;
  }
  writeFileSync(ruta, s.replace(viejo, nuevo));
  console.log(`• ${etiqueta}: parcheado`);
  cambios++;
  return true;
}

/** Igual, pero con patrón (para el alias del import de React). */
function patron(fichero, re, nuevo, marcador, etiqueta) {
  const ruta = join(chunks, fichero);
  if (!existsSync(ruta)) {
    console.log(`  ⚠️  no existe ${fichero}`);
    return false;
  }
  const s = readFileSync(ruta, "utf8");
  if (s.includes(marcador)) {
    console.log(`• ${etiqueta}: ya estaba`);
    return true;
  }
  if (!re.test(s)) {
    console.log(`  ⚠️  ${etiqueta}: no encontré el patrón (¿otra versión?)`);
    return false;
  }
  writeFileSync(ruta, s.replace(re, nuevo));
  console.log(`• ${etiqueta}: parcheado`);
  cambios++;
  return true;
}

console.log(`Qwen Code: ${PKG}`);

const okAlias = literal(AUTH, ALT_VIEJO, ALT_NUEVO, ALT_NUEVO, "alias /provider");

let okVista = false;
let okTitulo = false;
for (const f of DIALOGOS) {
  okVista = patron(f, VISTA_RE, VISTA_NUEVO, VISTA_MARCADOR, `vista inicial (${f})`) || okVista;
  okTitulo = literal(f, TITULO_VIEJO, TITULO_NUEVO, TITULO_NUEVO, `título (${f})`) || okTitulo;
}

const okCustom = literal(PROV_CHUNK, LISTA_VIEJA, LISTA_NUEVA, LISTA_NUEVA, "Custom Provider en la lista");

if (okAlias && okVista && okTitulo && okCustom) {
  console.log("\n✅ Listo. En `qwen -i`: /connect o /provider abren el catálogo con buscador.");
  console.log("   Escribe «custom» para pegar tu propia Base URL y API key.");
  console.log("   La lista de texto sigue en /providers. Tras `qwen update`, relanza esto.");
} else {
  console.log("\n⚠️  Algo no se pudo aplicar. Revisa la versión de Qwen Code.");
  process.exitCode = 1;
}
process.exit(0);
