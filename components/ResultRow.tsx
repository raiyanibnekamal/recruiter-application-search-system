"use client";

import { sanitizeHeadline, Highlight } from "./Highlight";
import type { SearchRow } from "@/lib/supabase/client";

export function ResultRow({
  row,
  query,
  active,
  index,
  onHover,
  onActivate,
}: {
  row: SearchRow;
  query: string;
  active: boolean;
  index: number;
  onHover: (i: number) => void;
  onActivate: (row: SearchRow) => void;
}) {
  const safeHeadline = sanitizeHeadline(row.headline);
  return (
    <li
      role="option"
      aria-selected={active}
      data-index={index}
      onMouseEnter={() => onHover(index)}
      onClick={() => onActivate(row)}
      className={
        "cursor-pointer border-b border-slate-100 px-2 py-3 transition " +
        (active ? "bg-accent/5" : "hover:bg-slate-50")
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-medium text-ink">
          <Highlight text={row.name} query={query} />
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-xs " +
            (row.matched_on === "fulltext"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700")
          }
          title={row.matched_on === "fulltext" ? "Full-text match" : "Substring fallback"}
        >
          {row.matched_on}
        </span>
      </div>
      <div className="mt-0.5 text-sm text-muted">
        <Highlight text={row.email} query={query} />
      </div>
      {safeHeadline ? (
        <div
          className="prose prose-sm mt-2 max-w-none text-sm leading-relaxed text-slate-700"
          // safeHeadline is server-built, sanitized to <mark> + text only.
          dangerouslySetInnerHTML={{ __html: safeHeadline }}
        />
      ) : null}
    </li>
  );
}
