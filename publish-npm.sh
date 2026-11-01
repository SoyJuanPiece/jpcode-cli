#!/usr/bin/env bash
# Publica jpcode en npm (el registro de npm).
#
#   bash publish-npm.sh              # construye, prueba y publica con npm
#   bash publish-npm.sh --bun        # construye, prueba y publica con bun
#   bash publish-npm.sh --dry-run    # construye y enseña qué se subiría
#   bash publish-npm.sh --bun --dry-run
#
# OJO: Bun no tiene registro propio. `bun publish` sube al MISMO registro de
# npm (registry.npmjs.org). Bun es solo otra herramienta para publicar ahí;
# su ventaja es que lee NPM_CONFIG_TOKEN y no necesita `npm login`.
#
# En CI lo llama el workflow .github/workflows/publish-npm.yml, que publica por
# OIDC (sin tokens ni secretos) con npm. La publicación por OIDC solo la hace
# npm, así que en CI no se usa --bun.
#
# Se publica el ÁRBOL MINIFICADO: no se sube el código fuente legible. Ojo con
# la expectativa de siempre — minificar no esconde nada, el código tiene que
# ejecutarse en la máquina de quien instala.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

SECO=0
PUBLICADOR="npm"
for ARG in "$@"; do
  case "$ARG" in
    --dry-run) SECO=1 ;;
    --bun)     PUBLICADOR="bun" ;;
    *) echo "Opción no reconocida: $ARG" >&2; exit 2 ;;
  esac
done

if [ "$PUBLICADOR" = "bun" ] && ! command -v bun >/dev/null 2>&1; then
  echo "✕ falta bun; instálalo desde https://bun.sh o usa npm" >&2
  exit 1
fi

NOMBRE="$(node -p "require('./package.json').name")"
VERSION="$(node -p "require('./package.json').version")"

# 1) build-dist.sh minifica y corre las 227 aserciones sobre el resultado. Si la
#    minificación rompe algo, aborta y aquí no se publica nada.
bash "$AQUI/build-dist.sh"

# 2) Montamos el paquete de npm desde el árbol ya minificado y probado.
STAGE="$AQUI/dist/npm"
rm -rf "$STAGE"
mkdir -p "$STAGE"
tar -xzf "$AQUI/dist/jpcode-app.tar.gz" -C "$STAGE" --strip-components=1
cp "$AQUI/package.json" "$STAGE/package.json"
cp "$AQUI/README.md" "$STAGE/README.md"
cp "$AQUI/postinstall.mjs" "$STAGE/postinstall.mjs"

echo "→ $NOMBRE@$VERSION"

if [ "$PUBLICADOR" = "bun" ]; then
  # --ignore-scripts para que el postinstall no se ejecute durante el
  # empaquetado (bun corre los scripts del ciclo de vida al empaquetar él
  # mismo). El paquete ya viene construido y probado por build-dist.sh.
  PUBLICAR=(bun publish --access public --ignore-scripts)
else
  PUBLICAR=(npm publish --access public)
fi

if [ "$SECO" = 1 ]; then
  ( cd "$STAGE" && "${PUBLICAR[@]}" --dry-run )
  echo "✅ en seco con $PUBLICADOR: no se ha publicado nada"
  exit 0
fi

if [ "$PUBLICADOR" = "bun" ]; then
  echo "→ publicando con bun (destino: registry.npmjs.org)"
  if [ -z "${NPM_CONFIG_TOKEN:-}" ] && [ -z "${NPM_TOKEN:-}" ] && ! grep -q '_authToken' "$HOME/.npmrc" 2>/dev/null; then
    echo "✕ bun no encuentra credenciales: define NPM_CONFIG_TOKEN o añade _authToken a ~/.npmrc" >&2
    exit 1
  fi
fi

# --access public porque el paquete es scoped (@juanpiecedev/jpcode) y por defecto
# saldría restringido; así queda público. La provenance la genera npm al publicar por OIDC.
( cd "$STAGE" && "${PUBLICAR[@]}" )
