-- The Avena Weekly — newsletter subscription + per-issue archive.
-- Subscribers sign up via the homepage form; cron sends every Monday 07:30 UTC.

begin;

create table if not exists newsletter_subscribers (
  id             bigserial primary key,
  email          text not null unique,
  status         text not null default 'active',   -- active | unsubscribed | bounced
  source         text default 'homepage',           -- homepage | exit-intent | footer | tiktok
  locale         text default 'en',
  subscribed_at  timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists idx_newsletter_subscribers_status
  on newsletter_subscribers (status, subscribed_at desc);

create table if not exists newsletter_issues (
  id             bigserial primary key,
  issue_number   int not null unique,
  sent_at        timestamptz not null default now(),
  subject        text not null,
  preview_text   text,
  html           text not null,
  plain_text     text not null,
  recipients     int not null default 0,
  signals        jsonb not null default '{}'::jsonb  -- {apci, hot_region, yield_leader, ...}
);

create index if not exists idx_newsletter_issues_sent
  on newsletter_issues (sent_at desc);

alter table newsletter_subscribers enable row level security;
alter table newsletter_issues       enable row level security;

drop policy if exists "public read newsletter_issues" on newsletter_issues;
create policy "public read newsletter_issues"
  on newsletter_issues for select
  using (true);
-- subscribers table stays service-role only (PII)

commit;
