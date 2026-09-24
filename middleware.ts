// middleware.ts
// Auth gating layer 3 + lightweight rate limiting.
//
// Edge middleware checks the Supabase session cookie on every /search
// request and bounces to /login if missing. RLS (layer 1) and the
// revoked anon grants (layer 2) already prevent data leaks — middleware
// is the UX gate.
//
// Rate limit: a single in-memory sliding window per IP, scoped to the
// edge runtime. Vercel's edge runtime gives us a short-lived cache per
// POP, so this is best-effort — for production you'd swap this for
// Upstash / Redis. It's still good enough to defang a brute-force
// script that hammers /search.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED = ["/search"];
const WINDOW_MS = 10_000; // 10 seconds
const MAX_REQS = 30;      // 30 requests per 10s per IP — generous for typing, blocks scrapers

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory sliding window. On Vercel this lives in the edge function
// instance; it's not durable across cold starts but it's enough to
// blunt a tight loop from a single attacker.
const buckets = new Map<string, Bucket>();

function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= MAX_REQS) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

// Best-effort client IP. Vercel sets x-forwarded-for; fall back to
// x-real-ip, then a constant so the limiter still works in dev.
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next({ request: { headers: req.headers } });

  // Apply rate limit only to protected routes (login is already gated
  // by Supabase's own abuse protection + email flow).
  const ip = clientIp(req);
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": String(rl.retryAfter ?? 10),
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Fail loud in dev; fail closed in prod by bouncing to /login.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
    }
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

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
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  return res;
}

export const config = {
  // Match everything except static assets and the auth callback.
  matcher: ["/((?!_next/|favicon.ico|api/auth/).*)"],
};
