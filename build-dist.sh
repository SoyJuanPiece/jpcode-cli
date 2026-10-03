#!/usr/bin/env bash
# Construye el paquete de jpcode que se publica en npm.
#
#   bash build-dist.sh                  # construye y prueba
#   bash build-dist.sh v0.2.0           # versión a mano
#
# Lo llama publish-npm.sh, que es quien publica. Aquí NO se publica nada: esto
# es el gate. Minifica el paquete con bun --minify (sin empaquetar, para no
# cambiar la estructura de ficheros) y deja en dist/ el tarball que npm sube.
#
# Aviso honesto: minificar NO es proteger. El código tiene que ejecutarse en la
# máquina de quien instala, así que viaja entero dentro del paquete; quita los
# comentarios y los nombres, pero un `strings` lo devuelve a la superficie. Solo
# evita que se lea de un vistazo.
#
# Lo que SÍ es serio: el paquete minificado pasa el juego completo de pruebas
# (227 aserciones). Si la minificación rompe algo, publish-npm.sh no publica.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

ASSET="jpcode-app.tar.gz"

VERSION="${1:-v$(node -p "require('./package.json').version")}"
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

# El motor NO está en git (son 95 MB de artefacto, no fuente): se trae con
# vendor-engine.sh y se copia tal cual, sin minificar. Ya viene construido y
# minificarlo no aportaría nada y podría romperlo.
if [ ! -f "$AQUI/engine/cli-entry.js" ]; then
  echo "→ falta el motor; lo traigo con vendor-engine.sh"
  bash "$AQUI/vendor-engine.sh" >/dev/null || { echo "✗ no pude traer el motor" >&2; exit 1; }
else
  echo "→ actualizando parches sobre el motor en engine/…"
  for p in patch-jpcode-brand patch-jpcode-clipboard patch-jpcode-image-watch patch-jpcode-render patch-jpcode-vision; do
    QWEN_PKG="$AQUI/engine" node "$AQUI/$p.mjs" >/dev/null 2>&1 || true
  done
  for p in patch-qwen-search patch-qwen-providers patch-qwen-auth patch-qwen-connect patch-qwen-model-sections patch-qwen-discover; do
    QWEN_PKG="$AQUI/engine" node "$AQUI/gateway/$p.mjs" >/dev/null 2>&1 || true
  done
fi
tar -cf - -C "$AQUI" engine | tar -xf - -C "$TRABAJO"
echo "→ motor incluido ($(du -sh "$TRABAJO/engine" | cut -f1), $(find "$TRABAJO/engine" -type f | wc -l) ficheros)"

echo "→ minificando…"
# La lista se toma ENTERA antes de empezar: los temporales que se crean dentro
# del bucle no pueden colarse en la propia enumeración de find.
mapfile -d '' FICHEROS < <(find "$TRABAJO" -name '*.mjs' -not -path "$TRABAJO/engine/*" -print0)
for f in "${FICHEROS[@]}"; do
  primera="$(head -1 "$f")"
  # El temporal TIENE que acabar en .mjs: node --check decide ESM o CommonJS por
  # la extensión, y con otra se queja de los `import` de un fichero que está bien.
  tmp="$f.min.mjs"
  if ! bun build "$f" --minify --target=node --no-bundle --outfile="$tmp" >/dev/null 2>&1; then
    echo "✗ bun no pudo minificar $f" >&2; exit 1
  fi
  # bun se come el shebang, y el binario se ejecuta directo (va enlazado en el PATH).
  case "$primera" in
    '#!'*) { printf '%s\n' "$primera"; cat "$tmp"; } > "$tmp.shebang"; mv "$tmp.shebang" "$tmp" ;;
  esac
  node --check "$tmp" >/dev/null 2>&1 || { echo "✗ el minificado de $f no parsea" >&2; exit 1; }
  mv "$tmp" "$f"
done
echo "   ${#FICHEROS[@]} ficheros .mjs"

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
( cd "$DIST" && sha256sum "$ASSET" > SHA256SUMS )
rm -rf "$TRABAJO" # el tarball ya lo tiene todo

echo "→ artefactos:"
( cd "$DIST" && ls -la "$ASSET" SHA256SUMS | awk '{print "   " $9 " · " $5 " bytes"}' )

echo "✅ construido y probado en dist/ — lo publica publish-npm.sh"
