-- 2026-10-22 — create bandit_arms (used by /api/v1/experimental/bandit).
-- The route has always read/upserted this table, but it was never created,
-- so every write failed silently. Writes go through the service role only
-- (POST now requires the admin token or cron secret); reads are public.
-- Non-destructive: new empty table.

begin;

create table if not exists public.bandit_arms (
  persona    text not null,
  arm        text not null,
  alpha      double precision not null default 1,
  beta       double precision not null default 1,
  updated_at timestamptz not null default now(),
  primary key (persona, arm)
);

alter table public.bandit_arms enable row level security;

grant select on table public.bandit_arms to anon, authenticated;
drop policy if exists "public read bandit_arms" on public.bandit_arms;
create policy "public read bandit_arms" on public.bandit_arms for select using (true);

commit;
