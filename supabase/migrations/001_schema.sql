-- 001_schema.sql
-- Bare table only. Indexes / RLS / RPCs live in their own files
-- so migrations stay reviewable and rollback-friendly.

create extension if not exists "pgcrypto";

create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  notes       text,
  status      text default 'new',
  created_at  timestamptz default now()
);

comment on table  public.applications is 'Job applications submitted by candidates; searchable by recruiters.';
comment on column public.applications.status  is 'Free-form pipeline stage: new | shortlisted | rejected | hired.';
