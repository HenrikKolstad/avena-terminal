-- Append-only event log for every action Avena Agent takes on a mission.
-- This is the cryptographic chain — each row is signed and timestamped.
-- Powers the public mission timeline + audit trail for autonomous transactions.

begin;

create table if not exists mission_events (
  id              bigserial primary key,
  mission_id      bigint not null,
  occurred_at     timestamptz not null default now(),
  actor           text not null,                -- 'agent' | 'user' | 'counterparty' | 'system'
  event_type      text not null,                -- 'mission_created' | 'outreach_drafted' | 'outreach_sent' | 'reply_received' | 'offer_signed' | 'counter_signed' | 'closed' | 'aborted'
  property_ref    text,                         -- AVN_PROP_ID if event is property-specific
  to_email        text,                         -- if event involves outbound communication
  subject         text,
  body            text,
  avp_doc         jsonb,                        -- AVP-compliant signed document if applicable
  signature       text,                         -- sha256 of (prev_signature || event payload)
  prev_signature  text,                         -- hash chain pointer
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_mission_events_mission_id  on mission_events (mission_id, occurred_at desc);
create index if not exists idx_mission_events_event_type  on mission_events (event_type, occurred_at desc);
create index if not exists idx_mission_events_property    on mission_events (property_ref, occurred_at desc);

alter table mission_events enable row level security;

drop policy if exists "public read mission_events" on mission_events;
create policy "public read mission_events" on mission_events for select using (true);

drop policy if exists "public insert mission_events" on mission_events;
create policy "public insert mission_events" on mission_events for insert with check (true);

commit;
