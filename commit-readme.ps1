Set-Location "Search-App-Submission"
$msg = "README + AUDIT-REPORT: reflect post-hardening security posture"
$msg2 = "Documentation refresh after the nonce-CSP / login-rate-limit / open-redirect / CORP hardening commit (16527c7). Also removes the audit-probe / commit / push helper PowerShell scripts that were committed by mistake in the previous commit (they were MCP-shell workarounds, not production code)."
git add -A
git commit -m $msg -m $msg2
"EXIT: $LASTEXITCODE"
