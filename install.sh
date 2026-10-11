#!/usr/bin/env bash
# File Cloud - instalador para Linux y macOS.
# Detecta el sistema, instala Node.js y npm si faltan y ejecuta "npm install".
# Uso:  bash install.sh        (FILECLOUD_START=1 bash install.sh  -> además arranca el servidor)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export DEBIAN_FRONTEND=noninteractive

info() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi
need_root() { [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "Hacen falta permisos de administrador (ejecuta como root o instala sudo)."; }

node_ok()     { command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]; }
node_modern() { node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'; }
nodesource()  { curl -fsSL "$1" | ${SUDO:+$SUDO -E} bash -; }

OS="$(uname -s)"; PM=""
if [ "$OS" = "Darwin" ]; then PM="brew"
else for p in apt-get dnf yum pacman zypper apk; do if command -v "$p" >/dev/null 2>&1; then PM="$p"; break; fi; done; fi
DISTRO="$OS"; [ -r /etc/os-release ] && DISTRO="$(. /etc/os-release; echo "${PRETTY_NAME:-$NAME}")"
info "Sistema detectado: $DISTRO (gestor de paquetes: ${PM:-ninguno})"

install_node() {
  [ -n "$PM" ] || die "No reconozco el gestor de paquetes. Instala Node.js 18 o superior desde https://nodejs.org y repite."
  if [ "$PM" = "brew" ]; then command -v brew >/dev/null 2>&1 || die "Instala Homebrew (https://brew.sh) y repite."; else need_root; fi
  case "$PM" in
    apt-get) $SUDO apt-get update -y; $SUDO apt-get install -y curl ca-certificates gnupg
             nodesource https://deb.nodesource.com/setup_22.x; $SUDO apt-get install -y nodejs ;;
    dnf|yum) $SUDO "$PM" install -y curl ca-certificates
             nodesource https://rpm.nodesource.com/setup_22.x; $SUDO "$PM" install -y nodejs ;;
    pacman)  $SUDO pacman -Sy --noconfirm nodejs npm ;;
    zypper)  $SUDO zypper --non-interactive install nodejs22 npm22 || $SUDO zypper --non-interactive install nodejs npm ;;
    apk)     $SUDO apk add --no-cache nodejs npm ;;
    brew)    brew install node ;;
  esac
}

build_tools() {
  info "Node anterior a 22.13: instalando herramientas de compilación para SQLite…"
  case "$PM" in
    apt-get) $SUDO apt-get install -y build-essential python3 ;;
    dnf|yum) $SUDO "$PM" install -y gcc-c++ make python3 ;;
    pacman)  $SUDO pacman -S --noconfirm --needed base-devel python ;;
    zypper)  $SUDO zypper --non-interactive install gcc-c++ make python3 ;;
    apk)     $SUDO apk add --no-cache build-base python3 ;;
  esac
}

if node_ok; then
  ok "Node.js $(node -v) y npm $(npm -v) ya están instalados"
else
  info "Instalando Node.js y npm…"
  install_node; hash -r
  node_ok || die "Node.js no quedó disponible. Abre una terminal nueva y repite, o instálalo desde https://nodejs.org"
  ok "Instalado Node.js $(node -v) y npm $(npm -v)"
fi

info "Instalando dependencias (npm install)…"
if node_modern; then npm install --omit=optional --no-audit --no-fund
else build_tools || true; npm install --no-audit --no-fund; fi
mkdir -p data hosting

info "Configuración del agente de IA…"
node setup-ai.js || true   # pregunta si quieres IA (Grok u Ollama); nunca interrumpe la instalación

ok "File Cloud listo."
echo "   Iniciar:  npm start        (http://localhost:3001)"
echo "   El primer usuario que se registre será administrador."
if [ "${FILECLOUD_START:-0}" = "1" ]; then info "Arrancando…"; exec npm start; fi
