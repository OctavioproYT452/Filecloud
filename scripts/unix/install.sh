#!/usr/bin/env bash
# File Cloud - instalador para Linux y macOS.
# Detecta el sistema, instala Node.js y npm si faltan y ejecuta "npm install".
# Uso:  bash scripts/unix/install.sh        (FILECLOUD_START=1 bash scripts/unix/install.sh  -> además arranca el servidor)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."   # raíz del proyecto

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=lib/node.sh
source "$SCRIPT_DIR/lib/node.sh"

ensure_node
install_dependencies
mkdir -p data hosting
if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; info "Creado .env (opcional: pon DISCORD_TOKEN para activar el bot de Discord)."; fi

info "Configuración del agente de IA…"
node tools/setup-ai.js || true   # pregunta si quieres IA (Grok, OpenAI, Gemini u Ollama); nunca interrumpe la instalación

ok "File Cloud listo."
echo "   Iniciar:  npm start        (http://localhost:3001)"
echo "   El primer usuario que se registre será administrador."
if [ "${FILECLOUD_START:-0}" = "1" ]; then info "Arrancando…"; exec npm start; fi
