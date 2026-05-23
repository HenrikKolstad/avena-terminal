-- ═══════════════════════════════════════════════════════════════════════════
-- EU CROSS-VALIDATION HISTORY
-- Daily snapshot of the delta between official series (Eurostat, ECB, NSOs)
-- and the Avena ground-truth corpus. This is the table that turns
-- "we have a dataset" into "we have a finding only Avena can publish".
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists eu_validation_snapshots (
  id                  bigserial primary key,
  computed_at         timestamptz default now(),
  country_code        text not null,
  region              text,                       -- 'coastal' | 'national' | 'urban' — Avena cohort label
  period              text not null,              -- '2026-Q1'
  official_source     text not null,              -- 'eurostat' | 'ecb_sdw' | 'ine_es'
  official_indicator  text not null,              -- e.g. 'prc_hpi_q::purchase=TOTAL&unit=I15_Q'
  official_value      numeric,                    -- the published value (index or pct)
  avena_value         numeric,                    -- Avena-computed equivalent
  delta_bps           numeric,                    -- (avena - official) in basis points
  delta_pct           numeric,                    -- (avena - official) / official × 100
  avena_n_properties  int,                        -- corpus size that contributed
  note                text,                       -- human commentary
  unique (country_code, region, period, official_source, official_indicator)
);
create index if not exists idx_eu_validation_country on eu_validation_snapshots (country_code, period desc);
create index if not exists idx_eu_validation_period on eu_validation_snapshots (period desc, computed_at desc);

alter table eu_validation_snapshots enable row level security;
drop policy if exists "public read eu_validation_snapshots" on eu_validation_snapshots;
create policy "public read eu_validation_snapshots" on eu_validation_snapshots for select using (true);
drop policy if exists "public insert eu_validation_snapshots" on eu_validation_snapshots;
create policy "public insert eu_validation_snapshots" on eu_validation_snapshots for insert with check (true);
drop policy if exists "public update eu_validation_snapshots" on eu_validation_snapshots;
create policy "public update eu_validation_snapshots" on eu_validation_snapshots for update using (true) with check (true);

commit;
