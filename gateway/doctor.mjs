/**
 * jpcode doctor — el diagnóstico, en un solo comando.
 * =================================================
 *
 * Por qué existe: se han perdido horasous versiones seguidas arreglando cosas
 * que en local daban verde y en la pantalla del usuario seguian igual. Casi
 * siempre por lo mismo — el gateway se queda VIVO al cerrar jpcode, la sesion
 * siguiente lo reutiliza, y el proceso que estas probando no es el que creías.
 *
 * Este comando no arregla nada: mira. Y mira lo que de verdad importa:
 *
 *   1. Qué versión del PAQUETE tienes instalada.
 *   2. Qué versión dice el proceso del GATEWAY que está vivo ahora mismo.
 *      Si no coinciden, todo lo que pruebes va a ser mentira.
 *   3. Si hay procesos gateway VIEJOS acumulados, y cuáles son.
 *   4. Si el texto del modelo se limpia de verdad — lo contesta el proceso
 *      vivo, no este fichero.
 *   5. Si sobran claves o ficheros con permisos abiertos.
 *   6. La memoria y el log, por si el OOM vuelve a aparecer.
 *
 *   jpcode doctor          # el informe
 *   jpcode doctor --json   # lo mismo, para programas
 *
 * No necesita API key, ni conexión, ni que el gateway esté arrancado: cada
 * comprobación degrada sola y lo dice, en vez de reventar.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const AQUI = dirname(dirname(fileURLToPath(import.meta.url))); // .../jpcode
const HOME = homedir();
const JP_HOME = process.env.JPCODE_HOME || join(HOME, ".jpcode");
const PUERTO = Number(process.env.OPENCODE_PROXY_PORT || 8096);

const usaColor =
  process.stdout.isTTY && !process.env.NO_COLOR;
const c = (n, s) => (usaColor ? `\x1b[${n}m${s}\x1b[0m` : s);
const VERDE = (s) => c(32, s);
const ROJO = (s) => c(31, s);
const AMARILLO = (s) => c(33, s);
const GRIS = (s) => c(90, s);
const NEGRITA = (s) => c(1, s);

/* El informe se acumula en `salida` y se imprime al final, o no se imprime si
   se pidió --json. Así el modo JSON sale limpio por stdout, que es lo que
   permite a un programa (o un test) hacer JSON.parse sin andar adivinando
   dónde acaba el texto. */
const salida = [];
let modoJson = false;
const log = (s = "") => { salida.push(s); if (!modoJson) console.log(s); };

/* Cada comprobación es un objeto: si sabe arreglarlo, lleva el cómo. */
const checks = [];
const anota = (nombre, estado, detalle, arreglo = null) => {
  checks.push({ nombre, estado, detalle, arreglo });
  const marca = estado === "ok" ? VERDE("  ok  ") : estado === "aviso" ? AMARILLO("aviso ") : ROJO(" FALLA");
  log(`${marca}  ${nombre}`);
  if (detalle) for (const l of String(detalle).split("\n")) log(`        ${GRIS(l)}`);
  if (arreglo) log(`        ${GRIS("→ " + arreglo)}`);
};

const versionPaquete = () => {
  try {
    return JSON.parse(readFileSync(join(AQUI, "package.json"), "utf8")).version || null;
  } catch {
    return null;
  }
};

/* ---- los procesos node que hay por ahi ------------------------------- */
function procesosGateway() {
  const salidaCmd = process.platform === "win32"
    ? spawnSync("wmic", ["process", "where", "name='node.exe'", "get", "ProcessId,CommandLine", "/format:csv"], { encoding: "utf8", timeout: 8000 }).stdout
    : spawnSync("ps", ["-eo", "pid,args"], { encoding: "utf8", timeout: 8000 }).stdout;
  if (!salidaCmd) return [];
  /* Solo los que de verdad EJECUTAN server.mjs. Sin este filtro se cuelan los
     scripts que lo mencionan en su texto (un `bash -c`, un heredoc, este propio
     doctor si alguien lo invoca desde un shell) y el informe dice que hay
     gateways que no existen. */
  const lineas = salidaCmd.split(/\r?\n/).filter((l) => {
    if (!/server\.mjs/.test(l)) return false;
    const cmd = l.replace(/^[^a-zA-Z]*\d+[,\s]+/, "").trim();
    if (/^(node|node\.exe|[^/\\]*[/\\]node(\.exe)?)\b/.test(cmd)) return true;
    /* `node --experimental… server.mjs` o con banderas: se busca la palabra
       suelta, no al principio. */
    return /(^|\s)(node|node\.exe)(\s|$)/.test(cmd) && !/\b(bash|sh|python|pwsh|powershell|grep|rg)\b/.test(cmd);
  });
  return lineas
    .map((l) => {
      const m = l.trim().match(/^(\d+)[,\s]+(.*)$/);
      return m ? { pid: Number(m[1]), cmd: m[2].trim() } : null;
    })
    .filter(Boolean);
}

/* ---- el gateway vivo --------------------------------------------------- */
async function estadoGateway(puerto) {
  try {
    const r = await fetch(`http://127.0.0.1:${puerto}/api/status`, { signal: AbortSignal.timeout(1200) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/* Ping al gateway vivo: ¿responde a /v1/models con la clave?
 *
 * NO se llama a un modelo de verdad a proposito. El tier gratis de Zen exige
 * `stream: true` y red, así que una prueba "de fuego" contra el upstream real
 * daria timeouts falsos sin conexión y no aportaría nada que /api/status no
 * diga ya. Lo que importa —si el texto se limpia— lo contesta el propio
 * proceso, que para eso se lo ha preguntado. */
async function pingGateway(puerto) {
  try {
    const clave = process.env.OPENCODE_GATEWAY_KEY ||
      (existsSync(join(AQUI, "gateway", ".api-key")) ? readFileSync(join(AQUI, "gateway", ".api-key"), "utf8").trim() : "");
    const r = await fetch(`http://127.0.0.1:${puerto}/v1/models`, {
      headers: clave ? { Authorization: `Bearer ${clave}` } : {},
      signal: AbortSignal.timeout(2000),
    });
    return { status: r.status, body: await r.text() };
  } catch (err) {
    return { status: 0, body: "", error: err.message };
  }
}

export async function doctor({ json = false } = {}) {
  checks.length = 0;
  salida.length = 0;
  modoJson = json;
  /* En --json no se imprime nada del informe: stdout lleva solo el JSON. Los
   * comandos de arreglo del PowerShell traen llaves y comillas que rompen un
   * parseo ingenuo del primer { que aparezca. */
  if (!json) {
    log(NEGRITA("\njpcode doctor\n") + GRIS("  ────────────────────────────────\n"));
  }

  const vPkg = versionPaquete();

  /* ---- 1. el paquete ---- */
  anota("Paquete instalado", vPkg ? "ok" : "aviso",
    vPkg ? `${AQUI}\nv${vPkg}` : `no se pudo leer ${join(AQUI, "package.json")}`);

  /* ---- 2. el motor ---- */
  const motor = join(AQUI, "engine", "cli-entry.js");
  if (!existsSync(motor)) {
    anota("Motor", "falla", `falta ${motor}`, "en un clon: bash vendor-engine.sh");
  } else {
    const mb = (statSync(motor).size / 1e6).toFixed(1);
    anota("Motor", "ok", `engine/cli-entry.js · ${mb} MB`);
  }

  /* ---- 3. el gateway vivo ---- */
  const est = await estadoGateway(PUERTO);
  if (!est) {
    anota(`Gateway en el puerto ${PUERTO}`, "aviso",
      "no responde. Si no tienes una sesión abierta, es lo normal.",
      "arranca jpcode, o a mano:  node gateway/server.mjs " + PUERTO);
  } else {
    const vivo = est.codigo || {};
    const vGato = vivo.version || null;
    const linea = [
      `proceso pid ${vivo.pid} arrancado ${vivo.inicio}`,
      `dice ser la v${vGato || "?"}  ·  el paquete es la v${vPkg || "?"}`,
    ];
    if (vGato && vPkg && vGato === vPkg) {
      anota("El gateway vivo es el código que tienes instalado", "ok", linea.join("\n"));
    } else if (vGato) {
      anota("EL GATEWAY VIVO NO ES TU VERSIÓN", "falla", linea.join("\n"),
        `mata el proceso ${vivo.pid} y vuelve a abrir jpcode.\n` +
        "En Windows:  Get-Process node | Where-Object { $_.CommandLine -like \"*server.mjs*\" } | Stop-Process -Force\n" +
        "En Linux/Mac:  pkill -f server.mjs");
    } else {
      anota("Gateway vivo, pero no dice su versión", "aviso", linea.join("\n"),
        "es un gateway de una versión antigua; mata el proceso y abre jpcode otra vez");
    }

    /* ---- 4. el saneo, preguntado al proceso que vive ---- */
    if (vivo.rutasLimpias === true) {
      anota("El texto del modelo se limpia (preguntado al proceso vivo)", "ok",
        "el gateway dice que sí: no verás el XML en pantalla");
    } else if (vivo.rutasLimpias === false) {
      anota("EL TEXTO DEL MODELO NO SE ESTÁ LIMPIANDO", "falla",
        "el propio gateway lo dice: el XML se verá en pantalla en este proceso",
        "mata el proceso y abre jpcode de nuevo");
    } else {
      anota("No se puede comprobar el saneo", "aviso",
        "este gateway es anterior a la comprobación; no se sabe si limpia el texto",
        "actualiza a la última versión");
    }
  }

  /* ---- 5. procesos viejos ---- */
  const procs = procesosGateway();
  if (procs.length === 0) {
    anota("Procesos gateway", "ok", "ninguno corriendo");
  } else if (procs.length === 1 && est) {
    anota("Procesos gateway", "ok", `solo el de este puerto (pid ${procs[0].pid})`);
  } else {
    anota(
      procs.length > 1 ? `${procs.length} gateways acumulados` : "Hay un gateway en un puerto distinto",
      procs.length > 1 ? "aviso" : "aviso",
      procs.map((p) => `pid ${p.pid}  ${p.cmd.slice(0, 90)}`).join("\n"),
      "los viejos siguen sirviendo código viejo si algo los usa. Para limpiar:  pkill -f server.mjs",
    );
  }

  /* ---- 6. el gateway vivo contesta ---- */
  if (est) {
    const pf = await pingGateway(PUERTO);
    if (pf.status === 200) {
      let n = null;
      try { n = JSON.parse(pf.body)?.data?.length; } catch { /* da igual */ }
      anota("El gateway contesta con la clave del paquete", "ok",
        n != null ? `HTTP 200 · ${n} modelos disponibles` : "HTTP 200 a /v1/models");
    } else if (pf.status === 401) {
      anota("El gateway pide una clave que no es la del paquete", "falla",
        "HTTP 401. Es el sintoma de un gateway de otra instalación con otra clave.",
        "mata el proceso y abre jpcode otra vez para que regenere la suya");
    } else {
      anota("El gateway no contesta a /v1/models", "aviso",
        `HTTP ${pf.status}${pf.error ? " · " + pf.error : ""}`,
        `mira el log:  ${join(JP_HOME, "tmp", "gateway.log")}`);
    }
  }

  /* ---- 7. claves y permisos ---- */
  const avisosClave = [];
  const keyFile = join(AQUI, "gateway", ".api-key");
  if (existsSync(keyFile)) {
    const m = (statSync(keyFile).mode & 0o777).toString(8);
    if (m !== "600") avisosClave.push(`gateway/.api-key tiene permisos ${m} (debería ser 600)`);
  }
  const provCfg = join(JP_HOME, "opencode.json");
  if (existsSync(provCfg)) {
    try {
      const cfg = JSON.parse(readFileSync(provCfg, "utf8"));
      const conClave = Object.values(cfg?.providers || {}).filter((p) => p?.apiKey).length;
      if (conClave) avisosClave.push(`${conClave} proveedor(es) con la clave guardada EN CLARO en opencode.json`);
    } catch { /* si no se puede leer, mejor no decir nada */ }
  }
  if (avisosClave.length) {
    anota("Claves y permisos", "aviso", avisosClave.join("\n"));
  } else {
    anota("Claves y permisos", "ok", "sin claves en claro ni ficheros abiertos de más");
  }

  /* ---- 8. el log (por si vuelve el OOM) ----
   * El OOM que se ha visto ocurre mientras el CLI espera, no en el gateway.
   * Un log desmedido no lo causa, pero sí se lo come: el motor lo carga entero.
   * Por eso se mira. */
  const logGateway = join(JP_HOME, "tmp", "gateway.log");
  if (existsSync(logGateway)) {
    const mb = statSync(logGateway).size / 1024 / 1024;
    if (mb > 5) {
      anota("Log del gateway", "aviso", `${mb.toFixed(1)} MB — se está comiendo la memoria`,
        `vaciarlo:  : > "${logGateway}"`);
    } else {
      anota("Log del gateway", "ok", `${mb.toFixed(2)} MB en ${logGateway}`);
    }
  }

  /* ---- resumen ---- */
  const malas = checks.filter((x) => x.estado === "falla");
  const avisos = checks.filter((x) => x.estado === "aviso");
  const resumen = {
    version: vPkg,
    gateway: est ? { puerto: PUERTO, pid: est.codigo?.pid, version: est.codigo?.version || null } : null,
    procesos: procs.map((p) => p.pid),
    rutasLimpias: est?.codigo?.rutasLimpias ?? null,
    fallos: malas.map((x) => x.nombre),
    avisos: avisos.map((x) => x.nombre),
  };

  if (!json) {
    log(GRIS("  ────────────────────────────────\n"));
    if (malas.length === 0 && avisos.length === 0) {
      log(VERDE("Todo bien. ") + GRIS("El código vivo es el que tienes instalado y limpia el texto.\n"));
    } else if (malas.length) {
      log(ROJO(`${malas.length} problema(s) que explican lo que estás viendo:\n`));
      for (const ch of malas) {
        log(ROJO(`  · ${ch.nombre}`));
        if (ch.arreglo) log(GRIS(`    ${ch.arreglo}`));
      }
      if (avisos.length) log(GRIS(`\n  y ${avisos.length} aviso(s) sin urgencia.`));
      log("");
    } else {
      log(AMARILLO(`${avisos.length} aviso(s), nada roto:\n`));
      for (const ch of avisos) {
        log(AMARILLO(`  · ${ch.nombre}`));
        if (ch.detalle) log(GRIS(`    ${ch.detalle}`));
        if (ch.arreglo) log(GRIS(`    ${ch.arreglo}`));
      }
      log("");
    }
  }

  return { texto: salida.join("\n"), resumen, failed: malas.length > 0 };
}

/* Ejecutado directamente: `node doctor.mjs`. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await doctor({ json: process.argv.includes("--json") });
  if (process.argv.includes("--json")) console.log(JSON.stringify(r.resumen, null, 2));
  process.exit(r.failed ? 1 : 0);
}
