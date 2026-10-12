# File Cloud - instalador para Windows (PowerShell 5.1 o superior).
# Instala Node.js (LTS) si falta y ejecuta "npm install".   Uso:  .\scripts\windows\install.ps1   (o -Start para arrancar al terminar)
param([switch]$Start)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')   # raíz del proyecto

. (Join-Path $PSScriptRoot 'lib\common.ps1')
. (Join-Path $PSScriptRoot 'lib\node.ps1')

Write-Host "==> Sistema detectado: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor Cyan
Ensure-Node
Install-Dependencies
New-Item -ItemType Directory -Force data, hosting | Out-Null

Write-Host "==> Configuración del agente de IA..." -ForegroundColor Cyan
node tools/setup-ai.js   # pregunta si quieres IA (Grok, OpenAI, Gemini u Ollama); nunca interrumpe la instalación

Write-Host " OK File Cloud listo. Inicia con:  npm start   (http://localhost:3001)" -ForegroundColor Green
Write-Host "    El primer usuario que se registre será administrador."
if ($Start) { npm start }
