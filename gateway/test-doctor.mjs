/**
 * Tests de jpcode doctor.
 * =====================
 *
 * El doctor existe para contestar UNA pregunta: "¿el código que se está
 * ejecutando es el que creo que tengo?". Si el doctor empieza a mentir es
 * PEOR que no tenerlo, porque te dice que todo está bien mientras el gateway
 * viejo sigue sirviendo el código viejo.
 *
 * Por eso aquí se monta un gateway de verdad en cada caso y se le pregunta.
 * Un gateway "al día" es este mismo server.mjs con SU package.json (el del
 * repo): entonces las versiones coinciden y todo debe dar ok. Un gateway
 * "viejo" es el mismo código al que se le quitan los campos nuevos: entonces
 * el doctor tiene que avisar, no pasar.
 *
 *   node gateway/test-doctor.mjs
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, cpSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RAIZ = dirname(HERE);
const PUERTO = 8197;
const VERSION_PKG = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")).version;

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  console.log(`  ${ok ? "✅" : "❌"} ${nombre}${detalle ? " → " + detalle : ""}`);
};

const MODULOS = ["models.mjs", "anthropic.mjs", "providers.mjs", "protocols.mjs", "ids.mjs", "forced-tools.mjs"];

/**
 * Monta un gateway en un directorio limpio.
 *   version: la que dirá que es (la del repo, o una inventada de "antes").
 *   viejo:   si es true, le quita los campos que solo tiene la versión nueva.
 */
async function conGateway({ version = VERSION_PKG, viejo = false }, fn) {
  const dir = mkdtempSync(join(tmpdir(), "jpcode-doctor-"));
  let hijo;
  try {
    for (const m of [...MODULOS, "server.mjs"]) cpSync(join(HERE, m), join(dir, m));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x", version }));
    if (viejo) {
      /* Se sustituyen los VALORES, no las lineas enteras: el codigo minificado
       * tiene los campos en la misma linea y los nombres de funcion cambiados
       * (versionDelPaquete se llama kQ o como toque). Buscar la linea entera
       * solo funcionaba contra el fuente, y hacia que estas pruebas no
       * comprobaran nada sobre lo que se publica de verdad. */
      let s = readFileSync(join(dir, "server.mjs"), "utf8");
      const antes = s;
      s = s.replace(/version:\s*[A-Za-z_$][\w$]*\(\)/, 'version: "0.2.19"');
      s = s.replace(/rutasLimpias:\s*[A-Z_$][\w$]*/, 'rutasLimpias: false');
      if (s === antes) throw new Error("el mutador del test no encontró los campos en /api/status");
      if (/rutasLimpias:\s*[A-Z_$]/.test(s)) throw new Error("el mutador no pudo sustituir rutasLimpias");
      writeFileSync(join(dir, "server.mjs"), s);
    }

    hijo = spawn(process.execPath, [join(dir, "server.mjs"), String(PUERTO)], {
      env: { ...process.env, OPENCODE_GATEWAY_KEY: CLAVE_TEST, OPENCODE_BASE: "http://127.0.0.1:1" },
      stdio: ["ignore", "ignore", "ignore"],
    });
    let arriba = false;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${PUERTO}/api/status`)).ok) { arriba = true; break; } } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!arriba) throw new Error("el gateway del test no arrancó");
    return await fn(dir);
  } finally {
    try { hijo?.kill(); } catch {}
    await new Promise((r) => setTimeout(r, 300));
    rmSync(dir, { recursive: true, force: true });
  }
}

/* El doctor, tal cual lo ejecuta el usuario, y solo su JSON.
 *
 * OPENCODE_GATEWAY_KEY se pasa porque es lo que hace el launcher real: el
 * gateway y el doctor tienen que ver la MISMA clave. Sin esto, el doctor
 * compararía la clave del repo contra un gateway arrancado con otra y
 * se inventaría un fallo que en el uso real no existe. */
const CLAVE_TEST = "clave-doctor-test";
function correrDoctor() {
  const r = spawnSync(process.execPath, [join(HERE, "doctor.mjs"), "--json"], {
    env: { ...process.env, OPENCODE_PROXY_PORT: String(PUERTO), OPENCODE_GATEWAY_KEY: CLAVE_TEST, NO_COLOR: "1" },
    encoding: "utf8",
    timeout: 30000,
  });
  try { return JSON.parse(r.stdout.trim()); } catch { return null; }
}

console.log(`\njpcode doctor, contra gateways de verdad (paquete v${VERSION_PKG}):`);

/* ---- 1. sin gateway: degrada, no revienta ---------------------------- */
{
  const r = correrDoctor();
  check("sin gateway no se rompe y devuelve JSON", r !== null, r ? "" : r?.error);
  check("avisa de que no hay gateway", !!r?.avisos?.some((x) => /Gateway/.test(x)), JSON.stringify(r?.avisos));
  check("sin fallos inventados", r?.fallos?.length === 0, JSON.stringify(r?.fallos));
}

/* ---- 2. gateway al día: todo en verde ------------------------------- */
await conGateway({}, () => {
  const r = correrDoctor();
  check("un gateway al día no da ningún fallo", r?.fallos?.length === 0,
    `fallos=${JSON.stringify(r?.fallos)} avisos=${JSON.stringify(r?.avisos)}`);
  check("no avisa de nada tampoco", r?.avisos?.length === 0, JSON.stringify(r?.avisos));
  check("y afirma que el texto se limpia", r?.rutasLimpias === true, String(r?.rutasLimpias));
  check("las versiones coinciden en el resumen", r?.gateway?.version === VERSION_PKG,
    `${r?.gateway?.version} vs ${VERSION_PKG}`);
});

/* ---- 3. gateway VIEJO: el caso que te ha pasado --------------------- */
await conGateway({ viejo: true }, () => {
  const r = correrDoctor();
  check("un gateway viejo da FALLA, no un ok",
    r?.fallos?.some((x) => /NO ES TU VERSIÓN/.test(x)),
    `fallos=${JSON.stringify(r?.fallos)}`);
  check("y se ve en el resumen", r?.gateway?.version === "0.2.19", String(r?.gateway?.version));
  check("no se afirma que el texto se limpia", r?.rutasLimpias === false, String(r?.rutasLimpias));
});

/* ---- 4. la versión es lo único que decide -------------------------- */
await conGateway({ version: "0.0.1" }, () => {
  const r = correrDoctor();
  check("otra versión = otra falla, aunque el código sea el mismo",
    r?.fallos?.some((x) => /NO ES TU VERSIÓN/.test(x)),
    `fallos=${JSON.stringify(r?.fallos)}`);
  check("pero el saneo de ESE proceso sí funciona", r?.rutasLimpias === true, String(r?.rutasLimpias));
});

console.log(fallos ? `\n❌ ${fallos} fallo(s)\n` : "\n✅ el doctor no miente\n");
process.exit(fallos ? 1 : 0);
