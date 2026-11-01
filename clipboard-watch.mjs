#!/usr/bin/env node
/**
 * Watcher de portapapeles — lee imágenes del portapapeles del sistema y las
 * guarda en ~/.jpcode/tmp/clipboard/ para que jpcode las adjunte sola.
 *
 * - Windows:  PowerShell + System.Windows.Forms → PNG en base64
 * - macOS:    pngpaste (brew install pngpaste) o osascript
 * - Linux:    wl-paste (Wayland) o xclip (X11)
 *
 * Comparte el mismo directorio destino que img-bridge.mjs pero genera ficheros
 * clip-*.png para distinguirlos de los bridge-*.png del puente web.
 *
 *   node clipboard-watch.mjs          # watcher continuo (cada 1.5 s)
 *   node clipboard-watch.mjs --once   # disparo único: guarda lo que haya ahora
 *
 * Variables:
 *   JPCODE_CLIP_INTERVAL  ms entre lecturas (por defecto 1500)
 *   JPCODE_IMG_DIR        carpeta destino (por defecto $JPCODE_HOME/tmp/clipboard)
 *   JPCODE_CLIP_WATCH     "0" desactiva el watcher continuo
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const CASA = process.env.JPCODE_HOME || process.env.QWEN_HOME || join(homedir(), ".jpcode");
const DIR = process.env.JPCODE_IMG_DIR || join(CASA, "tmp", "clipboard");
const INTERVALO = Number(process.env.JPCODE_CLIP_INTERVAL || 1500);
const ONCE = process.argv.includes("--once");

mkdirSync(DIR, { recursive: true });

const esWindows = process.platform === "win32";
const esMac = process.platform === "darwin";

/* ---------- lectura del portapapeles por plataforma ---------- */

function leerWindows() {
  /* PowerShell en modo STA (necesario para acceder al portapapeles de Windows).
     Convertimos a PNG con System.Drawing y devolvemos base64 por stdout. */
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$img = [System.Windows.Forms.Clipboard]::GetImage()",
    "if ($null -eq $img) { exit 1 }",
    "$ms = New-Object System.IO.MemoryStream",
    "$img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)",
    "[Convert]::ToBase64String($ms.ToArray())",
  ].join("; ");

  for (const exe of ["powershell", "pwsh"]) {
    try {
      const r = spawnSync(exe, ["-Sta", "-NoProfile", "-Command", script], {
        encoding: "buffer",
        timeout: 8000,
        windowsHide: true,
      });
      if (r.status !== 0 || !r.stdout || r.stdout.length < 4) continue;
      const b64 = r.stdout.toString("utf8").trim();
      if (!b64) continue;
      const buf = Buffer.from(b64, "base64");
      if (buf.length > 8) return buf;
    } catch { /* exe no encontrado */ }
  }
  return null;
}

function leerMac() {
  /* Opción 1: pngpaste (brew install pngpaste) — la más fiable */
  const tmp = join(tmpdir(), `jpcode-clip-${Date.now()}.png`);
  const r = spawnSync("pngpaste", [tmp], { timeout: 5000 });
  if (r.status === 0 && existsSync(tmp)) {
    try {
      const buf = readFileSync(tmp);
      try { unlinkSync(tmp); } catch { /* no importa */ }
      return buf;
    } catch { return null; }
  }

  /* Opción 2: osascript (sin dependencias) */
  const script = `set theData to the clipboard as «class PNGf»
set theFile to open for access POSIX file "${tmp}" with write permission
write theData to theFile
close access theFile`;
  const r2 = spawnSync("osascript", ["-e", script], { timeout: 6000 });
  if (r2.status === 0 && existsSync(tmp)) {
    try {
      const buf = readFileSync(tmp);
      try { unlinkSync(tmp); } catch { /* no importa */ }
      return buf;
    } catch { return null; }
  }
  return null;
}

function leerLinux() {
  /* Wayland: wl-paste */
  let r = spawnSync("wl-paste", ["--type", "image/png"], { encoding: "buffer", timeout: 3000 });
  if (r.status === 0 && r.stdout?.length > 8) return r.stdout;

  /* X11: xclip */
  r = spawnSync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"], {
    encoding: "buffer", timeout: 3000,
  });
  if (r.status === 0 && r.stdout?.length > 8) return r.stdout;

  /* xsel como último recurso */
  r = spawnSync("xsel", ["--clipboard", "--output"], { encoding: "buffer", timeout: 3000 });
  if (r.status === 0 && r.stdout?.length > 8) return r.stdout;

  return null;
}

function leerPortapapeles() {
  if (esWindows) return leerWindows();
  if (esMac) return leerMac();
  return leerLinux();
}

/* ---------- utilidades ---------- */

function esPNG(buf) {
  return buf && buf.length > 8 && buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG";
}

/** Huella rápida: primeros 64 bytes + tamaño. Evita guardar el mismo portapapeles dos veces. */
function hash4(buf) {
  return `${buf.length}|${buf.slice(0, 64).toString("hex")}`;
}

/* ---------- bucle principal ---------- */

let ultimoHash = "";

function tick() {
  const buf = leerPortapapeles();
  if (!buf || !esPNG(buf)) return false;

  const h = hash4(buf);
  if (h === ultimoHash) return false; // mismo que antes, nada nuevo

  ultimoHash = h;
  const nombre = `clip-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
  writeFileSync(join(DIR, nombre), buf);
  console.log(`📋 portapapeles → ${nombre}  (${(buf.length / 1024).toFixed(0)} KB)`);
  return true;
}

if (ONCE) {
  const ok = tick();
  if (!ok) {
    console.error("📋 No hay ninguna imagen en el portapapeles ahora mismo.");
    process.exit(1);
  }
  process.exit(0);
}

/* Modo watcher continuo */
if (process.env.JPCODE_CLIP_WATCH === "0") {
  process.exit(0);
}

console.log(`📋 watcher del portapapeles activo (cada ${INTERVALO} ms) → ${DIR}`);
setInterval(tick, INTERVALO);
