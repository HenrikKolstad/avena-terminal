-- Honest agent logging — every cron run persists a real row.
-- Replaces the formula-based "tasks_completed" display on /swarm with
-- actual COUNT(*) of executions.

begin;

create table if not exists cron_logs (
  id            bigserial primary key,
  agent_id      text not null,           -- e.g. 'prometheus', 'cassandra', 'argus'
  cron_path     text,                    -- e.g. '/api/cron/prometheus'
  status        text not null,           -- 'started' | 'success' | 'error' | 'skipped'
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   int,
  output_summary jsonb,                  -- agent-specific data (rows published, calls made, etc.)
  error         text
);

create index if not exists idx_cron_logs_agent_started
  on cron_logs (agent_id, started_at desc);
create index if not exists idx_cron_logs_status
  on cron_logs (status, started_at desc);
create index if not exists idx_cron_logs_started
  on cron_logs (started_at desc);

alter table cron_logs enable row level security;

drop policy if exists "public read cron_logs" on cron_logs;
create policy "public read cron_logs"
  on cron_logs for select using (true);

commit;
