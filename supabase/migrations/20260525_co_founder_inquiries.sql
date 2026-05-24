-- ═══════════════════════════════════════════════════════════════════════════
-- CO-FOUNDER INQUIRIES — captures applications to the /careers/co-founder
-- archetype page. Not a job posting; a search for one specific person who
-- brings senior industry credentials Avena currently lacks.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists co_founder_inquiries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  full_name       text not null,
  contact_email   text not null,
  linkedin_url    text,
  current_role    text,
  current_org     text,
  archetype_fit   text,                 -- free-text: which archetype facets they match
  bet_thesis      text,                 -- their answer to "why bet on this"
  ip_address      text,                 -- for spam triage
  status          text default 'new'    -- new | replied | meeting_booked | declined | hired
);
create index if not exists idx_co_founder_inquiries_created on co_founder_inquiries (created_at desc);
create index if not exists idx_co_founder_inquiries_status on co_founder_inquiries (status);

alter table co_founder_inquiries enable row level security;
drop policy if exists "public insert co_founder_inquiries" on co_founder_inquiries;
create policy "public insert co_founder_inquiries" on co_founder_inquiries for insert with check (true);
-- No public read — applications are private to the admin

commit;
