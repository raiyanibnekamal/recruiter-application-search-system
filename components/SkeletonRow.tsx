"use client";

export function SkeletonRow() {
  return (
    <div
      role="status"
      aria-label="Loading result"
      className="flex items-start gap-4 border-b border-slate-100 px-2 py-4"
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:800px_100%] animate-shimmer" />
        <div className="h-3 w-1/2 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:800px_100%] animate-shimmer" />
        <div className="h-3 w-2/3 rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:800px_100%] animate-shimmer" />
      </div>
    </div>
  );
}
