-- Avena Agent missions — one row per buying brief a user submits.
-- The agent autonomously scans inventory, ranks matches, drafts outreach,
-- and persists the full mission state here so users can resume later.

begin;

create table if not exists agent_missions (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'draft',  -- draft | analyzing | ready | sent | closed
  brief           jsonb not null,                  -- full user brief (criteria)
  matches         jsonb,                           -- ranked property matches
  outreach        jsonb,                           -- drafted emails per match
  user_email      text,                            -- where to notify
  approved_refs   text[] default '{}',             -- refs the user approved for outreach
  session_token   text unique,                     -- anon session id (no auth required)
  notes           text
);

create index if not exists idx_agent_missions_created   on agent_missions (created_at desc);
create index if not exists idx_agent_missions_status    on agent_missions (status);
create index if not exists idx_agent_missions_token     on agent_missions (session_token);

alter table agent_missions enable row level security;

drop policy if exists "public insert agent_missions" on agent_missions;
create policy "public insert agent_missions"
  on agent_missions for insert with check (true);

drop policy if exists "public read by token" on agent_missions;
create policy "public read by token"
  on agent_missions for select using (session_token is not null);

drop policy if exists "public update by token" on agent_missions;
create policy "public update by token"
  on agent_missions for update
  using (session_token is not null)
  with check (session_token is not null);

commit;
