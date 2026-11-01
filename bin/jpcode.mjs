#!/usr/bin/env node
// JpCode v2.1 — CLI propio con diseño estilo Claude Code.
// Motor: opencode 2.x (serve + API HTTP v2 `/api/*` con Basic auth).
//
// Cambios respecto a 2.0.x: opencode 2 dejó de exponer el API v1 y renombró
// sus paquetes (`opencode-ai` -> `@opencode/cli`, SDK v2 en proceso que exige
// Node 24). Para mantener jpcode ligero y compatible con Node >=18, hablamos
// directamente con el API HTTP v2 y usamos el modelo gratuito de OpenCode Zen
// por defecto.
import readline from "node:readline"
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

const C = {
  accent: (s) => `\x1b[38;5;214m${s}\x1b[0m`, // naranja Claude
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
}

const BANNER = [
  "     ▄▄ ▄▄▄▄▄▄   ▄▄▄▄▄▄  ▄▄▄▄▄▄  ▄▄▄▄▄▄▄",
  "     ██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝",
  "     ██║██████╔╝██║     ██║   ██║██║  ██║█████╗",
  "██   ██║██╔═══╝ ██║     ██║   ██║██║  ██║██╔══╝",
  "╚█████╔╝██║     ╚██████╔╝██████╔╝██████╔╝███████╗",
  " ╚════╝ ╚═╝      ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
]

// Gradiente vertical por fila: arriba más claro, abajo más oscuro
const GRADIENT = [
  "\x1b[38;5;117m",
  "\x1b[38;5;215m",
  "\x1b[38;5;214m",
  "\x1b[38;5;208m",
  "\x1b[38;5;202m",
  "\x1b[38;5;166m",
]
const RESET = "\x1b[0m"

function printBanner(sub) {
  console.log("")
  BANNER.forEach((line, i) => {
    console.log(`${GRADIENT[i]}${line}${RESET}`)
  })
  console.log("")
}

// versión leída del package.json del paquete (nunca hardcodeada)
const APP_VERSION = (() => {
  try {
    return require("../package.json").version
  } catch {
    return "2.1.0"
  }
})()

// ---------------------------------------------------------------------------
// Modelo por defecto: tier gratuito de OpenCode Zen
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "opencode/deepseek-v4.1-flash-free"
let MODEL = process.env.JPCODE_MODEL?.trim() || DEFAULT_MODEL

function parseModel(spec) {
  const [providerID, ...rest] = String(spec).split("/")
  const id = rest.join("/")
  if (!providerID || !id) return null
  return { providerID, id }
}

// ---------------------------------------------------------------------------
// UI: panel de info estilo plugin (>_ JpCode (vX) | modelo | directorio)
// ---------------------------------------------------------------------------

function printHeader() {
  const border = C.dim("─".repeat(46))
  console.log(border)
  console.log(
    ` ${C.accent(C.bold(">_ JpCode"))} ${C.dim(`(v${APP_VERSION})`)}${MODEL ? C.dim("  ·  " + MODEL) : ""}`,
  )
  console.log(C.dim(`   ${process.cwd()}`))
  console.log(border)
  console.log("")
}

// ---------------------------------------------------------------------------
// Motor opencode como backend
// ---------------------------------------------------------------------------

async function findEngineBinary() {
  // 1) junto a este paquete (dependencia npm @opencode/cli)
  try {
    const pkgDir = path.dirname(require.resolve("@opencode/cli/package.json"))
    const candidates = ["opencode.exe", "opencode"].map((n) => path.join(pkgDir, "bin", n))
    for (const p of candidates) if (existsSync(p)) return p
  } catch {}
  // 2) binario global en PATH
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["opencode"], {
    encoding: "utf8",
  })
  if (which.status === 0 && which.stdout.trim().split(/\r?\n/)[0]) {
    return which.stdout.trim().split(/\r?\n/)[0]
  }
  return null
}

async function startEngine() {
  const bin = await findEngineBinary()
  if (!bin) {
    console.error(C.red("✗ No encontré el motor opencode."))
    console.error("  Instálalo con: npm i -g @opencode/cli   (o reinstala @juanpiecedev/jpcode)")
    process.exit(1)
  }

  const port = 14000 + Math.floor(Math.random() * 20000)
  const child = spawn(bin, ["serve", "--port", String(port), "--hostname", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    cwd: process.cwd(),
  })

  let password = ""
  let out = ""
  const base = `http://127.0.0.1:${port}`

  child.stdout.on("data", (d) => {
    out += String(d)
    // opencode 2 imprime: "server password <token>"
    const m = out.match(/server password\s+(\S+)/)
    if (m && !password) password = m[1]
    if (process.env.JPCODE_DEBUG) process.stderr.write(C.dim(String(d)))
  })
  child.stderr.on("data", (d) => {
    if (process.env.JPCODE_DEBUG) process.stderr.write(C.dim(String(d)))
  })
  child.on("exit", (code) => {
    if (code && code !== 0 && !process.env.JPCODE_EXITING) {
      console.error(C.red(`✗ El motor opencode terminó (código ${code}).`))
    }
  })

  // esperar a que el server responda y tengamos la contraseña
  for (let i = 0; i < 160; i++) {
    if (password) {
      const r = await apiRaw(base, password, "/api/info").catch(() => null)
      if (r?.ok) {
        const info = await r.json().catch(() => null)
        if (info?.version && process.env.JPCODE_DEBUG) {
          console.error(C.dim(`  motor opencode v${info.version} en ${base}`))
        }
        // opencode hace fork: el PID real del server viene en /api/info
        return { base, password, child, serverPid: info?.pid ?? null }
      }
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  console.error(C.red("✗ El motor opencode no respondió a tiempo."))
  child.kill()
  process.exit(1)
}

function stopEngine(engine) {
  process.env.JPCODE_EXITING = "1"
  try {
    if (engine?.serverPid) process.kill(engine.serverPid, "SIGTERM")
  } catch {}
  try {
    engine?.child?.kill?.()
  } catch {}
}

// ---------------------------------------------------------------------------
// Cliente HTTP hacia el motor (API v2 en /api/*, Basic auth)
// ---------------------------------------------------------------------------

function authHeader(password) {
  return "Basic " + Buffer.from(`opencode:${password}`).toString("base64")
}

function apiRaw(base, password, route, init = {}) {
  return fetch(`${base}${route}`, {
    ...init,
    headers: {
      authorization: authHeader(password),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  })
}

async function apiJson(base, password, route, init) {
  const res = await apiRaw(base, password, route, init)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const msg = body?.message ?? body?.error ?? text ?? `HTTP ${res.status}`
    throw new Error(String(msg).slice(0, 300))
  }
  return body
}

async function createSession(engine) {
  const model = parseModel(MODEL)
  const body = { title: "jpcode" }
  if (model) body.model = model
  const res = await apiJson(engine.base, engine.password, "/api/session", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return res?.data?.id ?? res?.id ?? null
}

async function sendPrompt(engine, sessionID, text) {
  return apiJson(engine.base, engine.password, `/api/session/${sessionID}/prompt`, {
    method: "POST",
    body: JSON.stringify({ text }),
  })
}

// ---------------------------------------------------------------------------
// Streaming: escucha el SSE /api/event y pinta deltas de texto
// ---------------------------------------------------------------------------

function watchEvents(engine, handlers) {
  const ctrl = new AbortController()
  ;(async () => {
    try {
      const res = await apiRaw(engine.base, engine.password, "/api/event", {
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error(`event stream HTTP ${res.status}`)
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith("data:")) continue
          try {
            handlers.onEvent?.(JSON.parse(t.slice(5).trim()))
          } catch {}
        }
      }
    } catch (e) {
      if (!ctrl.signal.aborted) handlers.onError?.(e)
    }
  })()
  return ctrl
}

// Traduce eventos v2 a acciones de UI
function handleEvent(evt, sessionID, state) {
  const type = evt?.type
  const data = evt?.data ?? {}

  if (type === "session.text.delta" && data.sessionID === sessionID) {
    const delta = data.delta ?? ""
    if (delta) {
      process.stdout.write(delta)
      state.text += delta
    }
    return
  }

  if (type === "session.idle" && data.sessionID === sessionID) {
    state.done = true
    return
  }

  if (type === "provider.free-limit") {
    const msg =
      evt.message ??
      "Límite del tier gratuito alcanzado. Conecta un provider o cambia de modelo con /model."
    if (!state.errors.includes(msg)) state.errors.push(msg)
    return
  }

  if (type === "session.step.failed" || type === "session.execution.failed") {
    const msg = data?.error?.message ?? data?.message ?? "fallo del modelo"
    if ((data?.sessionID === sessionID || !data?.sessionID) && !state.errors.includes(msg)) {
      state.errors.push(msg)
    }
    state.done = true
    return
  }

  if (type === "session.execution.succeeded" && data.sessionID === sessionID) {
    state.done = true
  }
}

// ---------------------------------------------------------------------------
// Modo interactivo
// ---------------------------------------------------------------------------

async function interactive(engine) {
  printBanner()
  printHeader()
  console.log(C.dim("  ctrl+c salir · /help comandos · modelo gratuito por defecto"))
  console.log("")

  let sessionID = null
  let busy = false
  const state = { text: "", done: false, errors: [] }

  const events = watchEvents(engine, {
    onEvent: (evt) => handleEvent(evt, sessionID, state),
    onError: (e) => {
      if (process.env.JPCODE_DEBUG) console.error(C.dim(`  events: ${e?.message ?? e}`))
    },
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: C.cyan("❯ "),
  })
  rl.prompt(true)

  rl.on("line", async (line) => {
    const input = line.trim()
    if (busy) {
      console.log(C.dim("  (esperando respuesta del modelo…)"))
      rl.prompt(true)
      return
    }
    if (!input) {
      rl.prompt(true)
      return
    }

    // comandos
    if (input === "/help") {
      console.log(
        C.dim(
          "  /new sesión nueva · /model ver modelo · /model provider/id cambiar · /clear limpiar · /exit salir",
        ),
      )
      rl.prompt(true)
      return
    }
    if (input === "/new") {
      sessionID = null
      console.log(C.dim("  ✓ sesión nueva"))
      rl.prompt(true)
      return
    }
    if (input === "/clear") {
      console.clear()
      printBanner()
      printHeader()
      rl.prompt(true)
      return
    }
    if (input === "/exit" || input === "/quit") {
      rl.close()
      return
    }
    if (input.startsWith("/model")) {
      const arg = input.slice(6).trim()
      if (arg) {
        if (!parseModel(arg)) {
          console.log(C.red("  ✗ formato: /model provider/modelo"))
        } else {
          MODEL = arg
          sessionID = null
          console.log(C.dim(`  ✓ modelo ${MODEL} (sesión nueva)`))
        }
      } else {
        console.log(C.dim(`  modelo actual: ${MODEL}`))
        console.log(C.dim("  gratuitos: opencode/deepseek-v4.1-flash-free, opencode/glm-5.3-flash-free, opencode/beam-free"))
      }
      rl.prompt(true)
      return
    }

    // prompt normal
    busy = true
    state.text = ""
    state.done = false
    state.errors = []
    try {
      if (!sessionID) {
        sessionID = await createSession(engine)
        if (!sessionID) throw new Error("el motor no devolvió una sesión")
      }
      await sendPrompt(engine, sessionID, input)
      // el texto llega vía eventos; esperar a idle
      await new Promise((resolve) => {
        const iv = setInterval(() => {
          if (state.done) {
            clearInterval(iv)
            resolve()
          }
        }, 100)
      })
      console.log("")
      for (const err of state.errors) console.log(C.yellow(`  ⚠ ${err}`))
    } catch (e) {
      console.log(C.red(`  ✗ ${e?.message ?? e}`))
    }
    busy = false
    rl.prompt(true)
  })

  // No resolvemos hasta cerrar el REPL: así el motor y el SSE siguen vivos.
  return new Promise((resolve) => {
    rl.on("close", () => {
      events.abort()
      stopEngine(engine)
      setTimeout(resolve, 150)
    })
  })
}

// ---------------------------------------------------------------------------
// Modo one-shot: jpcode "pregunta"
// ---------------------------------------------------------------------------

async function oneShot(engine, prompt) {
  const sessionID = await createSession(engine)
  if (!sessionID) throw new Error("el motor no devolvió una sesión")

  const state = { text: "", done: false, errors: [] }
  let finish
  const idle = new Promise((r) => {
    finish = r
  })

  const events = watchEvents(engine, {
    onEvent: (evt) => {
      handleEvent(evt, sessionID, state)
      if (state.done) finish()
    },
    onError: () => finish(),
  })

  await sendPrompt(engine, sessionID, prompt)
  await Promise.race([idle, new Promise((r) => setTimeout(r, 120000))])
  events.abort()
  if (state.text && !state.text.endsWith("\n")) console.log("")
  for (const err of state.errors) console.error(C.yellow(`⚠ ${err}`))
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  if (args.includes("--help") || args.includes("-h")) {
    printBanner()
    console.log(`  ${C.bold("jpcode")}              REPL interactivo`)
    console.log(`  ${C.bold('jpcode "pregunta"')}   respuesta one-shot`)
    console.log(`  ${C.bold("jpcode --version")}    versión`)
    console.log("")
    console.log(C.dim(`  modelo: ${MODEL} (cámbialo con JPCODE_MODEL o /model)`))
    console.log("")
    process.exit(0)
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(APP_VERSION)
    process.exit(0)
  }

  const engine = await startEngine()
  // si el usuario corta jpcode, no dejamos el motor huérfano
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.once(sig, () => {
      stopEngine(engine)
      process.exit(sig === "SIGINT" ? 130 : 143)
    })
  }

  const prompt = args.filter((a) => !a.startsWith("-")).join(" ").trim()
  if (prompt) {
    try {
      await oneShot(engine, prompt)
    } finally {
      stopEngine(engine)
    }
  } else {
    await interactive(engine)
  }
}

main()
  .then(() => {
    process.env.JPCODE_EXITING = "1"
    process.exit(0)
  })
  .catch((e) => {
    process.env.JPCODE_EXITING = "1"
    console.error(C.red(`✗ ${e?.message ?? e}`))
    process.exit(1)
  })
