#!/usr/bin/env node
/**
 * Sonda: ¿qué modelos gratis de Zen hablan tool_calls NATIVAS?
 * =========================================================
 *
 * ## Por qué existe esto
 *
 * Llevamos varias versiones atrapados en el mismo bucle: el tier gratis de Zen
 * escribe sus llamadas a herramientas como TEXTO (XML, JSON, tokens raros…), el
 * formato cambia cada pocas semanas, y cada vez hay que publicar una versión
 * nueva para perseguirlo. Eso no se arreglaAffinity parcheando el parser.
 *
 * En server.mjs hay dos cosas que podrían ser la causa de raíz:
 *
 *   tool_choice: payload.tool_choice ?? "none"   → les decimos que NO llamen
 *   fillerTools(): herramientas FALSAS con "nunca la llames" en la descripción
 *
 * O sea que quizá el problema sea que nosotros mismos se lo estamos pidiendo.
 * Pero eso es una HIPÓTESIS, y no se va a publicar nada hasta comprobarla.
 *
 * ## Qué hace esto
 *
 * Una sola cosa: mandarle a cada modelo gratis UN prompt con dos herramientas
 * REALES y `tool_choice: "auto"`, y decir en qué formato respondió. No cambia
 * absolutely nada del jpcode: no toca el servidor, ni la configuración, ni los
 * ficheros del usuario. Solo hace peticiones GET/POST a Zen.
 *
 * Gasta peticiones del cupo diario (~200/día por IP): una por modelo. Con los
 * 11 son 11. Con --comparar son el doble.
 *
 * Uso:
 *   node gateway/probe-tools.mjs                # los 11 modelos, tool_choice auto
 *   node gateway/probe-tools.mjs --comparar     # además compara con "none"
 *   node gateway/probe-tools.mjs space-bunny-free big-pickle
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODELS } from "./models.mjs";
import { ZEN_UA, ocId } from "./ids.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const UPSTREAM = process.env.OPENCODE_BASE || "https://opencode.ai/zen/v1";
const KEY = process.env.OPENCODE_API_KEY || process.env.ZEN_API_KEY || "";
const AUTH = KEY ? `Bearer ${KEY}` : "Bearer public";

/* ------------------------------------------------------------------ *
 * Se reutilizan las funciones REALES de server.mjs, no una copia: la
 * sonda tiene que clasificar exactamente igual que el gateway. Se
 * extraen por source-slicing (como en test-toolcalls.mjs) para no
 * arrancar el servidor al importarlo.
 * ------------------------------------------------------------------ */
const src = readFileSync(join(HERE, "server.mjs"), "utf8");
function trocear(nombre) {
  const i = src.indexOf(`function ${nombre}`);
  if (i < 0) throw new Error(`no encuentro ${nombre} en server.mjs`);
  const j = src.indexOf("\n/**", i + 10);
  return src.slice(i, j < 0 ? src.length : j);
}
const tmp = join(process.env.TMPDIR || "/tmp", "jpcode-probe.cjs");
writeFileSync(
  tmp,
  `${trocear("extraerToolCallsDeTexto")}\n${trocear("partesDelSse")}\n` +
    `module.exports={extraerToolCallsDeTexto,partesDelSse};`,
);
const { extraerToolCallsDeTexto, partesDelSse } = createRequire(import.meta.url)(tmp);

/* ------------------------------------------------------------------ *
 * Las 11 herramientas que el servidor de Zen exige ver POR NOMBRE. La primera
 * version de esta sonda mandaba solo un par y por eso devolvia 403: el servidor
 * no dice que falte la key, dice "free tier can only be used from within
 * OpenCode", que parece un problema de autenticacion pero es que la peticion no
 * lleva las tools que espera.
 *
 * Se mandan con su esquema de verdad, que es justo lo que no se estaba probando:
 * el gateway de serie manda herramientas de relleno que dicen "nunca la llames".
 * ------------------------------------------------------------------ */
const ESQUEMAS = {
  bash: { command: "string", description: "Ejecuta un comando de shell" },
  edit: { file_path: "string", old_string: "string", new_string: "string" },
  glob: { pattern: "string", path: "string" },
  grep: { pattern: "string", path: "string" },
  read: { file_path: "string" },
  skill: { name: "string", args: "string" },
  task: { description: "string", prompt: "string", subagent_type: "string" },
  todowrite: { todos: "array" },
  webfetch: { url: "string", prompt: "string" },
  websearch: { query: "string" },
  write: { file_path: "string", content: "string" },
};

const TOOLS = Object.entries(ESQUEMAS).map(([name, props]) => ({
  type: "function",
  function: {
    name,
    description: props.description || `Herramienta ${name}`,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.keys(props)
          .filter((k) => k !== "description")
          .map((k) => [k, { type: props[k] === "array" ? "array" : "string", description: props[k] }]),
      ),
      required: [],
    },
  },
}));

const MENSAJE = [
  { role: "user", content: "Usa la herramienta glob para listar los ficheros del Escritorio." },
];

/* Clasifica lo que respondió el modelo en un formato legible. */
function clasificar(sseText) {
  const partes = partesDelSse(sseText);
  if (partes.toolCalls.length) {
    return {
      veredicto: "NATIVA",
      detalle: partes.toolCalls.map((t) => t.function.name).join(", "),
      texto: partes.content,
      nativas: partes.toolCalls,
    };
  }
  const { toolCalls, contentLimpio } = extraerToolCallsDeTexto(partes.content);
  if (toolCalls.length) {
    return {
      veredicto: "TEXTO",
      detalle: `convertida con el parser: ${toolCalls.map((t) => t.function.name).join(", ")}`,
      texto: partes.content,
      nativas: [],
    };
  }
  const bruto = partes.content;
  /* El `\u200B?` es porque el motor pega un caracter de ancho cero justo detras
     del `<` en `<tool_call>`. Sin el, la marca no se ve y el formato nuevo
     se clasificaria como "NADA" cuando en realidad si es un intento. */
  const tieneMarca = /<(?:\u200B?invoke|\u200B?tool_call|tool_reflect)|"name"\s*:|\[\s*\{/.test(bruto);
  return {
    veredicto: tieneMarca ? "TEXTO-ROTO" : "NADA",
    detalle: tieneMarca
      ? "hay marcas de tool call pero el parser no las reconoce: FORMATO NUEVO"
      : "responde con texto normal, ni lo intenta",
    texto: bruto,
    nativas: [],
  };
}

async function preguntar(modelo, toolChoice) {
  const cuerpo = {
    model: modelo,
    messages: MENSAJE,
    tools: TOOLS,
    tool_choice: toolChoice,
    stream: true,
  };
  const r = await fetch(`${UPSTREAM}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
      Accept: "*/*",
      "User-Agent": ZEN_UA,
      "x-opencode-session": ocId("ses_"),
      "x-opencode-request": ocId("msg_"),
    },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) {
    let motivo = texto.slice(0, 160);
    try { motivo = JSON.parse(texto)?.error?.message ?? motivo; } catch { /* literal */ }
    return { error: `HTTP ${r.status} — ${motivo}` };
  }
  return { sse: texto };
}

/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const comparar = args.includes("--comparar");
const pedidos = args.filter((a) => !a.startsWith("--"));
const objetivos = pedidos.length ? MODELS.filter((m) => pedidos.includes(m.id)) : MODELS;

if (!objetivos.length) {
  console.error("No hay modelos con esos ids. Disponibles:");
  for (const m of MODELS) console.error(`  ${m.id}`);
  process.exit(1);
}

console.log(`\nSonda de tool calls — ${objetivos.length} modelo(s), tool_choice "auto"`);
console.log(`Cuota: ~${objetivos.length * (comparar ? 2 : 1)} peticiones del cupo diario.\n`);

const resultados = [];
const carpeta = join(HERE, ".cache", "probe");
mkdirSync(carpeta, { recursive: true });

for (const m of objetivos) {
  process.stdout.write(`… ${m.id}`);
  let r;
  try {
    r = await preguntar(m.id, "auto");
  } catch (e) {
    console.log(`\r✗ ${m.id.padEnd(34)} no se pudo conectar: ${e.message}`);
    resultados.push({ modelo: m.id, error: e.message });
    continue;
  }
  if (r.error) {
    console.log(`\r✗ ${m.id.padEnd(34)} ${r.error}`);
    resultados.push({ modelo: m.id, error: r.error });
    continue;
  }
  const c = clasificar(r.sse);
  const marca = c.veredicto === "NATIVA" ? "★" : " ";
  console.log(`\r${marca} ${m.id.padEnd(34)} ${c.veredicto.padEnd(11)} ${c.detalle}`);
  resultados.push({ modelo: m.id, ...c, comparar: null });

  if (comparar && !c.error) {
    try {
      const r2 = await preguntar(m.id, "none");
      if (!r2.error) {
        const c2 = clasificar(r2.sse);
        resultados[resultados.length - 1].comparar = c2;
        console.log(`  ${" ".repeat(35)}con "none": ${c2.veredicto} — ${c2.detalle}`);
      }
    } catch { /* la comparación es opcional */ }
  }

  /* Se guarda el literal, que es lo que hace falta para los fixtures cuando
     el formato vuelva a cambiar. Sin esto toca volver a pedir screenshots. */
  if (c.texto) {
    const f = join(carpeta, `${m.id}.txt`);
    writeFileSync(f, c.texto, "utf8");
  }
}

const contestaron = resultados.filter((r) => !r.error);
const fallaron = resultados.filter((r) => r.error);
const nativas = contestaron.filter((r) => r.veredicto === "NATIVA");

console.log("\n" + "─".repeat(70));
if (!contestaron.length) {
  console.log("\nNINGUNO respondió. No hay dato, así que no se puede concluir nada.");
  console.log("Lo normal es que falte la key: se necesita OPENCODE_API_KEY o ZEN_API_KEY.");
  console.log("Con eso:");
  console.log("  OPENCODE_API_KEY=tu_clave node gateway/probe-tools.mjs");
} else {
  console.log(`\nRespondieron ${contestaron.length}/${resultados.length} modelos.`);
  if (nativas.length) {
    console.log(`\nCon tool calls NATIVAS: ${nativas.map((r) => r.modelo).join(", ")}`);
    console.log("Estos no necesitan el parser de texto. Habría que comprobar que además");
    console.log("dan buenos resultados antes de ponerlos de serie.");
  } else if (contestaron.length === resultados.length) {
    console.log("\nNinguno de los que respondieron emitió tool calls nativas.");
    console.log("Así que tool_choice NO es la causa de raíz (o el modelo las emite de otra");
    console.log("forma que la sonda no ve). Habría que mirar el texto guardado.");
  } else {
    console.log(`\nNinguno de los ${contestaron.length} que respondieron emitió nativas.`);
    console.log(`Pero ${fallaron.length} no respondieron, así que la lista de arriba NO es`);
    console.log("concluyente. Pásalo con la key puesta y sin errores.");
  }
}
if (fallaron.length) {
  console.log(`\nSin respuesta (${fallaron.length}): ${fallaron.map((r) => r.modelo).join(", ")}`);
}
console.log(`\nLiterales guardados en gateway/.cache/probe/ para usarlos de fixtures.`);
console.log("\nEsto no ha cambiado nada del jpcode. Pásame la salida y decidimos con datos.\n");
