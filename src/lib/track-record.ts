/**
 * Stored scores versus later asking prices and feed exits.
 *
 * The split is fixed before looking at outcomes: a listing is "flagged" when
 * its stored avena_score on the cohort day is at or above that day's 75th
 * percentile (percentile_cont, ties included). There is no second pass that
 * picks a threshold because it looks better.
 *
 * This file never returns a claim stronger than "illustrative". A few months
 * of asking-price history and feed exits are not a transaction backtest.
 */

import { daysBetween, median, quantile, rate } from '@/lib/fund-report';

/** Below this span, or below this many listings on either side, the page refuses a comparison claim. */
export const MIN_CLAIM_SPAN_DAYS = 60;
export const MIN_CLAIM_SIDE = 100;
/** Even a large sample under this span stays illustrative. There is no stronger label. */
export const ILLUSTRATIVE_SPAN_DAYS = 180;

export const MATERIAL_MOVE = 0.01;

export type ClaimLevel = 'unavailable' | 'too_thin' | 'illustrative';

export interface ScorePoint {
  ref: string;
  score: number;
}

export interface PricePoint {
  ref: string;
  price: number;
}

export interface SideStats {
  n: number;
  withEntryPrice: number;
  paired: number;
  medianChange: number | null;
  materialCuts: number;
  materialIncreases: number;
  flatPaired: number;
  materialCutRate: number | null;
  materialIncreaseRate: number | null;
  flatRate: number | null;
  leftBook: number;
  leftBookRate: number | null;
  recordedDelistings: number;
  unrecordedExits: number;
  relisted: number;
}

export interface TrackRecord {
  cohortDate: string;
  outcomeDate: string;
  spanDays: number;
  threshold: number | null;
  cohortN: number;
  flagged: SideStats;
  rest: SideStats;
  claim: ClaimLevel;
  reasons: string[];
}

export function claimLevel(input: {
  spanDays: number | null;
  flagged: number;
  rest: number;
  pairedFlagged: number;
  pairedRest: number;
}): ClaimLevel {
  if (input.spanDays == null || input.flagged < 1 || input.rest < 1) return 'unavailable';
  if (
    input.spanDays < MIN_CLAIM_SPAN_DAYS
    || input.flagged < MIN_CLAIM_SIDE
    || input.rest < MIN_CLAIM_SIDE
    || input.pairedFlagged < MIN_CLAIM_SIDE
    || input.pairedRest < MIN_CLAIM_SIDE
  ) {
    return 'too_thin';
  }
  return 'illustrative';
}

function emptySide(): SideStats {
  return {
    n: 0,
    withEntryPrice: 0,
    paired: 0,
    medianChange: null,
    materialCuts: 0,
    materialIncreases: 0,
    flatPaired: 0,
    materialCutRate: null,
    materialIncreaseRate: null,
    flatRate: null,
    leftBook: 0,
    leftBookRate: null,
    recordedDelistings: 0,
    unrecordedExits: 0,
    relisted: 0,
  };
}

function summarise(
  members: { ref: string }[],
  entry: Map<string, number>,
  exit: Map<string, number>,
  sold: Set<string>,
): SideStats {
  const side = emptySide();
  side.n = members.length;
  const changes: number[] = [];
  for (const member of members) {
    const entryPrice = entry.get(member.ref);
    const exitPrice = exit.get(member.ref);
    const hasEntry = entryPrice != null && entryPrice > 0;
    const stillListed = exitPrice != null && exitPrice > 0;
    const inSold = sold.has(member.ref);
    if (hasEntry) side.withEntryPrice += 1;
    if (!stillListed) {
      side.leftBook += 1;
      if (inSold) side.recordedDelistings += 1;
      else side.unrecordedExits += 1;
    } else if (inSold) {
      side.relisted += 1;
    }
    if (!hasEntry || !stillListed || exitPrice == null || entryPrice == null) continue;
    const change = (exitPrice - entryPrice) / entryPrice;
    if (!Number.isFinite(change)) continue;
    side.paired += 1;
    changes.push(change);
    if (change <= -MATERIAL_MOVE) side.materialCuts += 1;
    else if (change >= MATERIAL_MOVE) side.materialIncreases += 1;
    else side.flatPaired += 1;
  }
  side.medianChange = median(changes);
  side.materialCutRate = rate(side.materialCuts, side.paired);
  side.materialIncreaseRate = rate(side.materialIncreases, side.paired);
  side.flatRate = rate(side.flatPaired, side.paired);
  side.leftBookRate = rate(side.leftBook, side.n);
  return side;
}

export function buildTrackRecord(input: {
  cohortDate: string;
  outcomeDate: string;
  scores: ScorePoint[];
  entryPrices: PricePoint[];
  exitPrices: PricePoint[];
  soldRefs: string[];
  longestMissingDays: number;
  /** True when the cohort day is before the scribe date correction. */
  scoreMayLagOneDay: boolean;
}): TrackRecord | null {
  const scores = input.scores.filter((s) => s.ref && Number.isFinite(s.score));
  if (!scores.length || !input.cohortDate || !input.outcomeDate) return null;
  if (input.outcomeDate < input.cohortDate) return null;

  const scoreValues = scores.map((s) => s.score).sort((a, b) => a - b);
  const threshold = quantile(scoreValues, 0.75);
  const flaggedMembers = threshold == null ? [] : scores.filter((s) => s.score >= threshold);
  const restMembers = threshold == null ? [] : scores.filter((s) => s.score < threshold);

  const entry = new Map<string, number>();
  for (const row of input.entryPrices) {
    if (row.price > 0) entry.set(row.ref, row.price);
  }
  const exit = new Map<string, number>();
  for (const row of input.exitPrices) {
    if (row.price > 0) exit.set(row.ref, row.price);
  }
  const sold = new Set(input.soldRefs);

  const flagged = summarise(flaggedMembers, entry, exit, sold);
  const rest = summarise(restMembers, entry, exit, sold);
  const spanDays = daysBetween(input.cohortDate, input.outcomeDate);
  const claim = claimLevel({
    spanDays,
    flagged: flagged.n,
    rest: rest.n,
    pairedFlagged: flagged.paired,
    pairedRest: rest.paired,
  });

  const reasons: string[] = [];
  if (claim === 'unavailable') {
    reasons.push('One side of the score split is empty, so there is no comparison to publish.');
  } else if (claim === 'too_thin') {
    reasons.push(
      `The window is ${spanDays} days, with ${flagged.n} flagged listings and ${rest.n} in the rest of the book (${flagged.paired} and ${rest.paired} paired prices). That is below the bar this page uses before it will even call the comparison illustrative.`,
    );
  } else {
    reasons.push(
      `The window is ${spanDays} days. A comparison this page is willing to call anything other than illustrative would need at least ${ILLUSTRATIVE_SPAN_DAYS} days, and even then it would still be asking prices rather than registered sales. This page has no stronger label.`,
    );
  }
  if (input.longestMissingDays > 1) {
    reasons.push(
      `Inside the window, ${input.longestMissingDays} calendar days have no price snapshot. Listings were not observed on those days.`,
    );
  }
  if (input.scoreMayLagOneDay) {
    reasons.push(
      'Score rows dated before the 2026-08-21 scribe correction can describe the previous day\'s book. Entry and exit prices here are taken from price_snapshots on the named dates, not from the price stored on the score row.',
    );
  }
  reasons.push('A feed exit is a listing that left the RedSP book. It is not a registered sale, and a return to the book is counted as a relisting.');
  reasons.push('The score\'s largest term is the gap between asking €/m² and an in-book benchmark. It is not an out-of-sample forecast of a transaction price.');

  return {
    cohortDate: input.cohortDate,
    outcomeDate: input.outcomeDate,
    spanDays,
    threshold,
    cohortN: scores.length,
    flagged,
    rest,
    claim,
    reasons,
  };
}

export function comparisonSentence(record: TrackRecord): string | null {
  if (record.claim === 'unavailable') return null;
  const a = record.flagged.medianChange;
  const b = record.rest.medianChange;
  if (a == null || b == null) return null;
  const flatNote = a === 0 && b === 0
    ? ' A median of zero means at least half of the paired listings in each group were unchanged.'
    : '';
  return `Median asking-price change from ${record.cohortDate} to ${record.outcomeDate} was ${signed(a)} in the flagged group (${record.flagged.paired} paired listings) and ${signed(b)} in the rest (${record.rest.paired} paired).${flatNote}`;
}

function signed(ratio: number): string {
  const pct = ratio * 100;
  const body = `${Math.abs(pct).toFixed(2)}%`;
  if (pct > 0) return `+${body}`;
  if (pct < 0) return `-${body}`;
  return '0.00%';
}
