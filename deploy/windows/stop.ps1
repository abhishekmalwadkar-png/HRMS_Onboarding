<#
  Stops AutomationEdge HR (Nginx and the Python backend).
      powershell -ExecutionPolicy Bypass -File deploy\windows\stop.ps1 -NginxDir C:\nginx
#>
param([string]$NginxDir = 'C:\nginx')

if (Get-Process nginx -ErrorAction SilentlyContinue) {
    Push-Location $NginxDir
    & (Join-Path $NginxDir 'nginx.exe') -s quit
    Pop-Location
    Write-Host "Nginx stopped."
} else {
    Write-Host "Nginx was not running."
}

$backend = Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'server\.py' }
if ($backend) {
    $backend | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Write-Host "Backend stopped (pid $($backend.ProcessId -join ', '))."
} else {
    Write-Host "Backend was not running."
}
