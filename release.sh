#!/usr/bin/env bash
# DEPRECADO. Usa build-dist.sh.
#
# Este script construía el tarball con `git archive`, que solo mete lo
# commiteado. Como `engine/` está ignorado por git (son 95 MB de artefacto, no
# fuente), la release que producía salía SIN el motor: quien instalaba recibía
# un jpcode que seguía exigiendo Qwen Code aparte. Pasó de verdad con v0.1.0.
#
# build-dist.sh ya hace todo lo que hacía este, y además empaqueta el motor y
# exige que el código minificado pase las 209 aserciones antes de publicar. Así
# que aquí solo se delega, para que nadie vuelva a publicar sin motor.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "⚠️  release.sh está deprecado: delego en build-dist.sh (que sí incluye el motor)." >&2

# build-dist.sh no acepta --solo-build como único argumento posicional, y no
# hace falta: si le pasas una versión, esa es la que publica.
exec bash "$AQUI/build-dist.sh" "$@"
