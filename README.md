# Applications Search

> Live demo: **https://YOUR-VERCEL-URL.vercel.app** _(replace after deploy)_
> Submission folder (Google Drive, viewer-access): **https://drive.google.com/drive/folders/PASTE_ID_HERE** _(share before submitting)_
> Walkthrough video: `walkthrough.mp4` _(also in the Drive folder)_

A recruiter-grade search UI over a Supabase/Postgres `applications` table,
with weighted full-text search, trigram fallback, RLS-gated rows,
debounced input, and every UI state a hiring tool should have.

---

## 1. Problem & approach

Recruiters want to find an applicant by **name**, **email**, or a **note
phrase** ("Visa sponsorship", "Berlin, remote-only") without trawling
list views. The product constraints:

- Sub-200 ms feel on a few-thousand-row table.
- Graceful on partial input ("sadi", "rahman", "example.com").
- Resistant to a public visitor scraping rows by guessing common names.

Approach:

1. **One weighted `tsvector` generated column** that ranks name/email hits
   above notes hits. Single GIN index serves the fast path.
2. **Trigram indexes** on `name` and `email` for partial substrings that
   token-based full-text misses (e.g. `example.com` in an email).
3. **One Postgres RPC** (`search_applications`) that combines a
   `websearch_to_tsquery` and an `ilike '%…%'` predicate, ranks by
   `ts_rank_cd`, and returns `ts_headline` so we can highlight matches
   server-side without trusting HTML.
4. **Three layers of auth gating**: RLS, revoked anon grants on both
   RPCs, and an edge middleware redirect.
5. **UX**: debounce + AbortController, URL sync, Cmd/Ctrl+K, focus on
   mount, stale-while-revalidate skeletons, fuzzy fallback.

---

## 2. Schema

```sql
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  notes       text,
  status      text default 'new',
  created_at  timestamptz default now()
);
```

The search-relevant column is a **stored generated column** so it is
materialised at write time and the GIN index can index it directly:

```sql
alter table public.applications
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name,  '')), 'A') ||
    setweight(to_tsvector('simple',  coalesce(email, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) stored;
```

Two reasons for `stored`:

- GIN needs a real column it can index, not a sub-expression.
- `setweight` is computed once per write instead of once per query, which
  is the right cost balance for a read-heavy search workload.

The `simple` config on email avoids stemming `+` and `.` in
`john.doe+work@example.com`; the `english` config on name/notes gives
us Porter stemming for free.

---

## 3. Index choices

| Index                                      | Type             | Query it serves                          | Why                                                                                                                                  |
| ------------------------------------------ | ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `applications_search_gin`                  | GIN(tsvector)    | `search_vector @@ websearch_to_tsquery`  | Full-text search with weighted ranking; single index handles name/email/notes with `setweight` A/B.                                |
| `applications_name_trgm`                   | GIN(trgm)        | `name ilike '%q%'` (len ≥ 3)             | `john.doe@example.com` tokenises as ONE token; trigram is the only way to match the substring `example`.                            |
| `applications_email_trgm`                  | GIN(trgm)        | `email ilike '%q%'` (len ≥ 3)            | Same reason. Bonus: powers case-insensitive partial lookup.                                                                          |
| `applications_status_created_idx`          | B-tree composite | list views (`where status='new' order by created_at desc`) | Not used by the search RPC; included for the optional status facets so they don't seq-scan.                                         |

---

## 4. Query plan evidence

Captured in `assets/explain-before.txt` (indexes dropped) and
`assets/explain-after.txt` (indexes restored). Both produced by
running `supabase/bench.sql`, which inflates the table to ~200k rows
inside a `begin…rollback` so nothing persists on the demo database.

Illustrative numbers (replace with your captured run):

| Query type              | Plan                                | Time (after) | Time (before) |
| ----------------------- | ----------------------------------- | ------------ | ------------- |
| `websearch_to_tsquery('postgres developer')` | Bitmap Index Scan on `applications_search_gin` | ~1.8 ms | ~410 ms (seq scan) |
| `enable_seqscan = off` (same query)         | Bitmap Index Scan (planner-confirmed) | ~1.9 ms | n/a |
| `name ilike '%sadia%'`                     | Bitmap Index Scan on `applications_name_trgm`  | ~2.4 ms | ~380 ms (seq scan) |
| `name ilike '%a%'`                         | Parallel Seq Scan (unavoidable)      | ~310 ms  | ~310 ms |

The last row is the honest answer to "why didn't the index help?" —
pg_trgm needs ≥3 characters, so `%a%` cannot use any of our indexes.
Documented in §5.

---

## 5. Limitations

- **Trigram needs ≥ 3 chars.** `ILIKE '%a%'` still seq-scans. For one-
  char prefix search, look at `pg_trgm` with a stricter similarity
  threshold (`similarity(name, 'a') > 0.7`) or prefilter on a known
  first letter.
- **Email tokenisation.** `to_tsvector('simple', email)` keeps the
  whole address as one token, which is why trigram is mandatory if
  you want `example.com` to match.
- **`OFFSET` pagination.** Linear in `OFFSET`. Fine at a few thousand
  rows; bad at 10M. See §6.
- **ts_headline XSS.** The server output looks like HTML; we sanitise
  through `sanitizeHeadline` before `dangerouslySetInnerHTML`. The
  alternative — client-side highlighting — is what `Highlight.tsx`
  does for `name` and `email`, so we never trust the server HTML.

---

## 6. What I'd do at 10M rows

- **Keyset pagination.** Replace `OFFSET` with `WHERE (rank, id) < (last_rank, last_id)`.
  Constant-time regardless of depth. Worth wiring into the RPC as a
  second overload.
- **Partial indexes.** If most queries are `status='new'`, a partial
  GIN on `WHERE status='new'` is smaller and faster.
- **External search.** For > 1M rows with sub-50 ms latency, hand the
  index over to **Meilisearch** or **Typesense** and use Postgres as
  the source of truth. The RPC contract is small enough to migrate
  behind a thin client wrapper.
- **Hot row caching.** Cache the top 20 results for popular queries
  (Redis, 60 s TTL) — recruiter queries are bursty on the same terms.
- **Async reindex.** Generated columns re-tokenise on every UPDATE to
  `notes`. For heavy write paths, split the column into a write-time
  trigger that writes to a sidecar tsvector table, then back-fill.

---

## 7. How to run locally + submission

### Local

```bash
# 1. Install
npm install

# 2. Env
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Apply schema (run in Supabase SQL editor or via psql)
psql "$DATABASE_URL" -f supabase/migrations/001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/002_indexes.sql
psql "$DATABASE_URL" -f supabase/migrations/003_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/004_search_fn.sql

# 4. Seed
psql "$DATABASE_URL" -f supabase/seed.sql

# 5. Run
npm run dev
# open http://localhost:3000 → /login → magic link → /search
```

### Proof: anon cannot read

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/applications?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
# → []
```

### Deploy to Vercel

```bash
vercel                 # first run, link to your Vercel project
vercel --prod          # production deploy
# then add the two NEXT_PUBLIC_SUPABASE_* env vars in the Vercel UI
```

### Submit to Google Drive

1. Zip the project (no `node_modules`, no `.next`, no `.env.local`).
2. Upload to Google Drive.
3. Right-click → **Share** → **Anyone with the link** → **Viewer**.
4. Paste the URL at the top of this README and in the walkthrough
   intro.

> ⚠️ Never upload `.env.local`, the Supabase `service_role` key, or any
> DB connection string. Only `.env.example` belongs in the zip.

### Walkthrough

See `walkthrough-script.md` for the ≤5-minute script. Record and save
as `walkthrough.mp4` next to this README (and in the Drive folder).
