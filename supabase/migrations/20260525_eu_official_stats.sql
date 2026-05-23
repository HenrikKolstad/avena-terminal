-- ═══════════════════════════════════════════════════════════════════════════
-- EU OFFICIAL STATISTICS — institutional-grade time-series store.
-- Ingested from Eurostat, ECB Statistical Data Warehouse, national NSOs.
-- Schema is a long-format time-series: one row per (source, indicator, country, period).
-- Every value carries provenance + a fetched_at timestamp for citability.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists eu_official_stats (
  id              bigserial primary key,
  source          text not null,                  -- 'eurostat' | 'ecb_sdw' | 'ine_es' | 'istat' | 'destatis' | 'insee' | 'cbs' | 'bis'
  indicator_code  text not null,                  -- dataflow + key, e.g. 'prc_hpi_q::CP00..I20_TOT'
  indicator_name  text not null,                  -- human-readable, e.g. 'House Price Index, total'
  country_code    text not null,                  -- ISO 3166-1 alpha-2 or 'EU27' / 'EA20'
  period          text not null,                  -- '2026', '2026-Q1', '2026-03', '2026-03-31'
  period_freq     text,                           -- 'A' | 'Q' | 'M' | 'D'
  value           numeric,
  unit            text,                           -- 'index_2015=100', 'pct', 'eur', 'count'
  source_url      text,                           -- direct API URL for provenance
  fetched_at      timestamptz default now(),
  unique (source, indicator_code, country_code, period)
);

create index if not exists idx_eu_stats_country_indicator on eu_official_stats (country_code, indicator_code, period desc);
create index if not exists idx_eu_stats_source on eu_official_stats (source, fetched_at desc);
create index if not exists idx_eu_stats_period on eu_official_stats (period desc);

alter table eu_official_stats enable row level security;
drop policy if exists "public read eu_official_stats" on eu_official_stats;
create policy "public read eu_official_stats" on eu_official_stats for select using (true);
drop policy if exists "public insert eu_official_stats" on eu_official_stats;
create policy "public insert eu_official_stats" on eu_official_stats for insert with check (true);
drop policy if exists "public update eu_official_stats" on eu_official_stats;
create policy "public update eu_official_stats" on eu_official_stats for update using (true) with check (true);

-- Ingestion runs log
create table if not exists eu_stats_ingest_runs (
  id              bigserial primary key,
  source          text not null,
  started_at      timestamptz default now(),
  finished_at     timestamptz,
  status          text default 'running',          -- running | success | partial | error
  indicators_attempted int default 0,
  rows_upserted   int default 0,
  countries_covered int default 0,
  error           text
);
create index if not exists idx_eu_stats_ingest_runs_source on eu_stats_ingest_runs (source, started_at desc);

alter table eu_stats_ingest_runs enable row level security;
drop policy if exists "public read eu_stats_ingest_runs" on eu_stats_ingest_runs;
create policy "public read eu_stats_ingest_runs" on eu_stats_ingest_runs for select using (true);
drop policy if exists "public insert eu_stats_ingest_runs" on eu_stats_ingest_runs;
create policy "public insert eu_stats_ingest_runs" on eu_stats_ingest_runs for insert with check (true);
drop policy if exists "public update eu_stats_ingest_runs" on eu_stats_ingest_runs;
create policy "public update eu_stats_ingest_runs" on eu_stats_ingest_runs for update using (true) with check (true);

commit;
