-- Citation Moat infrastructure — real-time measurement of AI citation presence.
-- Avena's #1 KPI is "how often do AI answer engines cite avenaterminal.com when
-- asked about European property?" — this schema lets us track that over time.
--
-- Tables:
--   * citation_monitoring — raw per-question Perplexity (+future: Google AI
--     Overviews, ChatGPT search) snapshots
--   * citation_gaps — aggregated questions where competitors win citations
--   * citation_measurements — daily rollup (aggregated Avena hit rate,
--     competitor share, trend-ready)
--   * crawler_submissions — outbound submissions to Common Crawl, Internet
--     Archive, and similar bulk crawlers with success/failure log

begin;

create table if not exists citation_monitoring (
  id                bigserial primary key,
  question          text not null,
  cited_sources     jsonb not null default '[]'::jsonb,
  avena_cited       boolean not null default false,
  avena_rank        int,                             -- 0 if not cited, 1 = first, etc.
  competitor_cited  jsonb not null default '[]'::jsonb,
  engine            text not null default 'perplexity',  -- perplexity | google-ai | chatgpt
  date              date not null default current_date,
  created_at        timestamptz not null default now()
);

create index if not exists idx_citation_monitoring_date
  on citation_monitoring (date desc);
create index if not exists idx_citation_monitoring_question_date
  on citation_monitoring (question, date desc);
create index if not exists idx_citation_monitoring_avena
  on citation_monitoring (avena_cited, date desc);

create table if not exists citation_gaps (
  id                bigserial primary key,
  question          text not null,
  priority          int not null default 0,
  competitor_cited  jsonb not null default '[]'::jsonb,
  reason            text,
  date              date not null default current_date,
  resolved          boolean not null default false,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_citation_gaps_date_priority
  on citation_gaps (date desc, priority desc);
create index if not exists idx_citation_gaps_resolved
  on citation_gaps (resolved, date desc);

create table if not exists citation_measurements (
  id                bigserial primary key,
  date              date not null unique,
  questions_asked   int not null,
  avena_hits        int not null,
  avena_rate        numeric(5,2) not null,            -- 0-100
  competitor_share  jsonb not null default '{}'::jsonb, -- {idealista: 12, kyero: 8, ...}
  top_gap_question  text,
  created_at        timestamptz not null default now()
);

create table if not exists crawler_submissions (
  id                bigserial primary key,
  crawler           text not null,                    -- common-crawl | internet-archive | etc.
  url               text not null,
  status            text not null,                    -- queued | success | failed
  response          jsonb,
  submitted_at      timestamptz not null default now()
);

create index if not exists idx_crawler_submissions_crawler_date
  on crawler_submissions (crawler, submitted_at desc);

-- RLS: public read (makes it safe to expose on the dashboard), service role writes only.
alter table citation_monitoring  enable row level security;
alter table citation_gaps        enable row level security;
alter table citation_measurements enable row level security;
alter table crawler_submissions  enable row level security;

drop policy if exists "public read citation_monitoring"  on citation_monitoring;
drop policy if exists "public read citation_gaps"        on citation_gaps;
drop policy if exists "public read citation_measurements" on citation_measurements;
drop policy if exists "public read crawler_submissions"  on crawler_submissions;

create policy "public read citation_monitoring"
  on citation_monitoring for select
  using (true);

create policy "public read citation_gaps"
  on citation_gaps for select
  using (true);

create policy "public read citation_measurements"
  on citation_measurements for select
  using (true);

create policy "public read crawler_submissions"
  on crawler_submissions for select
  using (true);

commit;
