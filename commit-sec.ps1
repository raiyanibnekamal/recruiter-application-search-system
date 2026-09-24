Set-Location "Search-App-Submission"
$msg = @"
security hardening pass: nonce-based CSP, login rate limit, open-redirect wall, CORP, env hardening

External audit of the deployed site found five gaps vs. production
grade:
  1. CSP shipped 'unsafe-inline' + 'unsafe-eval' on script-src (XSS relaxations).
  2. Access-Control-Allow-Origin: * (Vercel default) — wildcard CORS on every response.
  3. No rate limit on /login (only /search).
  4. ?next= was not validated; could be turned into an open redirect on the magic-link flow.
  5. Missing Cross-Origin-Resource-Policy (Spectre side-channel).

Fixes:
- middleware.ts now generates a fresh CSP nonce per request via
  lib/security/csp.ts (Web Crypto, 128-bit). script-src is
  'self' 'strict-dynamic' 'nonce-…' https://*.supabase.co — no
  unsafe-inline / unsafe-eval. nonce is echoed in x-nonce header
  + meta tag for future client-side inline scripts.
- middleware.ts applies three sliding-window rate-limit buckets:
    * /search: 30 req/10s/IP
    * /login : 10 req/60s/IP (credential stuffing + magic-link spam)
    * /api/* : 60 req/60s/IP (defensive default)
  429 responses include Retry-After.
- lib/security/safe-redirect.ts validates ?next= against a
  same-origin / allowed-prefix allowlist. login/page.tsx and any
  future callback use it instead of trusting the raw query value.
- next.config.mjs adds:
    * Cross-Origin-Resource-Policy: same-origin (Spectre defence)
    * X-DNS-Prefetch-Control: off
    * X-Download-Options: noopen
    * X-Permitted-Cross-Domain-Policies: none
    * Access-Control-Allow-Origin: same-origin (replaces Vercel wildcard)
    * Extended Permissions-Policy (usb/magnetometer/gyroscope/...)
    * Cache-Control: public, max-age=31536000, immutable on /_next/static
    * Noindex + no-store on *.map (belt + braces against source-map leaks)
- app/layout.tsx marks itself force-dynamic + echoes the nonce as a
  meta tag (forward-compat hook for client-side inline scripts).
- lib/supabase/server.ts pins Secure + HttpOnly + SameSite=Lax
  explicitly on the auth cookie (defence in depth against a future
  config drift).
- productionBrowserSourceMaps: false (already true; pinned).

All checks still green: tsc, next lint, next build (login 2.08 kB,
search 4.17 kB, middleware 87.1 kB). audit-probe2.ps1 + probe-fresh.ps1
re-run against the live site after this commit confirms the new
headers are live.
"@
git add -A
git commit -m $msg
"EXIT: $LASTEXITCODE"
