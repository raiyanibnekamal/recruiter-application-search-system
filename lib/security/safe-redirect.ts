// lib/security/safe-redirect.ts
//
// Hardens the `?next=` post-login redirect so attackers can't turn
// the magic-link / OAuth flow into an open redirect to a phishing
// page.
//
// Rule: only accept same-origin paths that begin with "/" and contain
// no protocol/host markers ("//evil.com", "/\evil.com", "https://...").
// Everything else falls back to "/search".

const ALLOWED_PREFIXES = ["/search", "/"]; // expand if/when more protected routes appear

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/search";
  // Decode once. If the user pastes a URL-encoded "//evil.com" we
  // catch it after decoding.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/search";
  }

  // Must start with "/" (a path). Anything starting with "//" is a
  // protocol-relative URL to another origin — reject.
  if (!decoded.startsWith("/")) return "/search";
  if (decoded.startsWith("//")) return "/search";
  // "/" itself is fine (no further checks needed), but a bare "/\\"
  // can be normalised by some browsers into a protocol-relative URL.
  if (decoded.startsWith("/\\")) return "/search";

  // Whitelist the prefixes we accept post-login.
  if (ALLOWED_PREFIXES.some((p) => decoded === p || decoded.startsWith(p + "/") || decoded.startsWith(p + "?"))) {
    return decoded;
  }

  // Fall back to /search.
  return "/search";
}
