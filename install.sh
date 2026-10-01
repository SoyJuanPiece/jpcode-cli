#!/usr/bin/env bash
# Instala jpcode: rebrandea Qwen Code, siembra ~/.jpcode y enlaza el binario.
# Re-ejecutable tras `qwen update` (vuelve a aplicar los parches).
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JP_HOME="${JPCODE_HOME:-$HOME/.jpcode}"
QWEN_LEGACY="${QWEN_HOME:-$HOME/.qwen}"
# El gateway viaja dentro del repo, en `gateway/`, para que un clon limpio sea
# instalable sin depender de ninguna ruta de tu máquina. Pero tu copia de trabajo
# tiene prioridad: es la que usa el proxy que ya esté corriendo, y junto a su
# `.api-key` está la clave que el envoltorio necesita exportar.
resolver_gateway() {
  if [ -n "${OPENCODE_CHAT_DIR:-}" ]; then printf '%s' "$OPENCODE_CHAT_DIR"; return 0; fi
  if [ -f "$HOME/studio/opencode-chat/server.mjs" ]; then printf '%s' "$HOME/studio/opencode-chat"; return 0; fi
  if [ -f "$AQUI/gateway/server.mjs" ]; then printf '%s' "$AQUI/gateway"; return 0; fi
  printf '%s' "$HOME/studio/opencode-chat"
}
CHAT_DIR="$(resolver_gateway)"

chmod +x "$AQUI/bin/jpcode.mjs"
[ -f "$CHAT_DIR/qwen" ] && chmod +x "$CHAT_DIR/qwen"

if [ ! -f "$CHAT_DIR/server.mjs" ]; then
  echo "⚠️  no encuentro el gateway en $CHAT_DIR (esperaba server.mjs)" >&2
  echo "    clona el repo completo o define OPENCODE_CHAT_DIR=/ruta/a/opencode-chat" >&2
fi

# Qwen Code es la base que jpcode re-marca: sin él no hay nada que parchear. Lo
# comprobamos una vez, aquí, para no soltar seis stack traces más abajo.
encontrar_qwen() {
  for d in "$HOME/.global_modules/lib/node_modules" "$HOME/.npm-global/lib/node_modules" \
           "/usr/local/lib/node_modules" "/usr/lib/node_modules"; do
    if [ -f "$d/@qwen-code/qwen-code/package.json" ]; then printf '%s' "$d/@qwen-code/qwen-code"; return 0; fi
  done
  return 1
}
if ! QWEN_INSTALADO="$(encontrar_qwen)"; then
  QWEN_INSTALADO=""
  echo "⚠️  no encuentro Qwen Code (la base que jpcode re-marca). Instálalo:" >&2
  echo "    npm i -g @qwen-code/qwen-code" >&2
  echo "    y vuelve a lanzar este script." >&2
fi

# 1) Config inicial. Prioridad: lo que ya tuvieras en ~/.qwen (migración de una vez)
#    y, si no existe, la plantilla del gateway — que es la que apunta los modelos
#    al proxy. Sin esto, una máquina nueva arrancaría sin ningún modelo.
if [ ! -f "$JP_HOME/settings.json" ] && [ -f "$QWEN_LEGACY/settings.json" ]; then
  mkdir -p "$JP_HOME"
  cp -r "$QWEN_LEGACY/." "$JP_HOME/"
  echo "✅ config heredada de $QWEN_LEGACY → $JP_HOME"
fi
if [ ! -f "$JP_HOME/settings.json" ] && [ -f "$CHAT_DIR/qwen-settings.json" ]; then
  mkdir -p "$JP_HOME"
  install -m 644 "$CHAT_DIR/qwen-settings.json" "$JP_HOME/settings.json"
  echo "✅ config inicial desde el gateway → $JP_HOME/settings.json"
fi

# 2) Marca (título de ventana + textos), aviso honesto de pegado de imagen, el
#    vigilante que adjunta lo que llega del puente del navegador, e identidad visual.
#    Si falta Qwen Code estos parches solo pueden fallar, así que ni se intentan.
if [ -n "$QWEN_INSTALADO" ]; then
  node "$AQUI/patch-jpcode-brand.mjs" || true
  node "$AQUI/patch-jpcode-clipboard.mjs" || true
  node "$AQUI/patch-jpcode-image-watch.mjs" || true
else
  echo "   (me salto los parches de marca: no hay Qwen Code que parchear)"
fi
QWEN_HOME="$JP_HOME" node "$AQUI/sync-jpcode.mjs" || true

# 3) Comportamiento tipo OpenCode sobre Qwen Code: buscador en /model, catálogo
#    completo de models.dev en /connect y el diálogo de conexión en un paso.
#    Se resumen los fallos en una línea en vez de soltar seis stack traces; para
#    ver el error concreto, ejecuta el parche a mano (te lo dice abajo).
APLICADOS=0
FALLADOS=""
for p in patch-qwen-search patch-qwen-providers patch-qwen-auth patch-qwen-connect patch-qwen-model-sections patch-qwen-discover; do
  if [ -n "$QWEN_INSTALADO" ] && [ -f "$CHAT_DIR/$p.mjs" ]; then
    if node "$CHAT_DIR/$p.mjs" >/dev/null 2>&1; then
      APLICADOS=$((APLICADOS + 1))
    else
      FALLADOS="$FALLADOS $p"
    fi
  fi
done
if [ -z "$QWEN_INSTALADO" ]; then
  echo "   (me salto los parches de comportamiento: no hay Qwen Code que parchear)"
elif [ -n "$FALLADOS" ]; then
  echo "⚠️  parches de comportamiento que no pude aplicar:$FALLADOS" >&2
  echo "    para ver el error concreto:  node $CHAT_DIR/<parche>.mjs" >&2
else
  echo "✅ parches de comportamiento aplicados: $APLICADOS"
fi

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
