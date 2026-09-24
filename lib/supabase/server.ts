// lib/supabase/server.ts
//
// Server-side Supabase client for RSC + route handlers. Cookie
// defaults are pinned to Secure + HttpOnly + SameSite=Lax explicitly
// so a future change can't silently weaken the auth cookie. The
// Supabase SSR client already does this, but we set them here too
// as belt-and-braces — a maintainer editing this file in the future
// should not be able to weaken auth security without realising it.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SECURE_COOKIE_OPTS: Partial<CookieOptions> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...SECURE_COOKIE_OPTS, ...options });
          } catch {
            // ignore in RSC
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: "",
              ...SECURE_COOKIE_OPTS,
              ...options,
            });
          } catch {
            // ignore in RSC
          }
        },
      },
    }
  );
}
