-- 004_search_fn.sql
-- Two RPCs. BOTH must revoke anon + grant authenticated, otherwise
-- a forgotten grant on the fuzzy RPC becomes an open scrape door.

-- ─── Primary: websearch + ilike fallback, ranked, with ts_headline ───
create or replace function public.search_applications(
  q   text,
  lim int default 20,
  off int default 0
)
returns table (
  id uuid, name text, email text, notes text,
  rank real, headline text, matched_on text
)
language sql
stable
security invoker                 -- RLS still applies; critical.
as $$
  with p as (
    select websearch_to_tsquery('english', q) as tsq,
           '%' || q || '%'                     as pat
  )
  select
    a.id, a.name, a.email, a.notes,
    ts_rank_cd(a.search_vector, p.tsq, 32)::real                        as rank,
    ts_headline(
      'english',
      coalesce(a.notes, ''),
      p.tsq,
      'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MinWords=5,MaxWords=20'
    )                                                                  as headline,
    case
      when a.search_vector @@ p.tsq then 'fulltext'
      else 'substring'
    end                                                                as matched_on
  from public.applications a, p
  where a.search_vector @@ p.tsq
     or a.name  ilike p.pat
     or a.email ilike p.pat
  order by rank desc nulls last, a.created_at desc
  limit lim offset off;
$$;

revoke execute on function public.search_applications(text, int, int) from public, anon;
grant  execute on function public.search_applications(text, int, int) to authenticated;

-- ─── Fuzzy fallback: used when primary returns 0 rows ───
create or replace function public.search_applications_fuzzy(
  q   text,
  lim int default 10
)
returns table (
  id uuid, name text, email text, notes text,
  similarity real, headline text
)
language sql
stable
security invoker
as $$
  select
    a.id, a.name, a.email, a.notes,
    similarity(a.name, q)::real         as similarity,
    ts_headline(
      'english',
      coalesce(a.notes, ''),
      plainto_tsquery('english', q),
      'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MinWords=5,MaxWords=20'
    )                                   as headline
  from public.applications a
  where similarity(a.name, q) > 0.3
     or similarity(a.email, q) > 0.3
  order by greatest(similarity(a.name, q), similarity(a.email, q)) desc
  limit lim;
$$;

revoke execute on function public.search_applications_fuzzy(text, int) from public, anon;
grant  execute on function public.search_applications_fuzzy(text, int) to authenticated;
