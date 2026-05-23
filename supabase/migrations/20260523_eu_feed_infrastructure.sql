-- ═══════════════════════════════════════════════════════════════════════════
-- EU-WIDE DATA INFRASTRUCTURE
-- Tables backing /api/cron/sync-feeds, /api/cron/sync-macro, the partner
-- portal at /data-partners, and the federation protocol.
--
-- Existing tables touched (additive, never destructive):
--   sold_properties   → add country column
--   price_snapshots   → add country column
--   federated_partners → add columns to match the v2 portal schema
--   federation_nodes   → add columns for capabilities + heartbeat
--   federated_submissions → add columns for validation + processing state
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── feed_configs ──────────────────────────────────────────────────────────
create table if not exists feed_configs (
  id                   uuid primary key default gen_random_uuid(),
  country_code         text not null,
  country_name         text,
  portal_name          text,
  feed_url             text,
  feed_type            text check (feed_type in ('xml','json','scrape')),
  field_map            jsonb,
  active               boolean default true,
  last_sync            timestamptz,
  sync_interval_hours  int default 24,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (country_code, portal_name)
);
create index if not exists idx_feed_configs_active on feed_configs (active, country_code);

alter table feed_configs enable row level security;
drop policy if exists "public read feed_configs" on feed_configs;
create policy "public read feed_configs" on feed_configs for select using (true);

-- ─── feed_sync_log ─────────────────────────────────────────────────────────
create table if not exists feed_sync_log (
  id                   uuid primary key default gen_random_uuid(),
  country_code         text,
  portal_name          text,
  started_at           timestamptz,
  completed_at         timestamptz,
  properties_total     int default 0,
  properties_added     int default 0,
  properties_removed   int default 0,
  properties_updated   int default 0,
  error                text,
  status               text,
  created_at           timestamptz default now()
);
create index if not exists idx_feed_sync_log_country on feed_sync_log (country_code, started_at desc);

alter table feed_sync_log enable row level security;
drop policy if exists "public read feed_sync_log" on feed_sync_log;
create policy "public read feed_sync_log" on feed_sync_log for select using (true);
drop policy if exists "public insert feed_sync_log" on feed_sync_log;
create policy "public insert feed_sync_log" on feed_sync_log for insert with check (true);

-- ─── macro_indicators ──────────────────────────────────────────────────────
create table if not exists macro_indicators (
  id              uuid primary key default gen_random_uuid(),
  indicator_key   text not null,
  indicator_name  text,
  value           numeric,
  previous_value  numeric,
  country_code    text,
  source_url      text,
  fetched_at      timestamptz default now(),
  valid_for_date  text,
  unique (indicator_key, valid_for_date)
);
create index if not exists idx_macro_indicators_key on macro_indicators (indicator_key, fetched_at desc);

alter table macro_indicators enable row level security;
drop policy if exists "public read macro_indicators" on macro_indicators;
create policy "public read macro_indicators" on macro_indicators for select using (true);
drop policy if exists "public insert macro_indicators" on macro_indicators;
create policy "public insert macro_indicators" on macro_indicators for insert with check (true);
drop policy if exists "public update macro_indicators" on macro_indicators;
create policy "public update macro_indicators" on macro_indicators for update using (true) with check (true);

-- ─── sold_properties + price_snapshots: add country tag ────────────────────
do $$ begin
  alter table sold_properties add column if not exists country text default 'ES';
  alter table price_snapshots add column if not exists country text default 'ES';
exception when others then null; end $$;
create index if not exists idx_sold_properties_country on sold_properties (country);
create index if not exists idx_price_snapshots_country on price_snapshots (country, snapshot_date desc);

-- ─── federated_partners v2 ─────────────────────────────────────────────────
-- The existing table (created by an older migration) used partner_name/region/data_type.
-- The new self-serve portal needs name/country_codes/data_types[] + estimated_volume.
-- Add new columns alongside the old ones so both code paths keep working.
do $$ begin
  alter table federated_partners
    add column if not exists name              text,
    add column if not exists contact_email     text,
    add column if not exists country_codes     text[],
    add column if not exists data_types        text[],
    add column if not exists estimated_volume  int,
    add column if not exists status            text default 'pending',
    add column if not exists approved_at       timestamptz;
exception when others then null; end $$;
create index if not exists idx_federated_partners_status on federated_partners (status);

-- ─── federated_submissions v2 ──────────────────────────────────────────────
do $$ begin
  alter table federated_submissions
    add column if not exists country_code      text,
    add column if not exists record_count      int,
    add column if not exists payload_hash      text,
    add column if not exists status            text default 'received',
    add column if not exists validation_errors jsonb,
    add column if not exists processed_at      timestamptz;
exception when others then null; end $$;

-- ─── federation_nodes v2 ───────────────────────────────────────────────────
do $$ begin
  alter table federation_nodes
    add column if not exists country_code      text,
    add column if not exists protocol_version  text default '1.0',
    add column if not exists capabilities      text[],
    add column if not exists last_heartbeat    timestamptz;
exception when others then null; end $$;

-- ─── Seed feed_configs from eu-feed-configs.js ─────────────────────────────
-- Idempotent: ON CONFLICT (country_code, portal_name) DO NOTHING preserves
-- any manual edits operators made via the Supabase UI.
insert into feed_configs (country_code, country_name, portal_name, feed_url, feed_type, field_map, active) values
  ('PT', 'Portugal',        'casa-sapo',        'https://www.casasapo.pt/Comum/RSS/Imoveis.xml', 'xml',    '{"ref":"guid","title":"title","description":"description","url":"link","town":"category","region":"category","type":"category","price":"price"}'::jsonb, true),
  ('NL', 'Netherlands',     'funda-nl',         null,                                            'xml',    '{"ref":"ObjectKey","title":"Adres.Straat","url":"URL","town":"Adres.Plaats","region":"Adres.Provincie","type":"TypeObject","price":"KoopPrijs","built_m2":"WoonOppervlakte","bedrooms":"AantalKamers","bathrooms":"AantalBadkamers","lat":"Coordinaten.Latitude","lng":"Coordinaten.Longitude","energy":"EnergieLabel"}'::jsonb, true),
  ('FR', 'France',          'seloger',          null,                                            'xml',    '{}'::jsonb, true),
  ('DE', 'Germany',         'immoscout24',      null,                                            'json',   '{}'::jsonb, true),
  ('IT', 'Italy',            'immobiliare-it',   'https://www.immobiliare.it/api-next/search-list/?vetrina=1', 'json', '{"ref":"realEstate.id","title":"realEstate.title","url":"seo.url","price":"realEstate.price.value"}'::jsonb, true),
  ('GR', 'Greece',          'spitogatos',       null,                                            'xml',    '{}'::jsonb, true),
  ('CY', 'Cyprus',          'bazaraki',         null,                                            'xml',    '{}'::jsonb, true),
  ('HR', 'Croatia',         'njuskalo',         null,                                            'xml',    '{}'::jsonb, true),
  ('MT', 'Malta',           'propertymalta',    null,                                            'json',   '{}'::jsonb, true),
  ('AT', 'Austria',         'willhaben',        null,                                            'xml',    '{}'::jsonb, true),
  ('BE', 'Belgium',         'immoweb',          null,                                            'json',   '{}'::jsonb, true),
  ('SE', 'Sweden',          'hemnet',           null,                                            'xml',    '{}'::jsonb, true),
  ('DK', 'Denmark',         'boligsiden',       null,                                            'json',   '{}'::jsonb, true),
  ('FI', 'Finland',         'etuovi',           null,                                            'xml',    '{}'::jsonb, true),
  ('IE', 'Ireland',         'daft-ie',          null,                                            'json',   '{}'::jsonb, true),
  ('LU', 'Luxembourg',      'athome-lu',        null,                                            'xml',    '{}'::jsonb, true),
  ('PL', 'Poland',          'otodom',           null,                                            'json',   '{}'::jsonb, true),
  ('CZ', 'Czech Republic',  'sreality',         null,                                            'json',   '{}'::jsonb, true),
  ('SK', 'Slovakia',        'nehnutelnosti',    null,                                            'xml',    '{}'::jsonb, true),
  ('HU', 'Hungary',         'ingatlan-com',     null,                                            'xml',    '{}'::jsonb, true),
  ('RO', 'Romania',         'imobiliare-ro',    null,                                            'xml',    '{}'::jsonb, true),
  ('BG', 'Bulgaria',        'imot-bg',          null,                                            'xml',    '{}'::jsonb, true),
  ('SI', 'Slovenia',        'nepremicnine',     null,                                            'xml',    '{}'::jsonb, true),
  ('EE', 'Estonia',         'kv-ee',            null,                                            'json',   '{}'::jsonb, true),
  ('LV', 'Latvia',          'ss-lv',            null,                                            'xml',    '{}'::jsonb, true),
  ('LT', 'Lithuania',       'aruodas',          null,                                            'xml',    '{}'::jsonb, true)
on conflict (country_code, portal_name) do nothing;

commit;
