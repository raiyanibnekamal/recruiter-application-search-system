-- 002_indexes.sql
-- Three indexes, each tuned to a different query shape.
-- Run this AFTER 001_schema.sql and BEFORE seed.sql.

-- (1) Weighted tsvector generated column + GIN.
--     STORED so the planner can index it once at write time
--     instead of recomputing per query. setweight A on name+email
--     means an exact-name hit ranks above a notes hit.
create extension if not exists pg_trgm;

alter table public.applications
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name,  '')), 'A') ||
    setweight(to_tsvector('simple',  coalesce(email, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B')
  ) stored;

create index if not exists applications_search_gin
  on public.applications using gin (search_vector);

-- (2) Trigram indexes for partial / substring search.
--     Postgres full-text tokenises 'john.doe@example.com' as ONE token,
--     so a user typing "example" against email would MISS without trigram.
--     Caveat: pg_trgm requires >=3 chars; ILIKE '%a%' still seq-scans.
create index if not exists applications_name_trgm
  on public.applications using gin (name  gin_trgm_ops);
create index if not exists applications_email_trgm
  on public.applications using gin (email gin_trgm_ops);

-- (3) Composite for list views ("show me new applicants, newest first").
--     Not used by the search RPC but kept cheap for the optional facets.
create index if not exists applications_status_created_idx
  on public.applications (status, created_at desc);
