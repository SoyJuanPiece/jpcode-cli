#!/usr/bin/env bash
# Instala jpcode desde el CÓDIGO (no desde npm).
#
#   bash install.sh
#
# Qué hace:
#   1. Trae el motor a `engine/` (vendor-engine.sh) si no está, y le aplica los
#      parches de jpcode EN LA CONSTRUCCIÓN. El usuario nunca parchea nada.
#   2. Instala las piezas nativas por plataforma (npm las elige según el sistema).
#   3. Deja ~/.jpcode con su configuración y sus comandos.
#   4. Enlaza el binario `jpcode`.
#
# Antes este script parcheaba el Qwen Code que tuvieras instalado. Ya no: el motor
# viaja dentro del paquete, así que aquí no se toca nada del sistema.
#
# Para volver a aplicar los parches tras cambiar alguno:  bash vendor-engine.sh
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"
JP_HOME="${JPCODE_HOME:-$HOME/.jpcode}"
QWEN_LEGACY="${QWEN_HOME:-$HOME/.qwen}"

command -v node >/dev/null 2>&1 || { echo "✗ hace falta Node >= 22" >&2; exit 1; }
MAYOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$MAYOR" -ge 22 ] || { echo "✗ jpcode necesita Node >= 22; tienes $(node -v)" >&2; exit 1; }

chmod +x "$AQUI/bin/jpcode.mjs"

# 1) El motor, dentro y ya parcheado.
if [ ! -f "$AQUI/engine/cli-entry.js" ]; then
  echo "→ trayendo el motor (la primera vez tarda un poco)"
  bash "$AQUI/vendor-engine.sh"
else
  echo "✅ motor ya presente ($(du -sh "$AQUI/engine" | cut -f1))"
  echo "   (para re-aplicar los parches tras cambiarlos:  bash vendor-engine.sh)"
fi

# 2) Las piezas nativas: terminal, imágenes, portapapeles. npm elige las de esta
#    plataforma. --ignore-scripts para no disparar el postinstall del paquete.
echo "→ instalando las piezas nativas"
npm install --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 || {
  echo "⚠️  no pude instalar las piezas nativas; el motor avisará si le faltan" >&2
}
[ -d "$AQUI/node_modules" ] && echo "   $(du -sh "$AQUI/node_modules" | cut -f1) en node_modules/"

# 3) Config inicial: lo que ya tuvieras en ~/.qwen, y si no la plantilla del gateway.
if [ ! -f "$JP_HOME/settings.json" ] && [ -f "$QWEN_LEGACY/settings.json" ]; then
  mkdir -p "$JP_HOME"
  cp -r "$QWEN_LEGACY/." "$JP_HOME/"
  echo "✅ config heredada de $QWEN_LEGACY → $JP_HOME"
fi
if [ ! -f "$JP_HOME/settings.json" ] && [ -f "$AQUI/gateway/jpcode-settings.json" ]; then
  mkdir -p "$JP_HOME"
  install -m 644 "$AQUI/gateway/jpcode-settings.json" "$JP_HOME/settings.json"
  echo "✅ config inicial desde el gateway → $JP_HOME/settings.json"
fi

# 4) Comandos propios del CLI.
if [ -d "$AQUI/gateway/jpcode-commands" ]; then
  mkdir -p "$JP_HOME/commands"
  for md in "$AQUI"/gateway/jpcode-commands/*.md; do
    [ -f "$md" ] || continue
    cp "$md" "$JP_HOME/commands/$(basename "$md")"
  done
  echo "✅ comandos de jpcode: $(cd "$JP_HOME/commands" && ls *.md 2>/dev/null | sed 's/\.md//' | tr '\n' ' ')"
fi

# 5) Tema y banner.
QWEN_HOME="$JP_HOME" node "$AQUI/sync-jpcode.mjs" || true

# 6) El binario, en el primer directorio de binarios que exista. En una máquina
#    recién estrenada no existe ninguno, y antes eso dejaba a jpcode sin enlazar:
#    había que arrancarlo con `node .../bin/jpcode.mjs` a mano. Ahora se crea
#    ~/.local/bin, que es el estándar de facto.
DESTINO=""
for d in "$HOME/.global_modules/bin" "$HOME/.local/bin" "$HOME/.npm-global/bin"; do
  if [ -d "$d" ]; then DESTINO="$d"; break; fi
done
if [ -z "$DESTINO" ]; then
  DESTINO="$HOME/.local/bin"
  mkdir -p "$DESTINO"
fi

ln -sf "$AQUI/bin/jpcode.mjs" "$DESTINO/jpcode"
echo "✅ jpcode en $DESTINO/jpcode"

# Aviso honesto: el enlace no sirve de nada si esa carpeta no está en el PATH.
case ":$PATH:" in
  *":$DESTINO:"*)
    echo "   pruébalo con:  jpcode"
    ;;
  *)
    echo "   ⚠️  $DESTINO no está en tu PATH. Añádelo y reinicia la terminal:"
    echo "       export PATH=\"$DESTINO:\$PATH\""
    ;;
esac
