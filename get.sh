#!/usr/bin/env bash
# Instalador de una línea de jpcode.
#
#   curl -fsSL https://github.com/SoyJuanPiece/jpcode-dist/releases/latest/download/get.sh | bash
#
# Por defecto baja del repo PÚBLICO de distribución, así que no hace falta ni
# autenticarse ni tener `gh`. Si `gh` está y hay sesión, se usa (y entonces
# también vale contra el repo privado del código):
#
#   JPCODE_REPO=SoyJuanPiece/jpcode-cli gh release download \
#     -R SoyJuanPiece/jpcode-cli -p get.sh -O - | bash
#
# Variables:
#   JPCODE_VERSION   v0.1.0 para clavar una versión (por defecto, la última)
#   JPCODE_SRC       dónde deja el código (por defecto ~/.jpcode/src)
#   JPCODE_REPO      otro repo, si algún día lo bifurcas
#   JPCODE_ASSET     otro nombre de paquete dentro de la release
#
# Baja el tarball de la release, comprueba su SHA256, lo descomprime en
# JPCODE_SRC y lanza el install.sh de dentro. Se instala en una carpeta
# PERMANENTE a propósito: install.sh enlaza el binario a la carpeta desde la que
# se ejecuta, así que instalarlo en /tmp deja un jpcode roto en cuanto /tmp se
# vacíe.
set -euo pipefail

REPO="${JPCODE_REPO:-SoyJuanPiece/jpcode-dist}"
SRC="${JPCODE_SRC:-$HOME/.jpcode/src}"
VERSION="${JPCODE_VERSION:-latest}"
ASSET="${JPCODE_ASSET:-jpcode-app.tar.gz}"

log() { printf '→ %s\n' "$*"; }
die() { printf '✗ %s\n' "$*" >&2; exit 1; }

command -v tar >/dev/null 2>&1 || die "hace falta tar"
command -v node >/dev/null 2>&1 || die "hace falta Node ≥ 22 (https://nodejs.org)"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' \
  || die "jpcode necesita Node ≥ 22; tienes $(node -v)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# $1 = nombre del asset en la release, $2 = fichero destino local
bajar() {
  local nombre="$1" destino="$2"
  # 1) Con gh. Es la ÚNICA forma si el repo es privado.
  #    Ojo: sin tag, gh usa la última release. Pasarle la palabra "latest" hace
  #    que busque un tag que se llame así y falle con "release not found".
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    local args=(--repo "$REPO" --pattern "$nombre" --output "$destino" --clobber)
    if [ "$VERSION" != "latest" ]; then args=("$VERSION" "${args[@]}"); fi
    if gh release download "${args[@]}" >/dev/null 2>&1; then return 0; fi
    log "gh no pudo bajar $nombre; pruebo la URL directa"
  fi
  # 2) Con curl. Vale cuando el repo es público.
  local url
  if [ "$VERSION" = "latest" ]; then
    url="https://github.com/$REPO/releases/latest/download/$nombre"
  else
    url="https://github.com/$REPO/releases/download/$VERSION/$nombre"
  fi
  curl -fsSL "$url" -o "$destino" 2>/dev/null && return 0
  die "no pude descargar $nombre
    si el repo es privado, autentica gh primero:  gh auth login"
}

log "jpcode $VERSION · repo $REPO"
bajar "$ASSET" "$TMP/$ASSET"
[ -s "$TMP/$ASSET" ] || die "el tarball llegó vacío"

# Si hay sumas en la release, se comprueba: descargar y ejecutar código ajeno
# sin mirar ya es bastante, como para encima no verificar el fichero.
if bajar "SHA256SUMS" "$TMP/SHA256SUMS" 2>/dev/null && command -v sha256sum >/dev/null 2>&1; then
  ( cd "$TMP" && grep -E "[[:space:]]$ASSET\$" SHA256SUMS | sha256sum -c - >/dev/null ) \
    || die "la suma de $ASSET no cuadra: no lo instalo"
  log "suma verificada"
fi

log "instalando en $SRC"
mkdir -p "$SRC"
# El tarball trae un directorio raíz jpcode-cli-<version>/: lo aplanamos.
tar -xzf "$TMP/$ASSET" -C "$SRC" --strip-components=1
[ -f "$SRC/install.sh" ] || die "$SRC/install.sh no existe: ¿tarball corrupto?"

exec bash "$SRC/install.sh"
