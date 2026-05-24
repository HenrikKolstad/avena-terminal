-- ═══════════════════════════════════════════════════════════════════════════
-- METHODOLOGY EVOLUTION — Architectural Commitment 3 (manual variant).
--
-- Every methodology that produces a number a customer might cite —
-- avena_score, apci, counterpart_score, avm — is versioned. New versions
-- are inserted with the rationale, weights, and the derivation method.
-- Old versions are kept forever; activation is gated on `activated_at`
-- and `deactivated_at`.
--
-- The /methodology/evolution page reads from this table and shows weight
-- evolution over time, derivation provenance, and out-of-sample accuracy
-- where measured. Published audit trail = credibility no marketing can buy.
--
-- Prediction outcomes feed the recalibration argument. Autonomous weekly
-- recalibration is intentionally NOT wired in v1 — too few samples to
-- avoid noise-chasing. Human-in-the-loop until ≥10k labelled resolutions.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists methodology_versions (
  version_id              uuid primary key default gen_random_uuid(),
  methodology_name        text not null,                  -- 'avena_score' | 'apci' | 'counterpart' | 'avm' | 'regulatory_classifier' | 'score_confidence'
  semver                  text not null,                  -- '1.0.0' style
  weights                 jsonb not null,                 -- the actual weights, structured per methodology
  rationale               text not null,                  -- why this version exists
  derivation_method       text not null,                  -- 'manual' | 'gradient_descent' | 'bayesian_update' | 'rebase'
  derived_from_version_id uuid references methodology_versions(version_id),
  activated_at            timestamptz not null default now(),
  deactivated_at          timestamptz,
  out_of_sample_accuracy  numeric,                        -- 0..1, optional
  sample_size             int,
  notes                   text
);

create index if not exists idx_methodology_active
  on methodology_versions (methodology_name, activated_at desc);
create index if not exists idx_methodology_current
  on methodology_versions (methodology_name) where deactivated_at is null;

alter table methodology_versions enable row level security;
drop policy if exists "public read methodology_versions" on methodology_versions;
create policy "public read methodology_versions" on methodology_versions for select using (true);

create table if not exists prediction_outcomes (
  id                                uuid primary key default gen_random_uuid(),
  prediction_id                     uuid not null,                          -- references predictions(id) once that table lands
  prediction_methodology_version_id uuid references methodology_versions(version_id),
  predicted_at                      timestamptz not null,
  prediction_value                  numeric,
  prediction_metric                 text,                                    -- 'price_per_m2' | 'yield_gross_pct' | 'regime_score' | ...
  resolved_at                       timestamptz,
  actual_value                      numeric,
  error_magnitude                   numeric,                                 -- |actual - predicted|
  error_pct                         numeric,                                 -- |actual - predicted| / actual
  weight_in_recalibration           numeric default 1.0
);
create index if not exists idx_pred_outcomes_methodology on prediction_outcomes (prediction_methodology_version_id);
create index if not exists idx_pred_outcomes_resolved    on prediction_outcomes (resolved_at desc) where resolved_at is not null;

alter table prediction_outcomes enable row level security;
drop policy if exists "public read prediction_outcomes" on prediction_outcomes;
create policy "public read prediction_outcomes" on prediction_outcomes for select using (true);

-- Seed: the currently-published methodologies as v1.0.0 entries. These are
-- the audit-trail starting points.
insert into methodology_versions (methodology_name, semver, weights, rationale, derivation_method, notes)
values
  ('avena_score', '1.0.0',
   '{"value": 0.40, "yield": 0.25, "location": 0.20, "quality": 0.10, "risk": 0.05}'::jsonb,
   'Initial published weights. Derived manually from comparison against IPD residential index methodology and IMF Working Paper 19/258 ("House Price Synchronisation in Europe").',
   'manual',
   'Frozen at launch (2026-05). All subsequent revisions must be documented here.'),
  ('apci', '1.0.0',
   '{"price_velocity": 0.30, "yield_compression": 0.25, "supply_response": 0.20, "rate_sensitivity": 0.15, "policy_risk": 0.10}'::jsonb,
   'Avena Property Cycle Index — composite of five sub-signals derived from the BIS residential property cycle literature and the ESRB anti-cyclical capital buffer framework.',
   'manual',
   'v1.0 launched 2026-05.'),
  ('counterpart', '1.0.0',
   '{"payment_delay": 0.30, "legal_disputes": 0.20, "court_judgements": 0.20, "delivery_delay": 0.15, "financial_stress": 0.15}'::jsonb,
   'Counterpart Score — developer credit grade. Weights derived from a manual review of which factors most strongly predicted Spanish promoter insolvency 2008-2015 (concursos de acreedores corpus).',
   'manual',
   'v1.0 launched 2026-05.'),
  ('avm', '1.0.0',
   '{"town_median": 0.55, "size_adjust": 0.15, "view_premium": 0.10, "energy_band": 0.08, "beach_distance": 0.07, "amenity_pool_golf": 0.05}'::jsonb,
   'Automated Valuation Model — town × type median €/m² base with multiplicative adjustments. Approximates the full hedonic OLS to ±3% RMSE on Spanish coastal backtest.',
   'manual',
   'v1.0 launched 2026-05.'),
  ('score_confidence', '1.0.0',
   '{"missing_inputs": "additive", "comp_sparsity": "additive", "extreme_price_m2": "additive", "score_edge": "additive"}'::jsonb,
   'Adversarial confidence layer — deterministic v1 heuristic. Penalises properties whose features make them edge cases relative to the comp basis. v2 will swap in a trained residual model.',
   'manual',
   'v1.0 launched alongside Commitment 5.'),
  ('regulatory_classifier', '1.0.0',
   '{"model": "claude-sonnet-4-5", "pre_filter": "keyword", "confidence_floor": 0.30}'::jsonb,
   'Regulatory Radar classifier — Claude Sonnet 4.5 with keyword pre-filter and confidence floor 0.30. Signals below floor are dropped to suppress noise.',
   'manual',
   'v1.0 launched alongside Commitment 8.')
on conflict do nothing;

commit;
