"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, type SearchRow, type FuzzyRow } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchInput } from "@/components/SearchInput";
import { ResultRow } from "@/components/ResultRow";
import { SkeletonRow } from "@/components/SkeletonRow";
import { EmptyState, IdleState, ErrorState } from "@/components/EmptyState";

type State =
  | { kind: "idle" }
  | { kind: "loading"; prevRows: SearchRow[] }
  | { kind: "results"; rows: SearchRow[]; total?: number }
  | { kind: "empty"; q: string }
  | { kind: "error"; msg: string };

const RECENT_KEY = "recentSearches.v1";
const MAX_RECENT = 6;

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const debounced = useDebounce(q, 300);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  // URL sync (?q=…). Keeps the back button honest.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (debounced) url.searchParams.set("q", debounced);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, [debounced]);

  // Cmd/Ctrl+K focuses the input from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The actual RPC. Wrap in try/finally so the AbortController is
  // aborted on cleanup, superseding any in-flight request.
  const runSearch = useCallback(async (query: string, signal: AbortSignal) => {
    const { data, error } = await supabase.rpc("search_applications", {
      q: query,
      lim: 20,
      off: 0,
    }).abortSignal(signal);
    return { data: (data ?? []) as SearchRow[], error };
  }, []);

  const persistRecent = useCallback((term: string) => {
    setRecent((prev) => {
      const next = [term, ...prev.filter((p) => p !== term)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setState({ kind: "idle" });
      return;
    }

    const ac = new AbortController();
    setState((prev) => ({
      kind: "loading",
      prevRows: prev.kind === "results" ? prev.rows : [],
    }));

    runSearch(term, ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return;
        if (error) {
          setState({ kind: "error", msg: error.message });
          return;
        }
        if (data.length === 0) {
          setState({ kind: "empty", q: term });
          return;
        }
        setState({ kind: "results", rows: data });
        setActiveIndex(0);
        persistRecent(term);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "AbortError"
        ) {
          return;
        }
        const msg = (err as { message?: string })?.message ?? "Search failed";
        setState({ kind: "error", msg });
      });

    return () => ac.abort();
  }, [debounced, persistRecent, runSearch]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (state.kind !== "results") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, state.rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = state.rows[activeIndex];
      if (row) window.location.href = `mailto:${row.email}`;
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function onRetry() {
    setQ((v) => v + " ");
    setTimeout(() => setQ((v) => v.trimEnd()), 0);
  }

  async function runFuzzy() {
    if (state.kind !== "empty") return;
    const ac = new AbortController();
    setState((prev) => ({
      kind: "loading",
      prevRows: prev.kind === "results" ? prev.rows : [],
    }));
    const { data, error } = await supabase.rpc("search_applications_fuzzy", {
      q: state.q,
      lim: 10,
    }).abortSignal(ac.signal);
    if (ac.signal.aborted) return;
    if (error) {
      setState({ kind: "error", msg: error.message });
      return;
    }
    const rows = (data ?? []) as FuzzyRow[] as unknown as SearchRow[];
    if (rows.length === 0) {
      setState({ kind: "empty", q: state.q });
      return;
    }
    setState({ kind: "results", rows });
    setActiveIndex(0);
  }

  const loading = state.kind === "loading";
  const typing = q.trim().length > 0 && q.trim() !== debounced.trim();

  const headerCount = useMemo(() => {
    if (state.kind === "results") return `Showing ${state.rows.length} of ${state.rows.length}`;
    if (state.kind === "empty") return "No results";
    if (state.kind === "error") return "Error";
    return "Ready";
  }, [state]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Applications Search</h1>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </header>

      <SearchInput
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onInputKey}
        loading={typing}
      />

      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>{headerCount}</span>
        <span>Debounced 300 ms · min 2 chars</span>
      </div>

      <section className="mt-4">
        {state.kind === "idle" && (
          <IdleState>
            Search by name, email, or note text.{" "}
            {recent.length > 0 && (
              <>
                Recent:{" "}
                {recent.map((r) => (
                  <button
                    key={r}
                    className="ml-1 underline hover:text-ink"
                    onClick={() => setQ(r)}
                  >
                    {r}
                  </button>
                ))}
              </>
            )}
          </IdleState>
        )}

        {state.kind === "loading" && (
          <ul className="divide-y divide-slate-100" aria-busy="true">
            {state.prevRows.length > 0 ? (
              <div className="opacity-40 transition">
                {state.prevRows.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-slate-100 px-2 py-3"
                  >
                    <div className="font-medium text-ink">{r.name}</div>
                    <div className="text-sm text-muted">{r.email}</div>
                  </li>
                ))}
              </div>
            ) : (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            )}
          </ul>
        )}

        {state.kind === "results" && (
          <ul
            role="listbox"
            aria-label="Search results"
            className="rounded-xl border border-slate-100"
          >
            {state.rows.map((row, i) => (
              <ResultRow
                key={row.id}
                row={row}
                query={debounced}
                index={i}
                active={i === activeIndex}
                onHover={setActiveIndex}
                onActivate={(r) => (window.location.href = `mailto:${r.email}`)}
              />
            ))}
          </ul>
        )}

        {state.kind === "empty" && (
          <EmptyState query={state.q} onFuzzy={runFuzzy} loading={loading} />
        )}

        {state.kind === "error" && (
          <ErrorState message={state.msg} onRetry={onRetry} />
        )}
      </section>

      <footer className="mt-12 text-center text-xs text-muted">
        Press{" "}
        <kbd className="rounded border border-slate-300 bg-white px-1">Cmd/Ctrl</kbd> +{" "}
        <kbd className="rounded border border-slate-300 bg-white px-1">K</kbd> to focus search.
      </footer>
    </main>
  );
}

export default function SearchPage() {
  // useSearchParams requires a Suspense boundary, which also opts the
  // route out of static prerender — exactly what we want.
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl px-4 py-10" />}>
      <SearchInner />
    </Suspense>
  );
}
