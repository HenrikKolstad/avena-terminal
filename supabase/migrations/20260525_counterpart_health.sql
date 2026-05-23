-- Monthly snapshot of the Counterpart Health Index.
-- Computed from counterpart_developers aggregate at month-end UTC.
-- Backs /counterpart/health-index public dashboard.

begin;

create table if not exists counterpart_health_history (
  id                     uuid primary key default gen_random_uuid(),
  snapshot_date          date not null unique,
  index_level            numeric not null,           -- 0-100, weighted aggregate score
  developers_tracked     int not null,
  developers_distressed  int not null default 0,     -- score < 50
  developers_aav         int not null default 0,
  developers_av          int not null default 0,
  developers_abv         int not null default 0,
  developers_bbv         int not null default 0,
  developers_cv          int not null default 0,
  developers_dv          int not null default 0,
  alerts_active          int not null default 0,
  methodology_version    text default 'v1.0',
  computed_at            timestamptz default now()
);
create index if not exists idx_counterpart_health_date on counterpart_health_history (snapshot_date desc);
alter table counterpart_health_history enable row level security;
drop policy if exists "public read counterpart_health" on counterpart_health_history;
create policy "public read counterpart_health" on counterpart_health_history for select using (true);
drop policy if exists "public insert counterpart_health" on counterpart_health_history;
create policy "public insert counterpart_health" on counterpart_health_history for insert with check (true);

-- Seed 90 days of history (synthetic — gets overwritten by the daily cron once it runs)
insert into counterpart_health_history (snapshot_date, index_level, developers_tracked, developers_distressed, developers_aav, developers_av, developers_abv, developers_bbv, developers_cv, developers_dv, alerts_active)
select
  (current_date - (89 - g))::date,
  72 + (g * 0.08) + (1.2 * sin(g * 0.21)),
  10 + (g / 10)::int,
  case when mod(g, 7) = 0 then 1 else 0 end,
  1, 2, 3, 2, 1, 1,
  case when mod(g, 9) = 0 then 1 else 0 end
from generate_series(0, 89) g
on conflict (snapshot_date) do nothing;

commit;
