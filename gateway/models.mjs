/**
 * Catálogo canónico de los modelos gratis de Zen, probados el 2026-09-30.
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
  { id: "big-pickle", title: "Big Pickle", tone: "ok", note: "el más equilibrado; identidad stealth" },
  { id: "mimo-v2.6-flash-free", title: "MiMo V2.6 Flash Free", tone: "ok", note: "el más rápido (≈1 s)" },
  { id: "longcat-2.5-preview-free", title: "LongCat 2.5 Preview Free", tone: "ok", note: "el más constante en español" },
  { id: "nemotron-3-ultra-free", title: "Nemotron 3 Ultra Free", tone: "ok", note: "no sale en /models, pero responde" },
  { id: "mimo-v2.5-free", title: "MiMo V2.5 Free", tone: "ok", note: "bueno, pero lento (5-11 s)" },
  { id: "space-bunny-free", title: "Space Bunny Free", tone: "ok", note: "el único que va también sin key" },
  { id: "nemotron-3.5-lightning-free", title: "Nemotron 3.5 Lightning Free", tone: "warn", note: "vuelca su cadena de pensamiento; 45-120 s" },
  { id: "muse-spark-1.3-contributor-free", title: "Muse Spark 1.3 Contributor Free", tone: "bad", note: "400: habla el protocolo /responses" },
  { id: "muse-spark-1.2-contributor-free", title: "Muse Spark 1.2 Contributor Free", tone: "bad", note: "igual; comparte prompts con Meta" },
  { id: "ling-3.0-flash-fin-free", title: "Ling 3.0 Flash Fin Free", tone: "bad", note: "404: la ruta no existe" },
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
