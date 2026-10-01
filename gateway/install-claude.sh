#!/usr/bin/env bash
# Instala el comando global `claude` (el envoltorio de este repo) en un directorio
# del PATH. Pensado para entornos como Project IDX / Cloud Workstations, donde el
# contenedor se puede recrear y hay que reinstalar.
#
#   ./install-claude.sh              # instala en el primer directorio escribible del PATH
#   ./install-claude.sh ~/bin        # o donde quieras
#
# Requisitos: node y Claude Code (`npm i -g @anthropic-ai/claude-code`).
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEN="$AQUI/claude"
[ -f "$ORIGEN" ] || { echo "No encuentro $ORIGEN" >&2; exit 1; }

# Elegir destino: el argumento, o el primer directorio escribible del PATH.
destino="${1:-}"
if [ -z "$destino" ]; then
  IFS=':' read -ra partes <<< "$PATH"
  for d in "${partes[@]}"; do
    case "$d" in *global_modules/bin) continue ;; esac   # ahí vive el binario real, no lo pisamos
    [ -d "$d" ] && [ -w "$d" ] && { destino="$d"; break; }
  done
fi
[ -n "$destino" ] || { echo "Sin destino: pasa uno, p.ej. ./install-claude.sh ~/bin" >&2; exit 1; }
mkdir -p "$destino"

install -m 755 "$ORIGEN" "$destino/claude"
echo "✅ instalado: $destino/claude"

# El mismo truco, para Qwen Code (fork abierto de Gemini CLI): el envoltorio
# `qwen` levanta el proxy y le pasa la clave por OPENCODE_GATEWAY_KEY.
if [ -f "$AQUI/qwen" ]; then
  install -m 755 "$AQUI/qwen" "$destino/qwen"
  echo "✅ instalado: $destino/qwen"
fi

# Config de Qwen Code: modelProviders apuntando al gateway. No se guardan claves
# (cada modelo declara envKey y el valor lo pone el envoltorio en el entorno).
if [ -f "$AQUI/qwen-settings.json" ]; then
  QAJUSTES="${HOME}/.qwen/settings.json"
  if [ -f "$QAJUSTES" ]; then
    echo "   ~/.qwen/settings.json ya existe (no lo toco); el modelo de referencia está en $AQUI/qwen-settings.json"
  else
    mkdir -p "$(dirname "$QAJUSTES")"
    install -m 644 "$AQUI/qwen-settings.json" "$QAJUSTES"
    echo "✅ config de Qwen Code: ~/.qwen/settings.json"
  fi
fi

# Comandos propios de Qwen Code (/modelos…). Se sustituye __CHAT_DIR__ por la ruta
# real del repo para no depender de dónde esté clonado.
mkdir -p "${HOME}/.qwen/commands"
# Restos de versiones anteriores: `/provider` (texto) ahora es el diálogo de
# /connect, así que la lista de texto se llama /providers.
rm -f "${HOME}/.qwen/commands/provider.md"
for md in "$AQUI"/qwen-commands/*.md; do
  [ -f "$md" ] || continue
  sed "s#__CHAT_DIR__#$AQUI#g" "$md" > "${HOME}/.qwen/commands/$(basename "$md")"
  echo "✅ comando de Qwen: /$(basename "$md" .md)"
done

# Buscador en el selector /model (parchea el CLI instalado; re-aplicar tras qwen update).
if [ -f "$AQUI/patch-qwen-search.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-search.mjs" || true
fi

# Catálogo de models.dev dentro de la lista nativa de /auth → Third-party.
if [ -f "$AQUI/patch-qwen-providers.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-providers.mjs" || true
fi

# Buscador en esa lista de /auth (depende del parche de /model de arriba).
if [ -f "$AQUI/patch-qwen-auth.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-auth.mjs" || true
fi

# `/connect` y `/provider` abren el catálogo con buscador en un solo paso.
if [ -f "$AQUI/patch-qwen-connect.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-connect.mjs" || true
fi

# `/model` en dos niveles (proveedor → modelos). Va después del buscador.
if [ -f "$AQUI/patch-qwen-model-sections.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-model-sections.mjs" || true
fi

# Custom Provider: detecta los modelos al pegar la clave (GET {baseUrl}/models).
if [ -f "$AQUI/patch-qwen-discover.mjs" ] && command -v qwen >/dev/null 2>&1; then
  node "$AQUI/patch-qwen-discover.mjs" || true
fi

# Rellenar la lista de modelos desde el gateway, si el proxy está levantado.
if [ -f "$AQUI/sync-qwen-models.mjs" ]; then
  if node "$AQUI/sync-qwen-models.mjs" >/dev/null 2>&1; then
    echo "✅ lista de modelos de Qwen rellenada desde el gateway"
  else
    echo "   (el gateway no responde; cuando esté: node $AQUI/sync-qwen-models.mjs)"
  fi
fi

# Comandos propios para Claude Code (/provider…). El binario es cerrado, así que
# la única forma de tener comandos nuevos es .claude/commands/*.md.
for md in "$AQUI"/claude-commands/*.md; do
  [ -f "$md" ] || continue
  mkdir -p "${HOME}/.claude/commands"
  install -m 644 "$md" "${HOME}/.claude/commands/$(basename "$md")"
  echo "✅ comando: /$(basename "$md" .md)"
done

# Sembrar un modelo inicial honesto en los ajustes del usuario. Claude Code lo
# guarda ahí cuando eliges en /model; ponerlo una vez evita que la primera
# sesión muestre el nombre enmascarado ("Sonnet 4.5") de su catálogo interno.
AJUSTES="${HOME}/.claude/settings.json"
node -e '
  const fs = require("fs"), path = require("path");
  const p = process.argv[1];
  let j = {};
  try { j = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  if (j.model) { console.log("   modelo actual: " + j.model + " (no lo toco)"); process.exit(0); }
  j.model = "big-pickle";
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log("   modelo inicial: big-pickle (cámbialo con /model dentro de Claude Code)");
' "$AJUSTES"

echo "   comprueba con:  hash -r; claude --version; qwen --version"
case ":$PATH:" in
  *":$destino:"*) ;;
  *) echo "⚠️  $destino no está en tu PATH; añádelo a ~/.bashrc" ;;
esac
