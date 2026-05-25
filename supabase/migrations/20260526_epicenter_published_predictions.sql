-- ═══════════════════════════════════════════════════════════════════════════
-- PUBLISHED PREDICTIONS — Day-4 of strategic execution brief.
--
-- Distinct from the agent-generated `predictions` table (which feeds the
-- /track-record accuracy retrospective). This table holds hand-curated,
-- hero-quality forecasts published at /predictions: a small number of
-- specific, falsifiable, dated calls Henrik personally stands behind.
--
-- Purpose: institutional credibility = publishing predictions before they
-- resolve, not curating accuracy after. The IMF, ECB FSR, FT all do this.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists published_predictions (
  id                uuid primary key default gen_random_uuid(),
  short_id          text unique not null,                   -- 'AP-2026-001' style human ref
  thesis            text not null,                          -- the public prediction in one sentence
  target_metric     text not null,                          -- e.g. 'price_per_m2', 'yield_gross_pct', 'avena_index'
  target_segment    text not null,                          -- e.g. 'costa_blanca_resi', 'berlin_btr', 'lisbon_centre'
  baseline_value    numeric,                                -- the value at publish time
  predicted_value   numeric not null,                       -- where we say it will be
  predicted_change_pct numeric,                             -- derived if both values present
  confidence_band   text not null,                          -- 'low' | 'medium' | 'high'
  methodology_ref   text not null,                          -- which methodology produced this (links to methodology_versions)
  reasoning         text,                                   -- 1-2 paragraph rationale
  published_at      timestamptz not null default now(),
  target_date       date not null,                          -- when this resolves
  resolved          boolean default false,
  resolved_at       timestamptz,
  actual_value      numeric,
  accuracy_score    numeric,                                -- 0..1 after resolution
  resolution_note   text,
  display_order     int default 100
);

create index if not exists idx_published_predictions_unresolved
  on published_predictions (target_date) where resolved = false;
create index if not exists idx_published_predictions_published
  on published_predictions (published_at desc);

alter table published_predictions enable row level security;
drop policy if exists "public read published_predictions" on published_predictions;
create policy "public read published_predictions" on published_predictions for select using (true);

-- Seed 10 specific, falsifiable forecasts. All resolvable from public data
-- (Eurostat, ECB SDW, national stat offices, Avena's own index).
insert into published_predictions (
  short_id, thesis, target_metric, target_segment, baseline_value, predicted_value,
  predicted_change_pct, confidence_band, methodology_ref, reasoning, target_date, display_order
) values
  ('AP-2026-001',
   'Coastal Spain (Costa Blanca + Costa del Sol composite) prices end 2026 between +2% and +5% YoY in EUR terms, materially below consensus +6-8%.',
   'price_index_yoy', 'costa_es_composite', 100.0, 103.0, 3.0, 'medium',
   'apci@1.0.0',
   'APCI cycle position is late-expansion. Real rates remain restrictive; Northern European buyer power (the marginal Costa demand) softens as Bund yields stay >2.5%. Supply response in Alicante province (24,000 new permits 2025) caps price growth even if demand holds.',
   '2026-12-31', 1),

  ('AP-2026-002',
   'Berlin residential rents grow ≤2% in 2026 nominal — well below the German national average — driven by Mietendeckel-era regulatory drag and a step-up in supply completions from 2022-23 starts.',
   'rent_index_yoy', 'berlin_residential', 100.0, 102.0, 2.0, 'medium',
   'avena_score@1.0.0',
   'Mietspiegel methodology revision in late 2025 anchors negotiated rents below new-build asking. Supply catches up: ~17,000 units delivering H1 2026 vs ~11,000 absorbed pace. Yield compression unfavourable for new institutional buyers.',
   '2026-12-31', 2),

  ('AP-2026-003',
   'Lisbon prime yield compresses by 50-100 bps in 2026 as Portugal exits the EUR investor "frontier" classification at major real-estate research houses (PMA, JLL Research).',
   'prime_yield_bps_change', 'lisbon_centre', 450, 375, -16.7, 'medium',
   'avena_score@1.0.0',
   'Sustained Cushman/JLL upgrades, return of UK/Brazilian private buyer flow post-NHR transition. Stock scarcity in Príncipe Real / Chiado pushes incremental EUR per sq m higher faster than rent → yield down.',
   '2026-12-31', 3),

  ('AP-2026-004',
   'ECB does not deliver any cumulative rate cut in 2026 — DFR ends the year at or above 2.50% — contrary to current consensus pricing of two cuts.',
   'ecb_dfr_eoy', 'eu_macro', 3.00, 2.50, -16.7, 'high',
   'apci@1.0.0',
   'Sticky services HICP (~3.2% YoY in EU services basket through Q4 2025), continued wage pass-through in Italy/Spain, ECB risk-management bias toward credibility. The bar for cuts is higher than markets price.',
   '2026-12-31', 4),

  ('AP-2026-005',
   'No EU Member State imposes nationwide hard rental caps in 2026, despite political pressure in DE, IE, NL. Caps remain municipal-only.',
   'national_hard_rent_cap_count', 'eu_27', 0, 0, 0, 'high',
   'regulatory_classifier@1.0.0',
   'Constitutional court track record (DE 2021 Mietendeckel) makes federal caps politically unviable. Centre-right coalitions in NL, IT, ES retain rental supply rhetoric. Ireland tightens but stays municipal.',
   '2026-12-31', 5),

  ('AP-2026-006',
   'Spanish coastal new-build completions fall ≥15% YoY in 2026 vs 2025 as 2023 vintage permits roll off and 2024 permit issuance was the worst since 2014.',
   'new_build_completions_yoy', 'costa_es_composite', -3.0, -15.0, -12.0, 'high',
   'counterpart@1.0.0',
   'INE permit data 2023 → 2024 declined 22% in Andalucía + Comunidad Valenciana coastal municipalities. Lag from permit to completion is ~18-24 months. 2026 completions are mechanically thin regardless of demand.',
   '2026-12-31', 6),

  ('AP-2026-007',
   'At least one Tier-1 EU credit insurer (Atradius, Coface, Euler Hermes/Allianz Trade, or Credito y Caución) publicly references property data infrastructure for residential mortgage stress testing in their 2026 sector report.',
   'tier1_insurer_property_data_reference', 'eu_credit_insurance', 0, 1, 0, 'low',
   'avena_score@1.0.0',
   'Solvency II equivalence reviews 2026 force more granular real-estate exposure analytics. Tier-1 credit insurers will reference at least one external residential property data source (not necessarily Avena) in their flagship publications. We track this regardless.',
   '2026-12-31', 7),

  ('AP-2026-008',
   'EU AVM regulatory framework (EBA / ESMA) announces formal consultation on residential AVM methodology standards in 2026, citing macroprudential precedent from ECB working papers.',
   'eu_avm_consultation_open', 'eu_regulatory', 0, 1, 0, 'medium',
   'regulatory_classifier@1.0.0',
   'EBA 2025 Q4 risk dashboard flagged residential AVM divergence across member states. Macroprudential authorities consistently signal need for AVM harmonisation. Formal consultation likely 2026.',
   '2026-12-31', 8),

  ('AP-2026-009',
   'European AI assistants (Claude, ChatGPT, Perplexity) begin citing structured European residential property datasets by source name in user-facing answers ≥30% of the time for "what is the price of property X in Y" queries — up from <5% today.',
   'ai_property_citation_rate', 'ai_assistants_eu', 5.0, 30.0, 500.0, 'medium',
   'avena_score@1.0.0',
   'MCP adoption accelerates 2026. AI provider TOS shifts toward attributed sourcing. EU AI Act transparency requirements force named-source citations in property queries by H2.',
   '2026-12-31', 9),

  ('AP-2026-010',
   'No major German residential listed REIT (Vonovia, LEG, TAG, Adler) trades below 0.6x P/NAV at end-2026 — recovery from 2023-24 trough holds even if Euribor stays ≥2.5%.',
   'min_german_resi_reit_p_nav', 'de_listed_resi', 0.72, 0.70, -2.8, 'medium',
   'apci@1.0.0',
   'Deleveraging delivered 2024-25, dividend resumption priced. Floor for German listed resi is reflexive: <0.6x triggers consolidation bids. Sponsor balance sheets repaired enough to hold against rate stickiness.',
   '2026-12-31', 10)
on conflict (short_id) do nothing;

commit;
