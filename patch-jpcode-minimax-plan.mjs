#!/usr/bin/env node
/**
 * patch-jpcode-minimax-plan.mjs
 *
 * ## Problema
 *
 * Los modelos MiniMax / OpenCode Zen emiten las tool_calls en varios formatos de texto XML
 * o delimitadores de protocolo propios (por ejemplo, `]<]minimax>[{<invoke name="glob">...`,
 * `<tool_call>...`, etc.), además de incluir caracteres de ancho cero (\u200B).
 *
 * Sin un parser completo de estos formatos en el stream, el CLI de jpcode mostraba
 * etiquetas XML y basura de protocolo como `]<]minimax>[` en pantalla sin ejecutar las herramientas.
 *
 * ## Solución
 *
 * Implementa la función completa `extraerToolCallsDeTexto` en `MiniMaxOpenAICompatibleProvider`
 * dentro de `chunk-UZ5AMSVC.js`. Parsea tanto `<tool_call>` como `<invoke>`, limpia caracteres
 * de ancho cero y marcas de MiniMax, y convierte el resultado a `tool_calls` estructuradas.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

function paqueteQwen() {
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
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa JPCODE_ENGINE=/ruta/al/paquete");
}

const PKG = paqueteQwen();
const chunks = join(PKG, "chunks");
const CHUNK = "chunk-UZ5AMSVC.js";
const ruta = join(chunks, CHUNK);

if (!existsSync(ruta)) {
  console.error(`  ⚠️  no existe ${CHUNK}`);
  process.exit(1);
}

const MARCADOR = "JPCODE_MINIMAX_TOOL_CALL_PATCH";

const OBJETIVO = `getResponseParsingOptions(){return{taggedThinkingTags:true}}};`;

const REEMPLAZO = `getResponseParsingOptions(){return{taggedThinkingTags:true}}
/* ${MARCADOR} — interceptor y parser completo de tool_calls en texto para MiniMax */
postProcessStreamChunk(chunk){
  const choice=chunk?.choices?.[0];
  if(!choice)return chunk;
  if(choice.delta?.tool_calls?.length>0)return chunk;
  const raw=choice.delta?.content;
  if(typeof raw!=="string"||!raw)return chunk;

  this._pendingText=(this._pendingText||"")+raw;
  const contentToProcess=this._pendingText;

  const limpio=contentToProcess
    .replace(/[\\u200B-\\u200D\\u2060]/g,"")
    .replace(/\\]?[\\s\\u200B-\\u200D\\u2060]*\\[\\s*minimax\\s*[>\\]]?\\s*\\[?/gi,"");

  const toolCalls=[];
  let idx=0;
  const mk=(nombre,args)=>({
    id:\`call_\${nombre}_\${Date.now().toString(36)}_\${idx++}\`,
    type:"function",
    function:{name:nombre,arguments:typeof args==="string"?args:JSON.stringify(args)}
  });

  /* 1. <tool_call> ... </tool_call> */
  const bloqueRe=/<?\\s*tool_call\\s*>([\\s\\S]*?)<\\/?\\s*tool_call\\s*>/gi;
  let bm;
  while((bm=bloqueRe.exec(limpio))!==null){
    const cuerpo=(bm[1]||"").trim();
    if(!cuerpo)continue;
    let datos=null;
    try{datos=JSON.parse(cuerpo)}catch{
      let candidato=cuerpo.replace(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/g,"$1").replace(/,\\s*([\\]}])/g,"$1");
      try{datos=JSON.parse(candidato.trim())}catch{
        const arreglado=candidato.replace(/\\\\(?!["\\\\/bfnrtu])/g,"\\\\\\\\");
        try{datos=JSON.parse(arreglado.trim())}catch{}
      }
    }
    if(datos){
      for(const uno of Array.isArray(datos)?datos:[datos]){
        if(!uno||typeof uno!=="object")continue;
        const nombre=uno.name||uno.tool_name||uno.function?.name;
        if(!nombre)continue;
        let args=uno.arguments??uno.args??uno.parameters??uno.function?.arguments??{};
        if(typeof args==="string"){try{args=JSON.parse(args)}catch{args={value:args}}}
        toolCalls.push(mk(String(nombre),args));
      }
    }
  }

  /* 2. <invoke name="..."> ... </invoke> */
  const invokeRe=/<invoke\\s+name\\s*=?\\s*["']?\\s*([A-Za-z0-9_.-]+)["']?\\s*>([\\s\\S]*?)<\\/invoke>/gi;
  let im;
  while((im=invokeRe.exec(limpio))!==null){
    const nombre=im[1];
    const cuerpo=im[2];
    const args={};
    const paramRe=/<parameter\\s+name\\s*=\\s*["']?([A-Za-z0-9_.-]+)["']?\\s*>([\\s\\S]*?)<\\/parameter>/gi;
    let pm;
    while((pm=paramRe.exec(cuerpo))!==null){args[pm[1]]=pm[2].replace(/\\s+/g," ").trim()}
    const tagRe=/<([A-Za-z0-9_.-]+)>([\\s\\S]*?)<\\/\\1>/g;
    let tm;
    while((tm=tagRe.exec(cuerpo))!==null){if(tm[1]!=="parameter"){args[tm[1]]=tm[2].replace(/\\s+/g," ").trim()}}
    toolCalls.push(mk(String(nombre),args));
  }

  /* 3. Limpiar marcas del texto visible */
  let contentLimpio=limpio
    .replace(/<?\\s*tool_call\\s*>[\\s\\S]*?<\\/?\\s*tool_call\\s*>/gi,"")
    .replace(/<invoke\\s+[\\s\\S]*?<\\/invoke>/gi,"")
    .replace(/<invoke\\s+[^>]*>/gi,"")
    .replace(/<\\/invoke>/gi,"")
    .replace(/\\]?\\[minimax[^\\n]*$/gi,"")
    .replace(/\\]<\\]minimax>\\[?/gi,"")
    .replace(/[>\\]\\[}{]*$/g,"")
    .trim();

  if(toolCalls.length===0){
    if(contentLimpio!==raw){
      return{...chunk,choices:[{...choice,delta:{...choice.delta,content:contentLimpio||null}}]};
    }
    return chunk;
  }

  this._pendingText="";
  const newChoice={
    ...choice,
    delta:{
      ...choice.delta,
      content:contentLimpio||null,
      tool_calls:toolCalls
    }
  };
  const fr=choice.finish_reason;
  if(!contentLimpio&&fr==="stop"){
    newChoice.finish_reason="tool_calls";
  }
  return{...chunk,choices:[newChoice,...(chunk.choices?.slice(1)||[])]};
}
};`;

const antes = readFileSync(ruta, "utf8");

if (antes.includes(MARCADOR)) {
  console.log(`• ${CHUNK}: el parche de MiniMax plan ya está aplicado`);
} else if (!antes.includes(OBJETIVO)) {
  console.error(`  ⚠️  ${CHUNK}: no encuentro el punto de anclaje (¿otra versión del motor?)`);
  process.exit(1);
} else {
  const despues = antes.replace(OBJETIVO, REEMPLAZO);
  if (!despues.includes(MARCADOR)) {
    console.error(`  ⚠️  ${CHUNK}: el reemplazo no quedó bien`);
    process.exit(1);
  }
  writeFileSync(ruta, despues);
  console.log(`• ${CHUNK}: interceptor de tool_calls MiniMax instalado`);
}

const contenidoUZ5 = readFileSync(ruta, "utf8");
const MARCADOR3 = "JPCODE_MINIMAX_STREAM_LOOP";
const ANCLA_LOOP = "for await(const chunk of stream){";
const HOOK_CHUNK = "for await(const rawChunk of stream){/* JPCODE_MINIMAX_STREAM_LOOP */const chunk=this.config.provider?.postProcessStreamChunk?.(rawChunk)??rawChunk;";

const ocurrencias = (contenidoUZ5.match(new RegExp(ANCLA_LOOP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

if (contenidoUZ5.includes(MARCADOR3)) {
  console.log(`• ${CHUNK}: el hook de stream MiniMax ya está instalado`);
} else if (ocurrencias !== 1) {
  console.warn(`  ⚠️  ${CHUNK}: se encontraron ${ocurrencias} ocurrencias de "${ANCLA_LOOP}".`);
} else {
  const despues2 = contenidoUZ5.replace(ANCLA_LOOP, HOOK_CHUNK);
  writeFileSync(ruta, despues2);
  console.log(`• ${CHUNK}: hook de stream instalado en processStreamWithLogging`);
}

try {
  execSync(`node --check "${ruta}"`, { stdio: ["ignore", "ignore", "pipe"] });
  console.log(`• ${CHUNK}: pasa node --check ✓`);
} catch (e) {
  console.error(`  ⚠️  ${CHUNK}: no pasa node --check — el parche puede estar mal`);
  process.exit(1);
}

console.log("\n✅ Parche MiniMax plan mode aplicado con éxito.");
