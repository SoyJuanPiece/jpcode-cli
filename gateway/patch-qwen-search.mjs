#!/usr/bin/env node
/**
 * Añade un buscador al selector `/model` de Qwen Code.
 *
 * Qwen Code viene minificado en chunks, así que no hay código fuente que editar:
 * esto parchea los JS instalados. Es idempotente (si ya está, no hace nada) y
 * **re-aplicable**: después de `qwen update` (que reemplaza los chunks) hay que
 * volver a lanzarlo:
 *
 *     node opencode-chat/patch-qwen-search.mjs
 *
 * Qué hace:
 *   1. En el diálogo «Select Model»: añade un estado de consulta, captura las
 *      teclas imprimibles (el input principal está desactivado mientras el
 *      diálogo vive, así que no hay fugas), filtra la lista y pinta el filtro.
 *   2. Propaga `disableVimNav` (j/k no deben mover la lista mientras escribes)
 *      por DescriptiveRadioButtonSelect → BaseSelectionList → useSelectionList.
 *
 * Rutas: QWEN_PKG (por defecto, autodetección).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
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

/* ---------- utilidades ---------- */
const ficheros = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isFile() && p.endsWith(".js")) out.push(p);
  }
  return out;
};

/** Aplica reemplazos exactos en el primer fichero que contenga la firma. */
function parchear(etiqueta, firma, reemplazos, dirs, marcador = "__q") {
  for (const f of dirs.flatMap(ficheros)) {
    let s = readFileSync(f, "utf8");
    if (s.includes(marcador)) {
      console.log(`• ${etiqueta}: ya estaba parcheado (${f})`);
      return true;
    }
    if (!s.includes(firma)) continue;
    let cambiado = 0;
    for (const [viejo, nuevo] of reemplazos) {
      if (!s.includes(viejo)) {
        console.log(`  ⚠️  ${etiqueta}: no encontré un fragmento (¿otra versión de Qwen?)`);
        continue;
      }
      if (s.split(viejo).length - 1 !== 1) {
        console.log(`  ⚠️  ${etiqueta}: el fragmento aparece más de una vez, no lo toco`);
        continue;
      }
      s = s.replace(viejo, nuevo);
      cambiado++;
    }
    if (cambiado === reemplazos.length) {
      writeFileSync(f, s);
      console.log(`• ${etiqueta}: parcheado (${f})`);
      return true;
    }
    console.log(`  ⚠️  ${etiqueta}: aplicados ${cambiado}/${reemplazos.length}; revierto`);
    return false;
  }
  console.log(`• ${etiqueta}: no encontré la firma (¿ya parcheado o versión distinta?)`);
  return false;
}

/* ---------- 1) diálogo «Select Model» ---------- */
const KEYPRESS_VIEJO =
  'useKeypress(key=>{if(key.name==="escape"||key.name==="left"&&isAuxiliaryModelMode){closeWithoutSelection()}},{isActive:true});';

const KEYPRESS_NUEVO =
  'const[__q,__setQ]=(0,import_react32.useState)("");' +
  "const __filtradas=(0,import_react32.useMemo)(()=>{const q=__q.trim().toLowerCase();" +
  "if(!q)return MODEL_OPTIONS;const ps=q.split(/\\s+/);" +
  'return MODEL_OPTIONS.filter(o=>{const s=String(o.value||"").toLowerCase();return ps.every(p=>s.indexOf(p)>=0)})},[__q,MODEL_OPTIONS]);' +
  'useKeypress(key=>{if(key.name==="escape"||key.name==="left"&&isAuxiliaryModelMode){closeWithoutSelection();return}' +
  "if(key.ctrl||key.meta)return;if(key.name===\"return\"||key.name===\"enter\")return;" +
  'if(key.name==="backspace"||key.name==="delete"){__setQ(v=>v.slice(0,-1));return}' +
  'const __s=key.sequence;if(typeof __s==="string"&&__s.length===1&&__s>=" "&&__s!=="\\x7f"){__setQ(v=>v+__s)}},{isActive:true});';

const LISTA_VIEJA =
  "(0,import_jsx_runtime37.jsx)(Box_default,{marginTop:1,children:" +
  "(0,import_jsx_runtime37.jsx)(DescriptiveRadioButtonSelect,{items:MODEL_OPTIONS,onSelect:handleSelect," +
  "onHighlight:handleHighlight,initialIndex,showNumbers:true,maxItemsToShow:maxModelItemsToShow})})";

const LISTA_NUEVA =
  '(0,import_jsx_runtime37.jsxs)(Box_default,{marginTop:1,flexDirection:"column",children:[' +
  '(0,import_jsx_runtime37.jsx)(Text,{color:theme.text.accent,children:__q?"filtro: "+__q+' +
  '"   ["+__filtradas.length+"/"+MODEL_OPTIONS.length+"]":"escribe para filtrar   ["+' +
  '__filtradas.length+"/"+MODEL_OPTIONS.length+"]"}),' +
  '__filtradas.length===0?(0,import_jsx_runtime37.jsx)(Text,{color:theme.status.warning,children:"sin resultados"})' +
  ':(0,import_jsx_runtime37.jsx)(DescriptiveRadioButtonSelect,{items:__filtradas,onSelect:handleSelect,' +
  "onHighlight:handleHighlight,initialIndex:__q?0:initialIndex,showNumbers:!__q,disableVimNav:true," +
  "maxItemsToShow:maxModelItemsToShow})]})";

/* ---------- 2) propagar disableVimNav ---------- */
const DESC_VIEJO =
  "function DescriptiveRadioButtonSelect({items,initialIndex=0,onSelect,onHighlight,isFocused=true," +
  "showNumbers=false,showScrollArrows=false,maxItemsToShow=10,itemGap=0})";
const DESC_NUEVO = DESC_VIEJO.replace("itemGap=0})", "itemGap=0,disableVimNav=false})");

const DESC_LLAMADA_VIEJA =
  "(0,import_jsx_runtime4.jsx)(BaseSelectionList,{items,initialIndex,onSelect,onHighlight,isFocused," +
  "showNumbers,showScrollArrows,maxItemsToShow,itemGap,renderItem:";
const DESC_LLAMADA_NUEVA = DESC_LLAMADA_VIEJA.replace("itemGap,renderItem:", "itemGap,disableVimNav,renderItem:");

const BASE_VIEJO =
  "function BaseSelectionList({items,initialIndex=0,onSelect,onHighlight,isFocused=true,showNumbers=true," +
  "showScrollArrows=false,maxItemsToShow=10,itemGap=0,renderItem})";
const BASE_NUEVO = BASE_VIEJO.replace("itemGap=0,renderItem})", "itemGap=0,disableVimNav=false,renderItem})");

const BASE_LLAMADA_VIEJA = "useSelectionList({items,initialIndex,onSelect,onHighlight,isFocused,showNumbers})";
const BASE_LLAMADA_NUEVA = "useSelectionList({items,initialIndex,onSelect,onHighlight,isFocused,showNumbers,disableVimNav})";

/* ---------- ejecutar ---------- */
const pkg = paqueteQwen();
const chunks = join(pkg, "chunks");
const bundled = join(pkg, "bundled");
console.log(`Qwen Code: ${pkg}`);

const okDialogo = parchear(
  "diálogo /model",
  KEYPRESS_VIEJO,
  [[KEYPRESS_VIEJO, KEYPRESS_NUEVO], [LISTA_VIEJA, LISTA_NUEVA]],
  [chunks, bundled],
  "__filtradas",
);

const okDesc = parchear(
  "DescriptiveRadioButtonSelect",
  DESC_VIEJO,
  [[DESC_VIEJO, DESC_NUEVO], [DESC_LLAMADA_VIEJA, DESC_LLAMADA_NUEVA]],
  [chunks, bundled],
  "itemGap=0,disableVimNav=false})",
);

const okBase = parchear(
  "BaseSelectionList",
  BASE_VIEJO,
  [[BASE_VIEJO, BASE_NUEVO], [BASE_LLAMADA_VIEJA, BASE_LLAMADA_NUEVA]],
  [chunks, bundled],
  "itemGap=0,disableVimNav=false,renderItem})",
);

if (okDialogo && okDesc && okBase) {
  console.log("\n✅ Listo. Abre `qwen -i`, pulsa /model y escribe para filtrar.");
  console.log("   Tras `qwen update`, vuelve a lanzar este script.");
} else {
  console.log("\n⚠️  Algo no se pudo aplicar. Revisa la versión de Qwen Code.");
  process.exitCode = 1;
}
