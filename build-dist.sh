#!/usr/bin/env bash
# Construye el paquete PUBLICABLE de jpcode y lo sube al repo público.
#
#   bash build-dist.sh                  # construye, prueba y publica la release
#   bash build-dist.sh --solo-build     # construye y prueba, sin publicar
#   bash build-dist.sh v0.2.0           # versión a mano
#
# Para qué: el repo del código es privado, y GitHub no sirve los assets de un
# repo privado sin autenticar. Este script genera el MISMO código minificado
# (bun --minify, sin empaquetar, para no cambiar la estructura de ficheros) y lo
# publica en un repo público, de forma que `curl | bash` funcione sin `gh`.
#
# Aviso honesto: minificar NO es proteger. El código tiene que ejecutarse en la
# máquina de quien instala, así que viaja entero dentro del paquete; quita los
# comentarios y los nombres, pero un `strings` lo devuelve a la superficie. Solo
# evita que se lea de un vistazo.
#
# Lo que SÍ es serio: antes de publicar, el paquete minificado pasa el juego
# completo de pruebas (209 aserciones). Si la minificación rompe algo, no se
# publica nada.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

DIST_REPO="${JPCODE_DIST_REPO:-SoyJuanPiece/jpcode-dist}"
ASSET="jpcode-app.tar.gz"

PUBLICAR=1
POSICIONALES=()
for a in "$@"; do
  case "$a" in
    --solo-build) PUBLICAR=0 ;;
    -*) echo "✗ opción desconocida: $a" >&2; exit 1 ;;
    *) POSICIONALES+=("$a") ;;
  esac
done
VERSION="${POSICIONALES[0]:-v$(node -p "require('./package.json').version")}"
PREFIJO="jpcode-cli-${VERSION#v}"

command -v bun >/dev/null 2>&1 || { echo "✗ hace falta bun para minificar" >&2; exit 1; }
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ tienes cambios sin commitear; commitea antes de construir" >&2
  exit 1
fi

DIST="$AQUI/dist"
TRABAJO="$DIST/$PREFIJO"
rm -rf "$DIST"
mkdir -p "$TRABAJO"

# Solo lo commiteado: nada ignorado (ni .api-key, ni .zen-key, ni caché) puede colarse.
git archive HEAD | tar -x -C "$TRABAJO"

echo "→ minificando…"
N=0
while IFS= read -r -d '' f; do
  primera="$(head -1 "$f")"
  if ! bun build "$f" --minify --target=node --no-bundle --outfile="$f.min" >/dev/null 2>&1; then
    echo "✗ bun no pudo minificar $f" >&2; exit 1
  fi
  # bun se come el shebang, y el binario se ejecuta directo (va enlazado en el PATH).
  case "$primera" in
    '#!'*) { printf '%s\n' "$primera"; cat "$f.min"; } > "$f.tmp"; mv "$f.tmp" "$f.min" ;;
  esac
  node --check "$f.min" >/dev/null 2>&1 || { echo "✗ el minificado de $f no parsea" >&2; exit 1; }
  mv "$f.min" "$f"
  N=$((N + 1))
done < <(find "$TRABAJO" -name '*.mjs' -print0)
echo "   $N ficheros .mjs"

# Los .js de navegador se quedan como están: el propio test los compara por texto
# y minificarlos lo rompería sin ganar nada (son la interfaz, no la receta).

echo "→ probando el paquete minificado (juego completo)…"
if ! ( cd "$TRABAJO/gateway" && node test.mjs > "$DIST/pruebas.log" 2>&1 ); then
  echo "✗ las pruebas fallan en el paquete minificado — NO se publica" >&2
  grep -E "❌" "$DIST/pruebas.log" | head -10 >&2
  exit 1
fi
BIEN="$(grep -c "✅" "$DIST/pruebas.log" || true)"
grep -q "todo bien" "$DIST/pruebas.log" || {
  echo "✗ el paquete minificado no pasa las pruebas — NO se publica" >&2
  tail -20 "$DIST/pruebas.log" >&2
  exit 1
}
echo "   $BIEN aserciones en verde sobre el código minificado"

echo "→ empaquetando…"
tar -czf "$DIST/$ASSET" -C "$DIST" "$PREFIJO"
cp "$AQUI/get.sh" "$DIST/get.sh"
chmod +x "$DIST/get.sh"
( cd "$DIST" && sha256sum "$ASSET" get.sh > SHA256SUMS )
rm -rf "$TRABAJO" # el tarball ya lo tiene todo

echo "→ artefactos:"
( cd "$DIST" && ls -la "$ASSET" get.sh SHA256SUMS | awk '{print "   " $9 " · " $5 " bytes"}' )

if [ "$PUBLICAR" = 0 ]; then
  echo "✅ construido en dist/ (sin publicar)"
  exit 0
fi

command -v gh >/dev/null 2>&1 || { echo "✗ hace falta gh para publicar" >&2; exit 1; }
if gh release view "$VERSION" -R "$DIST_REPO" >/dev/null 2>&1; then
  echo "✗ la release $VERSION ya existe en $DIST_REPO" >&2
  echo "    gh release delete $VERSION -R $DIST_REPO --yes --cleanup-tag" >&2
  exit 1
fi

echo "→ publicando en $DIST_REPO…"
gh release create "$VERSION" -R "$DIST_REPO" \
  "$DIST/$ASSET" "$DIST/get.sh" "$DIST/SHA256SUMS" \
  --target main \
  --title "jpcode $VERSION" \
  --notes "$(cat <<EOF
Instalación de una línea (\`curl\`, sin \`gh\`, sin claves):

\`\`\`bash
curl -fsSL https://github.com/$DIST_REPO/releases/latest/download/get.sh | bash
\`\`\`

- \`$ASSET\` — el paquete que se instala (código minificado)
- \`get.sh\` — el instalador
- \`SHA256SUMS\` — y \`get.sh\` lo comprueba antes de descomprimir nada

El código de este paquete va **minificado**, no es una versión compilada: sigue
siendo JavaScript y se puede recuperar. Está así para no publicar el código
fuente, que vive en un repo privado.
EOF
)"

echo "✅ publicada: $(gh release view "$VERSION" -R "$DIST_REPO" --json url -q .url)"
