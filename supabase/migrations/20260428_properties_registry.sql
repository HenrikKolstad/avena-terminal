-- Properties registry — the canonical cross-country master table.
--
-- This is THE table that makes Avena a real European property registry.
-- Every property from every portal lands here, signed and timestamped.
-- Existing 1,881 Xavia/Spain records seed it; scrapers populate the rest.
--
-- Schema is portal-agnostic and country-neutral. raw JSONB preserves the
-- original parsed payload from each source, so we never lose information
-- we haven't yet modeled.

begin;

create table if not exists properties_registry (
  -- Canonical identity
  avn_prop_id        text primary key,                -- 'AVN:ES-03185-NB-0421'

  -- Geography (cross-country canonical)
  country            text not null,                   -- ISO 3166-1 alpha-2 ('ES', 'PT', 'FR', 'IT', 'GR', 'SE', 'DK')
  region             text,                            -- 'Costa Blanca', 'Algarve', etc. — Avena's own region taxonomy
  postal_code        text,                            -- ZIP / CP / CAP / postnummer
  municipality       text,                            -- Town / city / kommune
  province           text,                            -- Province / state / länder
  lat                numeric(10, 7),
  lng                numeric(10, 7),
  address            text,

  -- Property characteristics
  category           text not null default 'NB',      -- 'NB' new-build | 'EX' existing | 'CM' commercial | 'LH' leasehold | 'FR' fractional | 'PL' parcel
  property_type      text,                            -- 'villa' | 'apartment' | 'townhouse' | 'penthouse' | 'bungalow' | etc.
  status             text,                            -- 'off-plan' | 'under-construction' | 'ready' | 'resale' | 'reserved' | 'sold'
  bedrooms           int,
  bathrooms          int,
  built_m2           numeric(10, 2),
  plot_m2            numeric(10, 2),
  terrace_m2         numeric(10, 2),
  pool               boolean,
  parking            boolean,
  year_built         int,
  completion_year    int,
  energy_rating      text,

  -- Pricing (canonical EUR-equivalent)
  price_eur          numeric(14, 2),
  price_max_eur      numeric(14, 2),                  -- when listing has a range
  price_per_m2_eur   numeric(10, 2),
  price_currency     text default 'EUR',
  price_native       numeric(14, 2),                  -- if originally GBP/SEK/DKK

  -- Avena scoring
  avena_score        int,                             -- 0-100
  score_methodology  text,                            -- 'v1.2' | 'v2.0-climate' | etc.
  scored_at          timestamptz,
  yield_gross_pct    numeric(5, 2),
  yield_net_pct      numeric(5, 2),
  discount_to_market_pct numeric(5, 2),

  -- Source provenance (CRITICAL for institutional trust)
  source_portal      text not null,                   -- 'idealista' | 'kyero' | 'imovirtual' | 'xavia-feed' | etc.
  source_listing_id  text,                            -- Portal's internal ID
  source_url         text,
  developer          text,
  developer_id       text,
  agent              text,

  -- Media
  primary_image      text,
  images             jsonb default '[]'::jsonb,       -- Array of {url, caption?, width?, height?}
  description        text,
  description_lang   text default 'en',

  -- Lifecycle tracking
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  last_changed_at    timestamptz,
  withdrawn_at       timestamptz,

  -- Raw original payload from source (preserves everything we haven't yet modeled)
  raw                jsonb,

  -- Metadata
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Constraint: same source_portal + source_listing_id can only appear once
  unique (source_portal, source_listing_id)
);

-- Indexes for the queries the registry UI + API will hammer
create index if not exists idx_properties_country         on properties_registry (country);
create index if not exists idx_properties_country_region  on properties_registry (country, region);
create index if not exists idx_properties_municipality    on properties_registry (municipality);
create index if not exists idx_properties_postal          on properties_registry (postal_code);
create index if not exists idx_properties_score           on properties_registry (avena_score desc nulls last);
create index if not exists idx_properties_price           on properties_registry (price_eur);
create index if not exists idx_properties_type            on properties_registry (property_type);
create index if not exists idx_properties_status          on properties_registry (status);
create index if not exists idx_properties_source_portal   on properties_registry (source_portal);
create index if not exists idx_properties_first_seen      on properties_registry (first_seen_at desc);
create index if not exists idx_properties_last_seen       on properties_registry (last_seen_at desc);
create index if not exists idx_properties_geo             on properties_registry (lat, lng) where lat is not null;

-- Coverage rollup view — drives the registry dashboard cheaply
create or replace view properties_coverage as
select
  country,
  source_portal,
  count(*)                                  as record_count,
  count(*) filter (where avena_score is not null) as scored_count,
  min(first_seen_at)                        as oldest_record,
  max(last_seen_at)                         as newest_record,
  avg(price_eur)::numeric(14,2)             as avg_price_eur,
  avg(avena_score)::numeric(5,2)            as avg_score
from properties_registry
group by country, source_portal;

-- Public read so /registry can SSR without auth
alter table properties_registry enable row level security;

drop policy if exists "public read properties_registry" on properties_registry;
create policy "public read properties_registry"
  on properties_registry for select using (true);

drop policy if exists "public insert properties_registry" on properties_registry;
create policy "public insert properties_registry"
  on properties_registry for insert with check (true);

drop policy if exists "public update properties_registry" on properties_registry;
create policy "public update properties_registry"
  on properties_registry for update using (true);

commit;
