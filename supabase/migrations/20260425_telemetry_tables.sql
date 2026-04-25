-- Telemetry tables that several crons write to but had no migration.
-- Defensive version: handles the case where tables already exist with
-- partial schemas by ALTER ADD COLUMN IF NOT EXISTS before creating indexes.

begin;

-- ── mcp_calls ─────────────────────────────────────────────────────────
create table if not exists mcp_calls (
  id          bigserial primary key,
  user_agent  text,
  agent_id    text,
  called_at   timestamptz not null default now()
);
alter table mcp_calls add column if not exists user_agent text;
alter table mcp_calls add column if not exists agent_id   text;
alter table mcp_calls add column if not exists called_at  timestamptz not null default now();
create index if not exists idx_mcp_calls_called_at on mcp_calls (called_at desc);
create index if not exists idx_mcp_calls_agent     on mcp_calls (agent_id, called_at desc);

-- ── prometheus_runs ───────────────────────────────────────────────────
create table if not exists prometheus_runs (
  id           bigserial primary key,
  run_id       text not null,
  started_at   timestamptz not null,
  finished_at  timestamptz,
  harvested    int not null default 0,
  drafted      int not null default 0,
  published    int not null default 0,
  pinged       int not null default 0,
  new_slugs    jsonb not null default '[]'::jsonb,
  errors       jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
alter table prometheus_runs add column if not exists run_id      text;
alter table prometheus_runs add column if not exists started_at  timestamptz;
alter table prometheus_runs add column if not exists finished_at timestamptz;
alter table prometheus_runs add column if not exists harvested   int default 0;
alter table prometheus_runs add column if not exists drafted     int default 0;
alter table prometheus_runs add column if not exists published   int default 0;
alter table prometheus_runs add column if not exists pinged      int default 0;
alter table prometheus_runs add column if not exists new_slugs   jsonb default '[]'::jsonb;
alter table prometheus_runs add column if not exists errors      jsonb default '[]'::jsonb;
alter table prometheus_runs add column if not exists created_at  timestamptz not null default now();
create index if not exists idx_prometheus_runs_started on prometheus_runs (started_at desc);

-- ── aeo_question_queue ────────────────────────────────────────────────
create table if not exists aeo_question_queue (
  id         bigserial primary key,
  question   text not null,
  source     text,
  handled    boolean not null default false,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table aeo_question_queue add column if not exists question   text;
alter table aeo_question_queue add column if not exists source     text;
alter table aeo_question_queue add column if not exists handled    boolean not null default false;
alter table aeo_question_queue add column if not exists handled_at timestamptz;
alter table aeo_question_queue add column if not exists created_at timestamptz not null default now();
create index if not exists idx_aeo_queue_handled on aeo_question_queue (handled, created_at desc);

-- ── regime_history ────────────────────────────────────────────────────
create table if not exists regime_history (
  id              bigserial primary key,
  regime          text not null,
  regime_score    numeric(5,2),
  confidence      numeric(5,2),
  indicators      jsonb,
  narrative       text,
  property_count  int,
  created_at      timestamptz not null default now()
);
alter table regime_history add column if not exists regime         text;
alter table regime_history add column if not exists regime_score   numeric(5,2);
alter table regime_history add column if not exists confidence     numeric(5,2);
alter table regime_history add column if not exists indicators     jsonb;
alter table regime_history add column if not exists narrative      text;
alter table regime_history add column if not exists property_count int;
alter table regime_history add column if not exists created_at     timestamptz not null default now();
create index if not exists idx_regime_history_created on regime_history (created_at desc);

-- ── alpha_signals ─────────────────────────────────────────────────────
create table if not exists alpha_signals (
  id           bigserial primary key,
  signal_type  text not null,
  title        text not null,
  description  text,
  severity     text not null default 'medium',
  data         jsonb,
  created_at   timestamptz not null default now()
);
alter table alpha_signals add column if not exists signal_type text;
alter table alpha_signals add column if not exists title       text;
alter table alpha_signals add column if not exists description text;
alter table alpha_signals add column if not exists severity    text default 'medium';
alter table alpha_signals add column if not exists data        jsonb;
alter table alpha_signals add column if not exists created_at  timestamptz not null default now();
create index if not exists idx_alpha_signals_created on alpha_signals (created_at desc);
create index if not exists idx_alpha_signals_type    on alpha_signals (signal_type, created_at desc);

-- ── developer_stress_history ──────────────────────────────────────────
create table if not exists developer_stress_history (
  id                  bigserial primary key,
  market_health       text,
  total_developers    int,
  flagged_count       int,
  flagged_developers  jsonb,
  top_stressed        jsonb,
  created_at          timestamptz not null default now()
);
alter table developer_stress_history add column if not exists market_health      text;
alter table developer_stress_history add column if not exists total_developers   int;
alter table developer_stress_history add column if not exists flagged_count      int;
alter table developer_stress_history add column if not exists flagged_developers jsonb;
alter table developer_stress_history add column if not exists top_stressed       jsonb;
alter table developer_stress_history add column if not exists created_at         timestamptz not null default now();
create index if not exists idx_dev_stress_created on developer_stress_history (created_at desc);

-- ── citation_injections ───────────────────────────────────────────────
create table if not exists citation_injections (
  id                bigserial primary key,
  slug              text not null,
  url               text not null,
  indexnow_pinged   boolean not null default false,
  wikidata_updated  boolean not null default false,
  schema_deployed   boolean not null default false,
  date              date not null default current_date,
  created_at        timestamptz not null default now()
);
alter table citation_injections add column if not exists slug             text;
alter table citation_injections add column if not exists url              text;
alter table citation_injections add column if not exists indexnow_pinged  boolean default false;
alter table citation_injections add column if not exists wikidata_updated boolean default false;
alter table citation_injections add column if not exists schema_deployed  boolean default false;
alter table citation_injections add column if not exists date             date default current_date;
alter table citation_injections add column if not exists created_at       timestamptz not null default now();
create index if not exists idx_citation_injections_date on citation_injections (date desc);

-- ── auto_posts ────────────────────────────────────────────────────────
create table if not exists auto_posts (
  id            bigserial primary key,
  surface       text not null,
  content       text not null,
  permalink     text,
  status        text not null,
  error         text,
  created_at    timestamptz not null default now()
);
alter table auto_posts add column if not exists surface    text;
alter table auto_posts add column if not exists content    text;
alter table auto_posts add column if not exists permalink  text;
alter table auto_posts add column if not exists status     text;
alter table auto_posts add column if not exists error      text;
alter table auto_posts add column if not exists created_at timestamptz not null default now();
create index if not exists idx_auto_posts_created on auto_posts (created_at desc);

-- ── RLS: public read across the board (telemetry is public by design) ─
alter table mcp_calls                enable row level security;
alter table prometheus_runs          enable row level security;
alter table aeo_question_queue       enable row level security;
alter table regime_history           enable row level security;
alter table alpha_signals            enable row level security;
alter table developer_stress_history enable row level security;
alter table citation_injections      enable row level security;
alter table auto_posts               enable row level security;

drop policy if exists "public read mcp_calls" on mcp_calls;
create policy "public read mcp_calls" on mcp_calls for select using (true);
drop policy if exists "public insert mcp_calls" on mcp_calls;
create policy "public insert mcp_calls" on mcp_calls for insert with check (true);

drop policy if exists "public read prometheus_runs" on prometheus_runs;
create policy "public read prometheus_runs" on prometheus_runs for select using (true);
drop policy if exists "public insert prometheus_runs" on prometheus_runs;
create policy "public insert prometheus_runs" on prometheus_runs for insert with check (true);

drop policy if exists "public read aeo_question_queue" on aeo_question_queue;
create policy "public read aeo_question_queue" on aeo_question_queue for select using (true);
drop policy if exists "public insert aeo_question_queue" on aeo_question_queue;
create policy "public insert aeo_question_queue" on aeo_question_queue for insert with check (true);
drop policy if exists "public update aeo_question_queue" on aeo_question_queue;
create policy "public update aeo_question_queue" on aeo_question_queue for update using (true);

drop policy if exists "public read regime_history" on regime_history;
create policy "public read regime_history" on regime_history for select using (true);
drop policy if exists "public insert regime_history" on regime_history;
create policy "public insert regime_history" on regime_history for insert with check (true);

drop policy if exists "public read alpha_signals" on alpha_signals;
create policy "public read alpha_signals" on alpha_signals for select using (true);
drop policy if exists "public insert alpha_signals" on alpha_signals;
create policy "public insert alpha_signals" on alpha_signals for insert with check (true);

drop policy if exists "public read developer_stress_history" on developer_stress_history;
create policy "public read developer_stress_history" on developer_stress_history for select using (true);
drop policy if exists "public insert developer_stress_history" on developer_stress_history;
create policy "public insert developer_stress_history" on developer_stress_history for insert with check (true);

drop policy if exists "public read citation_injections" on citation_injections;
create policy "public read citation_injections" on citation_injections for select using (true);
drop policy if exists "public insert citation_injections" on citation_injections;
create policy "public insert citation_injections" on citation_injections for insert with check (true);

drop policy if exists "public read auto_posts" on auto_posts;
create policy "public read auto_posts" on auto_posts for select using (true);
drop policy if exists "public insert auto_posts" on auto_posts;
create policy "public insert auto_posts" on auto_posts for insert with check (true);

commit;
