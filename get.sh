#!/usr/bin/env bash
# File Cloud - instalación en una línea (Linux y macOS):
#   curl -fsSL https://raw.githubusercontent.com/OctavioproYT452/Filecloud/HEAD/get.sh | bash
# Instala git si falta, clona el repositorio y ejecuta install.sh.
# Variables opcionales: FILECLOUD_DIR (destino, por defecto ~/Filecloud), FILECLOUD_REPO, FILECLOUD_START=1
main() {
  set -euo pipefail
  export DEBIAN_FRONTEND=noninteractive
  local REPO="${FILECLOUD_REPO:-https://github.com/OctavioproYT452/Filecloud.git}"
  local DIR="${FILECLOUD_DIR:-$HOME/Filecloud}"
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
    echo "La carpeta $DIR ya existe y no está vacía. Usa FILECLOUD_DIR=/otra/ruta" >&2; exit 1
  else
    printf '\033[1;36m==>\033[0m Clonando en %s…\n' "$DIR"; git clone --depth 1 "$REPO" "$DIR"
  fi
  # </dev/null: evita que los comandos hijos lean (y se coman) el script que llega por la tubería
  bash "$DIR/install.sh" </dev/null
}
main "$@"
