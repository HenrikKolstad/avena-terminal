-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: correct `sold_properties.last_seen_date` to the date each unit was
-- actually last OBSERVED, not the date the run noticed it was gone.
--
-- NOT RUN AUTOMATICALLY. This mutates an existing column on historical rows of
-- the one table in this project that cannot be reconstructed from anywhere
-- else, so it goes to a branch for Henrik rather than to main.
--
-- WHY
--   parse-feed.js stamped `today` — the date of absence. pricing-history has
--   always stored its priorDate — the date of last observation. Both write the
--   same column, parse-feed runs first and upserts on `ref`, so parse-feed won.
--   Measured 2026-08-19 across all 75 tombstones:
--       36  stamped exactly one day late   (parse-feed)
--       31  stamped correctly              (pricing-history)
--        8  stamped BEFORE their newest snapshot — the 2026-08-06..09 rows that
--           O-7 records as a union of two books; deliberately left alone here
--        3  units that are LIVE in today's feed — delisted then relisted, and
--           the tombstone was never retracted (tracked separately as O-43)
--
-- THE RULE
--   true_last_seen = the newest snapshot_date for that ref that is ON OR BEFORE
--   the currently stored last_seen_date.
--
--   This only ever moves a date BACKWARD, and only ever onto a day the unit was
--   genuinely observed in price_snapshots. It cannot invent a date, cannot move
--   a date forward, and leaves the two pathological cohorts above untouched:
--     - a correctly stamped row resolves to itself and does not change;
--     - an O-7 row (stamped earlier than its newest snapshot) resolves to
--       itself, because snapshots after the stamp are excluded by the bound;
--     - a relisted unit's post-relisting snapshots are excluded for the same
--       reason, so the backfill cannot silently paper over O-43.
--
-- HOW TO USE
--   1. Run STEP 1 and read it. It changes nothing.
--   2. Confirm `would_change` is 37 and every `new_date` is exactly one day
--      before its `old_date`. Anything else means re-examine before writing.
--
-- DRY RUN AS EXECUTED 2026-08-19 (read-only, against production):
--     would_change 37 · already_correct 38 · no_snapshot_leave_alone 0 · total 75
--     max_days_moved 1 · min_days_moved 0
--   Every row it touches moves back exactly one day; nothing moves further.
--   37 rather than 36 because one of the three relisted units was also stamped
--   a day late, and the bounded rule corrects its date without touching the
--   separate question of whether it should be a tombstone at all (O-43).
--   3. Run STEP 2 inside the transaction and check the reported row count
--      before COMMIT.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── STEP 1 — dry run. Read-only. ────────────────────────────────────────────
with resolved as (
  select
    s.ref,
    s.last_seen_date as old_date,
    (select max(p.snapshot_date)
       from price_snapshots p
      where p.ref = s.ref
        and p.snapshot_date <= s.last_seen_date) as new_date
  from sold_properties s
)
select
  count(*) filter (where new_date is not null and new_date <> old_date) as would_change,
  count(*) filter (where new_date is not null and new_date = old_date)  as already_correct,
  count(*) filter (where new_date is null)                              as no_snapshot_leave_alone,
  count(*)                                                              as total
from resolved;

-- Per-row detail for the same dry run — eyeball this before writing anything.
with resolved as (
  select
    s.ref,
    s.last_seen_date as old_date,
    (select max(p.snapshot_date)
       from price_snapshots p
      where p.ref = s.ref
        and p.snapshot_date <= s.last_seen_date) as new_date
  from sold_properties s
)
select ref, old_date, new_date, (old_date - new_date) as days_moved_back
from resolved
where new_date is not null and new_date <> old_date
order by old_date desc, ref;

-- ── STEP 2 — the write. Wrapped; check the count, then COMMIT or ROLLBACK. ──
-- begin;
--
-- update sold_properties s
--    set last_seen_date = r.new_date
--   from (
--     select
--       s2.ref,
--       (select max(p.snapshot_date)
--          from price_snapshots p
--         where p.ref = s2.ref
--           and p.snapshot_date <= s2.last_seen_date) as new_date
--     from sold_properties s2
--   ) r
--  where r.ref = s.ref
--    and r.new_date is not null
--    and r.new_date <> s.last_seen_date;
--
-- -- Expect the same number STEP 1 reported as `would_change`.
-- commit;
