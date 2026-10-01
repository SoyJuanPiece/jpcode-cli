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
 *
 * Las piezas nativas (terminal, imágenes, portapapeles) las instala npm como
 * dependencias opcionales: cada sistema se lleva la suya. El motor las encuentra
 * subiendo desde `engine/` hasta `node_modules/`.
 *
 *   JPCODE_SKIP_POSTINSTALL=1   no hace nada (útil en CI y en `npm ci`)
 */
import { existsSync, mkdirSync, cpSync, readdirSync } from "node:fs";
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
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(AQUI, "gateway", "qwen-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(AQUI, "gateway", "qwen-settings.json"), join(JP_HOME, "settings.json"));
  aviso("config inicial sembrada desde la plantilla del gateway");
}

/* 2) Comandos propios del CLI. */
const ORIGEN_COMANDOS = join(AQUI, "gateway", "qwen-commands");
if (existsSync(ORIGEN_COMANDOS) && !existsSync(join(JP_HOME, "commands"))) {
  mkdirSync(join(JP_HOME, "commands"), { recursive: true });
  for (const md of readdirSync(ORIGEN_COMANDOS).filter((f) => f.endsWith(".md"))) {
    cpSync(join(ORIGEN_COMANDOS, md), join(JP_HOME, "commands", md));
  }
}

/* 3) Aviso útil, no error: el motor necesita Node >= 22 (su propio requisito). */
const mayor = Number(process.versions.node.split(".")[0]);
if (mayor < 22) aviso(`Node ${process.version}: el motor necesita Node >= 22. Actualízalo antes de usar jpcode.`);

aviso(`listo. Configuración en ${JP_HOME}. Arranca con:  jpcode`);
