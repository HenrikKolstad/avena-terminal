-- ═══════════════════════════════════════════════════════════════════════════
-- INSTITUTIONAL OUTREACH — one-button cold-email pipeline.
-- Tracks the recipient catalogue + every sent email + replies. Reply-to
-- is Henrik's personal address so responses route to him directly; this
-- table is for Avena's own funnel observability.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Sent emails log (the recipient catalogue lives in code so it's versioned)
create table if not exists outreach_emails (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  recipient_id    text not null,                        -- matches OUTREACH_TARGETS[].id in lib
  recipient_name  text,
  recipient_email text not null,
  organisation    text,
  subject         text not null,
  body            text not null,
  scenario_url    text,
  status          text default 'sent',                  -- sent | bounced | replied | unsubscribed
  resend_id       text,
  sent_at         timestamptz default now(),
  replied_at      timestamptz,
  opened_at       timestamptz,
  error           text
);
create index if not exists idx_outreach_emails_recipient on outreach_emails (recipient_id, created_at desc);
create index if not exists idx_outreach_emails_status on outreach_emails (status, created_at desc);

alter table outreach_emails enable row level security;
drop policy if exists "public insert outreach_emails" on outreach_emails;
create policy "public insert outreach_emails" on outreach_emails for insert with check (true);
-- No public read — these are private outreach records

commit;
