#!/usr/bin/env node
/**
 * postinstall de jpcode cuando se instala desde npm.
 *
 * Ahora es corto a propósito: el motor viaja dentro del paquete (`engine/`) y ya
 * viene parcheado desde la construcción, así que aquí NO se toca nada del
 * sistema. Solo se deja la configuración lista:
 *
 *   1. ~/.jpcode/settings.json la primera vez (de ~/.qwen si existía, y si no de
 *      la plantilla del gateway, que es la que apunta los modelos al proxy).
 *   2. Los comandos propios del CLI (/modelos, /providers).
 *   3. El catálogo de español en ~/.jpcode/locales/es.js, que el motor usa solo
 *      si el sistema está en español.
 *
 * Las piezas nativas (terminal, imágenes, portapapeles) las instala npm como
 * dependencias opcionales: cada sistema se lleva la suya. El motor las encuentra
 * subiendo desde `engine/` hasta `node_modules/`.
 *
 *   JPCODE_SKIP_POSTINSTALL=1   no hace nada (útil en CI y en `npm ci`)
 */
import { existsSync, mkdirSync, cpSync, copyFileSync, readdirSync } from "node:fs";
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

/* El motor tiene que venir en el paquete. Si no está, algo se rompió al
   empaquetar y es mejor decirlo aquí que dejar un jpcode que no arranca. */
if (!existsSync(join(AQUI, "engine", "cli-entry.js"))) {
  aviso("falta el motor (engine/cli-entry.js) en el paquete instalado.");
  aviso("reinstala el paquete; si vienes del código, trae el motor con: bash vendor-engine.sh");
  process.exit(1);
}

/* 1) Config inicial. */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(QWEN_LEGACY, "settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(QWEN_LEGACY, JP_HOME, { recursive: true });
  aviso(`config heredada de ${QWEN_LEGACY} a ${JP_HOME}`);
}
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(AQUI, "gateway", "jpcode-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(AQUI, "gateway", "jpcode-settings.json"), join(JP_HOME, "settings.json"));
  aviso("config inicial sembrada desde la plantilla del gateway");
}

/* 2) Comandos propios del CLI. */
const ORIGEN_COMANDOS = join(AQUI, "gateway", "jpcode-commands");
if (existsSync(ORIGEN_COMANDOS) && !existsSync(join(JP_HOME, "commands"))) {
  mkdirSync(join(JP_HOME, "commands"), { recursive: true });
  for (const md of readdirSync(ORIGEN_COMANDOS).filter((f) => f.endsWith(".md"))) {
    cpSync(join(ORIGEN_COMANDOS, md), join(JP_HOME, "commands", md));
  }
}

/* 2-bis) Locale en español.
 *
 * El motor busca primero un catálogo del usuario en `~/.jpcode/locales/<lang>.js`
 * y, si lo encuentra, lo usa en vez del que trae el paquete. Por eso esto no es un
 * parche del motor: es copiar un fichero. Así el español sobrevive a
 * `vendor-engine.sh` y a `npm update` sin que haya que volver a tocar ningún chunk.
 *
 * Se instala siempre: si falta, quien ya lo tenía vuelve a ponerlo al actualizar.
 * El idioma lo elige `detectSystemLanguage()` del motor con `LANG`, así que esto no
 * fuerza nada — solo hace que el catálogo esté disponible cuando toque. Para verlo
 * sí, sin esperar al sistema: `QWEN_CODE_LANG=es jpcode`. */
const ORIGEN_LOCALES = join(AQUI, "locales");
if (existsSync(ORIGEN_LOCALES)) {
  const DESTINO_LOCALES = join(JP_HOME, "locales");
  mkdirSync(DESTINO_LOCALES, { recursive: true });
  for (const f of readdirSync(ORIGEN_LOCALES).filter((f) => f.endsWith(".js"))) {
    copyFileSync(join(ORIGEN_LOCALES, f), join(DESTINO_LOCALES, f));
  }
  aviso(`catálogo es en ${DESTINO_LOCALES} (se usa si el sistema está en español)`);
}

/* 3) Aviso útil, no error: el motor necesita Node >= 22 (su propio requisito). */
const mayor = Number(process.versions.node.split(".")[0]);
if (mayor < 22) aviso(`Node ${process.version}: el motor necesita Node >= 22. Actualízalo antes de usar jpcode.`);

aviso(`listo. Configuración en ${JP_HOME}. Arranca con:  jpcode`);
