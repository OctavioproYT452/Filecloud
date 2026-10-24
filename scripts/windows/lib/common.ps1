# SynapseBox - funciones comunes de los instaladores de Windows (se cargan con "." desde install.ps1).

function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function NodeOk { (Has node) -and (Has npm) -and ([int](node -p "process.versions.node.split('.')[0]") -ge 18) }
