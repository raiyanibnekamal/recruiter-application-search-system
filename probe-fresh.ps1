# probe-fresh.ps1 — Force-fresh GET to bypass any Vercel cache.
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$req = [System.Net.HttpWebRequest]::Create("https://recruiter-application-search-system.vercel.app/login")
$req.Method = "GET"
$req.Headers.Add("Cache-Control", "no-cache, no-store, max-age=0")
$req.Headers.Add("Pragma", "no-cache")
$req.Headers.Add("User-Agent", "audit-probe/2.0")
$req.AllowAutoRedirect = $false
try {
  $resp = $req.GetResponse()
  Write-Host ("HTTP {0}" -f [int]$resp.StatusCode)
  foreach ($h in $resp.Headers.AllKeys) {
    Write-Host ("  {0}: {1}" -f $h, ($resp.Headers.GetValues($h) -join ", "))
  }
  $stream = $resp.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($stream)
  $body = $reader.ReadToEnd()
  Write-Host ""
  Write-Host "BODY (first 1200 chars):"
  Write-Host $body.Substring(0, [Math]::Min(1200, $body.Length))
} catch {
  Write-Host ("FAIL: {0}" -f $_.Exception.Message)
  if ($_.Exception.Response) {
    foreach ($h in $_.Exception.Response.Headers.AllKeys) {
      Write-Host ("  {0}: {1}" -f $h, ($_.Exception.Response.Headers.GetValues($h) -join ", "))
    }
  }
}
