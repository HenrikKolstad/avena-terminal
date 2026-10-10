-- 2026-10-10 — provenance for Counterpart scores, and a way to retract the
-- alerts the decay ratchet minted. BRANCH: odyssey/counterpart-decay-remediation.
--
-- Companion to 20261010_counterpart_signals_fingerprint.sql, which stopped the
-- ratchet. This one is about the rows it already wrote.
--
-- ADDITIVE ONLY. Two nullable columns. No existing column is altered, no row is
-- rewritten by this migration, and nothing is deleted. The row changes are made
-- by scripts/remediate-counterpart-decay.ts, which is dry-run by default.

alter table public.counterpart_developers
  add column if not exists score_provenance text;

comment on column public.counterpart_developers.score_provenance is
  'Where this score came from. "unsourced_seed" = hand-entered at table creation with no ingest path behind it. "decay_artifact" = moved by the counterpart-scan ratchet (constant drift re-applied nightly to static signals) and therefore not a measurement; the pre-ratchet value is NOT recoverable, because the alert log starts 2026-05-21 and the grade_revised event log only starts 2026-06-11. "measured" = derived from a real source. NULL = not yet classified. A score that is not "measured" must not be presented as a measurement.';

alter table public.counterpart_stress_alerts
  add column if not exists retracted_reason text;

comment on column public.counterpart_stress_alerts.retracted_reason is
  'Set when an alert is retracted rather than resolved. Alerts minted by the counterpart-scan decay ratchet were never observations: the drift that triggered them was a constant applied to signals nothing updates. Retracted alerts keep their row (nothing is deleted) and carry status = "retracted".';
