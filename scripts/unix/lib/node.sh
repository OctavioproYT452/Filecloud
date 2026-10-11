# File Cloud - detección del sistema e instalación de Node.js (se carga con "source" después de common.sh).

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

# Instala Node.js y npm si faltan.
ensure_node() {
  if node_ok; then
    ok "Node.js $(node -v) y npm $(npm -v) ya están instalados"
  else
    info "Instalando Node.js y npm…"
    install_node; hash -r
    node_ok || die "Node.js no quedó disponible. Abre una terminal nueva y repite, o instálalo desde https://nodejs.org"
    ok "Instalado Node.js $(node -v) y npm $(npm -v)"
  fi
}

# Instala las dependencias del proyecto (con herramientas de compilación si Node es anterior a 22.13).
install_dependencies() {
  info "Instalando dependencias (npm install)…"
  if node_modern; then npm install --omit=optional --no-audit --no-fund
  else build_tools || true; npm install --no-audit --no-fund; fi
}
