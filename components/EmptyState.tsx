"use client";

import { type ReactNode } from "react";

export function EmptyState({
  query,
  onFuzzy,
  loading,
}: {
  query: string;
  onFuzzy: () => void;
  loading: boolean;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-ink">No matches for “{query}”</h3>
      <p className="mt-2 text-sm text-muted">
        Try a different spelling, fewer words, or fall back to a fuzzy search that
        tolerates typos.
      </p>
      <button
        onClick={onFuzzy}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Searching…" : "Try fuzzy search"}
      </button>
    </div>
  );
}

export function IdleState({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <h3 className="text-base font-medium text-ink">Start typing…</h3>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
      <h3 className="text-base font-semibold text-rose-700">Search failed</h3>
      <p className="mt-1 text-sm text-rose-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
      >
        Retry
      </button>
    </div>
  );
}
