// lib/supabase/client.ts
// Browser-side Supabase client. Uses @supabase/ssr so cookies are
// hydrated for the same middleware that gates /search.
//
// Lazy-init: instantiating at module top level throws at Next.js
// build / prerender time when env vars are absent (a fresh clone
// with only .env.example present). The getter below creates the
// client on first call, so the module itself is safe to import
// during static analysis.
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Copy .env.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _client = createBrowserClient(url, key);
  return _client;
}

// Convenience proxy so call sites can keep using `supabase.rpc(...)`
// without rewriting every file.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type SearchRow = {
  id: string;
  name: string;
  email: string;
  notes: string | null;
  rank: number | null;
  headline: string | null;
  matched_on: "fulltext" | "substring";
};

export type FuzzyRow = {
  id: string;
  name: string;
  email: string;
  notes: string | null;
  similarity: number | null;
  headline: string | null;
};
