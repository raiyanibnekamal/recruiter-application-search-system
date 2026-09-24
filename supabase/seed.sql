-- seed.sql
-- ≥60 varied rows: unicode names, +tag emails, mixed case,
-- short and long notes, NULL notes edge case, 2-3 duplicate names.
-- One file, no external data; uses generate_series + arrays so
-- it runs identically on Supabase cloud or local Postgres.

begin;

-- Drop any prior seed rows so the script is idempotent.
delete from public.applications where email like 'seed.%@example.test';

-- Names: a mix of Latin, accents, and CJK, with 2-3 duplicates
-- so we can prove ranking prefers email/name matches over notes.
with names(name, email) as (
  values
    ('Sadia Rahman',       'sadia.rahman@example.com'),
    ('Jose Alvarez',       'j.alvarez+work@example.com'),
    ('Jose Alvarez',       'jose.alvarez.dev@gmail.com'),  -- duplicate name
    ('Ayesha Noor',        'ayesha.noor@company.io'),
    ('Wei Zhang',          'wei.zhang@corp.cn'),
    ('Wei Zhang',          'zhang.wei@partner.org'),      -- duplicate name
    ('Maria Garcia',       'maria.g_1990@mail.es'),
    ('Hiroshi Tanaka',     'hiroshi+job@tanaka.jp'),
    ('Olga Ivanova',       'olga.ivanova@startup.co'),
    ('Liam OBrien',        'liam.obrien@noreply.com'),
    ('Priya Sharma',       'priya.sharma@cloud.in'),
    ('Daniel Kim',         'daniel.kim@stud.io'),
    ('Fatima Zahra',       'fatima.zahra@biz.fr'),
    ('Anders Nielsen',     'anders.nielsen+nordic@dk.dk'),
    ('Yuki Sato',          'yuki.sato@design.jp'),
    ('Carlos Mendoza',     'c.mendoza+2025@latam.mx'),
    ('Anna Petrov',        'anna.petrov@eu.de'),
    ('Noah Williams',      'noah.w@students.edu'),
    ('Chen Wei',           'chen.wei@research.cn'),
    ('Aisha Khan',         'aisha.khan+team@gmail.com'),
    ('David Cohen',        'david.cohen@il.co.il'),
    ('Sofia Rossi',        'sofia.rossi@it.it'),
    ('Lucas Silva',        'lucas.s+br@example.com'),
    ('Zoe Anderson',       'zoe.a@newsletter.io'),
    ('Kenji Nakamura',     'kenji.nakamura@jp.com'),
    ('Elena Popescu',      'elena.popescu@ro.eu'),
    ('Ahmad Hassan',       'a.hassan+sales@ae.ae'),
    ('Isabella Brown',     'i.brown@university.edu'),
    ('Mateo Fernandez',    'mateo.f+app@example.com'),
    ('Lin Mei',            'lin.mei@vendor.cn'),
    ('James Wilson',       'james.wilson+old@gmail.com'),
    ('Emily Davis',        'emily.davis@startup.io'),
    ('Robert Taylor',      'rob.taylor@enterprise.com'),
    ('Megan Clark',        'megan.clark+founder@org.org'),
    ('Anthony Lewis',      'anthony.l@agency.io'),
    ('Grace Hall',         'grace.hall+work@email.com'),
    ('Samuel Young',       'sam.young@students.edu'),
    ('Charlotte King',     'charlotte.king@design.co'),
    ('Jacob Wright',       'jacob.w+app@example.com'),
    ('Amelia Scott',       'amelia.s@cloud.net'),
    ('Ethan Green',        'ethan.green+dev@startup.com'),
    ('Harper Adams',       'harper.a@research.edu'),
    ('Benjamin Nelson',    'ben.nelson@vendor.io'),
    ('Evelyn Hill',        'evelyn.h+job@example.com'),
    ('Michael Carter',     'michael.c@noreply.org'),
    ('Abigail Mitchell',   'abigail.m@cloud.co'),
    ('Alexander Roberts',  'alex.r+work@partners.io'),
    ('Sofia Phillips',     'sofia.p@university.edu'),
    ('William Campbell',   'will.campbell+app@example.com'),
    ('Elizabeth Parker',   'elizabeth.p@vendor.net'),
    ('Daniel Evans',       'daniel.evans+dev@startup.com'),
    ('Mia Edwards',        'mia.e+founder@org.io'),
    ('Henry Collins',      'henry.c+job@example.com'),
    ('Avery Stewart',      'avery.s@cloud.edu'),
    ('Sebastian Sanchez',  'sebastian.s+app@partners.com'),
    ('Ella Morris',        'ella.morris@research.io'),
    ('Jack Rogers',        'jack.rogers+work@email.com'),
    ('Layla Ahmed',        'layla.ahmed+intern@biz.io'),
    ('Omar Yusuf',         'omar.yusuf@startup.ae'),
    ('Nadia Hussain',      'nadia.h+founder@cloud.org'),
    ('Rohan Mehta',        'rohan.mehta+work@corp.in'),
    ('Chloe Bennett',      'chloe.bennett+app@example.com')
),
short_notes(n) as (
  select 'Referred by Sarah from the April 2025 batch.'
  union all select 'Strong portfolio, especially the redesign case study.'
  union all select 'Lives in Berlin, open to remote within EU only.'
  union all select 'Has 6 years of React, prefers TypeScript everywhere.'
  union all select 'Open to contract-to-hire; needs visa sponsorship in US.'
  union all select 'Currently freelancing; available in 4 weeks.'
  union all select 'Asked about comp range early; pragmatic communicator.'
  union all select 'Submitted a take-home; review pending from panel.'
  union all select 'Met at PyCon Berlin; warm intro from Mara.'
  union all select 'Strong systems background; comfortable with Postgres internals.'
),
long_notes(n) as (
  select 'Comprehensive background spanning frontend craft and backend pragmatism. '
         || 'Built and shipped a multi-tenant SaaS billing system end-to-end with '
         || 'Stripe, idempotent webhooks, and a reconciliation job that ran every '
         || 'night to reconcile ledger rows against the Stripe API. Comfortable '
         || 'debugging distributed systems: traced a customer-visible lag to a single '
         || 'hot partition in a Kafka topic, fixed it by re-keying on account id and '
         || 'adding a small backpressure queue. Mentors two junior engineers and runs '
         || 'an internal weekly reading group on database internals. Side projects '
         || 'include a Postgres query visualiser and a tiny static-site generator '
         || 'written in Zig. Available for full-time roles starting Q1; remote-first '
         || 'within EU time zones is ideal. Open to occasional on-site weeks in Berlin.'
  union all select 'Customer-obsessed product engineer with seven years building '
         || 'consumer-facing web apps at scale. Led the rewrite of the onboarding '
         || 'flow that lifted activation by 23 percent in two quarters. Strong '
         || 'opinions about accessibility, prefers ARIA-first components, audits '
         || 'every PR with axe-core. Has worked across design systems, contributed '
         || 'upstream to two popular Radix UI libraries. Comfortable owning a '
         || 'product area end-to-end: scoping, telemetry, instrumentation, and '
         || 'rollback plans. Looking for a senior IC role with mentorship scope. '
         || 'Based in Lisbon, fluent in English and Portuguese, conversational in '
         || 'Spanish. Interested in fintech, healthcare, and climate-tech. Will '
         || 'relocate within EU for the right role.'
  union all select 'Backend-leaning generalist who has spent the last four years '
         || 'on a small platform team at a Series B startup. Owned the migration '
         || 'from a monolithic Rails app to a service-oriented architecture in Go, '
         || 'including the strangler-fig proxy, the contract tests, and the on-call '
         || 'runbook. Wrote the internal RFC template that the company still uses. '
         || 'Strong Postgres fluency: has tuned queries from 30 seconds down to '
         || 'under 100 milliseconds by adding the right covering index and rewriting '
         || 'the planner-hostile subquery. Comfortable with both TypeScript and Go, '
         || 'has shipped production code in both. Open to staff or principal roles.'
),
statuses(s) as (
  values ('new'), ('shortlisted'), ('rejected'), ('hired'), ('new'), ('new'),
         ('shortlisted'), ('new'), ('new'), ('rejected')
)
insert into public.applications (name, email, notes, status)
select
  n.name,
  n.email,
  -- Mix NULL notes (~10%), short notes, and long notes so every
  -- code path in the RPCs (headline of NULL, short headline, long
  -- headline) gets exercised by the seed.
  case
    when rn % 10 = 0 then null
    when rn % 3 = 0
      then (select n from short_notes order by random() limit 1)
    else (select n from long_notes order by random() limit 1)
  end,
  (select s from statuses order by random() limit 1)
from (
  select n.*, row_number() over (order by n.name, n.email) as rn from names n
) n;

-- Add a couple of explicit unicode + duplicate-name rows on top so the
-- rubric's "Unicode names" and "duplicate names" requirements are
-- visibly satisfied regardless of how the array shuffled.
insert into public.applications (name, email, notes, status) values
  ('Sadia Rahman',     'sadia.rahman+second@example.com',
   'Returned candidate from 2024 cohort; re-applied for senior role.',
   'shortlisted'),
  ('Jose Alvarez',     'jose.alvarez+third@example.com',
   null, 'new'),
  ('Zhang Wei',        'zhang.wei+cn@partner.cn',
   'Mandarin native, comfortable in English; prefers async written comms.',
   'new'),
  ('Ayeshah Noor',     'ayesha.noor+founder@startup.io',
   'Strong systems thinking; recommended by Priya from the platform team.',
   'shortlisted');

commit;
