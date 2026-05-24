-- ═══════════════════════════════════════════════════════════════════════════
-- REGULATORY INTENT GRAPH — Architectural Commitment 8.
--
-- Most regulation is not surprising. It is signaled months in advance
-- through working papers, committee transcripts, MEP speeches, and central
-- bank speeches. This table captures every such signal, classifies it for
-- intent direction, and attaches estimated property-market impact.
--
-- Bloomberg's Government Affairs desk does this manually for clients
-- paying €50K/year. Avena does it algorithmically.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists regulatory_signals (
  id                  uuid primary key default gen_random_uuid(),
  source_body         text not null,         -- 'ECB' | 'ESMA' | 'EBA' | 'EP' | 'BdE' | 'BdF' | 'Bundesbank' | ...
  source_document_url text,
  title               text not null,
  summary             text,
  signal_type         text not null,         -- 'consultation' | 'speech' | 'paper' | 'vote' | 'minutes' | 'technical_standard'
  topic_tags          text[] default '{}',   -- ['mortgage_lending','rental_caps','energy_efficiency','aml','disclosure']
  intent_direction    text,                  -- 'tightening' | 'loosening' | 'neutral' | 'unclear'
  confidence          numeric,               -- 0..1
  estimated_lag_days  int,                   -- how long before policy crystallises
  affected_countries  text[] default '{}',
  raw_excerpt         text,
  published_at        timestamptz,
  ingested_at         timestamptz default now(),
  classified_at       timestamptz,
  classifier_version  text default 'claude-sonnet-4-5'
);

create index if not exists idx_regulatory_signals_published
  on regulatory_signals (published_at desc);
create index if not exists idx_regulatory_signals_body
  on regulatory_signals (source_body, published_at desc);
create index if not exists idx_regulatory_signals_direction
  on regulatory_signals (intent_direction, published_at desc);

create table if not exists regulatory_property_impact (
  id                  uuid primary key default gen_random_uuid(),
  signal_id           uuid references regulatory_signals(id) on delete cascade,
  affected_segment    text not null,         -- e.g. 'spain_residential', 'germany_btr', 'eu_aml_real_estate'
  estimated_coefficient numeric,             -- -1..+1 (negative = bearish for prices)
  estimated_lag_days  int,
  rationale           text,
  created_at          timestamptz default now()
);
create index if not exists idx_reg_impact_signal on regulatory_property_impact (signal_id);
create index if not exists idx_reg_impact_segment on regulatory_property_impact (affected_segment);

alter table regulatory_signals enable row level security;
alter table regulatory_property_impact enable row level security;

drop policy if exists "public read regulatory_signals" on regulatory_signals;
create policy "public read regulatory_signals" on regulatory_signals for select using (true);

drop policy if exists "public read regulatory_property_impact" on regulatory_property_impact;
create policy "public read regulatory_property_impact" on regulatory_property_impact for select using (true);

commit;
