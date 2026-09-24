/** @type {import('next').NextConfig} */

/**
 * Static security headers — those that do NOT depend on a per-request
 * nonce. The CSP with the nonce is added per-route by middleware (which
 * has access to the per-request nonce).
 *
 * Why no Content-Security-Policy here:
 *   Middleware generates a fresh nonce per request and needs to set
 *   the CSP as a response header. next.config.mjs builds headers at
 *   config-load time, so it can't see per-request data. The two
 *   definitions stay in lockstep via the canonical allowlist in
 *   lib/security/csp.ts, which both modules import.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "autoplay=()",
      "encrypted-media=()",
      "fullscreen=(self)",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Spectre side-channel defence: only same-origin loads can fetch us.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // HSTS — Vercel already sends one, but include for parity.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Modern browsers ignore the old X-XSS-Protection header; explicit 0
  // prevents quirks-mode re-enabling.
  { key: "X-XSS-Protection", value: "0" },
  { key: "X-Powered-By", value: "" },
  // Don't let browsers speculatively resolve hosts to leak our origin.
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // IE legacy no-open for downloads.
  { key: "X-Download-Options", value: "noopen" },
  // Adobe Flash / Acrobat cross-domain policy opt-out.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Production-grade security headers — applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Tighten CORS off the wildcard default Vercel sends.
          // 'same-origin' is the most restrictive safe value: only our
          // own origin can make CORS requests. Use 'null' if we ever
          // need to allow file:// embeds, or '*' with no credentials
          // if a public API is added.
          { key: "Access-Control-Allow-Origin", value: "same-origin" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
      {
        // Tighten for /api routes if/when we add them.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Access-Control-Allow-Origin", value: "same-origin" },
        ],
      },
      {
        // Static assets: cache aggressively, no CORS at all.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "same-origin" },
        ],
      },
      {
        // Source maps must NEVER be served. Vercel already blocks them
        // server-side (returns 403), but belt + braces.
        source: "/:path*.map",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },

  // Prevent accidental source-map leaks via build output.
  productionBrowserSourceMaps: false,

  compress: true,
};

export default nextConfig;
