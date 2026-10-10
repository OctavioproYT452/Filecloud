# File Cloud - instalador para Windows (PowerShell 5.1 o superior).
# Instala Node.js (LTS) si falta y ejecuta "npm install".   Uso:  .\install.ps1   (o -Start para arrancar al terminar)
param([switch]$Start)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function NodeOk { (Has node) -and (Has npm) -and ([int](node -p "process.versions.node.split('.')[0]") -ge 18) }

Write-Host "==> Sistema detectado: $([System.Environment]::OSVersion.VersionString)" -ForegroundColor Cyan
if (-not (NodeOk)) {
  Write-Host "==> Instalando Node.js LTS..." -ForegroundColor Cyan
  if (Has winget)     { winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements }
  elseif (Has choco)  { choco install nodejs-lts -y }
  else { throw "No encuentro winget ni Chocolatey. Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar este script." }
  RefreshPath
  if (-not (NodeOk)) { throw "Node.js se instaló pero aún no está en el PATH. Cierra y abre PowerShell y vuelve a ejecutar install.ps1." }
}
Write-Host " OK Node.js $(node -v) y npm $(npm -v)" -ForegroundColor Green

Write-Host "==> Instalando dependencias (npm install)..." -ForegroundColor Cyan
$modern = (node -p "(()=>{const [a,b]=process.versions.node.split('.').map(Number);return a>22||(a===22&&b>=13)})()") -eq 'true'
if ($modern) { npm install --omit=optional --no-audit --no-fund } else { npm install --no-audit --no-fund }
if ($LASTEXITCODE -ne 0) { throw "npm install falló (código $LASTEXITCODE)." }
New-Item -ItemType Directory -Force data, hosting | Out-Null

Write-Host " OK File Cloud listo. Inicia con:  npm start   (http://localhost:3001)" -ForegroundColor Green
Write-Host "    El primer usuario que se registre será administrador."
if ($Start) { npm start }
