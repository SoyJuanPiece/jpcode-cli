#!/usr/bin/env bash
# Trae el MOTOR dentro de jpcode: copia el agente a `engine/` y le aplica los
# parches de jpcode aquí, en la construcción — no en la instalación del usuario.
#
#   bash vendor-engine.sh                  # desde la instalación local (rápido)
#   ORIGEN=npm bash vendor-engine.sh       # bajándolo del registro (CI)
#   QWEN_VERSION=0.24.7 bash vendor-engine.sh
#
# Con esto jpcode deja de ser un accesorio que parchea lo que tengas instalado:
# el agente viaja dentro del paquete y arranca desde `engine/`.
#
# Dos cosas que este script NO hace y conviene tener claras:
#   - No copia `node_modules`: las piezas nativas (sharp, node-pty, clipboard)
#     las resuelve npm por plataforma desde las dependencias de package.json.
#     El motor las encuentra subiendo desde `engine/` hasta `jpcode/node_modules`.
#   - No inventa una licencia: el motor es Apache-2.0, así que se conserva su
#     LICENSE y se deja constancia de los cambios en engine/NOTICE-jpcode.md.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

MOTOR="$AQUI/engine"
ORIGEN="${ORIGEN:-auto}"
QWEN_DIR="${QWEN_DIR:-$HOME/.global_modules/lib/node_modules/@qwen-code/qwen-code}"

# auto = la instalación local si está (rápido y sin red) y, si no, el registro.
# Así el mismo comando vale en tu máquina y en CI.
if [ "$ORIGEN" = "auto" ]; then
  if [ -f "$QWEN_DIR/package.json" ]; then ORIGEN="local"; else ORIGEN="npm"; fi
fi

echo "→ origen: $ORIGEN"

rm -rf "$MOTOR"
mkdir -p "$MOTOR"

if [ "$ORIGEN" = "npm" ]; then
  VERSION="${QWEN_VERSION:-$(node -p "require('./package.json').engineVersion || '0.24.7'")}"
  echo "→ bajando el motor @qwen-code/qwen-code@$VERSION del registro"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  ( cd "$TMP" && npm pack "@qwen-code/qwen-code@$VERSION" --silent >/dev/null )
  tar -xzf "$TMP"/*.tgz -C "$MOTOR" --strip-components=1
else
  [ -f "$QWEN_DIR/package.json" ] || { echo "✗ no encuentro el motor en $QWEN_DIR" >&2; exit 1; }
  [ -d "$QWEN_DIR/chunks" ] || { echo "✗ $QWEN_DIR no parece el motor (falta chunks/)" >&2; exit 1; }
  echo "→ copiando desde la instalación local $QWEN_DIR"
  # node_modules fuera: lo resuelve npm por plataforma.
  tar -cf - -C "$QWEN_DIR" --exclude=node_modules . | tar -xf - -C "$MOTOR"
fi

VERSION="$(node -p "require('$MOTOR/package.json').version")"
echo "→ motor $VERSION en engine/ ($(du -sh "$MOTOR" | cut -f1))"

# Quitamos lo que no hace falta para ejecutar: ejemplos y sus mapas de tipos.
rm -rf "$MOTOR/examples" "$MOTOR/docs" 2>/dev/null || true

echo "→ aplicando los parches de jpcode sobre el motor (en el build, no al instalar)"
FALLADOS=""
for p in patch-jpcode-brand patch-jpcode-clipboard patch-jpcode-image-watch patch-jpcode-render patch-jpcode-minimax-plan; do
  if [ -f "$AQUI/$p.mjs" ]; then
    if ! JPCODE_ENGINE="$MOTOR" node "$AQUI/$p.mjs" >/dev/null 2>&1; then
      FALLADOS="$FALLADOS $p"
    fi
  fi
done
# Los parches de comportamiento (catálogo de models.dev, /model por proveedores,
# Custom Provider) viven en el gateway y son los mismos que aplica install.sh.
for p in patch-jpcode-search patch-jpcode-providers patch-jpcode-auth patch-jpcode-connect patch-jpcode-model-sections patch-jpcode-discover; do
  if [ -f "$AQUI/gateway/$p.mjs" ]; then
    if ! JPCODE_ENGINE="$MOTOR" node "$AQUI/gateway/$p.mjs" >/dev/null 2>&1; then
      FALLADOS="$FALLADOS $p"
    fi
  fi
done
if [ -n "$FALLADOS" ]; then
  echo "⚠️  parches que fallaron sobre el motor:$FALLADOS" >&2
  echo "    para ver el error:  JPCODE_ENGINE=$MOTOR node <parche>.mjs" >&2
  exit 1
fi
echo "   los 10 parches, aplicados"

# Comprobación mínima: que el motor siga parseando después de parchearlo.
for f in "$MOTOR/cli-entry.js" "$MOTOR/chunks/startInteractiveUI-ZKYQSLKT.js"; do
  [ -f "$f" ] || { echo "✗ falta $f después de parchear" >&2; exit 1; }
  node --check "$f" >/dev/null 2>&1 || { echo "✗ $f no parsea después de parchear" >&2; exit 1; }
done
echo "   y parsea bien"

# Licencia: Apache-2.0 obliga a conservarla y a dejar constancia de los cambios.
[ -f "$MOTOR/LICENSE" ] || { echo "✗ el motor no trae LICENSE; no lo empaqueto así" >&2; exit 1; }
cat > "$MOTOR/NOTICE-jpcode.md" <<'EOF'
# Aviso sobre el motor incluido en \`engine/\`

Este directorio contiene **Qwen Code $VERSION**, publicado bajo **Apache-2.0**.
Se conserva su \`LICENSE\` tal cual, como exige la licencia. Copyright y autoría
originales son de sus autores; Apache-2.0 concede la licencia, no la propiedad.

## Cambios realizados

jpcode **modifica** este código. Los cambios son los que aplican los parches del
repositorio, y se pueden reproducir con \`bash vendor-engine.sh\`:

| Parche | Qué cambia |
| --- | --- |
| \`patch-jpcode-brand\` | Textos visibles (título de ventana y cadenas de marca), color y frames del spinner del indicador de trabajo (fuera el braille, que sale en cuadro; y frames ASCII en la consola clásica de Windows, que tampoco sabe dibujar las formas geométricas), y **la versión que se anuncia**: el motor la traía fija en su código, así que jpcode se anunciaba con el número de la versión del motor (`$VERSION`) en vez del suyo. Esa versión del motor se conserva en `engine/package.json`, por si hay que reportar un bug contra él. |
| \`patch-jpcode-clipboard\` | Sustituye el aviso de pegado de imágenes por uno veraz. |
| \`patch-jpcode-image-watch\` | Añade el vigilante que adjunta la imagen que llega del puente. |
| \`patch-jpcode-render\` | Render de ink: deja el renderizador incremental **apagado por defecto** y le añade una guarda de desplazamiento. El incremental escribe 7-10 veces menos (el parpadeo en los terminales web viene de repintar la pantalla 12 veces por segundo), pero cuando el chat crece más que la ventana se rompe la pantalla, así que solo se activa a mano con \`JPCODE_INCREMENTAL_RENDER=1\`. |
| \`patch-jpcode-search\` | Buscador en /model. |
| \`patch-jpcode-providers\` | Catálogo completo de models.dev en el diálogo de conexión. |
| \`patch-jpcode-auth\` | Buscador en el diálogo de conexión. |
| \`patch-jpcode-connect\` | \`/provider\` como alias, abriendo directo en el catálogo. |
| \`patch-jpcode-model-sections\` | /model en dos niveles (proveedor → modelos). |
| \`patch-jpcode-discover\` | Detección automática de modelos del proveedor propio. |

## Marcas

Apache-2.0 **no concede derechos de marca**. Los nombres y logotipos del proyecto
original no se usan para identificar este producto, y su retirada de la interfaz
forma parte de los cambios de arriba.
EOF
echo "   LICENSE conservada + engine/NOTICE-jpcode.md escrito"

echo
echo "✅ motor dentro: engine/ ($(du -sh "$MOTOR" | cut -f1), $(find "$MOTOR" -type f | wc -l) ficheros)"
