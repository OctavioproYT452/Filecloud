@echo off
rem File Cloud - instalador para Windows (doble clic). Lanza install.ps1 sin cambiar tu politica de ejecucion.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
