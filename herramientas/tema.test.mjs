/**
 * El tema claro de jpcode, comprobado con el motor de verdad.
 * ====================================================
 *
 * No vale probar el parche mirando el fichero: lo que importa es qué tema
 * queda ACTIVO cuando el motor arranca con el terminal en claro. Eso solo se
 * sabe preguntándoselo al `themeManager` del chunk, que es lo que hace aquí.
 *
 * Se prueba contra los cuatro casos que de verdad importan:
 *   - terminal claro  -> jpcode-claro
 *   - terminal oscuro -> jpcode
 *   - sin nuestros temas registrados -> cae a los del motor, sin romperse
 *   - los dos temas cargan y no colapsan a un solo color
 *
 *   node herramientas/tema.test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ratio, comprobar, repetidos } from "./calcular-tema.mjs";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const CHUNK = join(RAIZ, "engine", "chunks", "chunk-UOLLXC6M.js");

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};

const oscuro = JSON.parse(readFileSync(join(RAIZ, "theme.json"), "utf8"));
const claro = JSON.parse(readFileSync(join(RAIZ, "theme-light.json"), "utf8"));

console.log(`\nTema de jpcode · paleta y auto-detección\n`);

/* ---- 1. los dos ficheros de tema, por contraste ---------------------- */
for (const t of [oscuro, claro]) {
  const problemas = comprobar(t);
  const rep = repetidos(t);
  check(
    `${t.name}: todo por encima del mínimo de contraste`,
    problemas.length === 0,
    problemas.map((p) => `${p.campo} ${p.valor} ${p.ratio}<${p.min}`).join(", ") || "todo ok",
  );
  check(
    `${t.name}: ningún color repetido (si no, no se distinguen)`,
    rep.length === 0,
    rep.map((r) => `${r.color} en ${r.campos.join("/")}`).join(", ") || "ninguno",
  );
  check(`${t.name}: el fondo es el declarado`, /^#[0-9a-f]{6}$/i.test(t.Background), t.Background);
}

/* ---- 2. el parche está aplicado ------------------------------------- */
{
  const s = readFileSync(CHUNK, "utf8");
  check("el motor lleva el parche", s.includes("__jpcodeAuto"), s.includes("__jpcodeAuto") ? "" : "no aparece __jpcodeAuto");
  const quedaTernaria = /return detected==="light"\?QwenLight:QwenDark\}/.test(s);
  check("y ya no decide por los temas internos", !quedaTernaria, quedaTernaria ? "queda la ternaria original" : "");
  check("el parche se define fuera de la clase", s.indexOf("var __jpcodeAuto=") < s.indexOf("var ThemeManager=class"), "");
}

/* ---- 3. el auto-detector, con el themeManager real ------------------- */
{
  /* Se importa el chunk de verdad, con COLORFGBG ya puesto en el entorno.
     El motor detecta el fondo por `COLORFGBG`: 7 o 9-15 = claro. */
  const probar = async (colorFgBg, registrar) => {
    const { themeManager } = await import(`${CHUNK}?v=${Math.random()}`);
    themeManager.loadCustomThemes(
      registrar ? { [oscuro.name]: oscuro, [claro.name]: claro } : {},
    );
    themeManager.setActiveTheme("auto");
    return themeManager.getActiveTheme();
  };

  const casos = [
    ["0;15", true, claro.name, "fondo claro del terminal"],
    ["0;7", true, claro.name, "otro fondo claro"],
    ["15;0", true, oscuro.name, "fondo oscuro"],
    ["0;0", true, oscuro.name, "otro fondo oscuro"],
  ];

  for (const [cfbg, registrar, esperado, que] of casos) {
    process.env.COLORFGBG = cfbg;
    const t = await probar(cfbg, registrar);
    check(
      `${que} (COLORFGBG=${cfbg}) -> ${esperado}`,
      t.name === esperado,
      `salió "${t.name}" fondo ${t.colors.Background}`,
    );
  }

  /* Sin nuestros temas registrados no debe romperse: cae a los del motor. */
  process.env.COLORFGBG = "0;15";
  const t = await probar("0;15", false);
  check(
    "sin nuestros temas, cae a los del motor y no peta",
    typeof t.name === "string" && !!t.colors?.Background,
    `"${t.name}"`,
  );
  delete process.env.COLORFGBG;
}

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : "\n✅ el tema funciona en claro y en oscuro\n");
process.exit(fallos ? 1 : 0);
