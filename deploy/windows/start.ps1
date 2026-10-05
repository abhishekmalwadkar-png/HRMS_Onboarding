<#
  Starts AutomationEdge HR: Python backend on 127.0.0.1:8081, then Nginx on port 8099.
      powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1 -NginxDir C:\nginx
  Logs: logs\backend.out.log and logs\backend.err.log
#>
param(
    [string]$NginxDir = 'C:\nginx',
    [int]$BackendPort = 8081
)

$ErrorActionPreference = 'Stop'
$AppRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $AppRoot 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null

# Backend: bound to localhost only, so it is reachable through Nginx but not directly from other machines
$running = Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'server\.py' }
if ($running) {
    Write-Host "Backend already running (pid $($running.ProcessId -join ', '))."
} else {
    $env:HOST = '127.0.0.1'
    $env:PORT = "$BackendPort"
    Start-Process python -ArgumentList 'server.py' -WorkingDirectory $AppRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'backend.out.log') -RedirectStandardError (Join-Path $logDir 'backend.err.log')
    Write-Host "Backend starting on 127.0.0.1:$BackendPort ..."
}

# Wait until the backend answers before putting Nginx in front of it
$ready = $false
foreach ($i in 1..20) {
    try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$BackendPort/api/employees" -TimeoutSec 3 | Out-Null; $ready = $true; break } catch { Start-Sleep -Milliseconds 750 }
}
if (-not $ready) { Write-Warning "Backend did not respond yet. Check $logDir\backend.err.log" }

# Nginx must be started from its own folder on Windows
if (Get-Process nginx -ErrorAction SilentlyContinue) {
    Push-Location $NginxDir; & (Join-Path $NginxDir 'nginx.exe') -s reload; Pop-Location
    Write-Host "Nginx already running: configuration reloaded."
} else {
    Start-Process (Join-Path $NginxDir 'nginx.exe') -WorkingDirectory $NginxDir -WindowStyle Hidden
    Write-Host "Nginx started."
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127|169\.254)\.' } | Select-Object -First 1).IPAddress
Write-Host "`nAutomationEdge HR is available at: http://${ip}:8099  (on this machine: http://localhost:8099)" -ForegroundColor Green
