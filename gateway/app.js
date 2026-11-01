/* Chat de prueba para OpenCode Zen — SOLO modelos gratis.
 * - No habla con opencode.ai directamente: opencode.ai no contesta al preflight
 *   CORS, así que todo pasa por el proxy local (server.mjs). La key vive en el
 *   servidor y el navegador nunca la ve.
 * - Sin dependencias: el markdown y el tema están hechos a mano.
 * - El markdown se construye con nodos del DOM, nunca con innerHTML.
 */
"use strict";

const API = "/api";
const THEME_STORE = "opencode_theme";

/* ================== catálogo: SOLO modelos gratis ==================
 * Todos los que el catálogo de Zen marca "Free" (revisado el 2026-11-01, opencode 2.2.5)
 * con la receta que exige el servidor (la añade server.mjs). `tone` es lo que se
 * vio de verdad: 200 y respuesta coherente = ok; 200 pero inservible = warn;
 * error de protocolo o endpoint muerto = bad. */
const MODELS = [
  { id: "big-pickle", title: "Big Pickle", tone: "ok", note: "razonamiento y tool use; 200k de contexto" },
  { id: "deepseek-v4.1-flash-free", title: "DeepSeek V4.1 Flash Free", tone: "ok", note: "razonamiento y coding; 200k" },
  { id: "glm-5.3-flash-free", title: "GLM-5.3 Flash Free", tone: "ok", note: "multimodal y tareas largas; 200k" },
  { id: "mimo-v2.6-flash-free", title: "MiMo V2.6 Flash Free", tone: "ok", note: "multimodal: imagen, audio y vídeo" },
  { id: "beam-free", title: "Beam Free", tone: "ok", note: "MoE con 23B activos; 1M de contexto" },
  { id: "flint-40b-free", title: "Flint 40B Free", tone: "ok", note: "MoE abierto; 262k de contexto" },
  { id: "nemotron-3.5-super-vl-free", title: "Nemotron 3.5 Super VL Free", tone: "ok", note: "visión-lenguaje; 1M de contexto" },
  { id: "nemotron-3.5-lightning-free", title: "Nemotron 3.5 Lightning Free", tone: "warn", note: "vuelca su cadena de pensamiento" },
];

/* ================== estado ================== */
const state = {
  model: MODELS[0].id,
  messages: [],   // {role, content} — lo que se manda al modelo
  busy: false,
  abort: null,
  filter: "",
  theme: "dark",
  probing: false,
  probe: {},      // id → {ok, status, ms, error}
};

try { state.theme = localStorage.getItem(THEME_STORE) || "dark"; } catch { /* modo privado */ }

/* ================== helpers ================== */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};
const metaOf = (id) => MODELS.find((m) => m.id === id) || {};
const fmtMs = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const persist = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

function toast(text) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

/* ================== markdown ==================
 * Lista de nodos del DOM, nunca innerHTML: el texto del modelo no puede
 * inyectar HTML. El textContent resultante conserva el texto original. */

const KW = new Set((
  "const let var function return if else for while of in new class extends import export from default " +
  "await async try catch finally throw typeof instanceof delete yield null undefined true false this " +
  "def elif None True False self lambda with as pass raise global interface type enum struct impl fn pub " +
  "use match mut mod print println fmt echo curl npm node git sudo cd SELECT FROM WHERE INSERT UPDATE " +
  "DELETE JOIN CREATE TABLE int float str bool void char string"
).split(" "));

const SPAN_RE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g;
const PLAIN_RE = /\b\d[\d_]*(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b/g;

/** Resalta código devolviendo nodos cuyo texto concatenado es igual al original. */
function highlightNodes(code) {
  const out = [];
  let last = 0;
  const pushSpans = (text) => {
    let pos = 0;
    PLAIN_RE.lastIndex = 0;
    let m;
    while ((m = PLAIN_RE.exec(text))) {
      if (m.index > pos) out.push(el("span", "", text.slice(pos, m.index)));
      const w = m[0];
      const cls = /^\d/.test(w) ? "tk-num" : KW.has(w) ? "tk-kw" : "";
      out.push(cls ? el("span", cls, w) : el("span", "", w));
      pos = m.index + w.length;
    }
    if (pos < text.length) out.push(el("span", "", text.slice(pos)));
  };

  SPAN_RE.lastIndex = 0;
  let m;
  while ((m = SPAN_RE.exec(code))) {
    if (m.index > last) pushSpans(code.slice(last, m.index));
    const t = m[0];
    const isComment = t.startsWith("//") || t.startsWith("/*") || t.startsWith("#");
    out.push(el("span", isComment ? "tk-com" : "tk-str", t));
    last = m.index + t.length;
  }
  if (last < code.length) pushSpans(code.slice(last));
  return out;
}

/** Formato en línea: `código`, **negrita**, *cursiva*, [enlace](url). */
function inlineNodes(text) {
  const nodes = [];
  const RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m;
  while ((m = RE.exec(text))) {
    if (m.index > last) nodes.push(document.createTextNode(text.slice(last, m.index)));
    if (m[1]) {
      nodes.push(el("code", "ic", m[1].slice(1, -1)));
    } else if (m[2] || m[3]) {
      const s = el("strong", "", null);
      s.append(...inlineNodes(m[0].slice(2, -2)));
      nodes.push(s);
    } else if (m[4] || m[5]) {
      const s = el("em", "", null);
      s.append(...inlineNodes(m[0].slice(1, -1)));
      nodes.push(s);
    } else if (m[6]) {
      const a = el("a", "md-a", m[6].slice(1, m[6].indexOf("]")));
      a.href = m[7];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      nodes.push(a);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
  return nodes;
}

/** Bloque de código con barra, lenguaje y botón de copiar. */
function codeBlock(code, lang) {
  const box = el("div", "md-code");
  const bar = el("div", "md-code-bar");
  bar.append(el("span", "", lang || "código"));
  const b = el("button", "copy-code", "⧉ copiar");
  b.type = "button";
  b.onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      b.textContent = "✓ copiado";
      setTimeout(() => { b.textContent = "⧉ copiar"; }, 1500);
    } catch { b.textContent = "no se pudo"; }
  };
  bar.append(b);
  const pre = el("pre", "");
  const c = el("code", "");
  c.append(...highlightNodes(code));
  pre.append(c);
  box.append(bar, pre);
  return box;
}

/** Convierte markdown en una lista de nodos. */
function mdNodes(text) {
  const out = [];
  const lines = String(text ?? "").split("\n");
  let i = 0;

  const para = (buf) => {
    const d = el("div", "md-p");
    buf.forEach((l, idx) => {
      if (idx) d.append(document.createTextNode("\n"));
      d.append(...inlineNodes(l));
    });
    return d;
  };
  const esBloque = (l) =>
    /^\s*```/.test(l) || /^\s{0,3}#{1,6}\s/.test(l) || /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+[.)]\s+/.test(l) || /^\s*>\s?/.test(l) || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*```(\w+)?\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(codeBlock(buf.join("\n"), (fence[1] || "").toLowerCase()));
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push(el("hr", "md-hr")); i++; continue; }

    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (h) {
      const d = el("div", "md-h md-h" + Math.min(h[1].length, 3));
      d.append(...inlineNodes(h[2]));
      out.push(d);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      const q = el("div", "md-quote");
      q.append(para(buf));
      out.push(q);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const ul = el("ul", "md-ul");
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const li = el("li", "md-li");
        li.append(...inlineNodes(lines[i].replace(/^\s*[-*+]\s+/, "")));
        ul.append(li);
        i++;
      }
      out.push(ul);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const ol = el("ol", "md-ol");
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const li = el("li", "md-li");
        li.append(...inlineNodes(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
        ol.append(li);
        i++;
      }
      out.push(ol);
      continue;
    }

    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !esBloque(lines[i])) { buf.push(lines[i]); i++; }
    if (buf.length) out.push(para(buf));
    else i++;
  }
  return out;
}

/** Pinta markdown en un contenedor, sustituyendo lo que hubiera. */
function renderMarkdown(container, text) {
  container.textContent = "";
  container.append(...mdNodes(text));
  return container;
}

/* ================== tema ================== */
function applyTheme() {
  const html = document.documentElement;
  if (html?.setAttribute) html.setAttribute("data-theme", state.theme);
  const t = $("#themetoggle");
  if (t) {
    t.textContent = state.theme === "dark" ? "🌙" : "☀️";
    t.title = state.theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
  }
}
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  persist(THEME_STORE, state.theme);
  applyTheme();
}

/* ================== lista de modelos ================== */
function renderModels() {
  const box = $("#models");
  if (!box) return;
  box.textContent = "";
  const q = state.filter.toLowerCase();
  const list = MODELS.filter((m) => !q || m.id.toLowerCase().includes(q) || m.title.toLowerCase().includes(q));

  if (!list.length) {
    box.append(el("div", "hint", "ningún modelo coincide"));
    return;
  }

  for (const m of list) {
    const row = el("button", "model" + (m.id === state.model ? " active" : ""));
    row.type = "button";
    row.dataset.model = m.id;
    row.append(el("div", "model-title", m.title));
    const tags = el("div", "model-tags");
    const probe = state.probe[m.id];
    if (probe) {
      tags.append(el("span", "tag " + (probe.ok ? "tag-ok" : "tag-bad"), probe.ok ? `responde · ${fmtMs(probe.ms)}` : `HTTP ${probe.status || "error"}`));
    } else {
      tags.append(el("span", "tag tag-" + (m.tone || "ok"), m.tone === "bad" ? "GRATIS pero no usable" : "GRATIS"));
    }
    if (m.note) tags.append(el("span", "tag tag-note", m.note));
    row.append(tags);
    row.addEventListener("click", () => selectModel(m.id));
    box.append(row);
  }
}

function selectModel(id) {
  state.model = id;
  renderModels();
  updateBanner();
}

function updateBanner() {
  const b = $("#banner");
  if (!b) return;
  const m = metaOf(state.model);
  const tono = m.tone || "ok";
  b.className = "banner " + (tono === "ok" ? "ok" : tono);
  if (tono === "bad") {
    b.textContent = `${m.title} es gratis en la tabla de Zen pero no habla chat/completions: ${m.note}. Selecciónalo y mándale algo si quieres ver el error real.`;
  } else if (tono === "warn") {
    b.textContent = `${m.title} responde, pero es incómodo: ${m.note}. Está aquí para que lo compruebes tú.`;
  } else {
    b.textContent = `${m.title} es gratis y responde. El proxy le añade la receta que exige Zen (UA opencode + ids ses_/msg_ + stream + tools oficiales); sin ella, 403.`;
  }
}

/* ================== chat ================== */
function hideEmpty() {
  const e = $("#empty");
  if (e) e.classList.add("hidden");
}
function showEmptyIfNeeded() {
  const e = $("#empty");
  if (e && !state.messages.length) e.classList.remove("hidden");
}
function scrollDown() {
  const box = $("#messages");
  if (box) box.scrollTop = box.scrollHeight;
}

function userBubble(text) {
  const row = el("div", "msg user");
  const b = el("div", "bubble", text);
  row.append(b);
  $("#messages")?.append(row);
  scrollDown();
}

/** Burbuja vacía del asistente, con los nodos que rellenará el stream. */
function assistantBubble() {
  const row = el("div", "msg bot");
  const bubble = el("div", "bubble");
  const reasoning = el("div", "reasoning");
  const raw = el("div", "raw");
  const meta = el("div", "meta");
  bubble.append(reasoning, raw, meta);
  row.append(bubble);
  $("#messages")?.append(row);
  scrollDown();
  return { row, bubble, reasoning, raw, meta };
}

/**
 * Lee el SSE de chat/completions y va pintando.
 * Devuelve {text, reasoning, finish}.
 */
async function readStream(res, ui) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let reasoning = "";
  let finish = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let json;
      try { json = JSON.parse(data); } catch { continue; }
      const choice = json?.choices?.[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const delta = choice?.delta || {};
      if (delta.reasoning_content) {
        reasoning += delta.reasoning_content;
        ui.reasoning.textContent = reasoning;
      }
      if (delta.content) {
        text += delta.content;
        ui.raw.textContent = text;   // en crudo mientras llega; se renderiza al cerrar
      }
    }
    scrollDown();
  }
  return { text, reasoning, finish };
}

async function send(text) {
  const cuerpo = String(text ?? "").trim();
  if (!cuerpo || state.busy) return;

  state.messages.push({ role: "user", content: cuerpo });
  userBubble(cuerpo);
  hideEmpty();
  setBusy(true);

  const ui = assistantBubble();
  const ctrl = new AbortController();
  state.abort = ctrl;
  const started = Date.now();
  const maxTok = Number($("#maxtokens")?.value) || 1200;

  try {
    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: state.model, messages: state.messages, max_tokens: maxTok, stream: true }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json()).error || msg; } catch { /* sin JSON */ }
      throw new Error(msg);
    }

    const { text: answer, reasoning, finish } = await readStream(res, ui);

    if (answer) {
      state.messages.push({ role: "assistant", content: answer });
      renderMarkdown(ui.raw, answer);
      ui.raw.className = "md";
      if (reasoning) {
        const det = el("details", "md-reason");
        det.append(el("summary", "", `razonamiento (${reasoning.length} caracteres)`));
        det.append(el("div", "reason-body", reasoning));
        ui.bubble.insertBefore(det, ui.raw);
        ui.reasoning.textContent = "";
      }
      ui.meta.textContent = `${metaOf(state.model).title} · ${fmtMs(Date.now() - started)} · max_tokens ${maxTok}${finish ? " · " + finish : ""}`;
    } else {
      const aviso = finish === "length"
        ? `Sin texto: se acabó el presupuesto de tokens razonando (${reasoning.length} caracteres de razonamiento). Sube max_tokens y reintenta.`
        : "La respuesta llegó vacía.";
      state.messages.pop(); // el turno del usuario no se queda sin respuesta en el historial
      ui.raw.className = "md";
      renderMarkdown(ui.raw, aviso);
      ui.meta.textContent = `${metaOf(state.model).title} · ${fmtMs(Date.now() - started)}`;
    }
  } catch (err) {
    const aborted = err?.name === "AbortError";
    ui.row.classList.add("error");
    ui.raw.className = "md";
    renderMarkdown(ui.raw, aborted ? "⏹ interrumpido" : `⚠️ ${err?.message || err}`);
    state.messages.pop(); // no dejamos el turno huérfano
  } finally {
    setBusy(false);
    scrollDown();
  }
}

function setBusy(on) {
  state.busy = on;
  const send_ = $("#send"), stop = $("#stop");
  if (send_) send_.disabled = on;
  if (stop) stop.disabled = !on;
}

function stop() {
  try { state.abort?.abort(); } catch { /* ya estaba */ }
}

function clearAll() {
  state.messages = [];
  const box = $("#messages");
  if (box) box.textContent = "";
  showEmptyIfNeeded();
}

/* ================== sonda de modelos ================== */
async function probeAll() {
  if (state.probing) return;
  state.probing = true;
  const btn = $("#probebtn");
  if (btn) btn.disabled = true;
  const rows = $("#proberows");
  if (rows) rows.textContent = "";
  let vivos = 0;

  for (const m of MODELS) {
    const row = el("div", "proberow", m.id);
    row.append(el("span", "probe-status", "…"));
    rows?.append(row);
    try {
      const res = await fetch(`${API}/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m.id }),
      });
      const j = await res.json();
      state.probe[m.id] = j;
      if (j.ok) {
        vivos++;
        row.className = "proberow ok";
        row.replaceChildren(el("span", "probe-status", "✅"), el("span", "probe-name", `${m.id} · ${fmtMs(j.ms)}`));
      } else {
        row.className = "proberow bad";
        row.replaceChildren(el("span", "probe-status", `❌ ${j.status || "err"}`), el("span", "probe-name", m.id));
        row.title = j.error || "";
      }
    } catch (err) {
      state.probe[m.id] = { ok: false, status: 0, error: String(err?.message || err) };
      row.className = "proberow bad";
      row.replaceChildren(el("span", "probe-status", "❌"), el("span", "probe-name", `${m.id} · red`));
      row.title = String(err?.message || err);
    }
    renderModels();
    const sum = $("#probesummary");
    if (sum) sum.textContent = `${vivos} de ${MODELS.length} gratis responden con la receta del proxy.`;
  }

  state.probing = false;
  if (btn) btn.disabled = false;
}

/* ================== arranque ================== */
async function checkServer() {
  const chip = $("#serverstate");
  try {
    const res = await fetch(`${API}/status`);
    const j = await res.json();
    if (chip) {
      chip.textContent = j.hasKey ? "key cargada en el server ✓" : "tier anónimo (Bearer public)";
      chip.className = "keystate " + (j.hasKey ? "ready" : "missing");
    }
    if (!j.hasKey) {
      const b = $("#banner");
      if (b) {
        b.className = "banner warn";
        b.textContent = "El servidor arrancó sin key: usa el tier anónimo (Bearer public) y funciona igual de bien, pero va por IP (~200 peticiones/día). Con OPENCODE_API_KEY=oc_sk_… sube ese límite.";
      }
    }
  } catch {
    if (chip) {
      chip.textContent = "no hay server";
      chip.className = "keystate missing";
    }
  }
}

function init() {
  applyTheme();
  renderModels();
  updateBanner();
  checkServer();

  $("#form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#input");
    const v = input?.value || "";
    if (input) input.value = "";
    send(v);
  });

  $("#input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("#form")?.dispatchEvent?.({ type: "submit", preventDefault() {} });
    }
  });

  $("#stop")?.addEventListener("click", stop);
  $("#clear")?.addEventListener("click", clearAll);
  $("#themetoggle")?.addEventListener("click", toggleTheme);
  $("#probebtn")?.addEventListener("click", probeAll);
  $("#modelsearch")?.addEventListener("input", (e) => {
    state.filter = e.target?.value || "";
    renderModels();
  });

  for (const chip of document.querySelectorAll?.(".chip") || []) {
    chip.addEventListener("click", () => {
      const input = $("#input");
      if (input) input.value = chip.dataset?.prompt || "";
      input?.focus?.();
    });
  }
}

/* El DOM simulado de los tests avisa por DOMContentLoaded; el navegador igual. */
if (typeof document !== "undefined") {
  if (document.readyState === "loading" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
