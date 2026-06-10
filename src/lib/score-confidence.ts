/**
 * Adversarial Confidence Layer — Architectural Commitment 5.
 *
 * Pairs every primary Avena Score with a confidence in [0,1] derived from a
 * deterministic adversarial heuristic: properties with comp-sparse towns,
 * extreme price/m², missing key inputs, or edge-case archetypes are scored
 * with lower confidence than median listings. v1 is a transparent formula;
 * v2 will swap in a trained residual model once we have ≥10k labelled
 * out-of-sample resolutions.
 *
 * Wired into /api/v1/properties response so every score returns alongside a
 * confidence float and an array of reason codes the institutional client
 * can show their compliance team.
 */

import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export interface ConfidenceFeatures {
  ref: string;
  primary_score: number;
  price_eur: number | null;
  built_m2: number | null;
  town: string | null;
  energy: string | null;
  bedrooms: number | null;
  type: string | null;
}

export interface ConfidenceResult {
  property_ref: string;
  primary_score: number;
  adversarial_residual: number;   // 0..50, magnitude of expected error
  confidence: number;             // 0..1
  flagged_for_review: boolean;
  reason_codes: string[];
  model_version: string;
  computed_at: string;
}

const MODEL_VERSION = 'adv-v1.0';
const REVIEW_THRESHOLD = 0.65;  // below this, flag for human review

/* -------------------------------------------------------------------------- */
/* Deterministic adversarial heuristic                                         */
/* -------------------------------------------------------------------------- */

export function computeConfidence(f: ConfidenceFeatures, marketContext?: {
  median_price_per_m2?: number;
  town_comp_count?: number;
}): ConfidenceResult {
  let residual = 0;
  const codes: string[] = [];

  // Missing-input penalties
  if (f.price_eur == null) { residual += 12; codes.push('missing_price'); }
  if (f.built_m2 == null || f.built_m2 <= 0) { residual += 10; codes.push('missing_area'); }
  if (!f.energy) { residual += 3; codes.push('missing_energy'); }
  if (f.bedrooms == null) { residual += 2; codes.push('missing_bedrooms'); }
  if (!f.type) { residual += 3; codes.push('missing_type'); }

  // Comp sparsity — towns where we have <10 comps trigger residual
  if (marketContext?.town_comp_count != null) {
    if (marketContext.town_comp_count < 5) { residual += 14; codes.push('comp_extremely_sparse'); }
    else if (marketContext.town_comp_count < 15) { residual += 7; codes.push('comp_sparse'); }
  }

  // Extreme price/m² vs market median (signals atypical comp basis)
  if (f.price_eur && f.built_m2 && marketContext?.median_price_per_m2) {
    const ppm = f.price_eur / f.built_m2;
    const ratio = ppm / marketContext.median_price_per_m2;
    if (ratio > 2.5 || ratio < 0.4) { residual += 10; codes.push('extreme_price_m2'); }
    else if (ratio > 1.8 || ratio < 0.55) { residual += 5; codes.push('atypical_price_m2'); }
  }

  // Very small or very large units are atypical
  if (f.built_m2 != null) {
    if (f.built_m2 < 30) { residual += 5; codes.push('micro_unit'); }
    else if (f.built_m2 > 600) { residual += 7; codes.push('jumbo_unit'); }
  }

  // Score edge — extreme primary scores (≥95 or ≤25) have less data support
  if (f.primary_score >= 95) { residual += 4; codes.push('score_extreme_high'); }
  else if (f.primary_score <= 25) { residual += 6; codes.push('score_extreme_low'); }

  // Clamp residual to [0, 50] then normalize → confidence
  residual = Math.max(0, Math.min(50, residual));
  const confidence = Math.max(0, Math.min(1, 1 - residual / 50));

  return {
    property_ref: f.ref,
    primary_score: f.primary_score,
    adversarial_residual: Number(residual.toFixed(2)),
    confidence: Number(confidence.toFixed(3)),
    flagged_for_review: confidence < REVIEW_THRESHOLD,
    reason_codes: codes,
    model_version: MODEL_VERSION,
    computed_at: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Persistence + read                                                          */
/* -------------------------------------------------------------------------- */

export async function persistConfidence(result: ConfidenceResult): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('score_confidence').upsert({
      property_ref: result.property_ref,
      primary_score: result.primary_score,
      adversarial_residual: result.adversarial_residual,
      confidence: result.confidence,
      flagged_for_review: result.flagged_for_review,
      reason_codes: result.reason_codes,
      model_version: result.model_version,
      computed_at: result.computed_at,
    });
  } catch { /* tolerate */ }
}

export async function loadConfidenceByRefs(refs: string[]): Promise<Map<string, ConfidenceResult>> {
  if (!supabase || refs.length === 0) return new Map();
  const out = new Map<string, ConfidenceResult>();
  try {
    const { data } = await supabase
      .from('score_confidence')
      .select('*')
      .in('property_ref', refs);
    for (const r of (data as ConfidenceResult[] | null) ?? []) {
      out.set(r.property_ref, r);
    }
  } catch { /* tolerate */ }
  return out;
}

export async function loadConfidence(ref: string): Promise<ConfidenceResult | null> {
  const map = await loadConfidenceByRefs([ref]);
  return map.get(ref) ?? null;
}

/** Human-readable label for UI display */
export function confidenceLabel(c: number): { label: string; tone: 'high' | 'medium' | 'low' | 'very_low' } {
  if (c >= 0.85) return { label: 'High confidence', tone: 'high' };
  if (c >= 0.70) return { label: 'Confident', tone: 'medium' };
  if (c >= 0.50) return { label: 'Estimated', tone: 'low' };
  return { label: 'Low confidence — review recommended', tone: 'very_low' };
}
