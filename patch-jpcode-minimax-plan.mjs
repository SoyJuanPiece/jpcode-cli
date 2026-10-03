#!/usr/bin/env node
/**
 * patch-jpcode-minimax-plan.mjs
 *
 * ## Problema
 *
 * El modelo MiniMax (minimax-text-01, minimax-m1, etc.) en ocasiones emite tool calls
 * como texto XML dentro del `delta.content` del stream:
 *
 *   <tool_call>{"name":"glob","arguments":{"pattern":"**\/*","path":"C:\\Users\\..."}}</tool_call>
 *
 * O variantes con sintaxis similar. El motor de jpcode no las interceptaba en el stream,
 * provocando que en modo plan aparezca el XML sin traducir en pantalla.
 *
 * ## Solución
 *
 * Parchamos `MiniMaxOpenAICompatibleProvider` en `chunk-UZ5AMSVC.js` para interceptar
 * el stream de MiniMax y convertir automáticamente cualquier `<tool_call>...</tool_call>`
 * hallado en el contenido textual a objetos `tool_calls` estructurados.
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
/* ${MARCADOR} — interceptor de tool_calls en texto para MiniMax */
postProcessStreamChunk(chunk){
  const choice=chunk?.choices?.[0];
  if(!choice)return chunk;
  if(choice.delta?.tool_calls?.length>0)return chunk;
  const raw=choice.delta?.content;
  if(typeof raw!=="string"||!raw.includes("<tool_call>"))return chunk;
  const TOOL_RE=/<tool_call>([\\s\\S]*?)<\\/tool_call>/g;
  const toolCalls=[];
  let idxCounter=0;
  let m;
  while((m=TOOL_RE.exec(raw))!==null){
    let parsed;
    try{parsed=JSON.parse(m[1].trim())}catch{continue}
    const name=parsed.name||parsed.tool_name||parsed.function||"unknown";
    const args=parsed.arguments||parsed.parameters||parsed.args||{};
    toolCalls.push({
      index:idxCounter++,
      id:\`call_mm_\${Date.now()}_\${idxCounter}\`,
      type:"function",
      function:{name,arguments:typeof args==="string"?args:JSON.stringify(args)}
    });
  }
  if(toolCalls.length===0)return chunk;
  const cleanedContent=raw.replace(/<tool_call>[\\s\\S]*?<\\/tool_call>/g,"").trim();
  const newChoice={
    ...choice,
    delta:{
      ...choice.delta,
      content:cleanedContent||null,
      tool_calls:toolCalls
    }
  };
  const fr=choice.finish_reason;
  if(!cleanedContent&&fr==="stop"){
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
const ANCLA_LOOP = "reportOpenAiChunk(telemetryAttempt,chunk);";
const ocurrencias = (contenidoUZ5.match(new RegExp(ANCLA_LOOP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

if (contenidoUZ5.includes(MARCADOR3)) {
  console.log(`• ${CHUNK}: el hook de stream MiniMax ya está instalado`);
} else if (ocurrencias !== 1) {
  console.warn(`  ⚠️  ${CHUNK}: se encontraron ${ocurrencias} ocurrencias de "${ANCLA_LOOP}".`);
} else {
  const HOOK_CHUNK = `${ANCLA_LOOP}/* ${MARCADOR3} */chunk=this.config.provider?.postProcessStreamChunk?.(chunk)??chunk;`;
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
