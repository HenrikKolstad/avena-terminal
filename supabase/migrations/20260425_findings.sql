-- EU Takeover — append-only ledger of every agent finding.
-- Every scan, score, index, signature gets a row. Counter climbs forever.

begin;

create table if not exists findings (
  id            bigserial primary key,
  recorded_at   timestamptz not null default now(),
  agent_id      text not null,           -- 'iberia' | 'costa-blanca' | 'algarve' | etc.
  agent_name    text,                    -- 'Agent Iberia'
  country       text not null,           -- 'Spain' | 'Portugal' | 'France' | 'Italy' | 'Greece'
  region        text,                    -- 'Costa Blanca' | 'Algarve' | etc.
  action        text not null,           -- 'ingested' | 'scored' | 'indexed' | 'signed' | 'flagged'
  property_ref  text,                    -- our internal ref or AVN_PROP_ID
  score         int,                     -- if action='scored'
  source        text,                    -- 'idealista' | 'kyero' | etc.
  metadata      jsonb
);

create index if not exists idx_findings_recorded   on findings (recorded_at desc);
create index if not exists idx_findings_agent      on findings (agent_id, recorded_at desc);
create index if not exists idx_findings_country    on findings (country, recorded_at desc);
create index if not exists idx_findings_action     on findings (action, recorded_at desc);

alter table findings enable row level security;

drop policy if exists "public read findings" on findings;
create policy "public read findings"
  on findings for select using (true);

drop policy if exists "public insert findings" on findings;
create policy "public insert findings"
  on findings for insert with check (true);

commit;
