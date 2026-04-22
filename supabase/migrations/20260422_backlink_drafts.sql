-- Backlink drafts — Claude-generated Reddit / Quora / blog replies that
-- reference Avena, queued for human review + manual posting.
--
-- Auto-posting external platforms = instant shadowban. Human-in-the-loop.
-- Cron writes 3 drafts 3x/week (Mon/Wed/Fri 10:00 UTC) + emails them to
-- Henrik via Resend.

begin;

create table if not exists backlink_drafts (
  id             bigserial primary key,
  surface        text not null,                -- reddit | quora | stackexchange | facebook | blog
  target         text,                         -- subreddit / quora space / forum name
  question       text not null,
  draft          text not null,
  links_used     jsonb not null default '[]'::jsonb,
  language       text not null default 'en',   -- en | no | sv
  posted         boolean not null default false,
  posted_url     text,
  posted_at      timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_backlink_drafts_created
  on backlink_drafts (created_at desc);
create index if not exists idx_backlink_drafts_posted
  on backlink_drafts (posted, created_at desc);

alter table backlink_drafts enable row level security;

drop policy if exists "public read backlink_drafts" on backlink_drafts;
create policy "public read backlink_drafts"
  on backlink_drafts for select
  using (true);

commit;
