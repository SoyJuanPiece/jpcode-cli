#!/usr/bin/env node
/**
 * Puente de imágenes: pega una imagen en el navegador y aparece en jpcode.
 *
 * Problema: en el terminal web de VS Code (Cloud Workstations, user: IDX/Firebase
 * Studio) pegar una imagen **no puede** funcionar. VS Code solo pega texto
 * (`TerminalInstance.paste()` → `clipboardService.readText()`) y el CLI, que corre
 * en el workstation, no tiene ni portapapeles del sistema ni forma de hablar con
 * el navegador. Ver `patch-jpcode-clipboard.mjs` para el detalle.
 *
 * Solución: el proxy de puertos de Cloud Workstations publica **cualquier** puerto
 * del workstation como `https://<puerto>-<WEB_HOST>/` (pidiendo la cookie de sesión
 * que el navegador ya tiene). Así que este script levanta un servidor diminuto que
 * sirve una página; la página corre **en el navegador del usuario**, lee la imagen
 * del portapapeles del navegador (evento `paste`, arrastrar o botón de leer) y la
 * manda por `POST /img` al mismo origen. El fichero cae en la carpeta que usa el CLI
 * (`~/.jpcode/tmp/clipboard/`) con nombre `bridge-*.png`, y
 * `patch-jpcode-image-watch.mjs` hace que jpcode lo adjunte solo.
 *
 *   node jpcode/img-bridge.mjs            # puerto 8097
 *   node jpcode/img-bridge.mjs --port 9000
 *
 * Variables:
 *   JPCODE_IMG_PORT   puerto (por defecto 8097)
 *   JPCODE_IMG_DIR    carpeta destino (por defecto $QWEN_HOME|$JPCODE_HOME/tmp/clipboard)
 *   JPCODE_IMG_TOKEN  si se define, la página pide ?token= (por defecto, sin token)
 *
 * Sin dependencias. ESC para parar en primer plano; en segundo plano, mátalo por pid.
 */
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

/* ---------------- configuración ---------------- */
const args = process.argv.slice(2);
const argDe = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};

const PUERTO = Number(argDe("--port") || process.env.JPCODE_IMG_PORT || 8097);
const TOKEN = process.env.JPCODE_IMG_TOKEN || argDe("--token") || "";
const CASA = process.env.QWEN_HOME || process.env.JPCODE_HOME || join(homedir(), ".jpcode");
const DIR = process.env.JPCODE_IMG_DIR || argDe("--dir") || join(CASA, "tmp", "clipboard");
const MAX_BYTES = 25 * 1024 * 1024;
const HOST_PUBLICO = process.env.WEB_HOST || "";

mkdirSync(DIR, { recursive: true });

/* ---------------- firmas de imagen ---------------- */
/* El navegador dice el tipo, pero no nos fiamos: comprobamos los bytes mágicos y
   sacamos la extensión de ahí (si no, el CLI adjuntaría un fichero corrupto). */
function detectarImagen(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG") return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("latin1", 0, 4) === "GIF8") return "gif";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  return null;
}

const leerCuerpo = (req, limite) =>
  new Promise((resolve, reject) => {
    const trozos = [];
    let total = 0;
    req.on("data", (t) => {
      total += t.length;
      if (total > limite) {
        reject(new Error(`imagen demasiado grande (máx ${Math.round(limite / 1024 / 1024)} MB)`));
        req.destroy();
        return;
      }
      trozos.push(t);
    });
    req.on("end", () => resolve(Buffer.concat(trozos)));
    req.on("error", reject);
  });

const cabeceras = (extra = {}) => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
  ...extra,
});

const json = (res, code, datos) => {
  res.writeHead(code, cabeceras({ "content-type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(datos));
};

/* ---------------- la página ---------------- */
const pagina = (token) => `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>jpcode · puente de imágenes</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; background:#000; color:#e8eaf0;
         font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
         display:flex; flex-direction:column; align-items:center; padding:24px 16px 40px; }
  h1 { font-size:15px; letter-spacing:.14em; text-transform:uppercase; color:#93a4c8; margin:0 0 4px; }
  p.sub { margin:0 0 20px; color:#5b6b8d; font-size:12.5px; }
  #zona { width:min(680px,100%); border:1.5px dashed #1e3a8a; border-radius:10px;
          background:linear-gradient(180deg,#050914,#000); padding:34px 20px; text-align:center;
          transition:border-color .15s, background .15s; outline:none; }
  #zona:focus { border-color:#3b82f6; }
  #zona.hot { border-color:#60a5fa; background:linear-gradient(180deg,#0a1428,#01040c); }
  #zona b { color:#dbe6ff; font-weight:600; }
  #zona code { color:#93c5fd; background:#0b1220; padding:1px 5px; border-radius:4px; }
  .fila { display:flex; gap:10px; margin-top:18px; flex-wrap:wrap; justify-content:center; }
  button, label.boton { background:#1e3a8a; color:#dbe6ff; border:0; border-radius:6px;
          padding:9px 15px; font:inherit; font-size:13px; cursor:pointer; }
  button:hover, label.boton:hover { background:#25489f; }
  button.sec { background:#0b1220; color:#93a4c8; border:1px solid #1b2a4a; }
  #estado { margin-top:20px; width:min(680px,100%); font-size:13px; }
  .ok { color:#7ee2a8; } .err { color:#f38ba8; }
  .item { display:flex; gap:10px; align-items:center; padding:7px 10px; margin-top:6px;
          background:#070d1a; border:1px solid #14213c; border-radius:6px; }
  .item img { height:38px; width:38px; object-fit:cover; border-radius:4px; background:#000; }
  .item span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #pie { margin-top:26px; color:#40506e; font-size:11.5px; text-align:center; }
  #pie code { color:#6b7fa6; }
</style></head><body>
  <h1>jpcode · puente de imágenes</h1>
  <p class="sub">Pega aquí la imagen y jpcode la adjunta sola — no hace falta tocar el terminal.</p>

  <div id="zona" tabindex="0">
    <b>Ctrl/⌘ + V</b> aquí, o <b>arrastra</b> la imagen, o usa los botones.<br>
    <span style="color:#5b6b8d;font-size:12.5px">Funciona con capturas de pantalla, no solo con ficheros.</span>
  </div>

  <div class="fila">
    <button id="leer">Leer el portapapeles</button>
    <label class="boton">Elegir fichero<input id="fichero" type="file" accept="image/*" hidden></label>
    <button id="limpiar" class="sec">Limpiar avisos</button>
  </div>

  <div id="estado"></div>
  <div id="pie">Guardando en <code>${DIR}</code><br>En jpcode: aparece como adjunto (<code>bridge-….png</code>).</div>

<script>
const token = ${JSON.stringify(token)};
const estado = document.getElementById("estado");
const zona = document.getElementById("zona");
let n = 0;

const fila = (clase, texto, mini) => {
  const d = document.createElement("div");
  d.className = "item";
  if (mini) { const i = document.createElement("img"); i.src = mini; d.appendChild(i); }
  const s = document.createElement("span");
  s.className = clase; s.textContent = texto; d.appendChild(s);
  estado.prepend(d);
};

const enviar = async (blob, origen) => {
  if (!blob || !blob.type.startsWith("image/")) { fila("err", "Eso no es una imagen (" + (blob?.type || "sin tipo") + ")"); return; }
  const mini = URL.createObjectURL(blob);
  try {
    const r = await fetch("img" + (token ? "?token=" + encodeURIComponent(token) : ""), {
      method: "POST", headers: { "content-type": blob.type }, body: blob,
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok || !datos.ok) throw new Error(datos.error || ("HTTP " + r.status));
    fila("ok", "✓ " + datos.filename + "  ·  " + (blob.size / 1024).toFixed(0) + " KB  ·  " + origen, mini);
  } catch (e) {
    fila("err", "✕ " + (e.message || e));
  }
};

const imagenesDe = (lista) => Array.from(lista || []).filter((f) => f.type.startsWith("image/"));

addEventListener("paste", (e) => {
  const items = Array.from(e.clipboardData?.items || []);
  const files = Array.from(e.clipboardData?.files || []);
  const blobs = [];

  for (const f of files) {
    if (f.type && f.type.startsWith("image/")) blobs.push(f);
  }
  for (const item of items) {
    if (item.kind === "file" && item.type && item.type.startsWith("image/")) {
      const b = item.getAsFile();
      if (b && !blobs.some((x) => x.size === b.size && x.name === b.name)) blobs.push(b);
    }
  }

  if (blobs.length > 0) {
    e.preventDefault();
    blobs.forEach((b) => enviar(b, "pegado"));
  } else {
    fila("err", "El contenido pegado no contiene ninguna imagen.");
  }
});

["dragenter", "dragover"].forEach((ev) => addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("hot"); }));
["dragleave", "drop"].forEach((ev) => addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove("hot"); }));
addEventListener("drop", (e) => {
  imagenesDe(e.dataTransfer?.files).forEach((b) => enviar(b, "arrastrado"));
});

document.getElementById("leer").onclick = async () => {
  try {
    if (!navigator.clipboard?.read) throw new Error("este navegador no deja leer el portapapeles; usa Ctrl+V aquí");
    const items = await navigator.clipboard.read();
    let algo = false;
    for (const it of items) {
      const tipo = it.types.find((t) => t.startsWith("image/"));
      if (!tipo) continue;
      algo = true;
      await enviar(new Blob([await it.getType(tipo)], { type: tipo }), "portapapeles");
    }
    if (!algo) fila("err", "El portapapeles no tiene ninguna imagen ahora mismo.");
  } catch (e) { fila("err", "✕ " + (e.message || e)); }
};

document.getElementById("fichero").onchange = (e) => {
  Array.from(e.target.files || []).forEach((f) => enviar(f, "fichero"));
  e.target.value = "";
};
document.getElementById("limpiar").onclick = () => { estado.textContent = ""; };

zona.focus();
</script></body></html>
`;

/* ---------------- servidor ---------------- */
const servidor = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://local");

  if (req.method === "OPTIONS") {
    res.writeHead(204, cabeceras());
    res.end();
    return;
  }

  if (TOKEN && url.searchParams.get("token") !== TOKEN) {
    json(res, 403, { ok: false, error: "token inválido" });
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, cabeceras({ "content-type": "text/html; charset=utf-8" }));
    res.end(pagina(TOKEN));
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    json(res, 200, { ok: true, dir: DIR, port: PUERTO, esperando: "jpcode adjunta bridge-*.png" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/img") {
    try {
      const cuerpo = await leerCuerpo(req, MAX_BYTES);
      const ext = detectarImagen(cuerpo);
      if (!ext) {
        json(res, 400, { ok: false, error: "no parece una imagen (PNG, JPEG, GIF, WebP o BMP)" });
        return;
      }
      const nombre = `bridge-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      writeFileSync(join(DIR, nombre), cuerpo);
      console.log(`• imagen recibida: ${nombre} (${(cuerpo.length / 1024).toFixed(0)} KB)`);
      json(res, 200, { ok: true, filename: nombre, bytes: cuerpo.length });
    } catch (e) {
      json(res, e.message?.includes("demasiado grande") ? 413 : 500, { ok: false, error: e.message });
    }
    return;
  }

  json(res, 404, { ok: false, error: "usa / (la página) o POST /img" });
});

servidor.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`⚠️  El puerto ${PUERTO} ya está ocupado (¿ya tienes el puente abierto?).`);
    console.error(`   Prueba: curl -s http://127.0.0.1:${PUERTO}/status`);
  } else {
    console.error("⚠️  no pude arrancar el puente:", e.message);
  }
  process.exit(1);
});

servidor.listen(PUERTO, "0.0.0.0", () => {
  console.log(`🎛️  puente de imágenes en el puerto ${PUERTO}`);
  console.log(`   local:  http://127.0.0.1:${PUERTO}/`);
  if (HOST_PUBLICO) {
    console.log(`   navegador:  https://${PUERTO}-${HOST_PUBLICO}/   ← abre esta`);
  } else {
    console.log("   navegador:  abre https://<puerto>-<tu-host>.cloudworkstations.dev/ (WEB_HOST)");
  }
  console.log(`   destino:  ${DIR}/bridge-*.png`);
  console.log("   Ctrl+C para parar.");
});
