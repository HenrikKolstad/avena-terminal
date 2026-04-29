-- Property augmentation — star schema for institutional-grade per-property metrics.
--
-- Avena's pivot: from "listings aggregator" to "property records platform".
-- Every property gets ~60 metrics across 8 augmentation tables, all joined
-- by avn_prop_id. Each augmentation has its own cron + data source.
--
-- Architecture: properties_registry stays the canonical core; this migration
-- extends it with cadastral_ref + osm_id + tier discriminator, and creates
-- 8 augmentation tables. Each augmentation is independently updated.

begin;

-- ── Extend the core registry ─────────────────────────────────────────
alter table properties_registry add column if not exists tier text default 'listing';
alter table properties_registry add column if not exists is_for_sale boolean default true;
alter table properties_registry add column if not exists osm_id text;
alter table properties_registry add column if not exists building_footprint_m2 numeric(10, 2);
alter table properties_registry add column if not exists last_augmented_at timestamptz;

-- Allow source_portal to be nullable for cadastral-only records
alter table properties_registry alter column source_portal drop not null;

-- properties_registry already has cadastral_ref column? if not, add it
alter table properties_registry add column if not exists cadastral_ref text;

create index if not exists idx_properties_tier on properties_registry (tier);
create index if not exists idx_properties_cadastral on properties_registry (cadastral_ref) where cadastral_ref is not null;
create index if not exists idx_properties_osm on properties_registry (osm_id) where osm_id is not null;
create index if not exists idx_properties_for_sale on properties_registry (is_for_sale) where is_for_sale = true;

-- ── property_geo — amenity distances + walkability ───────────────────
create table if not exists property_geo (
  avn_prop_id          text primary key references properties_registry(avn_prop_id) on delete cascade,
  distance_beach_m     int,
  distance_school_m    int,
  distance_hospital_m  int,
  distance_airport_m   int,
  distance_train_m     int,
  distance_supermarket_m int,
  distance_restaurant_m int,
  walkability_score    int,                  -- 0-100
  noise_score          int,                  -- 0-100, lower=quieter
  air_quality_index    int,                  -- 0-500 (AQI)
  elevation_m          int,
  source               text,                 -- 'osm' | 'overpass' | etc.
  computed_at          timestamptz default now()
);

-- ── property_climate — flood / heat / risk overlays ─────────────────
create table if not exists property_climate (
  avn_prop_id              text primary key references properties_registry(avn_prop_id) on delete cascade,
  flood_risk_100yr         numeric(4, 2),    -- 0-1 probability
  flood_risk_500yr         numeric(4, 2),
  heat_stress_score        int,              -- 0-100
  sea_level_rise_2050_m    numeric(4, 2),
  wildfire_risk            int,              -- 0-100
  seismic_zone             text,
  stranded_asset_prob_2040 numeric(4, 2),    -- 0-1, climate-adjusted obsolescence
  source                   text,             -- 'copernicus' | 'eu-jrc' | etc.
  source_version           text,
  computed_at              timestamptz default now()
);

-- ── property_valuation — current valuation (single row per property) ─
create table if not exists property_valuation (
  avn_prop_id              text primary key references properties_registry(avn_prop_id) on delete cascade,
  avena_score              int,
  score_methodology        text,
  avm_eur                  numeric(14, 2),    -- Avena AVM estimate
  avm_confidence           numeric(4, 2),     -- 0-1
  avm_low_eur              numeric(14, 2),
  avm_high_eur             numeric(14, 2),
  yield_gross_pct          numeric(5, 2),
  yield_net_pct            numeric(5, 2),
  discount_to_market_pct   numeric(5, 2),
  comp_count               int,               -- number of comparables used
  comp_median_pm2_eur      numeric(10, 2),
  climate_adjusted_score   int,               -- score after climate haircut
  computed_at              timestamptz default now()
);

-- ── property_valuation_history — every score change, AVP-signed ──────
create table if not exists property_valuation_history (
  id                       bigserial primary key,
  avn_prop_id              text references properties_registry(avn_prop_id) on delete cascade,
  recorded_at              timestamptz default now(),
  avena_score              int,
  avm_eur                  numeric(14, 2),
  yield_gross_pct          numeric(5, 2),
  methodology_version      text,
  signature                text                -- AVP-signed for audit
);
create index if not exists idx_valuation_history on property_valuation_history (avn_prop_id, recorded_at desc);

-- ── property_pricing_history — every listing-price change ────────────
create table if not exists property_pricing_history (
  id                       bigserial primary key,
  avn_prop_id              text references properties_registry(avn_prop_id) on delete cascade,
  recorded_at              timestamptz default now(),
  price_eur                numeric(14, 2),
  source_portal            text,
  status                   text                -- 'listed' | 'reduced' | 'withdrawn' | etc.
);
create index if not exists idx_pricing_history on property_pricing_history (avn_prop_id, recorded_at desc);

-- ── property_transactions — historical sales (DVF-style) ─────────────
create table if not exists property_transactions (
  id                       bigserial primary key,
  avn_prop_id              text references properties_registry(avn_prop_id) on delete cascade,
  transacted_at            date,
  price_eur                numeric(14, 2),
  price_per_m2_eur         numeric(10, 2),
  source                   text,               -- 'dvf-fr' | 'registradores-es' | etc.
  raw                      jsonb
);
create index if not exists idx_transactions_property on property_transactions (avn_prop_id, transacted_at desc);
create index if not exists idx_transactions_date on property_transactions (transacted_at desc);

-- ── property_regulatory — permits / licenses / heritage ──────────────
create table if not exists property_regulatory (
  avn_prop_id              text primary key references properties_registry(avn_prop_id) on delete cascade,
  building_permit          text,               -- license number
  permit_status            text,               -- 'valid' | 'expired' | 'pending' | etc.
  permit_issued_at         date,
  tourist_license          text,               -- VTL number for Spanish holiday rentals
  tourist_license_status   text,
  heritage_protection      boolean,
  heritage_grade           text,
  zoning                   text,
  epc_compliance           boolean,            -- Energy Performance Certificate
  epc_rating               text,
  source                   text,
  verified_at              timestamptz
);

-- ── property_market — local market context ───────────────────────────
create table if not exists property_market (
  avn_prop_id              text primary key references properties_registry(avn_prop_id) on delete cascade,
  population_5yr_change_pct numeric(5, 2),
  median_household_income_eur numeric(10, 2),
  foreign_ownership_pct    numeric(5, 2),
  tourism_intensity        int,                -- 0-100
  regional_apci            numeric(8, 4),      -- Avena Property Composite Index value
  bubble_risk_score        int,                -- 0-100
  liquidity_score          int,                -- 0-100
  rental_market_depth      int,                -- estimated active rental supply in postcode
  source                   text,
  computed_at              timestamptz default now()
);

-- ── property_provenance is mission_events (already exists) — joinable by property_ref

-- ── RLS: public read across the board (institutional data is intentionally open) ──
alter table property_geo enable row level security;
alter table property_climate enable row level security;
alter table property_valuation enable row level security;
alter table property_valuation_history enable row level security;
alter table property_pricing_history enable row level security;
alter table property_transactions enable row level security;
alter table property_regulatory enable row level security;
alter table property_market enable row level security;

drop policy if exists "public read property_geo" on property_geo;
create policy "public read property_geo" on property_geo for select using (true);
drop policy if exists "public insert property_geo" on property_geo;
create policy "public insert property_geo" on property_geo for insert with check (true);
drop policy if exists "public update property_geo" on property_geo;
create policy "public update property_geo" on property_geo for update using (true);

drop policy if exists "public read property_climate" on property_climate;
create policy "public read property_climate" on property_climate for select using (true);
drop policy if exists "public insert property_climate" on property_climate;
create policy "public insert property_climate" on property_climate for insert with check (true);
drop policy if exists "public update property_climate" on property_climate;
create policy "public update property_climate" on property_climate for update using (true);

drop policy if exists "public read property_valuation" on property_valuation;
create policy "public read property_valuation" on property_valuation for select using (true);
drop policy if exists "public insert property_valuation" on property_valuation;
create policy "public insert property_valuation" on property_valuation for insert with check (true);
drop policy if exists "public update property_valuation" on property_valuation;
create policy "public update property_valuation" on property_valuation for update using (true);

drop policy if exists "public read property_valuation_history" on property_valuation_history;
create policy "public read property_valuation_history" on property_valuation_history for select using (true);
drop policy if exists "public insert property_valuation_history" on property_valuation_history;
create policy "public insert property_valuation_history" on property_valuation_history for insert with check (true);

drop policy if exists "public read property_pricing_history" on property_pricing_history;
create policy "public read property_pricing_history" on property_pricing_history for select using (true);
drop policy if exists "public insert property_pricing_history" on property_pricing_history;
create policy "public insert property_pricing_history" on property_pricing_history for insert with check (true);

drop policy if exists "public read property_transactions" on property_transactions;
create policy "public read property_transactions" on property_transactions for select using (true);
drop policy if exists "public insert property_transactions" on property_transactions;
create policy "public insert property_transactions" on property_transactions for insert with check (true);

drop policy if exists "public read property_regulatory" on property_regulatory;
create policy "public read property_regulatory" on property_regulatory for select using (true);
drop policy if exists "public insert property_regulatory" on property_regulatory;
create policy "public insert property_regulatory" on property_regulatory for insert with check (true);
drop policy if exists "public update property_regulatory" on property_regulatory;
create policy "public update property_regulatory" on property_regulatory for update using (true);

drop policy if exists "public read property_market" on property_market;
create policy "public read property_market" on property_market for select using (true);
drop policy if exists "public insert property_market" on property_market;
create policy "public insert property_market" on property_market for insert with check (true);
drop policy if exists "public update property_market" on property_market;
create policy "public update property_market" on property_market for update using (true);

commit;
