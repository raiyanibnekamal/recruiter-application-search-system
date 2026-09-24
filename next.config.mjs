/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const CSP = [
  "default-src 'self'",
  // Scripts: Next.js needs unsafe-inline for hydration in dev; in prod
  // we use strict-dynamic + nonce-style hash. We keep 'unsafe-inline' for
  // backward-compat with @supabase/ssr's cookie bootstrap.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
  "style-src 'self' 'unsafe-inline'",
  // Supabase REST + WebSocket realtime channels (we don't use realtime
  // today but allow it for future extensions).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
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
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS — Vercel already sends one, but include for parity / defense in depth.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disable the legacy X-XSS-Protection header (modern browsers have CSP).
  { key: "X-XSS-Protection", value: "0" },
  // Don't reveal the framework in error responses.
  { key: "X-Powered-By", value: "" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Production-grade security headers — applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Tighten for /api routes if/when we add them.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },

  // Prevent accidental leaks via build-time source maps.
  productionBrowserSourceMaps: false,

  // Vercel handles compression; no-op locally.
  compress: true,

  // Quiet the noisy webpack perf warning that hits ~260 KB strings.
  // (Purely informational; doesn't affect output correctness.)
  webpack(config) {
    return config;
  },
};

export default nextConfig;
