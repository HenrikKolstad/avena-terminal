-- property_transactions: de-duplicate, then make the duplication impossible.
--
-- THE DEFECT
-- /api/cron/dvf-ingest writes with a plain `.insert()`, and there is no unique
-- constraint on the natural key. The cron rotates through 13 priority French
-- communes, so every ~2 weeks it re-ingests the same commune-year and appends
-- the whole thing again.
--
-- Measured 2026-09-04:
--     503,434 rows   (source 'dvf-fr', the only source in the table)
--      55,888 distinct (avn_prop_id, transacted_at) pairs
--     447,546 rows are re-inserted copies  = 88.9% of the table
--
-- WHY THIS IS A CREDIBILITY BUG, NOT HOUSEKEEPING
-- src/lib/deltas.ts getEngineTruth() publishes countOf('property_transactions')
-- — the RAW ROW COUNT — as `transactions`, rendered on /engine as "Verified
-- transactions" and described as "real closed transactions from the French land
-- registry (DVF)". The live page therefore overstates the transaction record by
-- roughly 9x. The page's own meta description says "396,000+ registered
-- transactions"; the true figure is ~55,900.
--
-- SAFETY — measured, not assumed
--   * 0 groups disagree on price_eur or price_per_m2_eur. Every duplicate is a
--     byte-identical re-insert, so collapsing them discards no information:
--       select count(*) from (
--         select avn_prop_id, transacted_at from property_transactions
--         group by 1,2
--         having count(distinct price_eur) > 1
--            or count(distinct coalesce(price_per_m2_eur,-1)) > 1) t;   -- 0
--   * 0 rows have a null avn_prop_id or transacted_at, so no row is excluded
--     from the key and none is silently dropped by the unique index.
--   * The row kept is the one with the lowest id — the FIRST observation of
--     each transaction, which is the one whose created_at is honest.
--
-- This file is deliberately NOT auto-applied. It deletes 447k rows from a table
-- that cannot be rebuilt from anything but a re-crawl, so it goes to a branch
-- for Henrik. Run the DRY RUN below first and read every line of it.
--
--   npx tsx scripts/dedupe-transactions-dryrun.ts

begin;

-- 1. Collapse each (avn_prop_id, transacted_at) group to its earliest row.
delete from public.property_transactions t
using public.property_transactions keep
where t.avn_prop_id   = keep.avn_prop_id
  and t.transacted_at = keep.transacted_at
  and t.id            > keep.id;

-- 2. Make the re-insert impossible rather than merely tidy. Without this the
--    table refills at ~3,000 rows a night and the published figure drifts
--    upward again.
create unique index if not exists property_transactions_natural_key
  on public.property_transactions (avn_prop_id, transacted_at);

commit;

-- After this lands, dvf-ingest's `.insert()` must become an upsert with
-- onConflict 'avn_prop_id,transacted_at' — that change ships in the same
-- branch. Applying this migration WITHOUT the route change turns every
-- re-ingest into a chunk of unique-violation errors, which the funnel would
-- correctly report as a total loss.
