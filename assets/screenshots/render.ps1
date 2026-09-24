# Render assets/screenshots/01-login.html to PNG via headless Edge.
$ErrorActionPreference = "Continue"
$ms = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$html = Join-Path (Get-Location) "assets\screenshots\01-login.html"
$png = Join-Path (Get-Location) "assets\screenshots\01-login.png"
$fileUrl = "file:///" + ($html -replace "\\","/")
if (Test-Path $png) { Remove-Item $png -Force }
Write-Host "URL : $fileUrl"
$p = Start-Process -FilePath $ms -ArgumentList @(
  "--headless=new","--disable-gpu","--no-sandbox","--hide-scrollbars",
  "--window-size=1024,768",
  "--screenshot=`"$png`"",
  "`"$fileUrl`""
) -PassThru -Wait -NoNewWindow
Write-Host "Edge exit: $($p.ExitCode)"
Start-Sleep -Seconds 2
if (Test-Path $png) {
  Write-Host "OK: $((Get-Item $png).Length) bytes"
} else {
  Write-Host "FAIL: png not produced"
}
