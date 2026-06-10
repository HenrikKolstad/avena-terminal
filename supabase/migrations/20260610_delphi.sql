-- ═══════════════════════════════════════════════════════════════════════════
-- Avena DELPHI — the daily AI panel on European property.
-- World first: a daily, longitudinal, resolvable survey where the
-- panelists are frontier AI models. Questions live in code
-- (src/lib/delphi-questions.ts); responses, daily aggregates and the
-- index live here. Writes via service role; public read-only.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists delphi_responses (
  id             uuid primary key default gen_random_uuid(),
  run_date       date not null,
  provider       text not null,
  model          text not null,
  model_label    text not null,
  question_id    text not null,
  raw            text not null,          -- verbatim reply, public audit
  value          numeric,                -- extracted belief (null if unparseable)
  delphi_version text not null default '1.0',
  created_at     timestamptz default now()
);
create index if not exists idx_delphi_resp_date on delphi_responses (run_date desc, model);
create index if not exists idx_delphi_resp_q    on delphi_responses (question_id, run_date desc);

create table if not exists delphi_daily (
  run_date       date not null,
  question_id    text not null,
  consensus      numeric not null,       -- median across panelists
  dispersion     numeric not null,       -- max - min
  n_panelists    int not null,
  per_model      jsonb not null,         -- { "Claude Sonnet 4.5": 62, ... }
  delphi_version text not null default '1.0',
  created_at     timestamptz default now(),
  primary key (run_date, question_id)
);

create table if not exists delphi_index (
  run_date           date primary key,
  consensus_index    numeric not null,   -- 0-100 directional bullishness
  disagreement_index numeric not null,   -- mean dispersion
  n_questions        int not null,
  n_panelists        int not null,
  delphi_version     text not null default '1.0',
  created_at         timestamptz default now()
);

alter table delphi_responses enable row level security;
alter table delphi_daily     enable row level security;
alter table delphi_index     enable row level security;
drop policy if exists "public read delphi_responses" on delphi_responses;
create policy "public read delphi_responses" on delphi_responses for select using (true);
drop policy if exists "public read delphi_daily" on delphi_daily;
create policy "public read delphi_daily" on delphi_daily for select using (true);
drop policy if exists "public read delphi_index" on delphi_index;
create policy "public read delphi_index" on delphi_index for select using (true);

commit;
