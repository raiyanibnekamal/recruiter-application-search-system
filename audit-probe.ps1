# audit-probe.ps1 — Live security probe against the deployed site.
# Hits a handful of endpoints + surfaces the response headers, then
# summarises the security posture against a checklist.
$ErrorActionPreference = "Continue"
$base = "https://recruiter-application-search-system.vercel.app"

function Probe($label, $method, $url, $extra = @{}) {
  Write-Host ""
  Write-Host "===== $label ====="
  Write-Host "$method $url"
  try {
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = $method
    $req.AllowAutoRedirect = $false
    $req.UserAgent = "audit-probe/1.0"
    foreach ($k in $extra.Keys) { $req.Headers.Add($k, $extra[$k]) }
    try {
      $resp = $req.GetResponse()
      $code = [int]$resp.StatusCode
      $headers = $resp.Headers
    } catch [System.Net.WebException] {
      $resp = $_.Exception.Response
      $code = [int]$resp.StatusCode
      $headers = $resp.Headers
    }
    Write-Host ("HTTP {0}" -f $code)
    foreach ($h in $headers.AllKeys) {
      $vals = $headers.GetValues($h) -join ", "
      Write-Host ("  {0}: {1}" -f $h, $vals)
    }
  } catch {
    Write-Host ("FAIL: {0}" -f $_.Exception.Message)
  }
}

Probe "Login (public)" GET "$base/login"
Probe "Search without auth (expect 303 -> /login)" GET "$base/search"
Probe "Search with bogus cookie (expect 303)" GET "$base/search" @{ Cookie = "sb-access-token=fake" }
Probe "Robots" GET "$base/robots.txt"
Probe "Sitemap" GET "$base/sitemap.xml"
Probe "Env file probe (expect 404)" GET "$base/.env.local"
Probe "Env example probe (expect 404 if not exposed)" GET "$base/.env.example"
Probe "Source map probe (expect 404, source maps disabled)" GET "$base/_next/static/chunks/main.js.map"
Probe "Git config probe (expect 404)" GET "$base/.git/config"
Probe "Service worker probe (expect 404)" GET "$base/sw.js"

# Anon-key REST probe (no Authorization header)
Probe "Supabase anon REST (expect 401 or [])" GET "https://thxvpmmyateyqlnycalz.supabase.co/rest/v1/applications?select=id&limit=1"
