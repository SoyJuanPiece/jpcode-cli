#!/usr/bin/env node
/**
 * Detección automática de modelos al pegar tu propia API key (estilo OpenCode).
 *
 * Qwen Code YA trae el mecanismo: cuando un proveedor tiene
 * `supportsModelDiscovery:true`, el paso «Model IDs» no es un campo de texto
 * —hay que saberse los ids— sino `DiscoveringModelIdsStep`, que hace
 * `GET {baseUrl}/models` con `Authorization: Bearer {apiKey}` (ver
 * `discoverProviderModels`), enseña la lista y deja marcarlos. Si la petición
 * falla, cae a los modelos estáticos del proveedor, así que nunca empeora.
 *
 * El proveedor «Custom Provider» (`custom-openai-compatible`), que es justo el
 * que usa quien trae su propio endpoint/clave, NO lo traía activado: pedía
 * escribir los ids a mano. Este parche lo activa, de modo que en
 *
 *   /connect → Custom Provider → protocolo → Base URL → API Key
 *
 * los modelos se descubren solos y se eligen de la lista. Igual que OpenCode.
 *
 *     node opencode-chat/patch-qwen-discover.mjs
 *
 * Idempotente y re-aplicable tras `qwen update` (que reemplaza los chunks).
 * Rutas: QWEN_PKG (por defecto, autodetección).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

/* ---------- localizar el paquete de Qwen Code ---------- */
function paqueteQwen() {
  if (process.env.QWEN_PKG) return process.env.QWEN_PKG;
  const candidatos = [];
  try {
    candidatos.push(execSync("npm root -g", { encoding: "utf8" }).trim());
  } catch { /* sin npm */ }
  candidatos.push(
    join(process.env.HOME || "", ".global_modules/lib/node_modules"),
    join(process.env.HOME || "", ".npm-global/lib/node_modules"),
    "/usr/lib/node_modules",
  );
  for (const base of candidatos) {
    const p = join(base, "@qwen-code/qwen-code");
    if (existsSync(join(p, "package.json"))) return p;
  }
  throw new Error("No encuentro @qwen-code/qwen-code. Pasa QWEN_PKG=/ruta/al/paquete");
}

const ficheros = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isFile() && p.endsWith(".js")) out.push(p);
  }
  return out;
};

// El bloque de `customProvider`. `models:void 0` (sin lista) es lo único que lo
// distingue y solo aparece una vez en todo el paquete.
const VIEJO = 'models:void 0,modelNamePrefix:"",showAdvancedConfig:true';
const NUEVO = 'models:void 0,supportsModelDiscovery:true,modelNamePrefix:"",showAdvancedConfig:true';

const pkg = paqueteQwen();
const dirs = [join(pkg, "chunks"), join(pkg, "bundled")];
console.log(`Qwen Code: ${pkg}`);

let hecho = false;
for (const f of dirs.flatMap(ficheros)) {
  const s = readFileSync(f, "utf8");
  if (!s.includes(VIEJO) && !s.includes(NUEVO)) continue;
  if (s.includes(NUEVO)) {
    console.log(`• detección de modelos del Custom Provider: ya estaba (${f})`);
  } else if (s.split(VIEJO).length - 1 === 1) {
    writeFileSync(f, s.replace(VIEJO, NUEVO));
    console.log(`• detección de modelos del Custom Provider: activada (${f})`);
  } else {
    continue;
  }
  hecho = true;
  break;
}

if (hecho) {
  console.log("\n✅ Listo. En `qwen -i`: /connect → Custom Provider → pega tu Base URL y");
  console.log("   tu API key, y los modelos se detectan solos para elegirlos.");
  console.log("   Tras `qwen update`, vuelve a lanzar este script.");
} else {
  console.log("\n⚠️  No encontré el Custom Provider. ¿Ya estaba parcheado o cambió la versión?");
  process.exitCode = 1;
}
process.exit(0);
