#!/usr/bin/env bash
# Refresca `gateway/` desde tu copia de trabajo de opencode-chat.
#
# `gateway/` es una COPIA publicada para que un clon limpio de este repo sea
# instalable. Tu copia de trabajo (por defecto ~/studio/opencode-chat) sigue
# siendo la fuente de verdad: ahí desarrollas, y con esto publicas.
#
#   bash sync-gateway.sh                        # desde ~/studio/opencode-chat
#   ORIGEN=~/otra/ruta bash sync-gateway.sh
#
# Nunca copia secretos (.api-key, .zen-key), caché (.cache/, .bin/) ni logs.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEN="${ORIGEN:-${OPENCODE_CHAT_DIR:-$HOME/studio/opencode-chat}}"
DESTINO="$AQUI/gateway"

if [ ! -f "$ORIGEN/server.mjs" ]; then
  echo "✗ no encuentro $ORIGEN/server.mjs" >&2
  echo "  pasa la ruta:  ORIGEN=/ruta/a/opencode-chat bash sync-gateway.sh" >&2
  exit 1
fi

if [ -z "$DESTINO" ] || [ "$DESTINO" = "/" ]; then
  echo "✗ destino inválido: '$DESTINO'" >&2
  exit 1
fi

mkdir -p "$DESTINO"

if command -v rsync >/dev/null 2>&1; then
  # --delete: lo que borres en el origen desaparece aquí también.
  rsync -a --delete \
    --exclude=.api-key --exclude=.zen-key --exclude=.cache/ --exclude=.bin/ \
    --exclude='*.log' --exclude=node_modules/ \
    "$ORIGEN"/ "$DESTINO"/
else
  # Sin rsync: reconstruye desde cero (los excluidos nunca se copian).
  find "$DESTINO" -mindepth 1 -delete
  tar -cf - -C "$ORIGEN" \
    --exclude=.api-key --exclude=.zen-key --exclude=.cache --exclude=.bin \
    --exclude='*.log' --exclude=node_modules . | tar -xf - -C "$DESTINO"
fi

# Red de seguridad: si alguna vez se colara un secreto, mejor enterarse aquí.
FUGA="$(find "$DESTINO" \( -name ".api-key" -o -name ".zen-key" -o -name "*.log" \) -print -quit)"
if [ -n "$FUGA" ]; then
  echo "✗ se coló un fichero que no debería: $FUGA" >&2
  exit 1
fi

chmod +x "$DESTINO/qwen" "$DESTINO/install-claude.sh" 2>/dev/null || true
echo "✅ gateway/ actualizado desde $ORIGEN"
echo "   $(find "$DESTINO" -type f | wc -l) ficheros · $(du -sh "$DESTINO" | cut -f1)"
echo "   ahora:  git add gateway && git commit"
