#!/usr/bin/env node
/**
 * Aplica la identidad de `jpcode` sobre Qwen Code (base Apache-2.0).
 *
 * Qwen trae branding por ajustes de fábrica, así que NO se parchea nada:
 *   ui.theme               → "jpcode"
 *   ui.customThemes.jpcode → la paleta de theme.json (negro + naranja Claude)
 *   ui.customAsciiArt      → banner propio (JPCODE grande / JPC compacto)
 *   ui.customBannerTitle   → "jpcode"
 *   ui.customBannerSubtitle→ vacío (jpcode no se presenta como derivado de nada)
 *   ui.customWittyPhrases  → frases del indicador de trabajo, sobrias
 *   ui.useTerminalBuffer   → false: historial al scrollback, no repintado (ver abajo)
 *   general.enableAutoUpdate → false (jpcode NO se auto-actualiza; ver abajo)
 *   tools.toolSearch.threshold → herramientas declaradas de entrada, sin puente
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
/* Sin subtítulo. Aquí ponía «fork de Qwen Code · Apache-2.0», y la cabecera del
   TUI es escaparate del producto, no aviso legal: jpcode es un CLI propio. La
   atribución que Apache-2.0 exige sigue donde toca, junto al motor:
   engine/LICENSE y engine/NOTICE-jpcode.md. */
const SUBTITULO = "";

/* Frases del indicador de trabajo. Las de fábrica son chistes ("Reticulating
   splines...", "Warming up the AI hamsters...") que rotan cada 15 s y hacen que
   la línea parezca rota; estas son del mismo tono seco que las de Claude Code. */
const FRASES_TRABAJO = [
  "Thinking…",
  "Pondering…",
  "Musing…",
  "Synthesizing…",
  "Determining…",
  "Percolating…",
];

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
ui.customWittyPhrases = FRASES_TRABAJO;

/* El historial virtual. Con él, la conversación se pinta DENTRO de la app, en
   la pantalla alternativa, y el renderizador estándar la reescribe entera en
   cada cuadro. El spinner y el contador de tokens cambian unas 12 veces por
   segundo, y el cuadro CRECE con la conversación: por eso el parpadeo empeora
   conforme bajas el chat, y duele más en un terminal lento (la consola clásica
   de Windows, la que abre `powershell.exe`, va bastante por detrás de Windows
   Terminal).

   Sin él, el motor envuelve el historial en `<Static>`: se escribe una vez en el
   scrollback del terminal y no se vuelve a pintar nunca. Cada cuadro repinta
   solo la zona viva — pie, spinner, indicador de trabajo — así que el coste deja
   de crecer al bajar. Y no hace falta pantalla alternativa ni secuencias de
   scroll: es el modo que entiende cualquier terminal.

   A diferencia del resto de claves de este fichero, que son identidad y jpcode
   las impone, esta se respeta si el usuario ya la ha elegido: poner
   `useTerminalBuffer: true` a mano en `~/.jpcode/settings.json` la deja como
   está, porque `settings.json` va antes que este script. */
if (typeof ui.useTerminalBuffer !== "boolean") ui.useTerminalBuffer = false;

/* El motor trae su propio auto-update encendido y cree que es
   `@qwen-code/qwen-code@0.24.7`: lo lee de engine/package.json y, si ve una
   versión más nueva en npm, lanza en segundo plano un `npm i -g` del paquete
   equivocado (instala otro CLI entero, no actualiza jpcode). En Windows ese
   baile de carpetas es justo el que da EBUSY. Lo apagamos: jpcode se actualiza
   a mano con `npm i -g @juanpiecedev/jpcode@latest`. */
const general = { ...(actual.general || {}), enableAutoUpdate: false };

/* Las herramientas "diferidas" y su puente. El motor, de fábrica, esconde casi
   todas las herramientas detrás de dos: `tool_search` (buscar) y `tool_call`
   (invocar). Para modelos que se pierden con el esquema (los gratis, sin ir más
   lejos) eso es un bucle de "params must have required property…" y el chat se
   llena de errores. Con este presupuesto el motor las declara todas de entrada
   y el modelo llama a cada herramienta por su nombre, sin puente de por medio.
   Es un porcentaje de la ventana de contexto; 20% sobra para el catálogo entero. */
const tools = {
  ...(actual.tools || {}),
  toolSearch: { ...(actual.tools?.toolSearch || {}), threshold: 20 },
};

const salida = { ...actual, ui, general, tools };

if (process.argv.includes("--print")) {
  console.log(JSON.stringify(salida, null, 2));
  process.exit(0);
}

mkdirSync(dirname(SETTINGS), { recursive: true });
writeFileSync(SETTINGS, JSON.stringify(salida, null, 2) + "\n");
console.log(`✓ jpcode aplicado en ${SETTINGS}`);
console.log(`  tema:   ${tema.name} (${tema.Background} · acento ${tema.AccentPurple})`);
console.log(`  banner: "${TITULO}"${SUBTITULO ? ` — ${SUBTITULO}` : " (sin subtítulo)"}`);
console.log(`  trabajo: ${FRASES_TRABAJO.join(" ")} · auto-update del motor: off`);
console.log(`  tools:  toolSearch.threshold=${tools.toolSearch.threshold} (declaradas de entrada)`);
console.log(`  scroll: useTerminalBuffer=${ui.useTerminalBuffer} (${
  ui.useTerminalBuffer
    ? "historial virtual: lo pide el parpadeo al bajar"
    : "historial al scrollback del terminal"
})`);
process.exit(0);
