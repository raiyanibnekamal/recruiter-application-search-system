import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or you don&rsquo;t
          have access to it.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
        >
          Go to search
        </Link>
      </div>
    </main>
  );
}
