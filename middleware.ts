// middleware.ts
// Auth gating layer 3. Edge middleware checks the Supabase session
// cookie on every /search request and bounces to /login if missing.
// RLS (layer 1) and the revoked anon grants (layer 2) already
// prevent data leaks — middleware is the UX gate.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED = ["/search"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next({ request: { headers: req.headers } });

  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

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
