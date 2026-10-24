#!/usr/bin/env bash
# SynapseBox - instalación en una línea (Linux y macOS):
#   curl -fsSL https://raw.githubusercontent.com/OctavioproYT452/SynapseBox/HEAD/get.sh | bash
# Instala git si falta, clona el repositorio y ejecuta scripts/unix/install.sh.
# Variables opcionales: SYNAPSEBOX_DIR (destino, por defecto ~/SynapseBox), SYNAPSEBOX_REPO, SYNAPSEBOX_START=1
main() {
  set -euo pipefail
  export DEBIAN_FRONTEND=noninteractive
  local REPO="${SYNAPSEBOX_REPO:-${FILECLOUD_REPO:-https://github.com/OctavioproYT452/SynapseBox.git}}"
  local DIR="${SYNAPSEBOX_DIR:-${FILECLOUD_DIR:-$HOME/SynapseBox}}"
  # Instalación anterior (File Cloud): si existe ~/Filecloud y no hay ~/SynapseBox, se sigue usando esa carpeta para no perder los datos.
  if [ -z "${SYNAPSEBOX_DIR:-}${FILECLOUD_DIR:-}" ] && [ -d "$HOME/Filecloud/.git" ] && [ ! -e "$HOME/SynapseBox" ]; then DIR="$HOME/Filecloud"; fi
  local SUDO=""
  if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi

  if ! command -v git >/dev/null 2>&1; then
    printf '\033[1;36m==>\033[0m Instalando git…\n'
    [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || [ "$(uname -s)" = "Darwin" ] || { echo "Hacen falta permisos de administrador para instalar git." >&2; exit 1; }
    if   [ "$(uname -s)" = "Darwin" ]; then brew install git || xcode-select --install
    elif command -v apt-get >/dev/null 2>&1; then $SUDO apt-get update -y && $SUDO apt-get install -y git curl ca-certificates
    elif command -v dnf     >/dev/null 2>&1; then $SUDO dnf install -y git curl ca-certificates
    elif command -v yum     >/dev/null 2>&1; then $SUDO yum install -y git curl ca-certificates
    elif command -v pacman  >/dev/null 2>&1; then $SUDO pacman -Sy --noconfirm git curl
    elif command -v zypper  >/dev/null 2>&1; then $SUDO zypper --non-interactive install git curl
    elif command -v apk     >/dev/null 2>&1; then $SUDO apk add --no-cache git curl bash
    else echo "No pude instalar git automáticamente. Instálalo y repite." >&2; exit 1; fi
  fi

  if [ -d "$DIR/.git" ]; then
    printf '\033[1;36m==>\033[0m Actualizando %s…\n' "$DIR"; git -C "$DIR" pull --ff-only
  elif [ -e "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
    echo "La carpeta $DIR ya existe y no está vacía. Usa SYNAPSEBOX_DIR=/otra/ruta" >&2; exit 1
  else
    printf '\033[1;36m==>\033[0m Clonando en %s…\n' "$DIR"; git clone --depth 1 "$REPO" "$DIR"
  fi
  # </dev/null: evita que los comandos hijos lean (y se coman) el script que llega por la tubería
  bash "$DIR/scripts/unix/install.sh" </dev/null
}
main "$@"
