#!/usr/bin/env node
/**
 * postinstall de jpcode cuando se instala desde npm.
 *
 * Es el equivalente en JavaScript de `install.sh`, porque el paquete tiene que
 * funcionar sin bash (npm no garantiza shell en todas las plataformas). Hace lo
 * mismo, en el mismo orden:
 *
 *   1. Siembra ~/.jpcode/settings.json (una vez): de ~/.qwen si existe, si no de
 *      la plantilla del gateway — que es la que apunta los modelos al proxy.
 *   2. Copia los comandos propios (/modelos, /providers).
 *   3. Aplica los parches de comportamiento sobre Qwen Code (marca, aviso de
 *      imágenes, vigilante del puente).
 *   4. Fusiona tema y banner.
 *
 * NUNCA tumba la instalación: si falta Qwen Code o no se puede parchear, avisa y
 * sale con 0. Un `npm i` que falla a mitad es peor que uno que avisa.
 *
 *   JPCODE_SKIP_POSTINSTALL=1   no hace nada (útil en CI y en `npm ci`)
 *   QWEN_PKG=/ruta/al/paquete   fuerza la ruta de Qwen Code (tests)
 */
import { existsSync, mkdirSync, cpSync, chmodSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const AQUI = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const JP_HOME = process.env.JPCODE_HOME || join(HOME, ".jpcode");
const QWEN_LEGACY = join(HOME, ".qwen");

const aviso = (m) => console.error(`→ jpcode: ${m}`);

if (process.env.JPCODE_SKIP_POSTINSTALL === "1") {
  aviso("postinstall omitido (JPCODE_SKIP_POSTINSTALL=1)");
  process.exit(0);
}

/** Localiza el paquete de Qwen Code, que es lo que hay que parchear. */
function paqueteQwen() {
  if (process.env.QWEN_PKG) return process.env.QWEN_PKG;
  const candidatos = [];
  try {
    const r = spawnSync("npm", ["root", "-g"], { encoding: "utf8" });
    const raiz = (r.stdout || "").trim();
    if (raiz) candidatos.push(raiz);
  } catch {
    /* sin npm en el PATH: tiramos de las rutas conocidas */
  }
  candidatos.push(
    join(HOME, ".global_modules/lib/node_modules"),
    join(HOME, ".npm-global/lib/node_modules"),
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
  );
  for (const c of candidatos) {
    const p = join(c, "@qwen-code/qwen-code");
    if (existsSync(join(p, "package.json"))) return p;
  }
  return null;
}

/* 1) Config inicial. Prioridad: lo que ya tuvieras en ~/.qwen, y si no la
   plantilla del gateway. Sin esto, una máquina nueva arranca sin ningún modelo. */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(QWEN_LEGACY, "settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(QWEN_LEGACY, JP_HOME, { recursive: true });
  aviso(`config heredada de ${QWEN_LEGACY} a ${JP_HOME}`);
}
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(AQUI, "gateway/qwen-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(AQUI, "gateway/qwen-settings.json"), join(JP_HOME, "settings.json"));
  aviso(`config inicial sembrada desde gateway/qwen-settings.json`);
}

/* 2) Comandos propios del CLI (/modelos, /providers). */
const ORIGEN_COMANDOS = join(AQUI, "gateway/qwen-commands");
if (existsSync(ORIGEN_COMANDOS) && !existsSync(join(JP_HOME, "commands"))) {
  mkdirSync(join(JP_HOME, "commands"), { recursive: true });
  for (const md of readdirSync(ORIGEN_COMANDOS).filter((f) => f.endsWith(".md"))) {
    // El envoltorio del gateway está en gateway/: los comandos lo referencian.
    cpSync(join(ORIGEN_COMANDOS, md), join(JP_HOME, "commands", md));
  }
}

/* 3) Parches sobre Qwen Code. */
const QWEN = paqueteQwen();
if (!QWEN) {
  aviso("no encuentro Qwen Code (la base que jpcode re-marca), así que no parcheo nada.");
  aviso(`instálalo con:  npm i -g @qwen-code/qwen-code`);
  aviso(`y repite:  node ${join(AQUI, "postinstall.mjs")}`);
} else {
  const parches = [
    "patch-jpcode-brand.mjs",
    "patch-jpcode-clipboard.mjs",
    "patch-jpcode-image-watch.mjs",
  ];
  for (const p of parches) {
    const ruta = join(AQUI, p);
    if (!existsSync(ruta)) continue;
    const r = spawnSync(process.execPath, [ruta], {
      stdio: "inherit",
      env: { ...process.env, QWEN_PKG: QWEN },
    });
    if (r.status !== 0) aviso(`el parche ${p} falló (código ${r.status}); el resto sigue`);
  }
}

/* 4) Tema y banner (idempotente). */
if (existsSync(join(AQUI, "sync-jpcode.mjs"))) {
  spawnSync(process.execPath, [join(AQUI, "sync-jpcode.mjs")], {
    stdio: "inherit",
    env: { ...process.env, QWEN_SETTINGS: join(JP_HOME, "settings.json") },
  });
}

/* 5) El envoltorio del gateway tiene que ser ejecutable. En npm los permisos
   del tarball no siempre llegan, así que se fuerza aquí. */
try {
  chmodSync(join(AQUI, "gateway/qwen"), 0o755);
} catch {
  /* si no está, el binario lo avisará con un mensaje claro */
}

/* 6) Aviso útil, no error: el proxy necesita tmux para levantarse solo. */
const tmux = spawnSync("tmux", ["-V"], { encoding: "utf8" });
if (tmux.status !== 0) {
  aviso("no veo tmux: jpcode no podrá levantar el gateway solo.");
  aviso("  instálalo, o arranca el proxy a mano:  node gateway/server.mjs 8096");
}

aviso(`listo. Configuración en ${JP_HOME}. Arranca con:  jpcode`);
