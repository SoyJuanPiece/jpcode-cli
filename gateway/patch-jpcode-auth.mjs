#!/usr/bin/env node
/**
 * Añade un buscador al diálogo `/auth` (el de `/connect` y `/provider`) de Qwen Code.
 *
 * Con el parche de proveedores (patch-jpcode-providers.mjs) la lista de
 * «Third-party Providers» pasa a tener ~200 entradas, y Qwen no trae buscador
 * nativo: hay que bajar a mano con las flechas. Este parche mete un filtro por
 * texto en ese diálogo, igual que patch-jpcode-search.mjs hace con `/model`.
 *
 *   node opencode-chat/patch-jpcode-auth.mjs
 *
 * Requiere que patch-jpcode-search.mjs esté aplicado (usa el prop `disableVimNav`
 * que ese parche añade a DescriptiveRadioButtonSelect/BaseSelectionList).
 *
 * Qué toca (AuthDialog en startInteractiveUI-*.js):
 *   1. Estado de consulta `__subq` y su setter.
 *   2. pushView/goBack lo limpian al cambiar de pantalla.
 *   3. `__subFiltradas`: memo que filtra los items del submenú activo.
 *   4. Captura de teclas imprimibles + backspace dentro del diálogo. **Escape va
 *      lo primero**: el terminal lo manda a veces como `meta`, y si se mira
 *      después de `if(key.ctrl||key.meta)return` no vuelve atrás nunca.
 *   5. Render: línea de filtro, lista filtrada (con `disableVimNav`) y aviso de
 *      «sin resultados».
 *
 * Todo dentro de bloques marcados con `__subq`, así que es idempotente. También
 * reconoce la primera versión del parche (Escape al final) y la actualiza.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
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

const ficheros = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isFile() && p.endsWith(".js")) out.push(p);
  }
  return out;
};

/**
 * Aplica `reemplazos` en el primer fichero que contenga alguno de sus fragmentos.
 * Cada reemplazo es `[[variantes...], nuevo, marcador?]`: se usa la primera
 * variante que aparezca exactamente una vez —así admite tanto el original como
 * una versión anterior del propio parche— y el `marcador` (por defecto el propio
 * `nuevo`) es lo que se busca para saber que ya está aplicado.
 */
function parchear(etiqueta, reemplazos, dirs, firma) {
  for (const f of dirs.flatMap(ficheros)) {
    let s = readFileSync(f, "utf8");
    // La firma evita tocar ficheros que solo comparten un fragmento suelto
    // (p. ej. la otra variante de la UI, con otro alias de React).
    if (!firma.some((v) => s.includes(v))) continue;
    const aplicados = reemplazos.filter(([, nuevo, marcador]) => s.includes(marcador ?? nuevo)).length;
    const candidatos = reemplazos.some(([variantes]) => variantes.some((v) => s.includes(v)));
    if (!candidatos) continue;
    if (aplicados === reemplazos.length) {
      console.log(`• ${etiqueta}: ya estaba parcheado (${f})`);
      return true;
    }
    let cambiado = 0;
    for (const [variantes, nuevo, marcador] of reemplazos) {
      if (s.includes(marcador ?? nuevo)) continue;
      const viejo = variantes.find((v) => s.split(v).length - 1 === 1);
      if (!viejo) {
        console.log(`  ⚠️  ${etiqueta}: no encontré un fragmento (¿otra versión de Qwen?)`);
        continue;
      }
      s = s.replace(viejo, nuevo);
      cambiado++;
    }
    if (cambiado) {
      writeFileSync(f, s);
      console.log(`• ${etiqueta}: parcheado (${f})`);
      return true;
    }
    console.log(`• ${etiqueta}: no encontré la firma (¿ya parcheado o versión distinta?)`);
    return false;
  }
  console.log(`• ${etiqueta}: no encontré la firma (¿ya parcheado o versión distinta?)`);
  return false;
}

/* ---------- fragmentos exactos del AuthDialog minificado ---------- */

// 1) estado de búsqueda
const ESTADO_VIEJO = 'const[subMenuIndex,setSubMenuIndex]=(0,import_react28.useState)({});';
const ESTADO_NUEVO =
  ESTADO_VIEJO + 'const[__subq,__setsubq]=(0,import_react28.useState)("");';

// 2) limpiar el filtro al navegar
const PUSH_VIEJO =
  'const pushView=__name(view=>{setViewStack(prev=>[...prev,viewLevel]);setViewLevel(view)},"pushView");';
const PUSH_NUEVO = PUSH_VIEJO.replace("{setViewStack(", '{__setsubq("");setViewStack(');

const GOBACK_VIEJO = 'const goBack=__name(()=>{clearErrors();';
const GOBACK_NUEVO = 'const goBack=__name(()=>{__setsubq("");clearErrors();';

// 3) memo con los items filtrados del submenú activo
const ACTIVE_VIEJO = 'const activeSubMenu=subMenus[viewLevel];';
// Se busca en título, etiqueta, valor Y descripción: así vale tanto «z.ai»
// (nombre visible) como «zai-coding-plan» (id del catálogo de models.dev).
const FILTRO_INI = "const __subFiltradas=(0,import_react28.useMemo)(()=>{";
const FILTRO_FIN = ",[__subq,activeSubMenu]);";
const FILTRO_MARCADOR =
  'const s=[o.title,o.label,o.value,o.description].map(x=>typeof x==="string"?x:"").join(" ").toLowerCase();';
const FILTRO_NUEVO =
  FILTRO_INI +
  "const q=__subq.trim().toLowerCase();const base=activeSubMenu?activeSubMenu.items:[];" +
  "if(!q)return base;const ps=q.split(/\\s+/);return base.filter(o=>{" +
  FILTRO_MARCADOR +
  "return ps.every(p=>s.indexOf(p)>=0)})}" +
  FILTRO_FIN;
const ACTIVE_NUEVO = ACTIVE_VIEJO + FILTRO_NUEVO;

// 4) capturar teclas imprimibles para filtrar (Escape lo PRIMERO)
const ESCAPE_VIEJO =
  'useKeypress(key=>{if(key.name==="escape"){if(viewLevel!=="main"){goBack();return}if(errorMessage)return;' +
  'if(config.getAuthType()===void 0){setErrorMessage(t("You must connect a provider to proceed. Press Ctrl+C again to exit."));return}closeAuthDialog()}},{isActive:true});';

const KEY_NUEVO =
  'useKeypress(key=>{if(key.name==="escape"){if(viewLevel!=="main"){goBack();return}if(errorMessage)return;' +
  'if(config.getAuthType()===void 0){setErrorMessage(t("You must connect a provider to proceed. Press Ctrl+C again to exit."));return}closeAuthDialog();return}' +
  'if(activeSubMenu){if(key.ctrl&&key.name==="u"){__setsubq("");return}if(key.ctrl||key.meta)return;' +
  'if(key.name==="backspace"||key.name==="delete"){__setsubq(v=>v.slice(0,-1));return}' +
  'if(key.name!=="return"&&key.name!=="enter"&&key.name!=="up"&&key.name!=="down"&&key.name!=="tab"){' +
  'const __sqs=key.sequence;if(typeof __sqs==="string"&&__sqs.length===1&&__sqs>=" "&&__sqs!=="\\x7f"){__setsubq(v=>v+__sqs);return}}}},{isActive:true});';

/*
 * Primera versión del parche: mismo buscador pero con Escape al final, detrás de
 * `if(key.ctrl||key.meta)return` — y como el terminal manda Esc a veces como
 * `meta`, no volvía atrás. Se arregla solo moviendo la cabecera del handler: el
 * trozo de escape que queda al final ya nunca se alcanza.
 */
const CABECERA_V1 =
  'useKeypress(key=>{if(activeSubMenu){if(key.ctrl&&key.name==="u"){__setsubq("");return}if(key.ctrl||key.meta)return;';
const CABECERA_NUEVA =
  'useKeypress(key=>{if(key.name==="escape"){if(viewLevel!=="main"){goBack();return}if(errorMessage)return;' +
  'if(config.getAuthType()===void 0){setErrorMessage(t("You must connect a provider to proceed. Press Ctrl+C again to exit."));return}closeAuthDialog();return}' +
  'if(activeSubMenu){if(key.ctrl&&key.name==="u"){__setsubq("");return}';

// 5) render: filtro + lista filtrada + hint
const RENDER_VIEJO =
  'activeSubMenu&&(0,import_jsx_runtime33.jsxs)(import_jsx_runtime33.Fragment,{children:[' +
  '(0,import_jsx_runtime33.jsx)(Box_default,{marginTop:1,children:(0,import_jsx_runtime33.jsx)(DescriptiveRadioButtonSelect,{items:activeSubMenu.items,initialIndex:subMenuIndex[viewLevel]??0,onSelect:activeSubMenu.onSelect,onHighlight:value=>{setSubMenuIndex(prev=>({...prev,[viewLevel]:activeSubMenu.items.findIndex(i=>i.value===value)}))},itemGap:1})}),' +
  '(0,import_jsx_runtime33.jsx)(Box_default,{marginTop:1,children:(0,import_jsx_runtime33.jsx)(Text,{color:theme?.text?.secondary,children:t("Enter to select, \\u2191\\u2193 to navigate, Esc to go back")})})]}),';

const RENDER_NUEVO =
  'activeSubMenu&&(0,import_jsx_runtime33.jsxs)(import_jsx_runtime33.Fragment,{children:[' +
  '(0,import_jsx_runtime33.jsx)(Box_default,{marginTop:1,children:(0,import_jsx_runtime33.jsx)(Text,{color:theme?.text?.accent,children:__subq?"filtro: "+__subq+"   ["+__subFiltradas.length+"/"+activeSubMenu.items.length+"]":"escribe para filtrar   ["+__subFiltradas.length+"/"+activeSubMenu.items.length+"]"})}),' +
  '(0,import_jsx_runtime33.jsx)(Box_default,{marginTop:1,children:__subFiltradas.length===0?(0,import_jsx_runtime33.jsx)(Text,{color:theme?.status?.warning,children:"sin resultados"}):(0,import_jsx_runtime33.jsx)(DescriptiveRadioButtonSelect,{items:__subFiltradas,initialIndex:__subq?0:(subMenuIndex[viewLevel]??0),onSelect:activeSubMenu.onSelect,onHighlight:value=>{setSubMenuIndex(prev=>({...prev,[viewLevel]:activeSubMenu.items.findIndex(i=>i.value===value)}))},itemGap:1,disableVimNav:true})}),' +
  '(0,import_jsx_runtime33.jsx)(Box_default,{marginTop:1,children:(0,import_jsx_runtime33.jsx)(Text,{color:theme?.text?.secondary,children:"Escribe para buscar, Enter para elegir, Esc para volver"})})]}),';

/* ---------- ejecutar ---------- */
const pkg = paqueteQwen();
const dirs = [join(pkg, "chunks"), join(pkg, "bundled")];
console.log(`Qwen Code: ${pkg}`);

// Antes de nada, actualizar instalaciones hechas con una versión anterior del
// parche. Los marcadores V1 solo los escribe este script, así que es seguro.
for (const f of dirs.flatMap(ficheros)) {
  const s = readFileSync(f, "utf8");
  let nuevo = s;
  if (s.includes(CABECERA_V1)) {
    nuevo = nuevo.replace(CABECERA_V1, CABECERA_NUEVA);
    console.log(`• Escape del buscador: corregido (${f})`);
  }
  const ini = nuevo.indexOf(FILTRO_INI);
  if (ini >= 0 && !nuevo.includes(FILTRO_MARCADOR)) {
    const fin = nuevo.indexOf(FILTRO_FIN, ini);
    if (fin > ini) {
      nuevo = nuevo.slice(0, ini) + FILTRO_NUEVO + nuevo.slice(fin + FILTRO_FIN.length);
      console.log(`• Buscador del /auth: ahora busca también por id y descripción (${f})`);
    }
  }
  if (nuevo !== s) writeFileSync(f, nuevo);
}

const ok = parchear(
  "diálogo /auth",
  [
    [[ESTADO_VIEJO], ESTADO_NUEVO],
    [[PUSH_VIEJO], PUSH_NUEVO],
    [[GOBACK_VIEJO], GOBACK_NUEVO],
    // En estos dos el marcador es una parte estable (el resto cambia al
    // actualizar instalaciones viejas).
    [[ACTIVE_VIEJO], ACTIVE_NUEVO, FILTRO_MARCADOR],
    [[ESCAPE_VIEJO], KEY_NUEVO, CABECERA_NUEVA],
    [[RENDER_VIEJO], RENDER_NUEVO],
  ],
  dirs,
  [ESTADO_VIEJO, ESTADO_NUEVO],
);

if (ok) {
  console.log("\n✅ Listo. Abre `qwen -i`, pulsa /connect (o /provider) y escribe para filtrar.");
  console.log("   Esc vuelve al menú; tras `qwen update`, relanza este script.");
} else {
  console.log("\n⚠️  Algo no se pudo aplicar. Revisa la versión de Qwen Code.");
  process.exitCode = 1;
}
process.exit(0);
