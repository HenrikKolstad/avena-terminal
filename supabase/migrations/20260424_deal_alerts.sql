-- Deal alerts — users subscribe to get notified when new properties
-- above a threshold score land in selected regions.

begin;

create table if not exists deal_alerts (
  id              bigserial primary key,
  email           text not null,
  regions         text[] not null default '{}',      -- ['costa-blanca','costa-del-sol',...] or ['*']
  min_score       int not null default 70,
  max_price_eur   int,
  min_yield       numeric,
  active          boolean not null default true,
  last_sent_at    timestamptz,
  created_at      timestamptz not null default now(),
  confirmed       boolean not null default false,
  confirm_token   text,
  unsubscribe_token text
);

create index if not exists idx_deal_alerts_email on deal_alerts (email);
create index if not exists idx_deal_alerts_active on deal_alerts (active, last_sent_at);

alter table deal_alerts enable row level security;

drop policy if exists "public insert deal_alerts" on deal_alerts;
create policy "public insert deal_alerts"
  on deal_alerts for insert with check (true);

-- no public read (PII)
drop policy if exists "public update own deal_alerts" on deal_alerts;
create policy "public update own deal_alerts"
  on deal_alerts for update
  using (unsubscribe_token is not null)
  with check (unsubscribe_token is not null);

commit;
