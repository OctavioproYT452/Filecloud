# SynapseBox - instalación en una línea (Windows, PowerShell):
#   irm https://raw.githubusercontent.com/OctavioproYT452/SynapseBox/HEAD/get.ps1 | iex
# Instala git si falta, clona el repositorio y ejecuta scripts\windows\install.ps1.
# Variables opcionales: SYNAPSEBOX_DIR (destino, por defecto %USERPROFILE%\SynapseBox), SYNAPSEBOX_REPO
$ErrorActionPreference = 'Stop'
$Repo = if ($env:SYNAPSEBOX_REPO) { $env:SYNAPSEBOX_REPO } elseif ($env:FILECLOUD_REPO) { $env:FILECLOUD_REPO } else { 'https://github.com/OctavioproYT452/SynapseBox.git' }
$Dir  = if ($env:SYNAPSEBOX_DIR)  { $env:SYNAPSEBOX_DIR }  elseif ($env:FILECLOUD_DIR) { $env:FILECLOUD_DIR } else { Join-Path $env:USERPROFILE 'SynapseBox' }
# Instalación anterior (File Cloud): si existe %USERPROFILE%\Filecloud y no hay SynapseBox, se sigue usando esa carpeta para no perder los datos.
if (-not $env:SYNAPSEBOX_DIR -and -not $env:FILECLOUD_DIR -and (Test-Path (Join-Path $env:USERPROFILE 'Filecloud\.git')) -and -not (Test-Path $Dir)) { $Dir = Join-Path $env:USERPROFILE 'Filecloud' }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }

if (-not (Has git)) {
  Write-Host "==> Instalando git..." -ForegroundColor Cyan
  if (Has winget)    { winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements }
  elseif (Has choco) { choco install git -y }
  else { throw "No encuentro winget ni Chocolatey. Instala git desde https://git-scm.com y repite." }
  RefreshPath
  if (-not (Has git)) { throw "Git se instaló pero no se detecta aún. Cierra y abre PowerShell y repite el comando." }
}
if (Test-Path (Join-Path $Dir '.git')) { Write-Host "==> Actualizando $Dir..." -ForegroundColor Cyan; git -C $Dir pull --ff-only }
elseif ((Test-Path $Dir) -and (Get-ChildItem $Dir -Force | Select-Object -First 1)) { throw "La carpeta $Dir ya existe y no está vacía. Define SYNAPSEBOX_DIR con otra ruta." }
else { Write-Host "==> Clonando en $Dir..." -ForegroundColor Cyan; git clone --depth 1 $Repo $Dir }
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dir 'scripts\windows\install.ps1')
