#!/usr/bin/env node
/**
 * CLI de proveedores: lo mismo que los endpoints /v1/providers, pero desde la
 * terminal sin escribir curl.
 *
 *   node providers-cli.mjs                    # los que están conectados y usables
 *   node providers-cli.mjs all                # los 225, con el motivo de cada uno
 *   node providers-cli.mjs models openrouter  # modelos de un proveedor
 *   node providers-cli.mjs connect groq gsk_… # guarda la clave y lo activa
 *   node providers-cli.mjs off groq           # lo apaga (sin borrar la clave)
 *   node providers-cli.mjs on groq
 *   node providers-cli.mjs refresh            # vuelve a bajar el catálogo
 *
 * Habla directamente con los módulos, así que funciona aunque el servidor no
 * esté levantado. Respeta las mismas variables (PROVIDERS_FILE, MODELS_OFFLINE…).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
process.env.OPENCODE_CHAT_DIR ||= HERE;

// La key de Zen vive en `.zen-key` (permisos 600) y el servidor la lee de ahí.
// Aquí se hace lo mismo para que la CLI vea los mismos proveedores conectados
// sin tener que exportar nada — así el comando /provider de Claude Code es una
// línea de shell simple, que es lo único que su chequeo de permisos acepta.
if (!process.env.OPENCODE_API_KEY) {
  try {
    const k = readFileSync(join(HERE, ".zen-key"), "utf8").trim();
    if (k) process.env.OPENCODE_API_KEY = k;
  } catch {
    /* sin fichero: se usará el entorno tal cual */
  }
}
const { CATALOGO_URL, ajustar, catalogo, config, guardarClave, listar } = await import("./providers.mjs");

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarillo = (s) => `\x1b[33m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const negrita = (s) => `\x1b[1m${s}\x1b[0m`;

const [accion = "list", ...resto] = process.argv.slice(2);

/** Cabecera común: cuándo se actualizó el catálogo y cuántos hay. */
async function conCatalogo() {
  if (accion === "refresh") return { cat: await catalogo({ refresh: true }), cfg: await config() };
  return { cat: await catalogo(), cfg: await config() };
}

const { cat, cfg } = await conCatalogo();
const total = Object.keys(cat).length;

switch (accion) {
  case "list": {
    const usables = await listar({ cat, cfg });
    console.log(negrita(`Proveedores usables: ${usables.length} de ${total}`) + dim(`  (${CATALOGO_URL})`));
    if (!usables.length) {
      console.log(amarillo("\nNo hay ninguno conectado. Ejemplos:"));
      console.log("  export GROQ_API_KEY=gsk_…");
      console.log("  node providers-cli.mjs connect groq gsk_…");
    }
    for (const p of usables) {
      console.log(`  ${verde("●")} ${p.id.padEnd(22)} ${String(p.modelos).padStart(5)} modelos  ${dim(p.protocolo + " · " + p.credencial)}`);
    }
    break;
  }

  case "all": {
    console.log(negrita(`Catálogo completo: ${total} proveedores, ${(await listar({ cat, cfg })).length} usables ahora`));
    for (const p of await listar({ todos: true, cat, cfg })) {
      const marca = p.usable ? verde("●") : p.motivo ? amarillo("○") : rojo("○");
      console.log(`  ${marca} ${p.id.padEnd(24)} ${String(p.modelos).padStart(5)} modelos  ${dim(p.protocolo.padEnd(10))} ${p.motivo ? dim("→ " + p.motivo) : ""}`);
    }
    break;
  }

  case "models": {
    const p = (await listar({ todos: true, modelo: true, cat, cfg })).find((x) => x.id === resto[0]);
    if (!p) {
      console.error(rojo(`no existe el proveedor "${resto[0]}"`));
      process.exit(1);
    }
    console.log(negrita(`${p.id} — ${p.name}`) + dim(`  ${p.protocolo} · ${p.baseURL || "sin URL base"}`));
    for (const m of p.models || []) {
      const flags = [m.tool_call ? "tools" : "", m.reasoning ? "reasoning" : "", m.attachment ? "imagenes" : ""].filter(Boolean).join(",");
      console.log(`  ${m.id.padEnd(46)} ${dim((m.limit?.context ? Math.round(m.limit.context / 1000) + "k" : "?").padStart(6) + "  " + flags)}`);
    }
    break;
  }

  case "connect":
  case "use": {
    const [id, clave] = resto;
    if (!id || !clave) {
      console.error(rojo("uso: providers-cli.mjs connect <id> <clave>"));
      process.exit(1);
    }
    await guardarClave(id, clave);
    await ajustar(id, { enabled: true });
    console.log(`${verde("✓")} ${id} conectado ${dim("(clave en auth.json, modo 600)")}`);
    break;
  }

  case "on":
  case "off": {
    const id = resto[0];
    if (!id) {
      console.error(rojo(`uso: providers-cli.mjs ${accion} <id>`));
      process.exit(1);
    }
    await ajustar(id, { enabled: accion === "on" });
    console.log(`${verde("✓")} ${id} ${accion === "on" ? "activado" : "desactivado"}`);
    break;
  }

  case "disconnect": {
    const id = resto[0];
    await guardarClave(id, "");
    console.log(`${verde("✓")} clave de ${id} borrada`);
    break;
  }

  case "refresh": {
    console.log(`${verde("✓")} catálogo actualizado: ${total} proveedores desde ${CATALOGO_URL}`);
    break;
  }

  default:
    console.log(`acciones: list · all · models <id> · connect <id> <clave> · on|off <id> · refresh`);
}

// El keep-alive de fetch puede dejar el proceso vivo tras bajar el catálogo.
process.exit(0);
