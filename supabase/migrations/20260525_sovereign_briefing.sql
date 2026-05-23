-- ═══════════════════════════════════════════════════════════════════════════
-- SOVEREIGN BRIEFING SERVICE
-- Monthly institutional research notes distributed to central banks,
-- ESMA, EIB, OECD, national statistics offices. Each note is published
-- at a permanent URL + dispatched via Resend.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists sovereign_briefings (
  id              uuid primary key default gen_random_uuid(),
  volume          int unique not null,
  slug            text unique not null,
  title           text not null,
  subtitle        text,
  publication_date date not null,
  abstract        text not null,
  body_markdown   text not null,
  key_findings    jsonb,
  methodology_note text,
  data_doi        text default '10.5281/zenodo.19520064',
  cite_as         text,
  recipient_count int default 0,
  sent_at         timestamptz,
  status          text default 'draft',                     -- draft | published | distributed
  authors         text[] default array['Avena Research Desk'],
  topics          text[],
  created_at      timestamptz default now()
);
create index if not exists idx_briefings_volume on sovereign_briefings (volume desc);
create index if not exists idx_briefings_status on sovereign_briefings (status, publication_date desc);
alter table sovereign_briefings enable row level security;
drop policy if exists "public read briefings" on sovereign_briefings;
create policy "public read briefings" on sovereign_briefings for select using (true);

create table if not exists sovereign_recipients (
  id                uuid primary key default gen_random_uuid(),
  organisation      text not null,
  department        text,
  contact_name      text,
  contact_email     text not null,
  country_code      text,
  category          text,                                   -- central_bank | esma | eib | oecd | nso | regulator | other
  status            text default 'active',                  -- active | bounced | unsubscribed
  added_at          timestamptz default now()
);
create index if not exists idx_recipients_category on sovereign_recipients (category);
alter table sovereign_recipients enable row level security;

create table if not exists sovereign_dispatches (
  id            uuid primary key default gen_random_uuid(),
  briefing_id   uuid references sovereign_briefings(id) on delete cascade,
  recipient_id  uuid references sovereign_recipients(id) on delete cascade,
  status        text default 'queued',                       -- queued | sent | bounced | opened
  sent_at       timestamptz,
  opened_at     timestamptz,
  resend_message_id text,
  created_at    timestamptz default now()
);
create index if not exists idx_dispatches_briefing on sovereign_dispatches (briefing_id);
alter table sovereign_dispatches enable row level security;

commit;
