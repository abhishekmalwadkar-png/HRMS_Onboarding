<#
  AutomationEdge HR - one-time setup on a Windows server (Nginx on port 8099).

  Run from an elevated PowerShell (needed only for the firewall rule):
      powershell -ExecutionPolicy Bypass -File deploy\windows\setup.ps1 -NginxDir C:\nginx

  Re-run it after every code update (git pull) to rebuild the frontend and refresh the config.
#>
param(
    [string]$NginxDir = 'C:\nginx',
    [int]$Port = 8099
)

$ErrorActionPreference = 'Stop'
$AppRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Step "Checking prerequisites"
foreach ($cmd in 'python', 'node', 'npm') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd was not found on PATH. Install it first." }
}
$nginxExe = Join-Path $NginxDir 'nginx.exe'
if (-not (Test-Path $nginxExe)) { throw "nginx.exe not found in $NginxDir. Download Nginx for Windows (nginx.org/en/download.html) and unzip it there, or pass -NginxDir." }
if (-not (Test-Path (Join-Path $AppRoot '.env'))) {
    Write-Warning ".env is missing in $AppRoot. Copy .env.example to .env and fill in the real credentials before starting."
}

Step "Installing Python packages"
python -m pip install --upgrade pip | Out-Null
python -m pip install -r (Join-Path $AppRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install failed' }

Step "Building the frontend (frontend\dist)"
Push-Location (Join-Path $AppRoot 'frontend')
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
} finally { Pop-Location }

Step "Writing Nginx config ($NginxDir\conf\nginx.conf)"
$confPath = Join-Path $NginxDir 'conf\nginx.conf'
if ((Test-Path $confPath) -and -not (Test-Path "$confPath.original")) {
    Copy-Item $confPath "$confPath.original"   # keep Nginx's default config once
}
$template = Get-Content (Join-Path $PSScriptRoot 'nginx.conf.template') -Raw
$conf = $template.Replace('{{APP_ROOT}}', ($AppRoot -replace '\\', '/')).Replace('listen       8099;', "listen       $Port;")
# Nginx can't read a UTF-8 BOM, so write without one
[IO.File]::WriteAllText($confPath, $conf, (New-Object System.Text.UTF8Encoding($false)))

Step "Testing Nginx config"
Push-Location $NginxDir
try {
    & $nginxExe -t
    if ($LASTEXITCODE -ne 0) { throw 'nginx -t reported an error (see above)' }
} finally { Pop-Location }

Step "Opening port $Port in Windows Firewall"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    if (-not (Get-NetFirewallRule -DisplayName "AutomationEdge HR $Port" -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName "AutomationEdge HR $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
    }
    Write-Host "Firewall rule ready."
} else {
    Write-Warning "Not running as Administrator: skipped the firewall rule. Re-run elevated, or allow TCP $Port manually."
}

Write-Host "`nSetup complete. Start the app with:" -ForegroundColor Green
Write-Host "    powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1 -NginxDir $NginxDir"
