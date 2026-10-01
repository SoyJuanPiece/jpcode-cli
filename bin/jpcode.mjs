#!/usr/bin/env node
/**
 * jpcode — CLI de código con la pinta de Claude Code.
 *
 * Es una versión re-marcada de Qwen Code (Apache-2.0): este bin prepara la
 * identidad, la config propia (~/.jpcode) y arranca el CLI apuntando al gateway
 * de opencode-chat (modelos gratis de Zen + catálogo de models.dev).
 *
 *   jpcode                 # interactivo
 *   jpcode "explica esto"  # one-shot
 *
 * Variables:
 *   JPCODE_HOME          config propia (por defecto ~/.jpcode)
 *   OPENCODE_CHAT_DIR    carpeta con server.mjs/.api-key (por defecto ~/studio/opencode-chat)
 *   OPENCODE_PROXY_PORT  puerto del gateway (por defecto 8096)
 *   JPCODE_IMG_BRIDGE    0 desactiva el puente de imágenes del navegador
 *   JPCODE_IMG_PORT      puerto del puente (por defecto 8097)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const AQUI = dirname(dirname(fileURLToPath(import.meta.url))); // .../jpcode
const HOME = homedir();
const JP_HOME = process.env.JPCODE_HOME || join(HOME, ".jpcode");
const QWEN_LEGACY = join(HOME, ".qwen");
// El gateway viaja con el repo (gateway/) para que un clon limpio funcione. Tu copia de
// trabajo tiene prioridad: es la que usa el proxy que ya esté corriendo, y junto a su
// `.api-key` está la clave que el envoltorio necesita exportar. OPENCODE_CHAT_DIR manda.
const CHAT_DIR =
  process.env.OPENCODE_CHAT_DIR ||
  (existsSync(join(HOME, "studio", "opencode-chat", "server.mjs"))
    ? join(HOME, "studio", "opencode-chat")
    : join(AQUI, "gateway"));

/* 1) Primer arranque: hereda la config/comandos de Qwen (migración de una vez). */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(QWEN_LEGACY, "settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(QWEN_LEGACY, JP_HOME, { recursive: true });
  console.error(`→ jpcode: config inicial copiada de ${QWEN_LEGACY} a ${JP_HOME}`);
}

/* 1b) Máquina nueva, sin ~/.qwen: siembra con la plantilla del gateway, que es la que
   declara los modelos apuntando al proxy. Sin esto arrancaría sin ningún modelo. */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(CHAT_DIR, "qwen-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(CHAT_DIR, "qwen-settings.json"), join(JP_HOME, "settings.json"));
  console.error(`→ jpcode: config inicial sembrada desde ${CHAT_DIR}/qwen-settings.json`);
}

/* 2) Comandos propios (/provider, /modelos…) por si llegaron tras el primer arranque. */
const comandosOrigen = join(QWEN_LEGACY, "commands");
if (existsSync(comandosOrigen) && !existsSync(join(JP_HOME, "commands"))) {
  cpSync(comandosOrigen, join(JP_HOME, "commands"), { recursive: true });
}

/* 3) Identidad visual (idempotente): tema jpcode + banner propio. */
spawnSync(process.execPath, [join(AQUI, "sync-jpcode.mjs")], {
  env: { ...process.env, QWEN_SETTINGS: join(JP_HOME, "settings.json") },
  stdio: "ignore",
});

/* 4) Puente de imágenes del navegador (ver img-bridge.mjs). El terminal web no puede
   pegar imágenes, así que se levanta un servidor pequeñito que sirve una página: pegas
   la captura ahí y el vigilante del prompt la adjunta sola. Si ya está corriendo (mismo
   puerto, p. ej. de otro jpcode abierto), se reutiliza. */
async function arrancarPuente() {
  if (process.env.JPCODE_IMG_BRIDGE === "0") return;
  const script = join(AQUI, "img-bridge.mjs");
  if (!existsSync(script)) return;
  const puerto = Number(process.env.JPCODE_IMG_PORT || 8097);

  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/status`, { signal: AbortSignal.timeout(400) });
    if (r.ok) return; // ya hay un puente escuchando
  } catch { /* nadie escucha: lo arrancamos */ }

  try {
    mkdirSync(join(JP_HOME, "tmp"), { recursive: true });
    const registro = openSync(join(JP_HOME, "tmp", "img-bridge.log"), "a");
    const p = spawn(process.execPath, [script], {
      detached: true,
      stdio: ["ignore", registro, registro],
      env: { ...process.env, QWEN_HOME: JP_HOME },
    });
    p.unref();
    const url = process.env.WEB_HOST ? `https://${puerto}-${process.env.WEB_HOST}/` : `http://127.0.0.1:${puerto}/`;
    console.error(`→ jpcode: puente de imágenes en ${url}`);
  } catch (e) {
    console.error(`→ jpcode: no pude arrancar el puente de imágenes (${e.message})`);
  }
}
await arrancarPuente();

/* 5) Arranca por el envoltorio del gateway (levanta el proxy y pasa la clave). */
const wrapper = join(CHAT_DIR, "qwen");
if (!existsSync(wrapper)) {
  console.error(`⚠️  No encuentro el gateway: falta ${wrapper}`);
  console.error(`    Debería venir en ${join(AQUI, "gateway")}; si usas tu propia copia, define OPENCODE_CHAT_DIR=/ruta/a/opencode-chat`);
  process.exit(127);
}

const hijo = spawn(wrapper, process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, QWEN_HOME: JP_HOME },
});
hijo.on("error", (e) => {
  console.error(`⚠️  no pude arrancar ${wrapper}: ${e.message}`);
  process.exit(127);
});
hijo.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
