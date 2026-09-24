# Render assets/screenshots/00-live-login.png from live Vercel site.
$ErrorActionPreference = "Continue"
$ms = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$png = Join-Path (Get-Location) "assets\screenshots\00-live-login.png"
$url = "https://recruiter-application-search-system.vercel.app/login"
if (Test-Path $png) { Remove-Item $png -Force }
Write-Host "URL : $url"
$p = Start-Process -FilePath $ms -ArgumentList @(
  "--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
  "--window-size=1024,768",
  "--virtual-time-budget=8000",
  "--screenshot=`"$png`"",
  "`"$url`""
) -PassThru -Wait -NoNewWindow
Write-Host "Edge exit: $($p.ExitCode)"
Start-Sleep -Seconds 2
if (Test-Path $png) {
  Write-Host "OK: $((Get-Item $png).Length) bytes"
} else {
  Write-Host "FAIL: png not produced"
}
