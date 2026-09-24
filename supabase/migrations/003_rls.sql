-- 003_rls.sql
-- Auth gating layer 1: row-level security. anon has NO policy,
-- so any direct REST/GQL access from the anon key returns [].
-- The middleware (layer 3) blocks the page route, and the RPC
-- grants in 004_search_fn.sql revoke anon at the function level
-- (layer 2). Three layers, one goal: no scrape surface.

alter table public.applications enable row level security;

drop policy if exists "read for authenticated only" on public.applications;
create policy "read for authenticated only"
  on public.applications
  for select
  to authenticated
  using (true);

-- Inserts/updates/deletes are intentionally NOT granted. A recruiter
-- dashboard might add an admin policy here later, but for this
-- take-home the table is read-only for authenticated users.
