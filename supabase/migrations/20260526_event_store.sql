-- ═══════════════════════════════════════════════════════════════════════════
-- EVENT STORE — append-only event log. Source of truth for every state
-- change in Avena. The Supabase tables you already have become "current
-- state projections" of the event stream. Enables time travel (?as_of=…)
-- as a native primitive across every read endpoint.
--
-- This is foundational infrastructure (Architectural Commitment 1). Cannot
-- be retrofitted later. Every high-value mutation in the system writes an
-- event BEFORE updating its projection. Reads can replay events up to any
-- timestamp to reconstruct historical state.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists events (
  event_id         uuid primary key default gen_random_uuid(),
  event_type       text not null,                  -- e.g. 'property.score_updated', 'regime.classified'
  aggregate_id     text not null,                  -- the entity this event mutates (property avn_id, market code, etc.)
  aggregate_type   text not null,                  -- 'property' | 'regime' | 'counterpart' | 'avm_query' | 'memo' | 'methodology' | 'macro'
  payload          jsonb not null,                 -- the actual state change
  metadata         jsonb,                          -- actor, request_id, source, etc.
  occurred_at      timestamptz not null default now(),  -- when it happened in the real world
  recorded_at      timestamptz not null default now(),  -- when we wrote it
  sequence_number  bigserial
);

create index if not exists events_by_aggregate on events (aggregate_id, sequence_number);
create index if not exists events_by_time      on events (occurred_at desc);
create index if not exists events_by_type      on events (event_type, occurred_at desc);
create index if not exists events_by_type_agg  on events (aggregate_type, occurred_at desc);

-- Public read is enabled so /verify and /timetravel can replay history
-- without service-role keys. Writes are server-side (service role) only.
alter table events enable row level security;
drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (true);

commit;
