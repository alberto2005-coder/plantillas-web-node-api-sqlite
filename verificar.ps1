<#
  VERIFICADOR DE LAS PLANTILLAS — Windows / PowerShell
  --------------------------------------------------------------------------
  Uso (desde la carpeta plantillas-web):

      powershell -ExecutionPolicy Bypass -File .\verificar.ps1

  Arranca cada plantilla en un puerto distinto (3101…3107), comprueba que
  GET /api/salud responde 200 y que la web responde 200, y las vuelve a parar.

  OJO: los puertos 3101-3107 deben estar libres.
#>

$ErrorActionPreference = 'SilentlyContinue'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

# Mapeo: carpeta → puerto
$planes = @(
    @{ carpeta = '01-portfolio'; puerto = 3101 },
    @{ carpeta = '02-saas';      puerto = 3102 },
    @{ carpeta = '03-blog';      puerto = 3103 },
    @{ carpeta = '04-tienda';    puerto = 3104 },
    @{ carpeta = '05-agencia';   puerto = 3105 },
    @{ carpeta = '06-dashboard'; puerto = 3106 },
    @{ carpeta = '07-restaurante'; puerto = 3107 }
)

Write-Host ''
Write-Host '  VERIFICACIÓN DE LAS PLANTILLAS' -ForegroundColor Cyan
Write-Host '  -------------------------------'
$resultado = @()

foreach ($p in $planes) {
    $carpeta = Join-Path $raiz $p.carpeta
    $servidor = Join-Path $carpeta 'server\server.js'
    $puerto = $p.puerto

    if (-not (Test-Path $servidor)) {
        Write-Host ("  [--] {0,-14} sin server\server.js (se omite)" -f $p.carpeta) -ForegroundColor DarkGray
        continue
    }

    $env:PORT = "$puerto"
    $proc = Start-Process -FilePath 'node' `
        -ArgumentList '--disable-warning=ExperimentalWarning', $servidor `
        -WorkingDirectory $carpeta -PassThru -WindowStyle Hidden

    $salud = $false
    $web = $false
    for ($intento = 0; $intento -lt 20 -and -not $salud; $intento++) {
        Start-Sleep -Milliseconds 400
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$puerto/api/salud" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200 -and $r.Content -match '"ok"') { $salud = $true }
        } catch { }
    }
    try {
        $w = Invoke-WebRequest -Uri "http://127.0.0.1:$puerto/" -UseBasicParsing -TimeoutSec 3
        if ($w.StatusCode -eq 200) { $web = $true }
    } catch { }

    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }

    if ($salud -and $web) {
        Write-Host ("  [OK] {0,-14} API + web en :{1}" -f $p.carpeta, $puerto) -ForegroundColor Green
        $resultado += "$($p.carpeta): OK"
    }
    else {
        Write-Host ("  [X]  {0,-14} NO responde (puerto {1})" -f $p.carpeta, $puerto) -ForegroundColor Red
        $resultado += "$($p.carpeta): FALLA"
    }
}

Remove-Item Env:\PORT -ErrorAction SilentlyContinue

Write-Host ''
Write-Host ('  Resumen: {0} de {1} plantillas verificadas correctamente.' -f @($resultado | Where-Object { $_ -like '*OK' }).Count, $resultado.Count)
Write-Host ''
