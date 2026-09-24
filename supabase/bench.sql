-- bench.sql
-- Performance evidence. WRAP THIS IN A TRANSACTION YOU ROLL BACK.
-- Inflating the table to ~200k rows and forgetting to roll back
-- leaves "Bench User" rows visible in the live demo's search.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/bench.sql > assets/explain-after.txt
-- Then to capture "before" numbers, run the same file but with the
-- two CREATE INDEX statements in 002_indexes.sql commented out (or
-- run DROP INDEX first), capture into assets/explain-before.txt.

begin;

-- 1) Inflate.
insert into public.applications (name, email, notes)
select
  'Bench User ' || i,
  'bench' || i || '@ex.com',
  'lorem ipsum dolor sit amet ' || i
from generate_series(1, 200000) as i;

analyze public.applications;

-- 2a) Full-text with GIN.
explain (analyze, buffers)
select id, name from public.applications
where search_vector @@ websearch_to_tsquery('english', 'postgres developer')
limit 20;

-- 2b) Same query with enable_seqscan=off to compare planner estimates.
set local enable_seqscan = off;
explain (analyze, buffers)
select id, name from public.applications
where search_vector @@ websearch_to_tsquery('english', 'postgres developer')
limit 20;
reset enable_seqscan;

-- 2c) ILIKE '%sadia%' (>=3 chars, trigram path).
explain (analyze, buffers)
select id, name from public.applications
where name ilike '%sadia%' limit 20;

-- 2d) ILIKE '%a%' — short pattern, trigram cannot help. Document the
-- unavoidable seq scan; this is the honest answer to "why is it slow?"
explain (analyze, buffers)
select id, name from public.applications
where name ilike '%a%' limit 20;

rollback;
