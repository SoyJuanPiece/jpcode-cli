/**
 * Calcula y comprueba el contraste de la paleta de jpcode.
 *
 * Existe porque el tema anterior tenía cuatro colores por debajo de 3:1 sobre
 * negro (los diffs, a 1.57 el peor) y dos campos apuntando al MISMO color, así
 * que cien apariciones del motor salían idénticas. Eso no se ve a ojo: se ve
 * mirando los números, y por eso el cálculo va en un script y no en la cabeza
 * de nadie.
 *
 *   node herramientas/calcular-tema.mjs           # tabla de contraste
 *   node herramientas/calcular-tema.mjs --json    # para tests
 */

export function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Veredicto WCAG para texto sobre un fondo. */
export function veredicto(r) {
  if (r >= 7) return "ok";
  if (r >= 4.5) return "justo";
  if (r >= 3) return "solo-grafico"; // iconos y bordes: la barra de 3:1
  return "ilegible";
}

/**
 * Los cuatro campos que el motor lee, con el mínimo que deben cumplir.
 *
 *   DiffAdded / DiffRemoved / DiffModified  → 3:1 basta (se leen como bloque
 *     de color, no como letra), pero se suben a 4.5 porque en la práctica el
 *     diff sí se lee frase a frase.
 *   Comment / Gray                          → 4.5:1, es texto.
 */
export const MINIMOS = {
  Foreground: 7,
  Comment: 4.5,
  Gray: 4.5,
  DiffAdded: 4.5,
  DiffRemoved: 4.5,
  DiffModified: 3,
  LightBlue: 7,
  AccentBlue: 7,
  AccentPurple: 4.5,
  AccentCyan: 4.5,
  AccentGreen: 4.5,
  AccentYellow: 4.5,
  AccentRed: 4.5,
};

export function comprobar(tema) {
  const problemas = [];
  for (const [campo, min] of Object.entries(MINIMOS)) {
    const v = tema[campo];
    if (!v) continue;
    const r = ratio(v, tema.Background);
    if (r < min) {
      problemas.push({ campo, valor: v, ratio: Number(r.toFixed(2)), min, fondo: tema.Background });
    }
  }
  return problemas;
}

/** Colores que aparecen en más de un campo: no se distinguen en pantalla. */
export function repetidos(tema) {
  const porColor = new Map();
  for (const [k, v] of Object.entries(tema)) {
    if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) continue;
    porColor.set(v, [...(porColor.get(v) || []), k]);
  }
  return [...porColor.entries()]
    .filter(([, ks]) => ks.length > 1)
    .map(([color, campos]) => ({ color, campos }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const raiz = dirname(dirname(new URL(import.meta.url).pathname));
  const tema = JSON.parse(readFileSync(join(raiz, "theme.json"), "utf8"));

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ problemas: comprobar(tema), repetidos: repetidos(tema) }, null, 2));
  } else {
    console.log(`\njpcode · contraste sobre ${tema.Background} (WCAG)\n`);
    const filas = Object.entries(MINIMOS)
      .filter(([c]) => tema[c])
      .map(([campo, min]) => {
        const v = tema[campo];
        const r = ratio(v, tema.Background);
        const ver = veredicto(r);
        const ok = r >= min;
        return { campo, valor: v, r, ver, min, ok };
      })
      .sort((a, b) => a.r - b.r);
    for (const f of filas) {
      const marca = f.ok ? "  ok " : " FALLA";
      console.log(`${marca} ${f.campo.padEnd(14)} ${f.valor}  ${f.r.toFixed(2).padStart(6)}  (mín ${f.min})  ${f.ver}`);
    }
    const rep = repetidos(tema);
    console.log("");
    if (rep.length === 0) console.log("  ok   ningún color repetido");
    for (const r of rep) console.log(` FALLA ${r.color} en ${r.campos.join(", ")} — no se distinguen`);
    console.log("");
  }
}
