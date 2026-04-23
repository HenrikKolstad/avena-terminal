-- Daily snapshots of per-property scores. Powers:
--   - "+2 this week" deltas on property pages
--   - watchlist alerts when score changes
--   - track-record attribution
--
-- One row per (property_ref, snapshot_date).

begin;

create table if not exists score_history (
  id             bigserial primary key,
  property_ref   text not null,
  snapshot_date  date not null default (now() at time zone 'utc')::date,
  avena_score    int  not null,
  price_eur      int,
  pm2_eur        int,
  mm2_eur        int,
  yield_gross    numeric,
  created_at     timestamptz not null default now(),
  unique (property_ref, snapshot_date)
);

create index if not exists idx_score_history_ref_date
  on score_history (property_ref, snapshot_date desc);

alter table score_history enable row level security;

drop policy if exists "public read score_history" on score_history;
create policy "public read score_history"
  on score_history for select using (true);

drop policy if exists "public insert score_history" on score_history;
create policy "public insert score_history"
  on score_history for insert with check (true);

commit;
