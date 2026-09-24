// middleware.ts
// Auth gating layer 3 + lightweight rate limiting + per-request CSP nonce.
//
// Edge middleware:
//   1. Validates the Supabase session cookie on every /search request
//      and bounces to /login if missing. RLS (layer 1) and the revoked
//      anon grants (layer 2) already prevent data leaks — middleware
//      is the UX gate.
//   2. Applies an in-memory sliding-window rate limit:
//        * /search    : 30 req / 10s / IP
//        * /login     : 10 req / 60s / IP  (defends brute-force / magic-link spam)
//        * /api/*     : 60 req / 60s / IP  (defensive default if/when added)
//      The edge runtime gives us a short-lived cache per POP, so this
//      is best-effort; for production you'd swap for Upstash / Redis.
//   3. Generates a fresh CSP nonce per request and ships a strict
//      Content-Security-Policy header so we no longer need
//      'unsafe-inline' / 'unsafe-eval' on script-src.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { buildCsp, generateNonce } from "@/lib/security/csp";

// ─── Rate limit buckets ────────────────────────────────────────────────

const WINDOW_MS = 10_000;       // 10 seconds for /search
const WINDOW_MS_AUTH = 60_000;  // 60 seconds for /login + /api
const MAX_REQS_SEARCH = 30;     // generous for typing, blocks scrapers
const MAX_REQS_LOGIN = 10;      // throttles credential stuffing + magic-link spam
const MAX_REQS_API = 60;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded across long-lived
// edge instances. The interval is per-process — Vercel cold-starts wipe
// state anyway, so this is just hygiene.
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();
function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, v] of buckets.entries()) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter?: number; remaining?: number } {
  const now = Date.now();
  maybeCleanup(now);
  const key = `${ip}|${windowMs}`;
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

function isProtected(pathname: string): boolean {
  return pathname === "/search" || pathname.startsWith("/search/");
}

function isLogin(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

// ─── Per-request CSP ──────────────────────────────────────────────────

function applyCsp(res: NextResponse, nonce: string): void {
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  // Echo the nonce in a request header so the page can read it if it
  // ever needs to inline its own scripts (it shouldn't — Next's
  // hydration tag uses the same nonce via the response header).
  res.headers.set("x-nonce", nonce);
}

// ─── Main middleware ──────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const ip = clientIp(req);

  // Rate limit: /search (already auth-gated, but defends authenticated
  // users from session-replay floods too).
  if (isProtected(pathname)) {
    const rl = rateLimit(ip, MAX_REQS_SEARCH, WINDOW_MS);
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter ?? 10),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  }

  // Rate limit: /login. Prevents credential stuffing + magic-link spam.
  if (isLogin(pathname)) {
    const rl = rateLimit(ip, MAX_REQS_LOGIN, WINDOW_MS_AUTH);
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter ?? 60),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  }

  // Rate limit: /api/* (defensive default).
  if (isApi(pathname)) {
    const rl = rateLimit(ip, MAX_REQS_API, WINDOW_MS_AUTH);
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter ?? 60),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  }

  // Generate a per-request nonce for CSP. Done BEFORE auth so even
  // rejected requests get a strict CSP (defense in depth — no path
  // serves an inline script).
  const nonce = generateNonce();

  // Non-protected + non-login paths: skip Supabase session check, but
  // still apply the CSP.
  if (!isProtected(pathname)) {
    const res = NextResponse.next({
      request: { headers: req.headers },
    });
    applyCsp(res, nonce);
    return res;
  }

  // /search path: validate session.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail loud in dev; fail closed in prod by bouncing to /login.
    if (process.env.NODE_ENV === "production") {
      const failRes = NextResponse.redirect(new URL("/login", req.url), {
        status: 303,
      });
      applyCsp(failRes, nonce);
      return failRes;
    }
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  // Forward nonce to downstream renders via a request header.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // getUser() validates the JWT against Supabase Auth, not just the cookie.
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + (search ?? ""));
    const redirectRes = NextResponse.redirect(loginUrl, { status: 303 });
    applyCsp(redirectRes, nonce);
    return redirectRes;
  }

  applyCsp(res, nonce);
  return res;
}

export const config = {
  // Match everything except static assets, favicon, and the auth
  // callback. The middleware handles its own path-based routing.
  matcher: ["/((?!_next/|favicon.ico|api/auth/).*)"],
};
