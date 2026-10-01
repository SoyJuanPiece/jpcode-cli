#!/usr/bin/env bash
# Publica jpcode en npm.
#
#   bash publish-npm.sh              # construye, prueba y publica
#   bash publish-npm.sh --dry-run    # construye y enseña qué se subiría
#
# En CI lo llama el workflow .github/workflows/publish-npm.yml, que publica por
# OIDC (sin tokens ni secretos). En local necesita `npm login` una vez.
#
# Se publica el ÁRBOL MINIFICADO, el mismo que la release de GitHub: no se sube
# el código fuente legible. Ojo con la expectativa de siempre — minificar no
# esconde nada, el código tiene que ejecutarse en la máquina de quien instala.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

SECO=0
[ "${1:-}" = "--dry-run" ] && SECO=1

NOMBRE="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"

# 1) El mismo paquete y las mismas pruebas que la release de GitHub. Si la
#    minificación rompe algo, build-dist.sh aborta y aquí no se publica nada.
bash "$AQUI/build-dist.sh" --solo-build

# 2) Montamos el paquete de npm desde el árbol ya minificado y probado.
STAGE="$AQUI/dist/npm"
rm -rf "$STAGE"
mkdir -p "$STAGE"
tar -xzf "$AQUI/dist/jpcode-app.tar.gz" -C "$STAGE" --strip-components=1
cp "$AQUI/package.json" "$STAGE/package.json"
cp "$AQUI/postinstall.mjs" "$STAGE/postinstall.mjs"

echo "→ $NOMBRE@$VERSION"

if [ "$SECO" = 1 ]; then
  ( cd "$STAGE" && npm publish --dry-run )
  echo "✅ en seco: no se ha publicado nada"
  exit 0
fi

# --access public porque el paquete es unscoped y no queremos sorpresas de
# configuración. La provenance la genera npm solo al publicar por OIDC.
( cd "$STAGE" && npm publish --access public )
