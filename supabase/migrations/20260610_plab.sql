-- ═══════════════════════════════════════════════════════════════════════════
-- PLAB — the European Property AI Benchmark.
--
-- Daily scoring of major AI models on a fixed, git-versioned question
-- bank of European property and finance facts. Questions live in code
-- (src/lib/plab-questions.ts) so the set is auditable; only runs and
-- scores live in the database. Writes happen via the service-role
-- client (bypasses RLS) — public gets read-only access.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists plab_runs (
  id            uuid primary key default gen_random_uuid(),
  run_date      date not null,
  provider      text not null,                 -- 'anthropic' | 'perplexity' | 'openai' | 'google'
  model         text not null,
  model_label   text not null,
  question_id   text not null,                 -- 'PLAB-001' … matches src/lib/plab-questions.ts
  category      text not null,
  answer_raw    text not null,                 -- verbatim model reply (public audit)
  extracted     text,
  correct       boolean not null,
  latency_ms    int,
  plab_version  text not null default '1.0',
  created_at    timestamptz default now()
);
create index if not exists idx_plab_runs_date  on plab_runs (run_date desc, model);
create index if not exists idx_plab_runs_q     on plab_runs (question_id, run_date desc);

create table if not exists plab_daily_scores (
  run_date      date not null,
  provider      text not null,
  model         text not null,
  model_label   text not null,
  n_questions   int not null,
  n_correct     int not null,
  accuracy      numeric not null,              -- 0..100
  plab_version  text not null default '1.0',
  created_at    timestamptz default now(),
  primary key (run_date, model)
);
create index if not exists idx_plab_scores_model on plab_daily_scores (model, run_date desc);

alter table plab_runs enable row level security;
alter table plab_daily_scores enable row level security;
drop policy if exists "public read plab_runs" on plab_runs;
create policy "public read plab_runs" on plab_runs for select using (true);
drop policy if exists "public read plab_daily_scores" on plab_daily_scores;
create policy "public read plab_daily_scores" on plab_daily_scores for select using (true);

commit;
