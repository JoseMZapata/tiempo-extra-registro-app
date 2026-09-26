param(
    [string]$Authtoken = $env:NGROK_AUTHTOKEN
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $Authtoken) {
    Write-Host "Falta el authtoken de ngrok." -ForegroundColor Yellow
    Write-Host "1) Crea una cuenta en https://dashboard.ngrok.com/signup"
    Write-Host "2) Copia tu token en https://dashboard.ngrok.com/get-started/your-authtoken"
    Write-Host "3) Ejecuta:  .\start-tunnel.ps1 -Authtoken TU_TOKEN"
    Write-Host "   o define la variable de entorno NGROK_AUTHTOKEN y vuelve a ejecutar."
    exit 1
}

Write-Host "==> Compilando e iniciando backend (NestJS :3000)..." -ForegroundColor Cyan
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start:dev" -WorkingDirectory "$root\backend"

Write-Host "==> Iniciando frontend (Angular :4200)..." -ForegroundColor Cyan
Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory "$root\frontend"

Write-Host "==> Esperando a que el frontend este listo..." -ForegroundColor Cyan
$listo = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:4200" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $listo = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $listo) {
    Write-Host "El frontend no respondio en :4200. Revisa la ventana de Angular." -ForegroundColor Yellow
}

Write-Host "==> Iniciando tunel ngrok (4200)..." -ForegroundColor Cyan
$ngrokArgs = "--config `"$root\ngrok.yml`" start --authtoken `"$Authtoken`" app"
Start-Process -FilePath "ngrok" -ArgumentList $ngrokArgs

$url = $null
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
        $url = ($resp.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
        if ($url) { break }
    } catch {
        # ngrok aun iniciando
    }
}

if ($url) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host " Aplicacion publica: $url" -ForegroundColor Green
    Write-Host " Panel ngrok:        http://127.0.0.1:4040" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "Comparte la URL publica. El backend se sirve en $url/api" -ForegroundColor Gray
} else {
    Write-Host "No se pudo leer la URL desde la API local de ngrok (:4040)." -ForegroundColor Yellow
    Write-Host "Revisa la ventana de ngrok por si falta el authtoken." -ForegroundColor Yellow
}
