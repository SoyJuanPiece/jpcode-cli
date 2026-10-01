/**
 * Adaptadores de protocolo: cada proveedor de models.dev habla uno de estos tres.
 *
 *   openai     → POST {base}/chat/completions          (184 de 225 proveedores)
 *   anthropic  → POST {base}/messages                   (8)
 *   google     → POST {base}/models/{m}:generateContent (2)
 *
 * Todos normalizan a **chunks con forma de OpenAI** (`{id, choices:[{delta}], usage}`)
 * porque eso es lo único que ya entiende el resto del servidor: el pipe a pelo
 * para clientes OpenAI y el traductor a Anthropic de `anthropic.mjs`. Así los
 * protocolos quedan aislados aquí y no hay que tocar el enrutado por cada uno.
 *
 * Cada adaptador expone:
 *   peticion({ baseURL, apiKey, model, body, headers, stream }) → { url, headers, json }
 *   chunks(respuesta)  → async generator de chunks estilo OpenAI (streaming)
 *   completo(json)     → { id, content, reasoning, toolCalls, finish, usage }
 */

/* ================== utilidades comunes ================== */

/** Une base y ruta sin duplicar barras. */
export function unir(base, ruta) {
  return String(base || "").replace(/\/+$/, "") + ruta;
}

/** Lee la respuesta como líneas, sin cargarla entera en memoria. */
async function* lineas(res) {
  const dec = new TextDecoder();
  let buf = "";
  for await (const trozo of res.body) {
    buf += typeof trozo === "string" ? trozo : dec.decode(trozo, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const linea = buf.slice(0, i);
      buf = buf.slice(i + 1);
      yield linea.endsWith("\r") ? linea.slice(0, -1) : linea;
    }
  }
  buf += dec.decode();
  if (buf) yield buf.endsWith("\r") ? buf.slice(0, -1) : buf;
}

/**
 * Trocea un SSE en objetos JSON. Los eventos de Anthropic llevan `event:` y su
 * `data:` trae el `type` dentro, así que se puede ignorar la línea de evento.
 */
async function* sseJson(res) {
  for await (const linea of lineas(res)) {
    const l = linea.trim();
    if (!l || l.startsWith(":")) continue;
    if (!l.startsWith("data:")) continue; // event:, id:, retry: → no hacen falta
    const dato = l.slice(5).trim();
    if (!dato || dato === "[DONE]") continue;
    try {
      yield JSON.parse(dato);
    } catch {
      /* un trozo partido no debería llegar aquí: sseJson solo da líneas completas */
    }
  }
}

/** Acumula chunks estilo OpenAI en una respuesta completa (como `partesDelSse`). */
export function acumulador() {
  const estado = { id: null, content: "", reasoning: "", finish: null, usage: null };
  const herramientas = new Map();
  return {
    push(j) {
      if (!j || typeof j !== "object") return;
      if (j.id && typeof j.id === "string") estado.id = j.id;
      if (j.usage) estado.usage = j.usage;
      const c = j.choices?.[0];
      if (!c) return;
      if (c.finish_reason) estado.finish = c.finish_reason;
      const d = c.delta || c.message || {};
      if (typeof d.content === "string") estado.content += d.content;
      const razonar = d.reasoning_content ?? d.reasoning;
      if (typeof razonar === "string") estado.reasoning += razonar;
      for (const tc of d.tool_calls || []) {
        const k = tc.index ?? 0;
        const acc = herramientas.get(k) || { id: "", name: "", args: "" };
        if (tc.id) acc.id = tc.id;
        if (tc.function?.name) acc.name = tc.function.name;
        if (tc.function?.arguments) acc.args += tc.function.arguments;
        herramientas.set(k, acc);
      }
    },
    resultado() {
      return {
        ...estado,
        toolCalls: [...herramientas.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, t]) => ({ id: t.id || `call_${Math.random().toString(36).slice(2)}`, type: "function", function: { name: t.name, arguments: t.args } })),
      };
    },
  };
}

/** Consume un generador de chunks y devuelve la respuesta completa. */
export async function juntar(generador) {
  const acc = acumulador();
  for await (const j of generador) acc.push(j);
  return acc.resultado();
}

/* ================== OpenAI Chat Completions ================== */

export const openai = {
  id: "openai",
  nombre: "OpenAI Chat Completions",
  peticion({ baseURL, apiKey, model, body, headers = {}, stream }) {
    const json = { ...body, model };
    // El upstream solo va en streaming si el cliente lo pidió: así los
    // proveedores con SSE flojo no se rompen en peticiones normales.
    if (stream) json.stream = true;
    delete json.stream_options;
    const h = {
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
      ...headers,
    };
    if (apiKey) h.Authorization = `Bearer ${apiKey}`;
    return { url: unir(baseURL, "/chat/completions"), headers: h, json };
  },
  async *chunks(res) {
    for await (const j of sseJson(res)) {
      if (j.error) throw new Error(j.error.message || "error del proveedor");
      yield j;
    }
  },
  completo(j) {
    const c = j.choices?.[0] || {};
    const m = c.message || {};
    const toolCalls = (m.tool_calls || []).map((t, i) => ({
      id: t.id || `call_${i}`,
      type: "function",
      function: { name: t.function?.name || "", arguments: t.function?.arguments || "" },
    }));
    return {
      id: j.id,
      content: typeof m.content === "string" ? m.content : "",
      reasoning: m.reasoning_content ?? m.reasoning ?? "",
      toolCalls,
      finish: c.finish_reason ?? null,
      usage: j.usage ?? null,
    };
  },
};

/* ================== Anthropic Messages ================== */

const FIN_ANTHROPIC = {
  end_turn: "stop",
  stop_sequence: "stop",
  max_tokens: "length",
  tool_use: "tool_calls",
  pause_turn: "stop",
  refusal: "content_filter",
};

const FIN_OPENAI = { stop: "end_turn", length: "max_tokens", tool_calls: "tool_use", function_call: "tool_use" };

/** OpenAI → Anthropic: convierte el body interno al formato de /messages. */
export function aAnthropicBody(body) {
  const mensajes = [];
  const sistemas = [];

  for (const m of body.messages || []) {
    if (m.role === "system" || m.role === "developer") {
      sistemas.push(typeof m.content === "string" ? m.content : (m.content || []).map((p) => p.text || "").join("\n"));
      continue;
    }
    if (m.role === "tool") {
      // Anthropic devuelve los resultados como bloque del turno de usuario.
      const bloque = { type: "tool_result", tool_use_id: m.tool_call_id, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "") };
      const ultimo = mensajes[mensajes.length - 1];
      if (ultimo && ultimo.role === "user" && Array.isArray(ultimo.content)) ultimo.content.push(bloque);
      else mensajes.push({ role: "user", content: [bloque] });
      continue;
    }

    const bloques = [];
    if (typeof m.content === "string") {
      if (m.content) bloques.push({ type: "text", text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p.type === "text" && p.text) bloques.push({ type: "text", text: p.text });
        else if (p.type === "image_url") bloques.push({ type: "image", source: { type: "url", url: p.image_url?.url } });
      }
    }
    for (const t of m.tool_calls || []) {
      let input = {};
      try { input = JSON.parse(t.function?.arguments || "{}"); } catch { input = {}; }
      bloques.push({ type: "tool_use", id: t.id, name: t.function?.name, input });
    }

    const contenido = bloques.length === 1 && bloques[0].type === "text" ? bloques[0].text : bloques;
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo && ultimo.role === m.role && Array.isArray(ultimo.content) && Array.isArray(contenido)) ultimo.content.push(...contenido);
    else mensajes.push({ role: m.role === "assistant" ? "assistant" : "user", content: contenido });
  }

  const json = {
    model: body.model,
    max_tokens: Number(body.max_tokens) > 0 ? Number(body.max_tokens) : 4096,
    messages: mensajes,
  };
  if (sistemas.length) json.system = sistemas.join("\n\n");
  if (Number.isFinite(body.temperature)) json.temperature = body.temperature;
  if (Number.isFinite(body.top_p)) json.top_p = body.top_p;
  if (Array.isArray(body.stop) && body.stop.length) json.stop_sequences = body.stop;
  else if (typeof body.stop === "string") json.stop_sequences = [body.stop];

  if (Array.isArray(body.tools) && body.tools.length) {
    json.tools = body.tools.map((t) => ({
      name: t.function?.name || t.name,
      description: t.function?.description || t.description || "",
      input_schema: t.function?.parameters || t.input_schema || { type: "object", properties: {} },
    }));
    const tc = body.tool_choice;
    if (tc === "none") json.tool_choice = { type: "none" };
    else if (tc === "required") json.tool_choice = { type: "any" };
    else if (tc && typeof tc === "object" && tc.function?.name) json.tool_choice = { type: "tool", name: tc.function.name };
    else json.tool_choice = { type: "auto" };
  }
  return json;
}

export const anthropic = {
  id: "anthropic",
  nombre: "Anthropic Messages",
  peticion({ baseURL, apiKey, model, body, headers = {}, stream }) {
    const json = aAnthropicBody({ ...body, model });
    if (stream) json.stream = true;
    const h = {
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
      "anthropic-version": "2023-06-01",
      ...headers,
    };
    if (apiKey) h["x-api-key"] = apiKey;
    return { url: unir(baseURL, "/messages"), headers: h, json };
  },
  async *chunks(res) {
    for await (const j of sseJson(res)) {
      switch (j.type) {
        case "message_start":
          yield {
            id: j.message?.id,
            choices: [],
            usage: j.message?.usage
              ? { prompt_tokens: j.message.usage.input_tokens, completion_tokens: j.message.usage.output_tokens }
              : undefined,
          };
          break;
        case "content_block_start":
          if (j.content_block?.type === "tool_use") {
            yield {
              choices: [{
                delta: {
                  tool_calls: [{
                    index: j.index,
                    id: j.content_block.id,
                    type: "function",
                    function: { name: j.content_block.name, arguments: "" },
                  }],
                },
              }],
            };
          }
          break;
        case "content_block_delta": {
          const d = j.delta || {};
          if (d.type === "text_delta") yield { choices: [{ delta: { content: d.text } }] };
          else if (d.type === "thinking_delta") yield { choices: [{ delta: { reasoning_content: d.thinking } }] };
          else if (d.type === "input_json_delta") {
            yield { choices: [{ delta: { tool_calls: [{ index: j.index, function: { arguments: d.partial_json } }] } }] };
          }
          break;
        }
        case "message_delta":
          yield {
            choices: [{ delta: {}, finish_reason: FIN_ANTHROPIC[j.delta?.stop_reason] || "stop" }],
            usage: j.usage
              ? { prompt_tokens: j.usage.input_tokens, completion_tokens: j.usage.output_tokens }
              : undefined,
          };
          break;
        case "error":
          throw new Error(j.error?.message || "error del proveedor (Anthropic)");
        default:
          break; // ping, content_block_stop, message_stop
      }
    }
  },
  completo(j) {
    const bloques = Array.isArray(j.content) ? j.content : [];
    const toolCalls = bloques
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
    return {
      id: j.id,
      content: bloques.filter((b) => b.type === "text").map((b) => b.text).join(""),
      reasoning: bloques.filter((b) => b.type === "thinking").map((b) => b.thinking).join(""),
      toolCalls,
      finish: FIN_ANTHROPIC[j.stop_reason] || "stop",
      usage: j.usage
        ? { prompt_tokens: j.usage.input_tokens, completion_tokens: j.usage.output_tokens }
        : null,
    };
  },
};

/* ================== Google Gemini ================== */

const FIN_GOOGLE = {
  STOP: "stop",
  MAX_TOKENS: "length",
  SAFETY: "content_filter",
  RECITATION: "content_filter",
  MALFORMED_FUNCTION_CALL: "tool_calls",
  OTHER: "stop",
};

/** OpenAI → Google: convierte mensajes, tools y opciones a generateContent. */
export function aGoogleBody(body) {
  const contents = [];
  const sistemas = [];
  const nombresPorId = new Map();

  for (const m of body.messages || []) {
    if (m.role === "system" || m.role === "developer") {
      sistemas.push(typeof m.content === "string" ? m.content : (m.content || []).map((p) => p.text || "").join("\n"));
      continue;
    }
    if (m.role === "tool") {
      // Gemini pide el NOMBRE de la función, no el id: se recupera del turno anterior.
      const nombre = m.name || nombresPorId.get(m.tool_call_id) || "funcion";
      contents.push({
        role: "function",
        parts: [{ functionResponse: { name: nombre, response: { result: typeof m.content === "string" ? m.content : m.content } } }],
      });
      continue;
    }
    const parts = [];
    if (typeof m.content === "string") {
      if (m.content) parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) if (p.type === "text" && p.text) parts.push({ text: p.text });
    }
    for (const t of m.tool_calls || []) {
      let args = {};
      try { args = JSON.parse(t.function?.arguments || "{}"); } catch { args = {}; }
      if (t.id) nombresPorId.set(t.id, t.function?.name);
      parts.push({ functionCall: { name: t.function?.name, args } });
    }
    if (parts.length) contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }

  const json = { contents };
  if (sistemas.length) json.systemInstruction = { parts: [{ text: sistemas.join("\n\n") }] };

  const gen = {};
  if (Number.isFinite(body.temperature)) gen.temperature = body.temperature;
  if (Number.isFinite(body.top_p)) gen.topP = body.top_p;
  if (Number(body.max_tokens) > 0) gen.maxOutputTokens = Number(body.max_tokens);
  if (Array.isArray(body.stop) && body.stop.length) gen.stopSequences = body.stop;
  if (Object.keys(gen).length) json.generationConfig = gen;

  if (Array.isArray(body.tools) && body.tools.length) {
    json.tools = [{
      functionDeclarations: body.tools.map((t) => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description || "",
        parameters: t.function?.parameters || t.input_schema || { type: "object", properties: {} },
      })),
    }];
    const tc = body.tool_choice;
    let modo = "AUTO";
    const cfg = {};
    if (tc === "none") modo = "NONE";
    else if (tc === "required") modo = "ANY";
    else if (tc && typeof tc === "object" && tc.function?.name) {
      modo = "ANY";
      cfg.allowedFunctionNames = [tc.function.name];
    }
    json.toolConfig = { functionCallingConfig: { mode: modo, ...cfg } };
  }
  return json;
}

export const google = {
  id: "google",
  nombre: "Google Gemini",
  peticion({ baseURL, apiKey, model, body, headers = {}, stream }) {
    const json = aGoogleBody({ ...body, model });
    const accion = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    const h = { "Content-Type": "application/json", Accept: stream ? "text/event-stream" : "application/json", ...headers };
    if (apiKey) h["x-goog-api-key"] = apiKey;
    return { url: unir(baseURL, `/models/${encodeURIComponent(model)}:${accion}`), headers: h, json };
  },
  async *chunks(res) {
    for await (const j of sseJson(res)) {
      if (j.error) throw new Error(j.error.message || "error del proveedor (Google)");
      yield* partesGoogle(j);
    }
  },
  completo(j) {
    const acc = acumulador();
    const primera = j.candidates?.[0];
    for (const c of partesGoogle(j)) acc.push(c);
    const r = acc.resultado();
    r.id = j.responseId || r.id;
    if (j.usageMetadata) r.usage = usageGoogle(j.usageMetadata);
    if (primera?.finishReason) r.finish = FIN_GOOGLE[primera.finishReason] || "stop";
    return r;
  },
};

function usageGoogle(u) {
  return {
    prompt_tokens: u.promptTokenCount,
    completion_tokens: u.candidatesTokenCount,
    total_tokens: u.totalTokenCount,
  };
}

/** Un trozo de Gemini → chunks estilo OpenAI. */
function* partesGoogle(j) {
  const cand = j.candidates?.[0];
  if (cand?.content?.parts) {
    let indice = 0;
    for (const p of cand.content.parts) {
      if (typeof p.text === "string" && p.text) yield { choices: [{ delta: { content: p.text } }] };
      else if (p.thought && typeof p.text === "string") yield { choices: [{ delta: { reasoning_content: p.text } }] };
      if (p.functionCall) {
        const id = `call_${(p.functionCall.name || "fn").replace(/\W/g, "")}_${indice++}`;
        yield {
          choices: [{
            delta: {
              tool_calls: [{
                index: indice - 1,
                id,
                type: "function",
                function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
              }],
            },
          }],
        };
      }
    }
  }
  if (cand?.finishReason) yield { choices: [{ delta: {}, finish_reason: FIN_GOOGLE[cand.finishReason] || "stop" }] };
  if (j.usageMetadata) yield { choices: [], usage: usageGoogle(j.usageMetadata) };
}

/* ================== registro ================== */

export const PROTOCOLOS = { openai, anthropic, google };

export function protocolo(id) {
  return PROTOCOLOS[id] || null;
}
