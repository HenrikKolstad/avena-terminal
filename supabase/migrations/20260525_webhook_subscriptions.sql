-- ═══════════════════════════════════════════════════════════════════════════
-- WEBHOOK SUBSCRIPTIONS — institutional integration surface.
-- Banks, supervisory authorities, and trading desks can register a URL
-- that gets POSTed every time a new event fires (macro anomaly, sovereign
-- briefing published, AVN-ID issued, cross-validation snapshot computed).
--
-- Every delivery carries an X-Avena-Signature header (HMAC-SHA256 of the
-- body using the subscription's secret), so the consumer can authenticate
-- the request came from Avena and wasn't tampered with in transit.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists webhook_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  url             text not null,
  secret          text not null,                  -- HMAC signing key (32 bytes hex)
  events          text[] not null default '{}',   -- subscribed event types
  contact_email   text,
  organisation    text,
  status          text default 'active',          -- active | paused | revoked
  created_at      timestamptz default now(),
  last_delivery_at timestamptz,
  failure_count   int default 0,
  last_error      text,
  unique (url, events)
);
create index if not exists idx_webhook_subs_status on webhook_subscriptions (status, created_at desc);
create index if not exists idx_webhook_subs_events on webhook_subscriptions using gin (events);

alter table webhook_subscriptions enable row level security;
drop policy if exists "public insert webhook_subscriptions" on webhook_subscriptions;
create policy "public insert webhook_subscriptions" on webhook_subscriptions for insert with check (true);
-- No public read — subscriptions are private to the subscriber

-- Delivery log — every POST attempt is recorded for audit
create table if not exists webhook_deliveries (
  id              bigserial primary key,
  subscription_id uuid references webhook_subscriptions(id) on delete cascade,
  event_type      text not null,
  event_payload   jsonb,
  http_status     int,
  response_body   text,
  signature       text,
  delivered_at    timestamptz default now(),
  duration_ms     int,
  error           text
);
create index if not exists idx_webhook_deliveries_sub on webhook_deliveries (subscription_id, delivered_at desc);
create index if not exists idx_webhook_deliveries_event on webhook_deliveries (event_type, delivered_at desc);

alter table webhook_deliveries enable row level security;
drop policy if exists "public insert webhook_deliveries" on webhook_deliveries;
create policy "public insert webhook_deliveries" on webhook_deliveries for insert with check (true);

-- Aggregate stats public read (anonymised — no URLs / secrets)
create or replace view webhook_stats as
select
  count(*) filter (where status = 'active')   as active_subscribers,
  count(*) filter (where status = 'paused')   as paused_subscribers,
  array_agg(distinct unnest_event) filter (where unnest_event is not null) as distinct_events
from webhook_subscriptions,
  lateral unnest(events) as unnest_event;

commit;
