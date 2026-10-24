# SynapseBox - funciones comunes de los instaladores de Linux y macOS (se carga con "source").
export DEBIAN_FRONTEND=noninteractive

info() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then SUDO="sudo"; fi
need_root() { [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "Hacen falta permisos de administrador (ejecuta como root o instala sudo)."; }
