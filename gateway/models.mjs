/**
 * Catálogo canónico de los modelos gratis de Zen, tomados del catálogo
 * público de Zen el 2026-11-01 (opencode 2.2.5).
 * Lo usa el servidor para `GET /v1/models` y para validar lo que pides.
 *
 * `app.js` mantiene su propia copia con títulos y notas para pintar la interfaz
 * (es un script de navegador, no puede importar módulos), y test.mjs comprueba
 * que las dos listas no se separen.
 *
 * tone: "ok"   → responde y sirve para chatear
 *       "warn" → responde, pero es incómodo (lento / vuelca su razonamiento)
 *       "bad"  → no habla chat/completions; se deja para que veas el error real
 */
export const MODELS = [
  { id: "big-pickle", title: "Big Pickle", tone: "ok", note: "razonamiento y tool use; 200k de contexto" },
  { id: "deepseek-v4.1-flash-free", title: "DeepSeek V4.1 Flash Free", tone: "ok", note: "razonamiento y coding; 200k", modalities: { image: true } },
  { id: "glm-5.3-flash-free", title: "GLM-5.3 Flash Free", tone: "ok", note: "multimodal y tareas largas; 200k", modalities: { image: true, video: true } },
  { id: "mimo-v2.6-flash-free", title: "MiMo V2.6 Flash Free", tone: "ok", note: "multimodal: imagen, audio y vídeo; 200k", modalities: { image: true, video: true } },
  { id: "beam-free", title: "Beam Free", tone: "ok", note: "MoE con 23B activos; 1M de contexto" },
  { id: "flint-40b-free", title: "Flint 40B Free", tone: "ok", note: "MoE abierto (~2.5B activos); 262k" },
  { id: "nemotron-3.5-super-vl-free", title: "Nemotron 3.5 Super VL Free", tone: "ok", note: "visión-lenguaje; 1M de contexto", modalities: { image: true } },
  { id: "nemotron-3.5-lightning-free", title: "Nemotron 3.5 Lightning Free", tone: "warn", note: "rápido, pero vuelca su cadena de pensamiento" },
];

/** Ids que se pueden pedir por la API (los "bad" también, para ver el error). */
export const MODEL_IDS = MODELS.map((m) => m.id);

/**
 * Normaliza el nombre que llega: acepta `big-pickle` y `oc/big-pickle`
 * (el prefijo es la convención que usan otros gateways para Zen).
 */
export function resolveModel(name) {
  const sinPrefijo = String(name ?? "").replace(/^(oc|opencode|zen)\//, "");
  return MODEL_IDS.includes(sinPrefijo) ? sinPrefijo : null;
}
