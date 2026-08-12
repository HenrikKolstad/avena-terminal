-- property_pricing_history cannot record a single live price move.
--
-- avn_prop_id carries:
--   FOREIGN KEY (avn_prop_id) REFERENCES properties_registry(avn_prop_id)
--   ON DELETE CASCADE
--
-- properties_registry froze on 2026-05-24 and is keyed in a different space:
-- 60,792 rows, and ZERO of the 1,999 refs currently on the market appear in
-- it. Measured 2026-08-11:
--
--   registry_rows                    60792
--   live_refs (price_snapshots)       1999
--   live_refs_missing_from_registry   1999   <-- all of them
--
-- So every insert keyed by a RedSP ref is rejected. This — not the diff bug
-- fixed in 7478108 — is the deepest reason the table holds 394k 'listed'
-- rows and not one 'reduced' or 'increased'. On 2026-08-11 the route
-- correctly detected 13 real reprices and the FK rejected all 13.
--
-- The ON DELETE CASCADE is a second, latent hazard: any cleanup of the dead
-- registry would silently delete the entire pricing history with it.
--
-- price_snapshots remains the ground truth for price movement and is
-- unaffected by this migration; deltas.ts reads it and is correct today.
-- This migration only makes the event log able to accept what the route
-- already observes.

ALTER TABLE property_pricing_history
  DROP CONSTRAINT IF EXISTS property_pricing_history_avn_prop_id_fkey;

-- The event log is append-only and keyed by RedSP ref going forward. No
-- replacement FK: the live book is the feed, not a registry table, and
-- re-pointing at a table that freezes again would reintroduce exactly this
-- failure. Existing 394k rows are untouched.

CREATE INDEX IF NOT EXISTS idx_pricing_history_recorded_at
  ON property_pricing_history (recorded_at DESC);
