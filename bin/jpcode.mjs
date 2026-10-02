#!/usr/bin/env node
/**
 * jpcode — el CLI de código de JuanPiece.
 *
 * Arranca el MOTOR que viaja dentro del propio paquete (`engine/`), que ya viene
 * parcheado desde la construcción: aquí no se parchea nada del sistema.
 *
 *   jpcode                 # interactivo
 *   jpcode "explica esto"  # one-shot
 *
 * Lo que hace, en orden:
 *   1. Crea ~/.jpcode la primera vez (heredando ~/.qwen si existía).
 *   2. Copia los comandos propios y fusiona tema y banner.
 *   3. Levanta el puente de imágenes del navegador.
 *   4. Se asegura de tener SU gateway (el proxy que habla con los proveedores):
 *      si el puerto está libre lo levanta, y si lo ocupa otro gateway ajeno,
 *      busca el siguiente libre y apunta los modelos ahí. Así jpcode no depende
 *      de que nadie más tenga nada instalado ni corriendo.
 *   5. Refresca la lista de /model con lo que el gateway tenga usable.
 *   6. Arranca el motor.
 *
 * Antes esto último pasaba por un envoltorio de bash que buscaba un `qwen`
 * instalado y usaba `tmux` para el proxy. Ya no hace falta ni lo uno ni lo otro.
 *
 * Variables:
 *   JPCODE_HOME          config (por defecto ~/.jpcode)
 *   OPENCODE_PROXY_PORT  primer puerto a probar para el gateway (por defecto 8096)
 *   JPCODE_IMG_BRIDGE    0 desactiva el puente de imágenes
 *   JPCODE_IMG_PORT      puerto del puente (por defecto 8097)
 *   OPENCODE_GATEWAY_DIR gateway alternativo (por defecto el del paquete)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, openSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const AQUI = dirname(dirname(fileURLToPath(import.meta.url))); // .../jpcode
const HOME = homedir();
const JP_HOME = process.env.JPCODE_HOME || join(HOME, ".jpcode");
const QWEN_LEGACY = join(HOME, ".qwen");
const ENGINE = join(AQUI, "engine");
const GATEWAY =
  process.env.OPENCODE_GATEWAY_DIR ||
  (existsSync(join(AQUI, "gateway", "server.mjs")) ? join(AQUI, "gateway") : join(HOME, "studio", "opencode-chat"));
const PUERTO = Number(process.env.OPENCODE_PROXY_PORT || 8096);

const aviso = (m) => console.error(`→ jpcode: ${m}`);

/** Lee un fichero de clave y devuelve undefined si no está o está vacío. */
function clave(ruta) {
  try {
    const v = readFileSync(ruta, "utf8").trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

/** La versión de jpcode, del package.json que está al lado. Si no se puede leer,
 *  undefined: mejor que el motor anuncie la suya (que es lo que pasaba antes) a
 *  que jpcode no arranque. */
function versionPropia() {
  try {
    const pkg = JSON.parse(readFileSync(join(AQUI, "package.json"), "utf8"));
    return typeof pkg.version === "string" && pkg.version ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

/* 1) Config inicial: de ~/.qwen si existía, y si no de la plantilla del gateway,
   que es la que apunta los modelos al proxy. Sin esto, arrancaría sin modelos. */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(QWEN_LEGACY, "settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(QWEN_LEGACY, JP_HOME, { recursive: true });
  aviso(`config inicial copiada de ${QWEN_LEGACY} a ${JP_HOME}`);
}
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(GATEWAY, "qwen-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(GATEWAY, "qwen-settings.json"), join(JP_HOME, "settings.json"));
  aviso("config inicial sembrada desde la plantilla del gateway");
}

/* 2) Comandos propios, que llegan con el paquete. */
const COMANDOS_ORIGEN = join(GATEWAY, "qwen-commands");
if (existsSync(COMANDOS_ORIGEN) && !existsSync(join(JP_HOME, "commands"))) {
  cpSync(COMANDOS_ORIGEN, join(JP_HOME, "commands"), { recursive: true });
}

/* 3) Tema y banner (idempotente). */
spawnSync(process.execPath, [join(AQUI, "sync-jpcode.mjs")], {
  env: { ...process.env, QWEN_SETTINGS: join(JP_HOME, "settings.json") },
  stdio: "ignore",
});

/* 4) Puente de imágenes del navegador. El terminal web no puede pegar capturas,
   así que se sirve una página: pegas ahí y el vigilante la adjunta sola. Si ya
   hay uno escuchando (otro jpcode abierto), se reutiliza. */
async function arrancarPuente() {
  if (process.env.JPCODE_IMG_BRIDGE === "0") return;
  const script = join(AQUI, "img-bridge.mjs");
  if (!existsSync(script)) return;
  const puerto = Number(process.env.JPCODE_IMG_PORT || 8097);

  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/status`, { signal: AbortSignal.timeout(400) });
    if (r.ok) return;
  } catch {
    /* nadie escucha: lo arrancamos */
  }

  try {
    mkdirSync(join(JP_HOME, "tmp"), { recursive: true });
    const registro = openSync(join(JP_HOME, "tmp", "img-bridge.log"), "a");
    spawn(process.execPath, [script], {
      detached: true,
      stdio: ["ignore", registro, registro],
      env: { ...process.env, QWEN_HOME: JP_HOME },
    }).unref();
    const url = process.env.WEB_HOST ? `https://${puerto}-${process.env.WEB_HOST}/` : `http://127.0.0.1:${puerto}/`;
    aviso(`puente de imágenes en ${url}`);
  } catch (e) {
    aviso(`no pude arrancar el puente de imágenes (${e.message})`);
  }
}
await arrancarPuente();

/* 5) El gateway: el proxy que traduce a todos los proveedores. */
async function responde(puerto) {
  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/api/status`, { signal: AbortSignal.timeout(1000) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * ¿El gateway que responde en ese puerto es el NUESTRO? La única prueba fiable es
 * que nuestra clave abra su /v1/models. Sin esto, jpcode reutilizaría el gateway
 * de otra instalación (con otra clave) y los modelos fallarían con un error raro.
 */
async function esNuestro(puerto, k) {
  if (!k) return false;
  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/v1/models`, {
      headers: { Authorization: `Bearer ${k}` },
      signal: AbortSignal.timeout(1500),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Primer puerto donde podamos mandar: libre, o ya ocupado por el nuestro. */
async function elegirPuerto() {
  const k = clave(join(GATEWAY, ".api-key"));
  // 8097 lo usa el puente de imágenes, así que no se prueba.
  for (const p of [PUERTO, PUERTO + 2, PUERTO + 3, PUERTO + 4, PUERTO + 5]) {
    if (!(await responde(p))) return p;
    if (await esNuestro(p, k)) return p;
    aviso(`el puerto ${p} lo ocupa otro gateway; pruebo el siguiente`);
  }
  return null;
}

const puerto = await elegirPuerto();
let gatewayListo = false;

if (puerto === null) {
  aviso("no encuentro ningún puerto libre para el gateway.");
  aviso(`arráncalo a mano:  node ${join(GATEWAY, "server.mjs")} <puerto>`);
} else if (await responde(puerto)) {
  gatewayListo = true; // ya era nuestro
} else {
  const server = join(GATEWAY, "server.mjs");
  if (!existsSync(server)) {
    aviso(`no encuentro el gateway en ${GATEWAY}`);
  } else {
    mkdirSync(join(JP_HOME, "tmp"), { recursive: true });
    const registro = openSync(join(JP_HOME, "tmp", "gateway.log"), "a");
    const zen = clave(join(GATEWAY, ".zen-key"));
    /* El proceso arranca con el cwd en ~/.jpcode y NO dentro del paquete, y
       OPENCODE_CHAT_DIR le dice dónde está su casa (las keys, la caché, la UI).
       Es a propósito: este gateway es `detached` y sobrevive a jpcode, y en
       Windows una carpeta que es el cwd de un proceso vivo no se puede
       renombrar → `npm i -g` fallaba con EBUSY al actualizar el paquete. */
    spawn(process.execPath, [server, String(puerto)], {
      detached: true,
      cwd: JP_HOME,
      stdio: ["ignore", registro, registro],
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        OPENCODE_CHAT_DIR: GATEWAY,
        ...(zen ? { OPENCODE_API_KEY: zen } : {}),
      },
    }).unref();

    for (let i = 0; i < 60; i++) {
      if (await responde(puerto)) {
        gatewayListo = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (gatewayListo) aviso(`gateway en el puerto ${puerto}`);
    else aviso(`el gateway no respondió en el puerto ${puerto}; mira ${join(JP_HOME, "tmp", "gateway.log")}`);
  }
}

const URL_GATEWAY = `http://127.0.0.1:${puerto ?? PUERTO}/v1`;

/* 6) La clave del gateway se lee después de que el servidor la haya generado (si era la primera vez). */
const claveGateway = clave(join(GATEWAY, ".api-key")) || process.env.OPENCODE_GATEWAY_KEY;

/* 7) La lista de /model se rellena con lo que el gateway tenga usable AHORA
   (gratis de Zen + proveedores conectados). Los modelos se apuntan a NUESTRO
   puerto, no al de siempre: si el 8096 estaba ocupado, los ajustes tienen que
   reflejarlo o el motor pediría al gateway equivocado.
   OPENCODE_SYNC_MODELS=0 la desactiva. */
if (gatewayListo && process.env.OPENCODE_SYNC_MODELS !== "0" && existsSync(join(GATEWAY, "sync-qwen-models.mjs"))) {
  spawnSync(process.execPath, [join(GATEWAY, "sync-qwen-models.mjs")], {
    stdio: "ignore",
    env: {
      ...process.env,
      QWEN_SETTINGS: join(JP_HOME, "settings.json"),
      OPENCODE_GATEWAY_URL: URL_GATEWAY,
      ...(claveGateway ? { OPENCODE_GATEWAY_KEY: claveGateway } : {}),
    },
  });
}

/* 8) El motor, que viaja dentro. */
const entrada = join(ENGINE, "cli-entry.js");
if (!existsSync(entrada)) {
  console.error(`⚠️  jpcode: falta el motor (${entrada}).`);
  console.error("    En un clon del código se trae con:  bash vendor-engine.sh");
  process.exit(127);
}

/* La versión que la interfaz anuncia (cabecera, /about, /bug, el item
   `qwen-version` de la línea de estado) va por entorno porque el motor la lleva
   escrita en su propio código: `JPCODE_CLI_VERSION` es lo que lee su
   `getCliVersion()` tras el parche de marca, y `CLI_VERSION` lo que lee su
   `cli-entry.js` para `jpcode --version`. Van SOLO en el entorno del motor, que
   es el único que las necesita: el gateway no las tiene por qué, y no deben
   colarse en las peticiones a los proveedores. */
const version = versionPropia();

const hijo = spawn(process.execPath, [entrada, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    QWEN_HOME: JP_HOME,
    JPCODE_INCREMENTAL_RENDER: process.env.JPCODE_INCREMENTAL_RENDER ?? "1",
    ...(claveGateway ? { OPENCODE_GATEWAY_KEY: claveGateway } : {}),
    ...(version ? { JPCODE_CLI_VERSION: version, CLI_VERSION: version } : {}),
  },
});
hijo.on("error", (e) => {
  console.error(`⚠️  jpcode: no pude arrancar el motor: ${e.message}`);
  process.exit(127);
});
hijo.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
