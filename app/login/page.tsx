"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// Force dynamic: login is interactive and varies per visitor.
export const dynamic = "force-dynamic";

type Mode = "password" | "magic";
type AuthKind = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [kind, setKind] = useState<AuthKind>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase env vars missing. Copy .env.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    return createBrowserClient(url, key);
  }

  function nextPath() {
    if (typeof window === "undefined") return "/search";
    return new URL(window.location.href).searchParams.get("next") ?? "/search";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = getSupabase();

      if (mode === "magic") {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${siteUrl}${nextPath()}` },
        });
        if (error) setError(error.message);
        else setInfo(`Magic link sent to ${email}. Check your inbox.`);
      } else {
        if (kind === "signup") {
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${siteUrl}${nextPath()}` },
          });
          if (error) {
            setError(error.message);
          } else {
            setInfo(
              "Account created. If your project requires email confirmation, check your inbox — otherwise you're signed in."
            );
            // Most demo projects have confirm-email disabled; in that
            // case Supabase returns a session immediately and we can
            // just route the user straight to /search.
            const { data } = await supabase.auth.getSession();
            if (data.session) router.replace(nextPath());
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            setError(error.message);
          } else {
            router.replace(nextPath());
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    !!email &&
    (mode === "magic" || password.length >= 6);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Recruiter sign-in</h1>
        <p className="mt-2 text-sm text-muted">
          Access is gated by RLS — only authenticated recruiters can read
          applicant rows. Anonymous keys return{" "}
          <code className="rounded bg-slate-100 px-1">[]</code>.
        </p>

        {/* Mode tabs: password vs magic link */}
        <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(null); setInfo(null); }}
            className={
              "rounded-md px-3 py-1.5 transition " +
              (mode === "password"
                ? "bg-white text-ink shadow"
                : "text-muted hover:text-ink")
            }
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(null); setInfo(null); }}
            className={
              "rounded-md px-3 py-1.5 transition " +
              (mode === "magic"
                ? "bg-white text-ink shadow"
                : "text-muted hover:text-ink")
            }
          >
            Magic link
          </button>
        </div>

        {/* Sign-in / sign-up toggle (password mode only) */}
        {mode === "password" && (
          <div className="mt-4 text-sm text-muted">
            {kind === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => { setKind("signup"); setError(null); setInfo(null); }}
                  className="font-medium text-accent hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setKind("signin"); setError(null); setInfo(null); }}
                  className="font-medium text-accent hover:underline"
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-ink" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />

          {mode === "password" && (
            <>
              <label
                className="block text-sm font-medium text-ink"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 6 characters"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </>
          )}

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-emerald-700" role="status">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Working…"
              : mode === "magic"
              ? "Send magic link"
              : kind === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          By signing in you confirm you&rsquo;re authorised to view applicant
          data under your organisation&rsquo;s policy.
        </p>
      </div>
    </main>
  );
}
