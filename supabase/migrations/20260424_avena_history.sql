-- AVENA Index daily close history.
-- One row per trading day (UTC). Immutable once inserted.

begin;

create table if not exists avena_history (
  id            bigserial primary key,
  snapshot_date date not null unique,
  value         numeric(12, 4) not null,
  median_pm2    int,
  mean_score    numeric(6, 2),
  count         int,
  value_index   numeric(10, 6),
  score_index   numeric(10, 6),
  depth_index   numeric(10, 6),
  methodology   text default 'v1.0',
  created_at    timestamptz not null default now()
);

create index if not exists idx_avena_history_date
  on avena_history (snapshot_date desc);

alter table avena_history enable row level security;

drop policy if exists "public read avena_history" on avena_history;
create policy "public read avena_history"
  on avena_history for select using (true);

drop policy if exists "public insert avena_history" on avena_history;
create policy "public insert avena_history"
  on avena_history for insert with check (true);

commit;
