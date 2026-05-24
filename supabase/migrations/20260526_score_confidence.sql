-- ═══════════════════════════════════════════════════════════════════════════
-- SCORE CONFIDENCE — Architectural Commitment 5 (adversarial validation).
--
-- Every Avena Score is produced by the primary scoring model. The
-- adversarial layer predicts the residual error of the primary model on
-- each property; confidence = 1.0 - normalized_residual_magnitude.
--
-- Properties whose adversarial residual exceeds a threshold are flagged
-- for human review. Institutional buyers see confidence on every score —
-- transparency about uncertainty is the differentiator.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists score_confidence (
  property_ref          text primary key,
  primary_score         numeric not null,                  -- the score the primary model output
  adversarial_residual  numeric not null,                  -- predicted error magnitude (0..50)
  confidence            numeric not null,                  -- 0.0 - 1.0
  flagged_for_review    boolean not null default false,
  reason_codes          text[] default '{}',               -- e.g. ['comp_sparse','extreme_price_m2','missing_energy']
  model_version         text not null default 'adv-v1.0',
  computed_at           timestamptz not null default now()
);

create index if not exists idx_score_confidence_flagged
  on score_confidence (flagged_for_review, computed_at desc) where flagged_for_review = true;
create index if not exists idx_score_confidence_low
  on score_confidence (confidence asc, computed_at desc);

alter table score_confidence enable row level security;
drop policy if exists "public read score_confidence" on score_confidence;
create policy "public read score_confidence" on score_confidence for select using (true);

commit;
