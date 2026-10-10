# File Cloud - instalación en una línea (Windows, PowerShell):
#   irm https://raw.githubusercontent.com/OctavioproYT452/Filecloud/HEAD/get.ps1 | iex
# Instala git si falta, clona el repositorio y ejecuta install.ps1.
# Variables opcionales: FILECLOUD_DIR (destino, por defecto %USERPROFILE%\Filecloud), FILECLOUD_REPO
$ErrorActionPreference = 'Stop'
$Repo = if ($env:FILECLOUD_REPO) { $env:FILECLOUD_REPO } else { 'https://github.com/OctavioproYT452/Filecloud.git' }
$Dir  = if ($env:FILECLOUD_DIR)  { $env:FILECLOUD_DIR }  else { Join-Path $env:USERPROFILE 'Filecloud' }
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
elseif ((Test-Path $Dir) -and (Get-ChildItem $Dir -Force | Select-Object -First 1)) { throw "La carpeta $Dir ya existe y no está vacía. Define FILECLOUD_DIR con otra ruta." }
else { Write-Host "==> Clonando en $Dir..." -ForegroundColor Cyan; git clone --depth 1 $Repo $Dir }
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dir 'install.ps1')
