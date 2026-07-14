-- Leads from the enquiry flow (2026-07-02). The money wire's ledger.
-- Written by the service-role client only; no public read.

create table if not exists leads_enquiries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  email         text not null,
  phone         text,
  budget        text,
  region        text,
  message       text,
  property_ref  text,
  source        text not null default 'enquire_page',
  status        text not null default 'new' -- new | contacted | viewing | offer | closed | lost
);

alter table leads_enquiries enable row level security;
-- No public policies: service-role writes/reads only. Intentional.

create index if not exists leads_enquiries_created_idx on leads_enquiries (created_at desc);
create index if not exists leads_enquiries_status_idx  on leads_enquiries (status);
