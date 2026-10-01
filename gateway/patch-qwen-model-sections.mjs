#!/usr/bin/env node
/**
 * Convierte el selector `/model` en dos niveles, como la lista de OpenCode:
 * primero los **proveedores** (con cuántos modelos tiene cada uno) y al elegir
 * uno, **solo sus modelos**. `Esc` (o el ítem «‹ Todos los proveedores») vuelve.
 *
 *   node opencode-chat/patch-qwen-model-sections.mjs
 *
 * Depende de patch-qwen-search.mjs: se aplica DESPUÉS y reescribe justo lo que
 * ese dejó (el estado `__q`, el filtro y el render). Con 150+ modelos en una
 * lista plana no hay quien elija; así queda:
 *
 *   │ Select Model                                                          │
 *   │ proveedores   escribe para filtrar   [3/3]                            │
 *   │ › OpenCode Zen                                    10 modelos          │
 *   │   Z.AI                                            42 modelos          │
 *   │   ‹ Esc vuelve · Enter elige · escribe para buscar                    │
 *
 * ¿De dónde sale el proveedor de cada modelo? Del propio nombre que escribe
 * `sync-qwen-models.mjs` («Modelo · Proveedor»), eligiendo el extremo que más se
 * repite (así vale tanto «Grok 4.7 · OpenCode Zen» como «Google · Gemini 3.1»).
 * Si no hay « · », se usa el host de su `baseUrl` (los que conectas con
 * `/connect`), y si tampoco, el tipo de autenticación.
 *
 * Idempotente y re-aplicable tras `qwen update` (lo hacen los instaladores).
 * Rutas: QWEN_PKG (por defecto, autodetección).
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
const FICHERO = join(PKG, "chunks", "startInteractiveUI-ZKYQSLKT.js");
const MARCADOR = "const[__prov,__setProv]=";

/* Anclas: los trozos que dejó patch-qwen-search.mjs (únicos en el fichero). */
const Q_INI = 'const[__q,__setQ]=(0,import_react32.useState)("");';
const Q_FIN = "},[__q,MODEL_OPTIONS]);";
const TECLA_VIEJA =
  'useKeypress(key=>{if(key.name==="escape"||key.name==="left"&&isAuxiliaryModelMode){closeWithoutSelection();return}';
// El render del diálogo es `hasModels?<Box>lista</Box>:<Box>sin modelos</Box>`.
// Se localiza la caja por su cabecera (con o sin el `!` que traía Qwen) y se
// reemplaza SOLO su contenido, dejando el ternario sano.
const RENDER_CABECERA =
  'hasModels?(0,import_jsx_runtime37.jsxs)(Box_default,{marginTop:1,flexDirection:"column",children:[';
const RE_CABECERA =
  /!?hasModels\?\(0,import_jsx_runtime37\.jsxs\)\(Box_default,\{marginTop:1,flexDirection:"column",children:\[/;
const RENDER_FIN = "maxItemsToShow:maxModelItemsToShow})]})";
const OPT_VIEJO = "return{value,title,description,key:value}});return isAdvisorModelMode?";

/* ---------- lo que se escribe en su lugar ---------- */

const ESTADO_NUEVO =
  Q_INI +
  "const[__prov,__setProv]=(0,import_react32.useState)(null);" +
  // `__c` trae los dos extremos del nombre; el que más se repita es el proveedor.
  "const __pDe=(0,import_react32.useMemo)(()=>{const c=new Map();" +
  "for(const o of MODEL_OPTIONS)if(o.__c)for(const s of o.__c)c.set(s,(c.get(s)||0)+1);" +
  "const m=new Map();for(const o of MODEL_OPTIONS){let p=null;if(o.__c){const a=o.__c[0],b=o.__c[1];" +
  'p=(c.get(b)||0)>=(c.get(a)||0)?b:a}m.set(o,p||o.__e||o.__h||"otros")}return m},[MODEL_OPTIONS]);' +
  "const __grupos=(0,import_react32.useMemo)(()=>{const g=new Map();for(const o of MODEL_OPTIONS){" +
  "const p=__pDe.get(o);if(!g.has(p))g.set(p,[]);g.get(p).push(o)}return g},[MODEL_OPTIONS,__pDe]);" +
  'const __casa=(0,import_react32.useCallback)(o=>{const q=__q.trim().toLowerCase();if(!q)return true;' +
  'const s=((typeof o.title==="string"?o.title:"")+" "+String(o.value||"")+" "+String(o.description||"")).toLowerCase();' +
  'return q.split(/\\s+/).every(p=>s.indexOf(p)>=0)},[__q]);' +
  "const __provs=(0,import_react32.useMemo)(()=>[...__grupos.entries()].map(([p,l])=>({" +
  'value:"__prov:"+p,key:"__prov:"+p,title:p,label:p,description:l.length+(l.length===1?" modelo":" modelos")})),[__grupos]);' +
  'const __filtradas=(0,import_react32.useMemo)(()=>{const base=__prov?' +
  '[{value:"__atras",key:"__atras",title:"\u2039 Todos los proveedores",description:""}].concat(__grupos.get(__prov)||[])' +
  ":__provs;return base.filter(__casa)},[__casa,__prov,__grupos,__provs]);" +
  // Los handlers viven más abajo en el componente; solo se llaman al interactuar.
  'const __sel=v=>{const s=String(v);if(s.indexOf("__prov:")===0){__setProv(s.slice(7));__setQ("");return}' +
  'if(s==="__atras"){__setProv(null);__setQ("");return}return handleSelect(s)};' +
  'const __res=v=>{const s=String(v);if(__prov&&s.indexOf("__prov:")!==0&&s!=="__atras")handleHighlight(s)};';

const TECLA_NUEVA =
  'useKeypress(key=>{if(key.name==="escape"){if(__prov){__setProv(null);__setQ("");return}closeWithoutSelection();return}' +
  'if(key.name==="left"&&isAuxiliaryModelMode){closeWithoutSelection();return}';

const RENDER_INTERIOR =
  "(0,import_jsx_runtime37.jsx)(Text,{color:theme.text.accent,children:(__prov?__prov:\"proveedores\")+" +
  '(__q?"   filtro: "+__q:"   escribe para filtrar")+"   ["+' +
  // El ítem «‹ Todos los proveedores» no cuenta como modelo.
  '__filtradas.filter(o=>o.value!=="__atras").length+"/"+' +
  "(__prov?(__grupos.get(__prov)||[]).length:__provs.length)+\"]\"})," +
  "__filtradas.length===0?(0,import_jsx_runtime37.jsx)(Text,{color:theme.status.warning,children:\"sin resultados\"})" +
  ":(0,import_jsx_runtime37.jsx)(DescriptiveRadioButtonSelect,{items:__filtradas,onSelect:__sel,onHighlight:__res," +
  "initialIndex:__q?0:__prov?0:initialIndex,showNumbers:!__q,disableVimNav:true,";

// La otra rama del ternario (sin modelos). Se reescribe junto al render para
// dejar el `:` explícito y en el lado correcto.
const RENDER_VACIO =
  ':(0,import_jsx_runtime37.jsx)(Box_default,{marginTop:1,children:' +
  '(0,import_jsx_runtime37.jsx)(Text,{color:theme.status.warning,children:t("No models available. Please configure models first.")})})';

const MARCADOR_TECLA = 'if(key.name==="escape"){if(__prov){__setProv(null);__setQ("");return}';
const MARCADOR_OPT = '__c:(typeof model.label==="string"';
// La rama del `:` forma parte del marcador: si falta, el ternario está roto.
const MARCADOR_RENDER = RENDER_FIN + RENDER_VACIO;

// Cadena de pistas: nombre con « · » → envKey legible (GOOGLE_API_KEY → Google,
// como los trae Qwen) → host de la baseUrl → tipo de autenticación.
const OPT_HOST =
  '__h:(function(){try{return new URL(model.baseUrl).host.replace(/^api\\./,"")}catch(e){return null}})()';
// `GOOGLE_API_KEY` → «Google», `OPENCODE_GATEWAY_KEY` → «Opencode Gateway».
const OPT_ENV_V2 =
  '__e:(function(){const e=String(model.envKey||"");' +
  'return e?e.replace(/_(API_)?KEY$/i,"").replace(/_/g," ").replace(/\\b\\w/g,c=>c.toUpperCase()):null})()';
const OPT_ENV =
  '__e:(function(){const e=String(model.envKey||"");return e?e.replace(/_(API_)?KEY$/i,"")' +
  '.replace(/_/g," ").toLowerCase().replace(/(^|\\s)\\w/g,c=>c.toUpperCase()):null})()';

const OPT_NUEVO =
  "return{value,title,description,key:value," +
  '__c:(typeof model.label==="string"&&model.label.indexOf(" \u00b7 ")>-1)?' +
  '(function(p){return[p[0],p[p.length-1]]})(model.label.split(" \u00b7 ")):null,' +
  OPT_ENV +
  "," +
  OPT_HOST +
  "}});return isAdvisorModelMode?";

/* ---------- ejecutar ---------- */
if (!existsSync(FICHERO)) {
  console.log(`⚠️  no existe ${FICHERO} (¿otra versión de Qwen?)`);
  process.exit(1);
}

let s = readFileSync(FICHERO, "utf8");
console.log(`Qwen Code: ${PKG}`);

let cambios = 0;

/** Reemplazo literal, exacto y único. */
function literal(viejo, nuevo, etiqueta, cuenta = 1) {
  if (s.includes(nuevo)) {
    console.log(`• ${etiqueta}: ya estaba`);
    return;
  }
  if (s.split(viejo).length - 1 !== cuenta) {
    console.log(`  ⚠️  ${etiqueta}: el fragmento no aparece ${cuenta} vez/veces`);
    return;
  }
  s = s.split(viejo).join(nuevo);
  console.log(`• ${etiqueta}: hecho`);
  cambios++;
}

// Estado + memos, desde `const[__q…` hasta el final del memo del filtro.
if (!s.includes(MARCADOR)) {
  const a = s.indexOf(Q_INI);
  const b = a < 0 ? -1 : s.indexOf(Q_FIN, a);
  if (a < 0 || b < 0) {
    console.log("  ⚠️  estado y agrupación: no encontré el bloque de patch-qwen-search.mjs");
  } else {
    s = s.slice(0, a) + ESTADO_NUEVO + s.slice(b + Q_FIN.length);
    console.log("• estado y agrupación por proveedor: hecho");
    cambios++;
  }
}

// Render: solo el contenido de la caja, sin tocar el ternario.
if (!s.includes(MARCADOR_RENDER)) {
  const m = s.match(RE_CABECERA);
  const a = m ? s.indexOf(m[0]) : -1;
  const b = a < 0 ? -1 : s.indexOf(RENDER_FIN, a);
  if (a < 0 || b < 0) {
    console.log("  ⚠️  render: no encontré la caja de modelos");
  } else {
    // La rama del `:` (sin modelos) se reescribe: si una versión anterior de
    // este parche la perdió, se vuelve a poner.
    const despues = s.slice(b + RENDER_FIN.length);
    const limpio = despues.startsWith(RENDER_VACIO) ? despues.slice(RENDER_VACIO.length) : despues;
    s = s.slice(0, a) + RENDER_CABECERA + RENDER_INTERIOR + RENDER_FIN + RENDER_VACIO + limpio;
    console.log("• render de las dos pantallas: hecho");
    cambios++;
  }
}

// Actualizaciones de versiones anteriores de este mismo parche. Van antes de
// los reemplazos literales, que si no avisan de algo ya hecho.
const ACTUALIZACIONES = [
  [
    'm.set(o,p||o.__h||"otros")',
    'm.set(o,p||o.__e||o.__h||"otros")',
    "el envKey también cuenta como nombre de proveedor",
  ],
  [OPT_ENV_V2, OPT_ENV, "nombre del proveedor capitalizado (GOOGLE → Google)"],
  [
    '"   ["+__filtradas.length+"/"',
    '"   ["+__filtradas.filter(o=>o.value!=="__atras").length+"/"',
    "contador de modelos (sin contar «‹ Todos los proveedores»)",
  ],
];
for (const [viejo, nuevo, etiqueta] of ACTUALIZACIONES) {
  if (!s.includes(viejo)) continue;
  s = s.split(viejo).join(nuevo);
  console.log(`• ${etiqueta}: hecho`);
}


literal(TECLA_VIEJA, TECLA_NUEVA, "Esc para volver a la lista de proveedores");
literal(OPT_VIEJO, OPT_NUEVO, "proveedor de cada modelo");

// La primera versión de este parche dejaba un resto del memo original pegado al
// final del estado nuevo (y el chunk no cargaba). Se quita aquí.
const RESTO = "};},[__q,MODEL_OPTIONS]);useKeypress";
if (s.includes(RESTO)) {
  s = s.split(RESTO).join("};useKeypress");
  console.log("• resto de la primera pasada corregido");
}

writeFileSync(FICHERO, s);

// Comprobación final: ¿están las cuatro piezas?
const piezas = [
  [s.includes(MARCADOR), "estado y agrupación por proveedor"],
  [s.includes(MARCADOR_RENDER), "render de las dos pantallas"],
  [s.includes(MARCADOR_TECLA), "Esc para volver"],
  [s.includes(MARCADOR_OPT), "proveedor de cada modelo"],
];
const faltan = piezas.filter(([ok]) => !ok).map(([, nombre]) => nombre);

if (!faltan.length) {
  console.log(cambios ? `\n✅ Listo (${cambios} cambio(s)).` : "\n✅ Ya estaba todo aplicado.");
  console.log("   En `qwen -i`: /model elige proveedor y luego modelo; Esc vuelve.");
  console.log("   Tras `qwen update`, relanza este script.");
} else {
  console.log(`\n⚠️  Falta por aplicar: ${faltan.join(", ")}.`);
  console.log("   Revisa la versión de Qwen Code (¿está applied patch-qwen-search.mjs?).");
  process.exitCode = 1;
}
process.exit(0);
