<#
  CONFIGURADOR DE LAS PLANTILLAS — Windows / PowerShell
  --------------------------------------------------------------------------
  Uso (desde la carpeta plantillas-web):

      powershell -ExecutionPolicy Bypass -File .\configurar.ps1

  Qué hace:
    1. Comprueba que tienes Node 22.13 o superior.
    2. Crea el fichero .env de cada plantilla si no existe
       (copiándolo de .env.example, que viene documentado).
    3. Te dice cómo arrancar cada una.

  No borra datos: si ya tienes un .env, lo deja como está.
  También funciona en macOS/Linux con:  bash configurar.sh
#>

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ''
Write-Host '  CONFIGURADOR DE PLANTILLAS' -ForegroundColor Cyan
Write-Host '  ---------------------------'

# 1) Versión de Node ---------------------------------------------------------
$nodo = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodo) {
    Write-Host '  [X] No encuentro Node.js.' -ForegroundColor Red
    Write-Host '       Instálalo desde https://nodejs.org (versión 22.13 o superior).'
    exit 1
}

$version = (node -v).TrimStart('v')
$partes = $version.Split('.')
$mayor = [int]$partes[0]
$menor = if ($partes.Count -gt 1) { [int]$partes[1] } else { 0 }

if ($mayor -lt 22 -or ($mayor -eq 22 -and $menor -lt 13)) {
    Write-Host "  [X] Node $version es demasiado antiguo: hace falta 22.13 o superior." -ForegroundColor Red
    Write-Host '       (Las plantillas usan node:sqlite, incluido en Node 22.13+)'
    exit 1
}
Write-Host "  [OK] Node $version" -ForegroundColor Green

# 2) .env de cada plantilla --------------------------------------------------
$plantillas = Get-ChildItem -Path $raiz -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
    Sort-Object Name

$creados = 0
foreach ($p in $plantillas) {
    $envRuta = Join-Path $p.FullName '.env'
    $ejemplo = Join-Path $p.FullName '.env.example'

    if (Test-Path $envRuta) {
        Write-Host ("  [OK] {0,-14} .env ya existe (no se toca)" -f $p.Name) -ForegroundColor DarkGray
    }
    elseif (Test-Path $ejemplo) {
        Copy-Item $ejemplo $envRuta
        Write-Host ("  [+]  {0,-14} creado .env desde .env.example" -f $p.Name) -ForegroundColor Green
        $creados++
    }
    else {
        Write-Host ("  [!]  {0,-14} no tiene .env.example" -f $p.Name) -ForegroundColor Yellow
    }
}

# 3) Resumen -----------------------------------------------------------------
Write-Host ''
Write-Host '  SIGUIENTES PASOS' -ForegroundColor Cyan
Write-Host '  -----------------'
if ($plantillas.Count -gt 0) {
    $primera = $plantillas[0].Name
    Write-Host "  1. Entra en una plantilla:   cd $primera"
    Write-Host '  2. Arráncala:                npm start'
    Write-Host '  3. Abre en el navegador:     http://localhost:3000'
}
Write-Host ''
Write-Host '  Para verlas todas a la vez usa puertos distintos, por ejemplo:'
Write-Host '      $env:PORT=3102; npm start'
Write-Host ''
Write-Host '  Para comprobar que cada API responde:  powershell -File .\verificar.ps1'
Write-Host ''

if ($creados -eq 0) {
    Write-Host '  (No había nada que configurar: todas las plantillas ya tienen .env)' -ForegroundColor DarkGray
    Write-Host ''
}
