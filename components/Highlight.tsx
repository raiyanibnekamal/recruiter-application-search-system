"use client";

// Highlight.tsx
// Client-side <mark> wrapping, driven by a SAFE query string. We do NOT
// use dangerouslySetInnerHTML for the server's ts_headline output
// without first passing it through sanitizeHeadline().
//
// sanitizeHeadline allows ONLY <mark>/</mark> through — everything else
// (other tags, attributes, javascript: URLs, broken unicode, control
// chars) is escaped or stripped. This is the canonical XSS wall between
// the Postgres ts_headline output and the DOM.

import { Fragment, type ReactNode } from "react";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/**
 * sanitizeHeadline — defense-in-depth XSS wall for ts_headline output.
 *
 * Approach:
 *   1. Strip control characters (U+0000..U+001F) except \t, \n, \r.
 *      Postgres can emit \x00 in ts_headline output under weird inputs.
 *   2. Strip ALL HTML tags except <mark> and </mark> via a strict
 *      allowlist regex (case-insensitive, no attributes allowed).
 *   3. Anything that survived step 2 (plain text + allowed marks) is
 *      safe to feed to dangerouslySetInnerHTML — there are no
 *      attributes, no script tags, no on* handlers.
 */
export function sanitizeHeadline(raw: string | null | undefined): string {
  if (!raw) return "";

  // 1. Drop control chars (except common whitespace).
  // eslint-disable-next-line no-control-regex
  const noControl = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 2. Split into segments. Anything that isn't <mark>/</mark> is plain
  //    text. We then HTML-escape the plain text and leave the marks
  //    untouched. This is more robust than "escape then un-escape
  //    <mark>" which can be defeated by weird quote/encoding tricks.
  const segments = noControl.split(/(<mark>|<\/mark>)/gi);

  return segments
    .map((seg) => {
      if (/^<\/?mark>$/i.test(seg)) return seg; // allowed tag, as-is
      return escapeHTML(seg); // everything else → escaped text
    })
    .join("");
}
