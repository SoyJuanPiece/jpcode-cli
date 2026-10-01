#!/usr/bin/env bash
# Apunta la fórmula del tap de Homebrew a una release ya publicada.
#
#   bash update-tap.sh              # la versión de package.json
#   bash update-tap.sh v0.2.0
#
# Coge del asset PUBLICADO (no de dist/ local, que puede estar desfasado) la url
# y el sha256 reales, y reescribe Formula/jpcode.rb en el repo del tap.
#
# Antes de tocar nada comprueba que el tarball lleve engine/cli-entry.js dentro.
# Esa comprobación existe por un fallo real: la release v0.1.0 se creó con
# `git archive`, que no incluye engine/ (está ignorado por git), y cualquiera
# que instalara desde ahí recibía un jpcode que no arrancaba.
#
# Variables:
#   JPCODE_TAP_REPO   repo del tap (por defecto SoyJuanPiece/homebrew-tap)
#   JPCODE_DIST_REPO  repo de los artefactos (por defecto SoyJuanPiece/jpcode-dist)
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

TAP_REPO="${JPCODE_TAP_REPO:-SoyJuanPiece/homebrew-tap}"
DIST_REPO="${JPCODE_DIST_REPO:-SoyJuanPiece/jpcode-dist}"
VERSION="${1:-v$(node -p "require('./package.json').version")}"
ASSET="jpcode-app.tar.gz"
RUTA_FORMULA="Formula/jpcode.rb"

log() { printf '→ %s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

command -v gh >/dev/null 2>&1 || die "hace falta gh"
command -v sha256sum >/dev/null 2>&1 || die "hace falta sha256sum"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

URL="https://github.com/$DIST_REPO/releases/download/$VERSION/$ASSET"
log "bajando $URL"
curl -fsSL "$URL" -o "$TMP/$ASSET" || die "no pude descargar $ASSET de $VERSION"
SHA="$(sha256sum "$TMP/$ASSET" | cut -d' ' -f1)"

# Red de seguridad: sin motor, el paquete instalado no arranca.
tar -tzf "$TMP/$ASSET" | grep -q "engine/cli-entry.js" \
  || die "el tarball de $VERSION no lleva engine/cli-entry.js; no toco la fórmula"

log "clonando $TAP_REPO"
gh repo clone "$TAP_REPO" "$TMP/tap" -- --depth 1 >/dev/null 2>&1 \
  || die "no pude clonar $TAP_REPO"
cd "$TMP/tap"
[ -f "$RUTA_FORMULA" ] || die "no encuentro $RUTA_FORMULA en el tap"

# -i.bak funciona igual en GNU sed (Linux) y en BSD sed (macOS).
sed -i.bak \
  -e "s#releases/download/[^/]*/$ASSET#releases/download/$VERSION/$ASSET#" \
  -e "s#^  sha256 .*#  sha256 \"$SHA\"#" \
  -e "s#^  version .*#  version \"${VERSION#v}\"#" \
  "$RUTA_FORMULA"
rm -f "$RUTA_FORMULA.bak"

grep -q "$SHA" "$RUTA_FORMULA" || die "el sha256 no quedó escrito; revisa la fórmula a mano"
grep -q "$VERSION/" "$RUTA_FORMULA" || die "la url no quedó escrita; revisa la fórmula a mano"

if git diff --quiet; then
  echo "✅ la fórmula ya estaba en $VERSION"
  exit 0
fi

git -c user.name="JuanPiece" -c user.email="vivenesjuan332@gmail.com" \
  commit -q -am "chore: jpcode $VERSION"
git push -q origin HEAD

echo "✅ tap actualizado a $VERSION (sha256 $SHA)"
