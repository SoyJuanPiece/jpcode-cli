#!/usr/bin/env bash
# Instala jpcode: rebrandea Qwen Code, siembra ~/.jpcode y enlaza el binario.
# Re-ejecutable tras `qwen update` (vuelve a aplicar los parches).
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JP_HOME="${JPCODE_HOME:-$HOME/.jpcode}"
QWEN_LEGACY="${QWEN_HOME:-$HOME/.qwen}"
CHAT_DIR="${OPENCODE_CHAT_DIR:-$HOME/studio/opencode-chat}"

chmod +x "$AQUI/bin/jpcode.mjs"

# 1) Config inicial: hereda la de Qwen la primera vez.
if [ ! -f "$JP_HOME/settings.json" ] && [ -f "$QWEN_LEGACY/settings.json" ]; then
  mkdir -p "$JP_HOME"
  cp -r "$QWEN_LEGACY/." "$JP_HOME/"
  echo "✅ config heredada de $QWEN_LEGACY → $JP_HOME"
fi

# 2) Marca (título de ventana + textos), aviso honesto de pegado de imagen, el
#    vigilante que adjunta lo que llega del puente del navegador, e identidad visual.
node "$AQUI/patch-jpcode-brand.mjs" || true
node "$AQUI/patch-jpcode-clipboard.mjs" || true
node "$AQUI/patch-jpcode-image-watch.mjs" || true
QWEN_HOME="$JP_HOME" node "$AQUI/sync-jpcode.mjs" || true

# 3) Comportamiento tipo OpenCode sobre Qwen Code: buscador en /model, catálogo
#    completo de models.dev en /connect y el diálogo de conexión en un paso.
for p in patch-qwen-search patch-qwen-providers patch-qwen-auth patch-qwen-connect patch-qwen-model-sections patch-qwen-discover; do
  if [ -f "$CHAT_DIR/$p.mjs" ]; then
    node "$CHAT_DIR/$p.mjs" >/dev/null || true
  fi
done

# 4) Comandos propios (/providers, /modelos) con la ruta real del gateway dentro.
#    `/provider` pasa a ser el diálogo de /connect, así que se limpia el viejo.
rm -f "$JP_HOME/commands/provider.md" "$QWEN_LEGACY/commands/provider.md" 2>/dev/null || true
if [ -d "$CHAT_DIR/qwen-commands" ]; then
  mkdir -p "$JP_HOME/commands"
  for md in "$CHAT_DIR"/qwen-commands/*.md; do
    [ -f "$md" ] || continue
    sed "s#__CHAT_DIR__#$CHAT_DIR#g" "$md" > "$JP_HOME/commands/$(basename "$md")"
  done
  echo "✅ comandos de jpcode: $(cd "$JP_HOME/commands" && ls *.md 2>/dev/null | sed 's/\.md//' | tr '\n' ' ')"
fi

# 5) Enlaza el binario en el primer directorio de binarios que exista.
for d in "$HOME/.global_modules/bin" "$HOME/.local/bin" "$HOME/.npm-global/bin"; do
  if [ -d "$d" ]; then
    ln -sf "$AQUI/bin/jpcode.mjs" "$d/jpcode"
    echo "✅ jpcode en $d/jpcode"
    echo "   pruébalo con:  jpcode"
    exit 0
  fi
done

echo "✅ hecho. Ejecuta:  node $AQUI/bin/jpcode.mjs"
