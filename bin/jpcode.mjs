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
import { existsSync, mkdirSync, cpSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
const VERBOSE = process.env.JPCODE_VERBOSE === "1";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;
let spinnerInterval = null;
let currentSpinnerText = "";

function startSpinner(text) {
  if (VERBOSE || !process.stderr.isTTY) {
    if (text) console.error(`→ jpcode: ${text}`);
    return;
  }
  currentSpinnerText = text;
  if (!spinnerInterval) {
    spinnerInterval = setInterval(() => {
      spinnerIndex = (spinnerIndex + 1) % FRAMES.length;
      process.stderr.write(`\r\x1b[36m${FRAMES[spinnerIndex]}\x1b[0m \x1b[90mjpcode:\x1b[0m ${currentSpinnerText}\x1b[K`);
    }, 80);
  }
}

function updateSpinner(text) {
  if (VERBOSE || !process.stderr.isTTY) {
    if (text) console.error(`→ jpcode: ${text}`);
    return;
  }
  currentSpinnerText = text;
}

function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    if (process.stderr.isTTY) {
      process.stderr.write("\r\x1b[K");
    }
  }
}

const aviso = (m) => {
  if (VERBOSE) {
    console.error(`→ jpcode: ${m}`);
  } else {
    updateSpinner(m);
  }
};

/** Lee un fichero de clave y devuelve undefined si no está o está vacío. */
function clave(ruta) {
  try {
    const v = readFileSync(ruta, "utf8").trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Garantiza que la clave del gateway exista antes de probar puertos.
 * Si no existía, la siembra en GATEWAY/.api-key para que el gateway y el motor
 * usen exactamente la misma clave desde la primera llamada.
 */
function asegurarClaveGateway() {
  if (process.env.OPENCODE_GATEWAY_KEY) return process.env.OPENCODE_GATEWAY_KEY;
  if (process.env.CHAT_API_KEY) return process.env.CHAT_API_KEY;
  const f = join(GATEWAY, ".api-key");
  const v = clave(f);
  if (v) return v;
  try {
    mkdirSync(GATEWAY, { recursive: true });
    const nueva = "ock_" + randomBytes(24).toString("hex");
    writeFileSync(f, nueva + "\n", { mode: 0o600 });
    return nueva;
  } catch {
    return "";
  }
}

const claveGateway = asegurarClaveGateway();

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

startSpinner("Iniciando servicios de jpcode…");

/* 1) Config inicial: de ~/.qwen si existía, y si no de la plantilla del gateway,
   que es la que apunta los modelos al proxy. Sin esto, arrancaría sin modelos. */
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(QWEN_LEGACY, "settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(QWEN_LEGACY, JP_HOME, { recursive: true });
  aviso(`config inicial copiada de ${QWEN_LEGACY} a ${JP_HOME}`);
}
if (!existsSync(join(JP_HOME, "settings.json")) && existsSync(join(GATEWAY, "jpcode-settings.json"))) {
  mkdirSync(JP_HOME, { recursive: true });
  cpSync(join(GATEWAY, "jpcode-settings.json"), join(JP_HOME, "settings.json"));
  aviso("config inicial sembrada desde la plantilla del gateway");
}

/* 2) Comandos propios, que llegan con el paquete. */
const COMANDOS_ORIGEN = join(GATEWAY, "jpcode-commands");
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

/* 4b) Watcher del portapapeles del sistema. Detecta automáticamente cuando el
   usuario copia una imagen (captura de pantalla, Ctrl+C sobre imagen, etc.) y
   la guarda en ~/.jpcode/tmp/clipboard/ para que el motor la adjunte sola.
   Solo se lanza una instancia: si ya hay una corriendo (PID activo), se reutiliza. */
function arrancarWatcherClipboard() {
  if (process.env.JPCODE_CLIP_WATCH === "0") return;
  const script = join(AQUI, "clipboard-watch.mjs");
  if (!existsSync(script)) return;

  /* Control de instancia única con fichero PID */
  const pidFile = join(JP_HOME, "tmp", "clipboard-watch.pid");
  try {
    const pid = Number(clave(pidFile));
    if (pid) {
      /* Comprobamos si el proceso sigue vivo (kill -0 no lo mata, solo lo toca) */
      try { process.kill(pid, 0); return; } catch { /* ya murió, arrancamos uno nuevo */ }
    }
  } catch { /* no había pidfile */ }

  try {
    mkdirSync(join(JP_HOME, "tmp"), { recursive: true });
    const registro = openSync(join(JP_HOME, "tmp", "clipboard-watch.log"), "a");
    const hijo = spawn(process.execPath, [script], {
      detached: true,
      stdio: ["ignore", registro, registro],
      env: {
        ...process.env,
        JPCODE_HOME: JP_HOME,
        JPCODE_IMG_DIR: join(JP_HOME, "tmp", "clipboard"),
      },
    });
    hijo.unref();
    /* Guardamos el PID para no arrancar duplicados */
    try { writeFileSync(pidFile, String(hijo.pid) + "\n"); } catch { /* no crítico */ }
  } catch (e) {
    /* No es crítico: si falla, el usuario puede pegar por el puente web */
  }
}
arrancarWatcherClipboard();


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

/**
 * Mata el proceso que ocupa un puerto dado.
 * Windows: netstat -ano + taskkill. Linux/Mac: fuser -k o lsof+kill.
 * Devuelve true si el puerto quedó libre tras el intento.
 */
async function matarPuerto(p) {
  try {
    const esWindows = process.platform === "win32";
    if (esWindows) {
      /* netstat -ano muestra: Proto  Addr_local  Addr_remota  Estado  PID */
      const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", timeout: 5000 });
      if (r.status !== 0) return false;
      /* Buscamos línea con :PUERTO y estado LISTENING */
      const linea = r.stdout.split("\n").find(
        (l) => new RegExp(`[: ]${p}\\s`).test(l) && /LISTENING/i.test(l)
      );
      if (!linea) return false;
      const pid = linea.trim().split(/\s+/).pop();
      if (!pid || pid === "0") return false;
      spawnSync("taskkill", ["/PID", pid, "/F"], { timeout: 5000 });
    } else {
      /* Linux / macOS: fuser mata directamente */
      const fuser = spawnSync("fuser", ["-k", `${p}/tcp`], { timeout: 5000 });
      if (fuser.status !== 0) {
        /* fallback: lsof */
        const lsof = spawnSync("lsof", ["-ti", `tcp:${p}`], { encoding: "utf8", timeout: 5000 });
        const pid = (lsof.stdout || "").trim();
        if (pid) spawnSync("kill", ["-9", pid], { timeout: 5000 });
      }
    }
    /* Esperamos hasta 2 s a que el proceso muera y el SO libere el puerto */
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (!(await responde(p))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Elige el puerto para el gateway con esta política:
 *  1. Puerto principal libre → úsalo.
 *  2. Puerto principal ocupado por el nuestro (clave ok) → reutiliza.
 *  3. Puerto principal ocupado por otro → intenta matarlo y quedarte con él.
 *  4. No se pudo matar → busca el primer puerto de la lista que esté libre.
 *  5. Todos ocupados y no matables → null (el usuario lo arranca a mano).
 */
async function elegirPuerto() {
  // 8097 lo usa el puente de imágenes, así que no se prueba.
  const candidatos = [PUERTO, PUERTO + 2, PUERTO + 3, PUERTO + 4, PUERTO + 5];

  /* Paso 1 y 2: puerto principal libre o ya nuestro */
  if (!(await responde(PUERTO))) return PUERTO;
  if (await esNuestro(PUERTO, claveGateway)) return PUERTO;

  /* Paso 3: hay algo ajeno en el puerto principal → intentamos matarlo */
  aviso(`el puerto ${PUERTO} lo ocupa un gateway ajeno; intentando liberarlo…`);
  const liberado = await matarPuerto(PUERTO);
  if (liberado) {
    aviso(`puerto ${PUERTO} liberado`);
    return PUERTO;
  }

  /* Paso 4: no pudimos matar; buscar el primero que esté libre de verdad */
  for (const p of candidatos.slice(1)) {
    if (!(await responde(p))) return p;           // libre: perfecto
    if (await esNuestro(p, claveGateway)) return p; // ya nuestro
    /* ocupado por otro: intentar matar también */
    if (await matarPuerto(p)) return p;
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
        /* OPENCODE_GATEWAY_KEY: la misma clave que asegurarClaveGateway() ya
           generó o leyó de GATEWAY/.api-key. Sin esto el gateway la ignora,
           genera una nueva en memoria y el CLI recibe 401 (claves distintas).
           También es lo que hace que esNuestro() detecte correctamente un
           gateway ya corriendo: si la clave no coincide, lo descarta y abre
           más puertos innecesariamente. */
        ...(claveGateway ? { OPENCODE_GATEWAY_KEY: claveGateway } : {}),
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

/* 7) La lista de /model se rellena con lo que el gateway tenga usable AHORA
   (gratis de Zen + proveedores conectados). Los modelos se apuntan a NUESTRO
   puerto, no al de siempre: si el 8096 estaba ocupado, los ajustes tienen que
   reflejarlo o el motor pediría al gateway equivocado.
   OPENCODE_SYNC_MODELS=0 la desactiva. */
if (gatewayListo && process.env.OPENCODE_SYNC_MODELS !== "0" && existsSync(join(GATEWAY, "sync-jpcode-models.mjs"))) {
  spawnSync(process.execPath, [join(GATEWAY, "sync-jpcode-models.mjs")], {
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

stopSpinner();

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
