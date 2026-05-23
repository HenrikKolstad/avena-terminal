-- Tables + columns required by the live-data rewrites of:
--   /api/intelligence/regime    → regime_history (snapshot of every run)
--   /api/v1/apci                 → market_snapshots (week-over-week delta)
--   /api/v1/transactions         → property_transactions (live AVM accuracy)
--   /api/v1/ghost/submissions    → ghost_submissions (sovereign filings tracker)
--   /api/v1/parasite/status      → auto_posts (already exists — adds platform/posted_at if missing)
--   /api/cron/push-training-data → hf_pushes.details column (push diagnostics)
--
-- All inserts use service-role or public-insert policies; reads are public.

begin;

-- 1. regime_history — every regime endpoint hit appends a snapshot. APCI
-- price_momentum reads from this, so a single source of truth for the
-- regime score over time.
create table if not exists regime_history (
  id              bigserial primary key,
  regime          text not null,
  regime_score    int not null,
  confidence      int,
  live_indicators int,
  total_indicators int,
  computed_at     timestamptz not null default now()
);
create index if not exists idx_regime_history_computed on regime_history (computed_at desc);
alter table regime_history enable row level security;
drop policy if exists "public read regime_history" on regime_history;
create policy "public read regime_history" on regime_history for select using (true);
drop policy if exists "public insert regime_history" on regime_history;
create policy "public insert regime_history" on regime_history for insert with check (true);

-- 2. market_snapshots — APCI uses this for week-over-week delta. Backwards-
-- compatible: if the table already exists we just add the apci column.
create table if not exists market_snapshots (
  id           bigserial primary key,
  apci         numeric,
  regime       text,
  median_pm2   int,
  computed_at  timestamptz not null default now()
);
do $$ begin
  alter table market_snapshots add column if not exists apci numeric;
exception when others then null; end $$;
create index if not exists idx_market_snapshots_computed on market_snapshots (computed_at desc);
alter table market_snapshots enable row level security;
drop policy if exists "public read market_snapshots" on market_snapshots;
create policy "public read market_snapshots" on market_snapshots for select using (true);
drop policy if exists "public insert market_snapshots" on market_snapshots;
create policy "public insert market_snapshots" on market_snapshots for insert with check (true);

-- 3. property_transactions — observed sold + avm pairs for AVM accuracy.
-- Written by a future Catastro/Registro ingestion cron.
create table if not exists property_transactions (
  id              bigserial primary key,
  property_ref    text,
  location        text,
  property_type   text,
  listed_price    numeric,
  sold_price      numeric,
  avm_estimate    numeric,
  list_date       date,
  sold_date       date,
  source          text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_property_transactions_sold on property_transactions (sold_date desc);
alter table property_transactions enable row level security;
drop policy if exists "public read property_transactions" on property_transactions;
create policy "public read property_transactions" on property_transactions for select using (true);
drop policy if exists "public insert property_transactions" on property_transactions;
create policy "public insert property_transactions" on property_transactions for insert with check (true);

-- 4. ghost_submissions — sovereign filings tracker. The Ghost agent records
-- each submission and any response from ECB/Eurostat/World Bank/IMF.
create table if not exists ghost_submissions (
  id                bigserial primary key,
  institution       text not null,
  format            text,
  data_type         text,
  status            text default 'pending',
  submission_date   timestamptz,
  response_status   text,
  notes             text,
  envelope_url      text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_ghost_submissions_status on ghost_submissions (status, submission_date desc);
alter table ghost_submissions enable row level security;
drop policy if exists "public read ghost_submissions" on ghost_submissions;
create policy "public read ghost_submissions" on ghost_submissions for select using (true);

-- 5. auto_posts — Parasite reads platform/posted_at. Add columns if missing.
create table if not exists auto_posts (
  id              bigserial primary key,
  platform        text not null,
  posted_at       timestamptz not null default now(),
  post_url        text,
  content_summary text,
  created_at      timestamptz not null default now()
);
do $$ begin
  alter table auto_posts add column if not exists platform text;
  alter table auto_posts add column if not exists posted_at timestamptz default now();
exception when others then null; end $$;
create index if not exists idx_auto_posts_platform_posted on auto_posts (platform, posted_at desc);
alter table auto_posts enable row level security;
drop policy if exists "public read auto_posts" on auto_posts;
create policy "public read auto_posts" on auto_posts for select using (true);

-- 6. hf_pushes.details — diagnostics column (commit URL, repo, status code).
do $$ begin
  alter table hf_pushes add column if not exists details jsonb;
exception when others then null; end $$;

-- 7. pulse_editions — Podcast reads slug + audio_url. Add columns if missing.
do $$ begin
  alter table pulse_editions add column if not exists slug text;
  alter table pulse_editions add column if not exists audio_url text;
exception when others then null; end $$;

commit;
