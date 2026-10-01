#!/usr/bin/env node
/**
 * Aplica la identidad de `jpcode` sobre Qwen Code (base Apache-2.0).
 *
 * Qwen trae branding por ajustes de fábrica, así que NO se parchea nada:
 *   ui.theme               → "jpcode"
 *   ui.customThemes.jpcode → la paleta de theme.json (negro + naranja Claude)
 *   ui.customAsciiArt      → banner propio (JPCODE grande / JPC compacto)
 *   ui.customBannerTitle   → "jpcode"
 *   ui.customBannerSubtitle→ atribución honesta
 *
 * Es idempotente: fusiona sobre ~/.qwen/settings.json sin tocar el resto
 * (modelProviders, providerProtocol, permisos, security…).
 *
 *   node jpcode/sync-jpcode.mjs          # aplica
 *   node jpcode/sync-jpcode.mjs --print  # solo muestra lo que escribiría
 *
 * QWEN_SETTINGS=/ruta para usar otro fichero (tests).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// QWEN_SETTINGS manda; si no, usamos el directorio global de Qwen, que jpcode
// apunta a ~/.jpcode con QWEN_HOME (ver bin/jpcode.mjs).
const BASE = process.env.QWEN_HOME || join(process.env.HOME || "", ".qwen");
const SETTINGS = process.env.QWEN_SETTINGS || join(BASE, "settings.json");

/* ---------- banner propio ---------- */
// Glifos de ancho fijo (cada fila del mismo glifo mide igual) para que las
// filas queden alineadas al unir. Estilo bloque/ANSI, 6 filas.
const GLIFOS = {
  J: ["    ██╗ ", "    ██║ ", "    ██║ ", "██  ██║ ", "╚████╔╝ ", " ╚═══╝  "],
  P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  C: [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"],
  O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  D: ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
};

/** Compone el arte uniendo los glifos fila a fila. */
function arte(letras) {
  return Array.from({ length: 6 }, (_, fila) => letras.map((l) => GLIFOS[l][fila]).join(" ")).join("\n");
}

const BANNER_LARGE = arte(["J", "P", "C", "O", "D", "E"]); // ancho: JPCODE
const BANNER_SMALL = arte(["J", "P", "C"]); // compacto para terminales estrechos

const TITULO = "jpcode";
const SUBTITULO = "fork de Qwen Code · Apache-2.0";

/* ---------- cargar/merge ---------- */
function leerJson(p, porDefecto = {}) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return porDefecto;
  }
}

const tema = leerJson(join(HERE, "theme.json"), null);
if (!tema || !tema.name) {
  console.error(`✗ no encuentro/valido ${join(HERE, "theme.json")}`);
  process.exit(1);
}

const actual = leerJson(SETTINGS, {});
const ui = { ...(actual.ui || {}) };
ui.theme = tema.name;
ui.customThemes = { ...(ui.customThemes || {}), [tema.name]: tema };
ui.customAsciiArt = { small: BANNER_SMALL, large: BANNER_LARGE };
ui.customBannerTitle = TITULO;
ui.customBannerSubtitle = SUBTITULO;

const salida = { ...actual, ui };

if (process.argv.includes("--print")) {
  console.log(JSON.stringify(salida, null, 2));
  process.exit(0);
}

mkdirSync(dirname(SETTINGS), { recursive: true });
writeFileSync(SETTINGS, JSON.stringify(salida, null, 2) + "\n");
console.log(`✓ jpcode aplicado en ${SETTINGS}`);
console.log(`  tema:   ${tema.name} (${tema.Background} · acento ${tema.AccentPurple})`);
console.log(`  banner: "${TITULO}" — ${SUBTITULO}`);
process.exit(0);
