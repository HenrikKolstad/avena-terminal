/**
 * Avena DELPHI — the daily AI panel on European property.
 *
 * The Delphi method, with machine panelists. Every day the same fixed
 * panel of forward-looking judgment questions is put to every major AI
 * model. Answers are stored event-sourced, aggregated into a consensus
 * and a disagreement index, tracked for drift over time, and — when
 * each question's horizon arrives — scored against reality.
 *
 * This is the inverse of PLAB: PLAB scores what models KNOW (facts with
 * ground truths); DELPHI records what they BELIEVE (judgments with
 * future resolution). Nothing like a daily, longitudinal, resolvable
 * AI-panel survey of a real asset class exists anywhere.
 *
 * Question design rules:
 *  - Every answer must be extractable as a single number.
 *  - Every question carries a horizon and a public resolution source.
 *  - The set is frozen per version; changes ship as a new version.
 */

export type DelphiKind = 'prob' | 'pct' | 'scale';

export interface DelphiQuestion {
  id: string;
  question: string;
  kind: DelphiKind;            // prob: 0-100 probability · pct: % change · scale: 0-100 rating
  /** 'bull' = higher value is bullish for European residential; 'bear' = higher is bearish. */
  direction: 'bull' | 'bear';
  horizon_months: number;
  resolution_source: string;
  short_label: string;
}

export const DELPHI_VERSION = '1.0';

export const DELPHI_QUESTIONS: DelphiQuestion[] = [
  { id: 'D-01', short_label: 'Spain coastal 12m', kind: 'prob', direction: 'bull', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that average Spanish coastal residential prices are higher 12 months from now than today?',
    resolution_source: 'INE Spain / Eurostat HPI' },
  { id: 'D-02', short_label: 'Germany resi 12m', kind: 'prob', direction: 'bull', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that Germany’s national residential property price index is higher 12 months from now than today?',
    resolution_source: 'Destatis / Eurostat HPI' },
  { id: 'D-03', short_label: 'France resi 12m', kind: 'prob', direction: 'bull', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that France’s national residential property price index is higher 12 months from now than today?',
    resolution_source: 'Insee / Eurostat HPI' },
  { id: 'D-04', short_label: 'Lisbon prime Δ12m', kind: 'pct', direction: 'bull', horizon_months: 12,
    question: 'What is your expected percentage change in Lisbon prime residential prices over the next 12 months? Answer with a single number (negative if you expect decline).',
    resolution_source: 'INE Portugal / Confidencial Imobiliário' },
  { id: 'D-05', short_label: 'ECB cuts in 6m', kind: 'prob', direction: 'bull', horizon_months: 6,
    question: 'What is the probability, from 0 to 100, that the ECB deposit facility rate is LOWER 6 months from now than it is today?',
    resolution_source: 'ECB key interest rates' },
  { id: 'D-06', short_label: 'HICP < 2.5% in 12m', kind: 'prob', direction: 'bull', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that euro area annual HICP inflation is below 2.5% twelve months from now?',
    resolution_source: 'Eurostat HICP flash' },
  { id: 'D-07', short_label: 'Amsterdam stretch', kind: 'scale', direction: 'bear', horizon_months: 12,
    question: 'On a scale from 0 (deeply undervalued) to 100 (extreme bubble), how stretched are Amsterdam residential property valuations today? Answer with a single number.',
    resolution_source: 'judgment — tracked for drift, not resolved' },
  { id: 'D-08', short_label: 'Munich stretch', kind: 'scale', direction: 'bear', horizon_months: 12,
    question: 'On a scale from 0 (deeply undervalued) to 100 (extreme bubble), how stretched are Munich residential property valuations today? Answer with a single number.',
    resolution_source: 'judgment — tracked for drift, not resolved' },
  { id: 'D-09', short_label: 'National rent cap 12m', kind: 'prob', direction: 'bear', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that at least one EU member state introduces a NATIONAL (not municipal) hard rental cap within the next 12 months?',
    resolution_source: 'national legislation registers' },
  { id: 'D-10', short_label: 'EU volumes 12m', kind: 'prob', direction: 'bull', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that EU residential property transaction volumes are higher over the next 12 months than over the previous 12?',
    resolution_source: 'Eurostat / national registries' },
  { id: 'D-11', short_label: 'Mortgage rate Δ12m', kind: 'pct', direction: 'bear', horizon_months: 12,
    question: 'By how many percentage points do you expect the average euro area new-mortgage interest rate to change over the next 12 months? Answer with a single number (negative if you expect it to fall).',
    resolution_source: 'ECB MIR statistics' },
  { id: 'D-12', short_label: 'DE REIT < 0.6x NAV', kind: 'prob', direction: 'bear', horizon_months: 12,
    question: 'What is the probability, from 0 to 100, that a major German listed residential REIT (Vonovia, LEG or TAG) trades below 0.6x price-to-NAV at any point within the next 12 months?',
    resolution_source: 'company reports / market data' },
];

/**
 * Map a raw answer to a 0-100 bullishness score for the composite index.
 *  - prob:  p (or 100-p when direction is 'bear')
 *  - pct:   [-10..+10] linearly mapped to [0..100], clamped; inverted for 'bear'
 *  - scale: value (or 100-value for 'bear' — a high bubble rating is bearish)
 */
export function bullishness(q: DelphiQuestion, value: number): number {
  let score: number;
  if (q.kind === 'pct') {
    const clamped = Math.max(-10, Math.min(10, value));
    score = ((clamped + 10) / 20) * 100;
  } else {
    score = Math.max(0, Math.min(100, value));
  }
  return q.direction === 'bull' ? score : 100 - score;
}
