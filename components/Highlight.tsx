"use client";

// Highlight.tsx
// Client-side <mark> wrapping, driven by a SAFE query string. We do NOT
// use dangerouslySetInnerHTML for the server's ts_headline output; that
// could ship attacker-controlled fragments. Instead we tokenize the
// query, escape everything, and build React nodes.

import { Fragment, type ReactNode } from "react";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

export function Highlight({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!text) return <span className={className}>{text}</span>;

  const q = query.trim();
  if (!q) return <span className={className}>{text}</span>;

  // Word-boundary aware: split query on whitespace, escape each, join |.
  const parts = q
    .split(/\s+/)
    .filter((p) => p.length >= 2)
    .map(escapeRegex);

  if (parts.length === 0) return <span className={className}>{text}</span>;

  const re = new RegExp(`(${parts.join("|")})`, "gi");
  const pieces = text.split(re);

  return (
    <span className={className}>
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-yellow-200 px-0.5 text-ink"
          >
            {piece}
          </mark>
        ) : (
          <Fragment key={i}>{piece}</Fragment>
        )
      )}
    </span>
  );
}

// Use this when you DO need to render <mark> tags that came from the
// server (ts_headline). It strips everything but <mark> tags first.
export function sanitizeHeadline(raw: string | null | undefined): string {
  if (!raw) return "";
  // Defense-in-depth: HTML-escape, then re-allow ONLY <mark>/</mark>.
  const escaped = escapeHTML(raw);
  return escaped
    .replace(/<mark>/g, "<mark>")
    .replace(/<\/mark>/g, "</mark>");
}
