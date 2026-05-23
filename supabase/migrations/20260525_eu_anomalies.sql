-- ═══════════════════════════════════════════════════════════════════════════
-- EU MACRO ANOMALIES — daily detection layer over eu_official_stats.
-- A row exists per (country, indicator, period) where the latest observation
-- deviates >2σ from the trailing 8-period mean.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists eu_anomalies (
  id              bigserial primary key,
  detected_at     timestamptz default now(),
  country_code    text not null,
  source          text not null,
  indicator_code  text not null,
  indicator_name  text not null,
  period          text not null,
  value           numeric,
  trailing_mean   numeric,
  trailing_std    numeric,
  z_score         numeric,                       -- (value - mean) / std
  severity        text,                          -- 'watch' (>2σ) | 'alert' (>2.5σ) | 'critical' (>3σ)
  trend           text,                          -- 'up' | 'down'
  note            text,
  source_url      text,
  unique (country_code, source, indicator_code, period)
);
create index if not exists idx_eu_anomalies_severity on eu_anomalies (severity, detected_at desc);
create index if not exists idx_eu_anomalies_country on eu_anomalies (country_code, detected_at desc);

alter table eu_anomalies enable row level security;
drop policy if exists "public read eu_anomalies" on eu_anomalies;
create policy "public read eu_anomalies" on eu_anomalies for select using (true);
drop policy if exists "public insert eu_anomalies" on eu_anomalies;
create policy "public insert eu_anomalies" on eu_anomalies for insert with check (true);
drop policy if exists "public update eu_anomalies" on eu_anomalies;
create policy "public update eu_anomalies" on eu_anomalies for update using (true) with check (true);

commit;
