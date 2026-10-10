-- 2026-10-10 — stop the Counterpart score ratchet.
--
-- `counterpart-scan` re-applied a signal-derived drift every night to stress
-- signals that nothing in the codebase ever updates (no Registro Mercantil /
-- BORME ingest exists; the route calls it "future v2"). The drift was
-- therefore a constant, and any developer carrying a static stress signal
-- walked down to the clamp floor of 0 and was published at grade DV.
--
-- Measured from `events` before the fix: 122 `counterpart.grade_revised`
-- events per developer, every one with min(drift) == max(drift).
-- Neinor Homes 59 -> 0, Realia Patrimonio 49 -> 0, Metrovacesa 13 -> 0 —
-- real, publicly-listed Spanish developers, graded by a countdown.
--
-- ADDITIVE ONLY. Adds one nullable column holding a fingerprint of the drift
-- inputs, so a scan can tell whether it has learned anything since last night.
-- A NULL fingerprint means "never baselined" and the scan treats it as
-- no-evidence-of-change: it records the fingerprint and moves nothing.
-- No existing column is altered and no row is rewritten by this migration.

alter table public.counterpart_developers
  add column if not exists signals_fingerprint text;

comment on column public.counterpart_developers.signals_fingerprint is
  'Fingerprint of the drift inputs (payment_delay_signals, legal_disputes_active, court_judgements_against, delayed_projects, cancelled_projects, financial_stress_score) as of the last scan. counterpart-scan moves a score only when this changes: drift is a response to new information, not a daily decay. NULL = never baselined; the next scan records it without moving the score. See src/lib/counterpart-drift.ts.';
