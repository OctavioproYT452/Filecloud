# SynapseBox - instalación de Node.js y de las dependencias del proyecto (se carga con "." después de common.ps1).

# Instala Node.js LTS si falta.
function Ensure-Node {
  if (-not (NodeOk)) {
    Write-Host "==> Instalando Node.js LTS..." -ForegroundColor Cyan
    if (Has winget)     { winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements }
    elseif (Has choco)  { choco install nodejs-lts -y }
    else { throw "No encuentro winget ni Chocolatey. Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar este script." }
    RefreshPath
    if (-not (NodeOk)) { throw "Node.js se instaló pero aún no está en el PATH. Cierra y abre PowerShell y vuelve a ejecutar install.ps1." }
  }
  Write-Host " OK Node.js $(node -v) y npm $(npm -v)" -ForegroundColor Green
}

# Ejecuta "npm install" (sin better-sqlite3 si Node ya incluye node:sqlite, es decir, 22.13 o superior).
function Install-Dependencies {
  Write-Host "==> Instalando dependencias (npm install)..." -ForegroundColor Cyan
  $modern = (node -p "(()=>{const [a,b]=process.versions.node.split('.').map(Number);return a>22||(a===22&&b>=13)})()") -eq 'true'
  if ($modern) { npm install --omit=optional --no-audit --no-fund } else { npm install --no-audit --no-fund }
  if ($LASTEXITCODE -ne 0) { throw "npm install falló (código $LASTEXITCODE)." }
}
