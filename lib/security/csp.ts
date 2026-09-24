// lib/security/csp.ts
//
// Single source of truth for the Content-Security-Policy directive
// list. Both the edge middleware (which sets the per-response CSP
// with a fresh nonce) and any debug-time tooling import from here so
// we can never drift between the policy and the headers we ship.
//
// Why no `unsafe-inline` for scripts:
//   The codebase doesn't use eval, JSONP, or inline event handlers.
//   Next.js injects one inline runtime script for hydration; we
//   allowlist it via 'strict-dynamic' + a per-request nonce set in
//   middleware.ts.
//
// Why we still allow `unsafe-inline` for styles:
//   Next.js emits inline <style> tags for SSR-critical CSS and
//   Tailwind's JIT classes. Hashing them all on the server is
//   impractical, and shipping a single large CSS bundle has its own
//   trade-offs (no SSR critical-CSS extraction). Style injection is
//   a much narrower attack surface than script injection — no event
//   handlers, no JS execution path.

export const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // script-src is filled with the nonce at build time below.
  "script-src 'self' 'strict-dynamic' __NONCE__ https://*.supabase.co",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "media-src 'self'",
  "upgrade-insecure-requests",
];

/**
 * Build a CSP header value with the given nonce baked into the
 * script-src directive. The nonce should be a freshly-generated
 * base64-or-hex string; it must not be reused across requests.
 *
 * Throws if the nonce contains characters that would break the
 * directive (quotes, semicolons, whitespace, angle brackets).
 */
export function buildCsp(nonce: string): string {
  assertSafeNonce(nonce);
  return CSP_DIRECTIVES.map((d) =>
    d === "script-src 'self' 'strict-dynamic' __NONCE__ https://*.supabase.co"
      ? `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https://*.supabase.co`
      : d
  ).join("; ");
}

function assertSafeNonce(nonce: string): void {
  if (!nonce) throw new Error("CSP nonce is empty");
  // RFC 7230 token chars plus base64 url-safe alphabet. CSP nonces
  // additionally forbid quotes, semicolons, and whitespace.
  if (nonce.length > 128) {
    throw new Error(`CSP nonce too long: ${nonce.length}`);
  }
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(nonce)) {
    throw new Error(`CSP nonce contains illegal characters: ${nonce}`);
  }
}

/**
 * Generate a fresh 128-bit nonce, base64-url encoded. Used by the
 * edge middleware. We deliberately avoid Node's `crypto` module here
 * because the edge runtime exposes a different API surface — instead
 * we use Web Crypto which works in both runtimes.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64url (no padding).
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
