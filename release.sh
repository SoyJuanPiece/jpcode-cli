#!/usr/bin/env bash
# Publica una release de jpcode-cli con lo necesario para instalar de una línea.
#
#   bash release.sh              # versión = la de package.json (v0.1.0)
#   bash release.sh v0.2.0       # versión a mano
#
# Sube tres artefactos: el tarball del código, `get.sh` (el instalador) y
# `SHA256SUMS`. El tarball se construye con `git archive`, así que solo entra lo
# commiteado: ni `.api-key`, ni `.zen-key`, ni caché, ni logs, ni `dist/`.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

VERSION="${1:-v$(node -p "require('./package.json').version")}"
ASSET="jpcode-cli.tar.gz"
DIST="$AQUI/dist"

command -v gh >/dev/null 2>&1 || { echo "✗ hace falta gh y estar autenticado" >&2; exit 1; }

# Nada a medias: la release tiene que corresponder a un commit.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ tienes cambios sin commitear; commitea (o stashea) antes de publicar" >&2
  exit 1
fi
git rev-parse --verify HEAD >/dev/null 2>&1 || { echo "✗ el repo no tiene commits" >&2; exit 1; }

if gh release view "$VERSION" >/dev/null 2>&1; then
  echo "✗ la release $VERSION ya existe. Bórrala o usa otra versión:" >&2
  echo "    gh release delete $VERSION --yes" >&2
  exit 1
fi

rm -rf "$DIST"
mkdir -p "$DIST"

# git archive = exactamente lo que está commiteado. Nada de lo ignorado puede colarse.
git archive --format=tar.gz --prefix="jpcode-cli-${VERSION#v}/" -o "$DIST/$ASSET" HEAD
cp "$AQUI/get.sh" "$DIST/get.sh"
chmod +x "$DIST/get.sh"
( cd "$DIST" && sha256sum "$ASSET" get.sh > SHA256SUMS )

echo "→ artefactos en dist/:"
ls -la "$DIST" | tail -4

echo "→ creando la release $VERSION…"
gh release create "$VERSION" \
  "$DIST/$ASSET" "$DIST/get.sh" "$DIST/SHA256SUMS" \
  --target main \
  --title "jpcode $VERSION" \
  --notes "$(cat <<EOF
Instalación de una línea:

\`\`\`bash
gh release download $VERSION -R SoyJuanPiece/jpcode-cli -p get.sh -O - | bash
\`\`\`

Con el repo público bastaría un \`curl | bash\`; al ser privado, la descarga pasa
por tu sesión de \`gh\`.

- Código: \`$ASSET\` (tal cual el árbol del tag, sin secretos ni caché)
- Instalador: \`get.sh\`
- Comprobación: \`SHA256SUMS\`

Necesita **Node ≥ 22**. La base (Qwen Code) se instala aparte:
\`npm i -g @qwen-code/qwen-code\`.
EOF
)"

echo "✅ release publicada: $(gh release view "$VERSION" --json url -q .url)"
