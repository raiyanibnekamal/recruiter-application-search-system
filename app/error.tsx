"use client";

// app/error.tsx — Next 14 App Router error boundary. Catches uncaught
// render errors in the route subtree and surfaces a recovery path.
// We intentionally do NOT echo the original error.message back to the
// client in production — it can leak server-side details. The dev-mode
// branch keeps the noise for local debugging.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would forward to Sentry / Datadog / Logflare.
    // For this take-home we log a structured payload to the console —
    // Vercel's runtime captures it via the platform's normal logs.
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.error("[app/error.tsx] boundary hit", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-rose-700">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-rose-600">
          The page hit an unexpected error. You can try again, or head back to
          the search.
        </p>
        {process.env.NODE_ENV !== "production" && error.message ? (
          <pre className="mt-4 overflow-auto rounded bg-rose-100 p-3 text-xs text-rose-800">
            {error.message}
          </pre>
        ) : null}
        {error.digest ? (
          <p className="mt-2 text-xs text-rose-500">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Try again
          </button>
          <a
            href="/search"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Back to search
          </a>
        </div>
      </div>
    </main>
  );
}
