-- gsc_queries — the query dimension of Search Console, captured nightly.
--
-- WHY THIS EXISTS (2026-10-06)
--
-- Weekly impressions have fallen for six consecutive weeks: 953 → 647 → 635
-- → 497 → 322 (and 187 across 6 days of the current week), from a pre-change
-- band of 427–758. Decomposed from gsc_pages, BOTH factors fell — pages with
-- at least one impression 221 → 150, impressions per page 4.31 → 2.15 — while
-- average position IMPROVED, 24.7 → 17.8.
--
-- Fewer impressions at BETTER positions is not the signature of a demotion.
-- It is the signature of being matched to fewer queries. But "fewer queries"
-- and "the same queries, less demand" are different diagnoses with opposite
-- responses, and nothing in gsc_daily or gsc_pages can tell them apart,
-- because the capture has never recorded a query.
--
-- Search Console retains 16 months. Every night without the query dimension
-- is a night of it permanently lost — exactly the argument the price ledger
-- rests on, applied to our own visibility. This table closes that hole.
--
-- Keyed on (date, query) so the nightly re-fetch window upserts idempotently
-- and a day Google restates self-corrects, the same contract as gsc_daily
-- and gsc_pages.

create table if not exists gsc_queries (
  date          date    not null,
  query         text    not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  avg_position  numeric(6, 2),
  created_at    timestamptz not null default now(),
  primary key (date, query)
);

create index if not exists gsc_queries_date_idx on gsc_queries (date desc);
create index if not exists gsc_queries_impressions_idx on gsc_queries (impressions desc);

comment on table gsc_queries is
  'Nightly Search Console query-dimension capture. Added 2026-10-06 to make a visibility decline diagnosable: impressions halved while average position improved, and no query-level data existed to say whether matching or demand moved.';
