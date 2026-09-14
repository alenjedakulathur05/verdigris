-- ═══════════════════════════════════════════════════════════════════
-- VERDIGRIS — database schema
-- Run once in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- what the visitor told Verdigris
  name         text        not null,
  age          smallint,
  location     text,
  email        text        not null,
  grievance    text        not null,

  -- what happened to it
  reply        text,
  ai_provider  text,
  email_sent   boolean     not null default false,
  status       text        not null default 'new'
);

-- Age is collected because the brief asks for it, but a nonsense value should
-- never reach the table. Validation already runs in the browser AND in the
-- route handler; this is the third and last line, and the only one an attacker
-- cannot skip by POSTing directly.
alter table public.requests
  drop constraint if exists requests_age_sane;
alter table public.requests
  add constraint requests_age_sane check (age is null or (age between 1 and 120));

-- Cheap win: the only query anyone will ever run against this is "newest
-- first", and an index on created_at is what keeps that fast once the table
-- is not tiny.
create index if not exists requests_created_at_idx
  on public.requests (created_at desc);

-- ── Security ───────────────────────────────────────────────────────
-- RLS ON with NO POLICIES is the important line in this file.
--
-- Supabase projects expose a public "anon" key to the internet by design.
-- With row-level security enabled and no policy granting anything, that key
-- can neither read nor write this table — the default is deny.
--
-- The server's service_role key bypasses RLS, so the API route can still
-- insert. That is the whole security model: the browser can never touch this
-- table, only our own server can, and the key that lets it is never sent to
-- the browser.
--
-- Forgetting this line is the single most common way Supabase projects leak
-- their users' data.
alter table public.requests enable row level security;


-- ── Triage ─────────────────────────────────────────────────────────
-- Added after the first deploy, so these are written to be safe to run on a
-- table that already has rows: existing requests get 'standard' rather than
-- null. A nullable priority column would sort unpredictably, which on a queue
-- ordered by urgency is worse than being wrong consistently.
alter table public.requests
  add column if not exists priority text not null default 'standard';
alter table public.requests
  add column if not exists priority_reason text;

-- The model suggests a band; this constraint is what makes it a contract.
alter table public.requests
  drop constraint if exists requests_priority_valid;
alter table public.requests
  add constraint requests_priority_valid
  check (priority in ('critical', 'high', 'standard', 'low'));

-- The whole point of triage is reading the queue in urgency order, so the
-- index matches the query: priority first, then newest within a band.
create index if not exists requests_priority_idx
  on public.requests (priority, created_at desc);
