-- Agent Mentat — terminal command health log.
-- Each row is one health-check ping against a backend endpoint.

begin;

create table if not exists command_health (
  id          bigserial primary key,
  command     text not null,
  endpoint    text not null,
  ok          boolean not null,
  status      int,
  duration_ms int,
  error       text,
  checked_at  timestamptz not null default now()
);

create index if not exists idx_command_health_command_time
  on command_health (command, checked_at desc);
create index if not exists idx_command_health_ok
  on command_health (ok, checked_at desc);

alter table command_health enable row level security;

drop policy if exists "public read command_health" on command_health;
create policy "public read command_health"
  on command_health for select using (true);

drop policy if exists "public insert command_health" on command_health;
create policy "public insert command_health"
  on command_health for insert with check (true);

commit;
