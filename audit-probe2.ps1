# audit-probe2.ps1 — Uses Invoke-WebRequest with explicit TimeoutSec.
$ErrorActionPreference = "Continue"

function Probe($label, $url) {
  Write-Host ""
  Write-Host "===== $label ====="
  Write-Host "GET $url"
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -MaximumRedirection 0 -Headers @{"User-Agent"="audit-probe/1.0"} -UseBasicParsing -ErrorAction Stop
    $code = [int]$resp.StatusCode
    Write-Host "HTTP $code"
    foreach ($k in $resp.Headers.Keys) {
      $vals = ($resp.Headers[$k] | ForEach-Object { $_ }) -join ", "
      Write-Host ("  {0}: {1}" -f $k, $vals)
    }
  } catch {
    $code = "?"
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-Host "HTTP $code"
    if ($_.Exception.Response) {
      foreach ($k in $_.Exception.Response.Headers.Keys) {
        $vals = ($_.Exception.Response.Headers[$k] | ForEach-Object { $_ }) -join ", "
        Write-Host ("  {0}: {1}" -f $k, $vals)
      }
    } else {
      Write-Host "  err: $($_.Exception.Message)"
    }
  }
}

$base = "https://recruiter-application-search-system.vercel.app"
Probe "Login"         "$base/login"
Probe "Search (anon)" "$base/search"
Probe "Robots"        "$base/robots.txt"
Probe "Env local"     "$base/.env.local"
Probe ".git/config"   "$base/.git/config"
Probe "Source map"    "$base/_next/static/chunks/main.js.map"
Probe "Supabase anon" "https://thxvpmmyateyqlnycalz.supabase.co/rest/v1/applications?select=id&limit=1"
