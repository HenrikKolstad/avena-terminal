-- ═══════════════════════════════════════════════════════════════════════════
-- DATA CONTRIBUTOR ONRAMP — network effect lever.
--
-- Notaries, brokers, registries, agencies holding EU residential property
-- data can contribute it under APIP and receive co-citation in Avena's
-- methodology + dataset. Goal: turn Avena from a vendor into a convener.
-- A network of 50 contributors is structurally unreplicable.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists data_contributions (
  id                  uuid primary key default gen_random_uuid(),
  contributor_name    text not null,
  contributor_email   text not null,
  organisation        text not null,
  organisation_type   text not null,                        -- 'notary' | 'broker' | 'registry' | 'agency' | 'fund' | 'academic'
  country_iso2        text not null,
  data_type           text not null,                        -- 'transactions' | 'listings' | 'valuations' | 'rents' | 'completions'
  estimated_record_count int,
  earliest_record     date,
  latest_record       date,
  proposed_terms      text,                                 -- 'cc_by_4' | 'cc_by_nc' | 'custom' | 'tbd'
  status              text not null default 'inbound',      -- 'inbound' | 'qualified' | 'integrating' | 'live' | 'declined'
  description         text,
  notes               text,
  ip_address          text,
  created_at          timestamptz default now(),
  decided_at          timestamptz
);

create index if not exists idx_data_contributions_status on data_contributions (status, created_at desc);
create index if not exists idx_data_contributions_country on data_contributions (country_iso2, created_at desc);

alter table data_contributions enable row level security;
drop policy if exists "public insert data_contributions" on data_contributions;
create policy "public insert data_contributions" on data_contributions for insert with check (true);
-- No public read — proposals are private until they go live
drop policy if exists "public read live data_contributions" on data_contributions;
create policy "public read live data_contributions" on data_contributions for select using (status = 'live');

commit;
