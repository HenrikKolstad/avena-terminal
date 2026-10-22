/**
 * Pre-specified test: does Avena's coastal new-build capture have any
 * linear association with later returns of listed Spanish homebuilders?
 *
 * Pure functions. No clock, no network, no database. The script in
 * scripts/builder-stock-signal.ts loads the published ledger and free BME
 * closes and calls `runSignal`. The claim family below is the only set of
 * results that can support a finding. It is fixed here, not chosen after
 * looking at which correlation is largest.
 *
 * What an "exit" is: a listing that left the captured book. That is a
 * sell-out or a withdrawal. The capture cannot tell them apart, and this
 * module never calls an exit a sale.
 */

export const MIN_N = 8;
export const TRAIN_FRACTION = 0.6;
export const BOOTSTRAP_DRAWS = 5_000;
export const PERMUTATION_DRAWS = 5_000;
export const ALPHA = 0.05;
export const SEED = 20260805;
/** A session return spanning more calendar days than this is a halt, not a weekend. */
export const MAX_RETURN_GAP_DAYS = 5;
export const MIN_CLEAN_DAYS_PER_WEEK = 5;
export const MIN_BETA_SESSIONS = 60;
export const EVENT_QUANTILE = 0.75;
export const MIN_EVENT_SIDE = 5;

export type FeatureName = 'exit_rate' | 'cut_rate' | 'book_change' | 'new_refs';
export type OutcomeName = 'excess' | 'raw';
export type FrequencyName = 'daily' | 'weekly';

export interface ClaimSpec {
  kind: 'correlation' | 'event';
  frequency: FrequencyName;
  feature: FeatureName;
  outcome: OutcomeName;
}

/**
 * The claim family. Two primary stocks, evaluated outside this file, times
 * these three specs. Anything else this module reports is a sensitivity.
 */
export const CLAIM_SPECS: readonly ClaimSpec[] = [
  { kind: 'correlation', frequency: 'daily', feature: 'exit_rate', outcome: 'excess' },
  { kind: 'correlation', frequency: 'daily', feature: 'cut_rate', outcome: 'excess' },
  { kind: 'event', frequency: 'daily', feature: 'exit_rate', outcome: 'excess' },
];

export const SENSITIVITY_SPECS: readonly ClaimSpec[] = [
  { kind: 'correlation', frequency: 'daily', feature: 'book_change', outcome: 'excess' },
  { kind: 'correlation', frequency: 'daily', feature: 'new_refs', outcome: 'excess' },
  { kind: 'correlation', frequency: 'daily', feature: 'exit_rate', outcome: 'raw' },
  { kind: 'correlation', frequency: 'daily', feature: 'cut_rate', outcome: 'raw' },
  { kind: 'correlation', frequency: 'weekly', feature: 'exit_rate', outcome: 'excess' },
  { kind: 'correlation', frequency: 'weekly', feature: 'cut_rate', outcome: 'excess' },
];

const DAY = 86_400_000;

export const addDays = (d: string, n: number): string =>
  new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);

export const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);

/** Monday of the week that contains `date`, as YYYY-MM-DD. Weeks start Monday. */
export function weekMonday(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const day = d.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function salt(id: string): number {
  let h = SEED >>> 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Lanczos approximation, g = 7. Tested against ln(120) and ln(sqrt(pi)). */
export function logGamma(z: number): number {
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const MAX_IT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_IT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);
  if (x < (a + 1) / (a + b + 2)) return (front * betacf(a, b, x)) / a;
  return 1 - (front * betacf(b, a, 1 - x)) / b;
}

/** Two-sided Student-t p-value. Returns null rather than a fabricated 0 or 1. */
export function studentTTwoSidedP(t: number, df: number): number | null {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null;
  if (t === 0) return 1;
  const t2 = t * t;
  const x = df / (df + t2);
  const p = regularizedIncompleteBeta(x, df / 2, 0.5);
  if (!Number.isFinite(p)) return null;
  return Math.min(1, Math.max(0, p));
}

/**
 * Two-sided p-value for a Pearson correlation under the null of no linear
 * association. Independent pairs are assumed. Overlapping returns are not
 * used, because that assumption would then be false.
 */
export function correlationPValue(r: number, n: number): number | null {
  if (!Number.isInteger(n) || n < 3 || !Number.isFinite(r) || Math.abs(r) > 1) return null;
  if (Math.abs(r) < 1e-15) return 1;
  const df = n - 2;
  const r2 = r * r;
  if (1 - r2 < 1e-15) return 0;
  const t = r * Math.sqrt(df / (1 - r2));
  return studentTTwoSidedP(t, df);
}

/** Smallest |r| that a two-sided  test of this n rejects at `alpha`. */
export function criticalAbsR(n: number, alpha = ALPHA): number | null {
  if (n < MIN_N) return null;
  let lo = 0;
  let hi = 0.999999;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const p = correlationPValue(mid, n);
    if (p === null) return null;
    if (p > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) return null;
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  const r = sxy / Math.sqrt(sxx * syy);
  if (!Number.isFinite(r)) return null;
  return Math.max(-1, Math.min(1, r));
}

export function quantile(sortedAsc: number[], p: number): number | null {
  if (!sortedAsc.length || p < 0 || p > 1) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const w = idx - lo;
  return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}

export function bootstrapPearsonCi(
  xs: number[],
  ys: number[],
  draws: number,
  seed: number,
): { lo: number; hi: number; finite: number } | null {
  if (xs.length !== ys.length || xs.length < MIN_N || draws < 100) return null;
  const n = xs.length;
  const rng = mulberry32(seed);
  const rs: number[] = [];
  for (let d = 0; d < draws; d++) {
    const bx = new Array<number>(n);
    const by = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rng() * n);
      bx[i] = xs[j];
      by[i] = ys[j];
    }
    const r = pearson(bx, by);
    if (r !== null) rs.push(r);
  }
  if (rs.length < draws * 0.8) return null;
  rs.sort((a, b) => a - b);
  const lo = quantile(rs, 0.025);
  const hi = quantile(rs, 0.975);
  if (lo === null || hi === null) return null;
  return { lo, hi, finite: rs.length };
}

export interface CorrBlock {
  n: number;
  r: number | null;
  p: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  underpowered: boolean;
  note: string | null;
}

export function correlationBlock(xs: number[], ys: number[], seed: number, draws = BOOTSTRAP_DRAWS): CorrBlock {
  const n = xs.length;
  const r = pearson(xs, ys);
  if (r === null) {
    return {
      n,
      r: null,
      p: null,
      ciLow: null,
      ciHigh: null,
      underpowered: true,
      note: n < 3 ? 'fewer than 3 pairs' : 'one series has no variance, so the correlation is undefined',
    };
  }
  const underpowered = n < MIN_N;
  if (underpowered) {
    return {
      n,
      r,
      p: null,
      ciLow: null,
      ciHigh: null,
      underpowered: true,
      note: `n = ${n} is below ${MIN_N}, so no p-value or interval is reported`,
    };
  }
  const p = correlationPValue(r, n);
  const ci = bootstrapPearsonCi(xs, ys, draws, seed);
  return {
    n,
    r,
    p,
    ciLow: ci?.lo ?? null,
    ciHigh: ci?.hi ?? null,
    underpowered: false,
    note: ci ? null : 'bootstrap interval was unstable and is not reported',
  };
}

export interface OlsResult {
  alpha: number;
  beta: number;
  n: number;
  r2: number | null;
}

/** OLS with an intercept. Null when the market series has no variance or n is short. */
export function olsBeta(y: number[], x: number[], minN = MIN_BETA_SESSIONS): OlsResult | null {
  if (y.length !== x.length || y.length < minN) return null;
  const n = y.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) return null;
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) return null;
  const beta = sxy / sxx;
  const alpha = my - beta * mx;
  return { alpha, beta, n, r2: syy === 0 ? null : (sxy * sxy) / (sxx * syy) };
}

export function chronologicalSplit<T>(rows: readonly T[], fraction = TRAIN_FRACTION): { train: T[]; test: T[] } {
  if (rows.length < 2) return { train: rows.slice(), test: [] };
  let nTrain = Math.floor(rows.length * fraction);
  if (nTrain < 1) nTrain = 1;
  if (nTrain >= rows.length) nTrain = rows.length - 1;
  return { train: rows.slice(0, nTrain), test: rows.slice(nTrain) };
}

export interface ClosePoint {
  date: string;
  close: number;
  volume?: number | null;
}

/** Log return labelled by the later session. Gaps longer than a long weekend are dropped. */
export function sessionLogReturns(points: readonly ClosePoint[]): Array<{ date: string; ret: number }> {
  const rows = points.filter((p) => Number.isFinite(p.close) && p.close > 0).slice().sort((a, b) => a.date.localeCompare(b.date));
  const out: Array<{ date: string; ret: number }> = [];
  for (let i = 1; i < rows.length; i++) {
    const gap = daysBetween(rows[i - 1].date, rows[i].date);
    if (gap <= 0 || gap > MAX_RETURN_GAP_DAYS) continue;
    out.push({ date: rows[i].date, ret: Math.log(rows[i].close / rows[i - 1].close) });
  }
  return out;
}

export function weeklyLogReturns(points: readonly ClosePoint[]): Array<{ week: string; ret: number }> {
  const rows = points.filter((p) => Number.isFinite(p.close) && p.close > 0).slice().sort((a, b) => a.date.localeCompare(b.date));
  const last = new Map<string, number>();
  for (const row of rows) last.set(weekMonday(row.date), row.close);
  const weeks = [...last.keys()].sort();
  const out: Array<{ week: string; ret: number }> = [];
  for (let i = 1; i < weeks.length; i++) {
    if (daysBetween(weeks[i - 1], weeks[i]) !== 7) continue;
    const prev = last.get(weeks[i - 1]);
    const cur = last.get(weeks[i]);
    if (prev === undefined || cur === undefined || prev <= 0 || cur <= 0) continue;
    out.push({ week: weeks[i], ret: Math.log(cur / prev) });
  }
  return out;
}

export interface LedgerDay {
  date: string;
  listings_observed: number;
  price_increases: number;
  price_reductions: number;
  median_abs_move_pct: number | null;
  delistings: number;
  relistings: number;
}

export interface AnnotatedDay extends LedgerDay {
  catchup: boolean;
  calendarGapFromPrev: number | null;
}

/**
 * A day is a catch-up when the previous observation is more than one calendar
 * day earlier. Its flow fields (exits, cuts, rises) describe the hole, not
 * that day, and are not used as a one-day shock.
 */
export function annotateLedger(days: readonly LedgerDay[]): AnnotatedDay[] {
  const sorted = days.slice().sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((d, i) => {
    if (i === 0) return { ...d, catchup: false, calendarGapFromPrev: null };
    const gap = daysBetween(sorted[i - 1].date, d.date);
    return { ...d, catchup: gap > 1, calendarGapFromPrev: gap };
  });
}

export function detectedGaps(days: readonly AnnotatedDay[]): Array<{ after: string; before: string; calendarDays: number }> {
  const gaps: Array<{ after: string; before: string; calendarDays: number }> = [];
  for (let i = 1; i < days.length; i++) {
    const gap = days[i].calendarGapFromPrev;
    if (gap !== null && gap > 1) {
      gaps.push({ after: days[i - 1].date, before: days[i].date, calendarDays: gap });
    }
  }
  return gaps;
}

export interface DailyFeature {
  date: string;
  exitRate: number | null;
  cutRate: number | null;
  bookChange: number | null;
  newRefs: number | null;
  listings: number | null;
  delistings: number | null;
  reductions: number | null;
  skipped: string | null;
}

/**
 * Feature for session T, known by the end of T, used to predict the next
 * session. Flows on non-session days since the previous session (weekends)
 * are included. A catch-up row anywhere in that span drops the session.
 */
export function dailyFeatures(
  ledger: readonly AnnotatedDay[],
  sessions: readonly string[],
  arrivals: ReadonlyMap<string, number>,
): DailyFeature[] {
  const byDate = new Map(ledger.map((d) => [d.date, d]));
  const out: DailyFeature[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const t = sessions[i];
    const prev = i === 0 ? addDays(t, -1) : sessions[i - 1];
    const span = ledger.filter((d) => d.date > prev && d.date <= t);
    const onT = byDate.get(t);
    if (!onT) {
      out.push(emptyFeature(t, 'no capture on this session date'));
      continue;
    }
    if (span.some((d) => d.catchup) || onT.catchup) {
      out.push(emptyFeature(t, 'a gap catch-up falls inside this span'));
      continue;
    }
    if (!(onT.listings_observed > 0)) {
      out.push(emptyFeature(t, 'book size is not positive'));
      continue;
    }
    let delistings = 0;
    let reductions = 0;
    let newRefs = 0;
    for (const d of span) {
      delistings += d.delistings;
      reductions += d.price_reductions;
      newRefs += arrivals.get(d.date) ?? 0;
    }
    const prevCal = byDate.get(addDays(t, -1));
    let bookChange: number | null = null;
    if (prevCal && !prevCal.catchup && prevCal.listings_observed > 0 && onT.listings_observed > 0) {
      bookChange = Math.log(onT.listings_observed / prevCal.listings_observed);
    }
    out.push({
      date: t,
      exitRate: delistings / onT.listings_observed,
      cutRate: reductions / onT.listings_observed,
      bookChange,
      newRefs,
      listings: onT.listings_observed,
      delistings,
      reductions,
      skipped: null,
    });
  }
  return out;
}

function emptyFeature(date: string, skipped: string): DailyFeature {
  return {
    date,
    exitRate: null,
    cutRate: null,
    bookChange: null,
    newRefs: null,
    listings: null,
    delistings: null,
    reductions: null,
    skipped,
  };
}

export interface WeekFeature {
  week: string;
  cleanDays: number;
  contaminated: boolean;
  reason: string | null;
  exitRate: number | null;
  cutRate: number | null;
  bookChange: number | null;
  newRefs: number | null;
  listingsEnd: number | null;
  delistings: number | null;
  reductions: number | null;
}

export function weeklyFeatures(ledger: readonly AnnotatedDay[], arrivals: ReadonlyMap<string, number>): WeekFeature[] {
  const groups = new Map<string, AnnotatedDay[]>();
  for (const d of ledger) {
    const w = weekMonday(d.date);
    const g = groups.get(w);
    if (g) g.push(d);
    else groups.set(w, [d]);
  }
  return [...groups.keys()].sort().map((week) => {
    const days = groups.get(week)!.slice().sort((a, b) => a.date.localeCompare(b.date));
    const clean = days.filter((d) => !d.catchup);
    const contaminated = days.some((d) => d.catchup) || clean.length < MIN_CLEAN_DAYS_PER_WEEK;
    if (contaminated) {
      const reason = days.some((d) => d.catchup)
        ? 'week contains a gap catch-up, so its flows are not a one-week shock'
        : `only ${clean.length} clean days (minimum ${MIN_CLEAN_DAYS_PER_WEEK})`;
      return {
        week,
        cleanDays: clean.length,
        contaminated: true,
        reason,
        exitRate: null,
        cutRate: null,
        bookChange: null,
        newRefs: null,
        listingsEnd: clean.length ? clean[clean.length - 1].listings_observed : null,
        delistings: null,
        reductions: null,
      };
    }
    let delistings = 0;
    let reductions = 0;
    let newRefs = 0;
    let bookSum = 0;
    for (const d of clean) {
      delistings += d.delistings;
      reductions += d.price_reductions;
      newRefs += arrivals.get(d.date) ?? 0;
      bookSum += d.listings_observed;
    }
    const meanBook = bookSum / clean.length;
    const first = clean[0].listings_observed;
    const last = clean[clean.length - 1].listings_observed;
    return {
      week,
      cleanDays: clean.length,
      contaminated: false,
      reason: null,
      exitRate: meanBook > 0 ? delistings / meanBook : null,
      cutRate: meanBook > 0 ? reductions / meanBook : null,
      bookChange: first > 0 && last > 0 ? Math.log(last / first) : null,
      newRefs,
      listingsEnd: last,
      delistings,
      reductions,
    };
  });
}

export interface AlignedPoint {
  key: string;
  exitRate: number | null;
  cutRate: number | null;
  bookChange: number | null;
  newRefs: number | null;
  raw: number;
  excess: number;
}

export function alignDaily(
  features: readonly DailyFeature[],
  sessions: readonly string[],
  stockRet: ReadonlyMap<string, number>,
  marketRet: ReadonlyMap<string, number>,
  beta: number,
): AlignedPoint[] {
  const byDate = new Map(features.map((f) => [f.date, f]));
  const out: AlignedPoint[] = [];
  for (let i = 0; i < sessions.length - 1; i++) {
    const t = sessions[i];
    const next = sessions[i + 1];
    const f = byDate.get(t);
    if (!f || f.skipped) continue;
    const ys = stockRet.get(next);
    const ym = marketRet.get(next);
    if (ys === undefined || ym === undefined) continue;
    out.push({
      key: t,
      exitRate: f.exitRate,
      cutRate: f.cutRate,
      bookChange: f.bookChange,
      newRefs: f.newRefs,
      raw: ys,
      excess: ys - beta * ym,
    });
  }
  return out;
}

export function alignWeekly(
  features: readonly WeekFeature[],
  stockWeek: ReadonlyMap<string, number>,
  marketWeek: ReadonlyMap<string, number>,
  beta: number,
): AlignedPoint[] {
  const out: AlignedPoint[] = [];
  for (const f of features) {
    if (f.contaminated) continue;
    const next = addDays(f.week, 7);
    const ys = stockWeek.get(next);
    const ym = marketWeek.get(next);
    if (ys === undefined || ym === undefined) continue;
    out.push({
      key: f.week,
      exitRate: f.exitRate,
      cutRate: f.cutRate,
      bookChange: f.bookChange,
      newRefs: f.newRefs,
      raw: ys,
      excess: ys - beta * ym,
    });
  }
  return out;
}

const FEATURE_KEY: Record<FeatureName, keyof Pick<AlignedPoint, 'exitRate' | 'cutRate' | 'bookChange' | 'newRefs'>> = {
  exit_rate: 'exitRate',
  cut_rate: 'cutRate',
  book_change: 'bookChange',
  new_refs: 'newRefs',
};

export interface Pair {
  key: string;
  x: number;
  y: number;
}

export function featurePairs(points: readonly AlignedPoint[], feature: FeatureName, outcome: OutcomeName): Pair[] {
  const xKey = FEATURE_KEY[feature];
  const out: Pair[] = [];
  for (const p of points) {
    const x = p[xKey];
    const y = outcome === 'excess' ? p.excess : p.raw;
    if (x === null || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({ key: p.key, x, y });
  }
  return out;
}

export interface EventBlock {
  threshold: number | null;
  trainEvents: number;
  trainOthers: number;
  testEvents: number;
  testOthers: number;
  trainDiff: number | null;
  testDiff: number | null;
  testCiLow: number | null;
  testCiHigh: number | null;
  permutationP: number | null;
  /** Share of the held-out event-group sum of outcomes coming from its three largest outcomes. */
  top3Share: number | null;
  degenerate: boolean;
  note: string | null;
}

function meanOf(ys: number[], mask: boolean[], want: boolean): number | null {
  let s = 0;
  let n = 0;
  for (let i = 0; i < ys.length; i++) {
    if (mask[i] === want) {
      s += ys[i];
      n++;
    }
  }
  return n ? s / n : null;
}

export function eventContrast(train: readonly Pair[], test: readonly Pair[], seed: number, draws = PERMUTATION_DRAWS): EventBlock {
  const empty = (note: string, partial: Partial<EventBlock> = {}): EventBlock => ({
    threshold: partial.threshold ?? null,
    trainEvents: partial.trainEvents ?? 0,
    trainOthers: partial.trainOthers ?? 0,
    testEvents: partial.testEvents ?? 0,
    testOthers: partial.testOthers ?? 0,
    trainDiff: partial.trainDiff ?? null,
    testDiff: null,
    testCiLow: null,
    testCiHigh: null,
    permutationP: null,
    top3Share: null,
    degenerate: true,
    note,
  });
  if (train.length < 4) return empty('fit window has fewer than 4 pairs');
  const xs = train.map((p) => p.x).sort((a, b) => a - b);
  const threshold = quantile(xs, EVENT_QUANTILE);
  if (threshold === null) return empty('threshold is undefined');
  const trainMask = train.map((p) => p.x > threshold);
  const trainEvents = trainMask.filter(Boolean).length;
  const trainOthers = train.length - trainEvents;
  const trainYe = meanOf(train.map((p) => p.y), trainMask, true);
  const trainYo = meanOf(train.map((p) => p.y), trainMask, false);
  const trainDiff = trainYe === null || trainYo === null ? null : trainYe - trainYo;
  if (trainEvents < 2 || trainOthers < 2 || trainDiff === null) {
    return empty('fit window does not have two groups on either side of the 75th percentile', {
      threshold,
      trainEvents,
      trainOthers,
      trainDiff,
    });
  }
  const testMask = test.map((p) => p.x > threshold);
  const testEvents = testMask.filter(Boolean).length;
  const testOthers = test.length - testEvents;
  if (testEvents < MIN_EVENT_SIDE || testOthers < MIN_EVENT_SIDE) {
    return {
      threshold,
      trainEvents,
      trainOthers,
      testEvents,
      testOthers,
      trainDiff,
      testDiff: null,
    testCiLow: null,
    testCiHigh: null,
    permutationP: null,
    top3Share: null,
    degenerate: true,
    note: `out-of-sample groups are ${testEvents} and ${testOthers}; both need at least ${MIN_EVENT_SIDE}`,
  };
}
  const ys = test.map((p) => p.y);
  const ye = meanOf(ys, testMask, true)!;
  const yo = meanOf(ys, testMask, false)!;
  const observed = ye - yo;
  const rng = mulberry32(seed);
  let extreme = 0;
  for (let d = 0; d < draws; d++) {
    const perm = ys.slice();
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    const diff = meanOf(perm, testMask, true)! - meanOf(perm, testMask, false)!;
    if (Math.abs(diff) + 1e-15 >= Math.abs(observed)) extreme++;
  }
  // Bootstrap of the held-out difference. The threshold stays the fit-window
  // threshold. This is not the permutation distribution, which is centred on
  // zero by construction and is not a confidence interval.
  const bootRng = mulberry32((seed + 0x9e3779b9) >>> 0);
  const boots: number[] = [];
  for (let d = 0; d < draws; d++) {
    const sample: Pair[] = [];
    for (let i = 0; i < test.length; i++) sample.push(test[Math.floor(bootRng() * test.length)]);
    const mask = sample.map((p) => p.x > threshold);
    const nE = mask.filter(Boolean).length;
    if (nE < 1 || nE > sample.length - 1) continue;
    const yb = sample.map((p) => p.y);
    const diff = meanOf(yb, mask, true)! - meanOf(yb, mask, false)!;
    if (Number.isFinite(diff)) boots.push(diff);
  }
  boots.sort((a, b) => a - b);
  const ciOk = boots.length >= draws * 0.8;
  return {
    threshold,
    trainEvents,
    trainOthers,
    testEvents,
    testOthers,
    trainDiff,
    testDiff: observed,
    testCiLow: ciOk ? quantile(boots, 0.025) : null,
    testCiHigh: ciOk ? quantile(boots, 0.975) : null,
    permutationP: (extreme + 1) / (draws + 1),
    top3Share: eventTop3Share(test, threshold),
    degenerate: false,
    note: ciOk ? null : 'bootstrap interval was unstable and is not reported',
  };
}

function eventTop3Share(test: readonly Pair[], threshold: number): number | null {
  const ys = test.filter((p) => p.x > threshold).map((p) => p.y);
  if (ys.length < 3) return null;
  const sum = ys.reduce((s, y) => s + y, 0);
  if (sum === 0) return null;
  const top = ys.slice().sort((a, b) => b - a).slice(0, 3).reduce((s, y) => s + y, 0);
  return top / sum;
}

export interface IssuerExample {
  id: string;
  ref: string;
  snippet: string;
}

export interface IssuerScan {
  counts: Record<string, number>;
  examples: IssuerExample[];
  listingsScanned: number;
}

const ISSUER_RES: { id: string; re: RegExp }[] = [
  { id: 'neinor', re: /neinor/i },
  { id: 'aedas', re: /aedas/i },
  { id: 'metrovacesa', re: /metrovacesa/i },
  { id: 'habitat', re: /(?:\bhabitat\b|\bhábitat\b)/i },
  { id: 'inmobiliaria_del_sur', re: /inmobiliaria del sur/i },
  { id: 'realia', re: /\brealia\b/i },
  { id: 'renta_corporacion', re: /renta corporaci[oó]n/i },
];

/** Word-bounded so "habitabilidad" is not counted as the developer Habitat. */
export function scanIssuerMentions(rows: readonly { ref: string; text: string }[]): IssuerScan {
  const counts: Record<string, number> = {};
  for (const issuer of ISSUER_RES) counts[issuer.id] = 0;
  const examples: IssuerExample[] = [];
  for (const row of rows) {
    for (const issuer of ISSUER_RES) {
      const m = issuer.re.exec(row.text);
      if (!m) continue;
      counts[issuer.id]++;
      if (examples.length < 8) {
        const at = Math.max(0, m.index - 40);
        examples.push({
          id: issuer.id,
          ref: row.ref,
          snippet: row.text.slice(at, at + 100).replace(/\s+/g, ' '),
        });
      }
    }
  }
  return { counts, examples, listingsScanned: rows.length };
}

export interface StockInput {
  id: string;
  name: string;
  isin: string;
  ticker: string;
  role: 'primary' | 'secondary';
  note: string;
  closes: ClosePoint[];
  /** BME listed-companies capitalisation in EUR on the fetch date, when the file provided it. */
  capitalisationEur: number | null;
}

export interface ExploratorySeries {
  id: string;
  label: string;
  points: { key: string; value: number }[];
}

export interface SignalInput {
  ledger: LedgerDay[];
  arrivalsByDate: Record<string, number>;
  stocks: StockInput[];
  market: { name: string; isin: string; closes: ClosePoint[] };
  coverage: {
    listingsScanned: number;
    agencyLabels: string[];
    issuerMentions: IssuerScan;
    projectIdNote: string;
    unmappedMoveTowns: number;
    mappedMoveTowns: number;
  };
  exploratory: ExploratorySeries[];
  priceSource: string;
  fetchedAt: string;
  adjustmentNote: string;
}

export interface BetaRow {
  ticker: string;
  alpha: number | null;
  beta: number | null;
  n: number;
  r2: number | null;
  from: string | null;
  to: string | null;
  note: string | null;
}

export interface ResultRow {
  id: string;
  claim: boolean;
  kind: 'correlation' | 'event';
  frequency: FrequencyName;
  stock: string;
  ticker: string;
  role: 'primary' | 'secondary' | 'exploratory';
  feature: string;
  outcome: OutcomeName;
  lag: string;
  pairs: Pair[];
  trainN: number;
  testN: number;
  full: CorrBlock | null;
  train: CorrBlock | null;
  test: CorrBlock | null;
  event: EventBlock | null;
  sameSign: boolean | null;
  oosCiExcludesZero: boolean;
  survives: boolean;
}

export interface SignalReport {
  generatedBy: string;
  claimSpecs: ClaimSpec[];
  familySize: number;
  bonferroni: number;
  minN: number;
  trainFraction: number;
  bootstrapDraws: number;
  permutationDraws: number;
  seed: number;
  ledgerStart: string;
  ledgerEnd: string;
  ledgerDays: number;
  gaps: Array<{ after: string; before: string; calendarDays: number }>;
  cleanWeeks: number;
  contaminatedWeeks: number;
  dailySessionsInWindow: number;
  dailyPairsPrimary: number;
  betas: BetaRow[];
  rows: ResultRow[];
  coverage: SignalInput['coverage'];
  stocks: Array<Omit<StockInput, 'closes'> & { sessions: number; medianVolumeInWindow: number | null }>;
  market: { name: string; isin: string; sessions: number };
  exploratoryLabels: string[];
  priceSource: string;
  fetchedAt: string;
  adjustmentNote: string;
  minDetectableAbsRDaily: number | null;
  minDetectableAbsRWeekly: number | null;
  headline: string;
  verdict: 'no-evidence' | 'nominal' | 'clears-bar';
}

function ciExcludesZero(block: CorrBlock | null): boolean {
  if (!block || block.underpowered || block.ciLow === null || block.ciHigh === null) return false;
  return block.ciLow > 0 || block.ciHigh < 0;
}

function sameSignNumbers(a: number | null, b: number | null): boolean | null {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === 0 || b === 0) return false;
  return Math.sign(a) === Math.sign(b);
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function toMap(rows: Array<{ date?: string; week?: string; ret: number }>, key: 'date' | 'week'): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of rows) {
    const k = row[key];
    if (k) m.set(k, row.ret);
  }
  return m;
}

export function runSignal(input: SignalInput): SignalReport {
  const ledger = annotateLedger(input.ledger);
  if (!ledger.length) throw new Error('runSignal: ledger is empty');
  const gaps = detectedGaps(ledger);
  const arrivals = new Map(Object.entries(input.arrivalsByDate));
  const weeks = weeklyFeatures(ledger, arrivals);
  const cleanWeeks = weeks.filter((w) => !w.contaminated).length;
  const marketRets = sessionLogReturns(input.market.closes);
  const marketMap = toMap(marketRets, 'date');
  const marketWeeks = toMap(weeklyLogReturns(input.market.closes), 'week');
  const ledgerStart = ledger[0].date;
  const sessions = input.market.closes.map((p) => p.date).filter((d) => d >= ledgerStart && d <= ledger[ledger.length - 1].date).sort();
  const features = dailyFeatures(ledger, sessions, arrivals);
  const betas: BetaRow[] = [];
  const alignedByTicker = new Map<string, { daily: AlignedPoint[]; weekly: AlignedPoint[] }>();

  for (const stock of input.stocks) {
    const rets = sessionLogReturns(stock.closes);
    const preX: number[] = [];
    const preY: number[] = [];
    let from: string | null = null;
    let to: string | null = null;
    for (const row of rets) {
      if (row.date >= ledgerStart) continue;
      const m = marketMap.get(row.date);
      if (m === undefined) continue;
      preX.push(m);
      preY.push(row.ret);
      if (!from || row.date < from) from = row.date;
      if (!to || row.date > to) to = row.date;
    }
    const fit = olsBeta(preY, preX);
    if (stock.role === 'primary' && !fit) {
      throw new Error(`runSignal: no pre-window beta for ${stock.ticker} (${preY.length} paired sessions before ${ledgerStart})`);
    }
    betas.push({
      ticker: stock.ticker,
      alpha: fit?.alpha ?? null,
      beta: fit?.beta ?? null,
      n: fit?.n ?? preY.length,
      r2: fit?.r2 ?? null,
      from,
      to,
      note: fit ? null : `beta not estimated (paired sessions before ${ledgerStart}: ${preY.length}, minimum ${MIN_BETA_SESSIONS})`,
    });
    if (!fit) {
      alignedByTicker.set(stock.ticker, { daily: [], weekly: [] });
      continue;
    }
    const stockMap = toMap(rets, 'date');
    const stockWeeks = toMap(weeklyLogReturns(stock.closes), 'week');
    alignedByTicker.set(stock.ticker, {
      daily: alignDaily(features, sessions, stockMap, marketMap, fit.beta),
      weekly: alignWeekly(weeks, stockWeeks, marketWeeks, fit.beta),
    });
  }

  const primary = input.stocks.filter((s) => s.role === 'primary');
  const familySize = primary.length * CLAIM_SPECS.length;
  const bonferroni = ALPHA / familySize;
  const rows: ResultRow[] = [];

  const pushCorr = (
    stock: StockInput,
    spec: ClaimSpec,
    claim: boolean,
    role: ResultRow['role'],
    points: AlignedPoint[],
    featureLabel: string,
  ) => {
    const pairs = featurePairs(points, spec.feature, spec.outcome);
    const { train, test } = chronologicalSplit(pairs);
    const id = `${stock.ticker}|${spec.frequency}|${spec.feature}|${spec.outcome}|${spec.kind}`;
    const full = correlationBlock(pairs.map((p) => p.x), pairs.map((p) => p.y), salt(id + '|full'));
    const trainBlock = correlationBlock(train.map((p) => p.x), train.map((p) => p.y), salt(id + '|train'));
    const testBlock = correlationBlock(test.map((p) => p.x), test.map((p) => p.y), salt(id + '|test'));
    rows.push({
      id,
      claim,
      kind: 'correlation',
      frequency: spec.frequency,
      stock: stock.name,
      ticker: stock.ticker,
      role,
      feature: featureLabel,
      outcome: spec.outcome,
      lag: spec.frequency === 'daily' ? 'next BME session' : 'next week',
      pairs,
      trainN: train.length,
      testN: test.length,
      full,
      train: trainBlock,
      test: testBlock,
      event: null,
      sameSign: sameSignNumbers(trainBlock.r, testBlock.r),
      oosCiExcludesZero: ciExcludesZero(testBlock),
      survives: false,
    });
  };

  for (const stock of input.stocks) {
    const aligned = alignedByTicker.get(stock.ticker);
    if (!aligned) continue;
    const specs = stock.role === 'primary' ? [...CLAIM_SPECS, ...SENSITIVITY_SPECS] : SENSITIVITY_SPECS.filter((s) => s.frequency === 'daily' && s.outcome === 'excess' && (s.feature === 'exit_rate' || s.feature === 'cut_rate'));
    for (const spec of specs) {
      if (spec.kind !== 'correlation') continue;
      const claim = stock.role === 'primary' && CLAIM_SPECS.some((c) => c.kind === spec.kind && c.frequency === spec.frequency && c.feature === spec.feature && c.outcome === spec.outcome);
      const points = spec.frequency === 'daily' ? aligned.daily : aligned.weekly;
      pushCorr(stock, spec, claim, stock.role, points, spec.feature);
    }
    if (stock.role === 'primary') {
      const spec = CLAIM_SPECS.find((c) => c.kind === 'event');
      if (spec) {
        const pairs = featurePairs(aligned.daily, spec.feature, spec.outcome);
        const { train, test } = chronologicalSplit(pairs);
        const id = `${stock.ticker}|daily|${spec.feature}|${spec.outcome}|event`;
        const ev = eventContrast(train, test, salt(id));
        const oosCi = ev.testCiLow !== null && ev.testCiHigh !== null && (ev.testCiLow > 0 || ev.testCiHigh < 0);
        rows.push({
          id,
          claim: true,
          kind: 'event',
          frequency: 'daily',
          stock: stock.name,
          ticker: stock.ticker,
          role: 'primary',
          feature: spec.feature,
          outcome: spec.outcome,
          lag: 'next BME session',
          pairs,
          trainN: train.length,
          testN: test.length,
          full: null,
          train: null,
          test: null,
          event: ev,
          sameSign: sameSignNumbers(ev.trainDiff, ev.testDiff),
          oosCiExcludesZero: !ev.degenerate && oosCi,
          survives: false,
        });
      }
    }
  }

  for (const series of input.exploratory) {
    for (const stock of primary) {
      const weekly = alignedByTicker.get(stock.ticker)?.weekly ?? [];
      const byWeek = new Map(weekly.map((p) => [p.key, p]));
      const pairs: Pair[] = [];
      for (const point of series.points) {
        // Aligned weekly rows are keyed by the feature week and already hold
        // the next week's excess return.
        const row = byWeek.get(point.key);
        if (!row || !Number.isFinite(point.value)) continue;
        pairs.push({ key: point.key, x: point.value, y: row.excess });
      }
      const { train, test } = chronologicalSplit(pairs);
      const id = `${stock.ticker}|weekly|${series.id}|excess|exploratory`;
      const full = correlationBlock(pairs.map((p) => p.x), pairs.map((p) => p.y), salt(id));
      const trainBlock = correlationBlock(train.map((p) => p.x), train.map((p) => p.y), salt(id + '|train'));
      const testBlock = correlationBlock(test.map((p) => p.x), test.map((p) => p.y), salt(id + '|test'));
      rows.push({
        id,
        claim: false,
        kind: 'correlation',
        frequency: 'weekly',
        stock: stock.name,
        ticker: stock.ticker,
        role: 'exploratory',
        feature: series.label,
        outcome: 'excess',
        lag: 'next week',
        pairs,
        trainN: train.length,
        testN: test.length,
        full,
        train: trainBlock,
        test: testBlock,
        event: null,
        sameSign: sameSignNumbers(trainBlock.r, testBlock.r),
        oosCiExcludesZero: ciExcludesZero(testBlock),
        survives: false,
      });
    }
  }

  for (const row of rows) {
    if (!row.claim) continue;
    if (row.kind === 'correlation') {
      const p = row.test?.p;
      row.survives = row.sameSign === true && row.oosCiExcludesZero && p != null && p < bonferroni;
    } else if (row.event && !row.event.degenerate) {
      const p = row.event.permutationP;
      row.survives = row.sameSign === true && row.oosCiExcludesZero && p !== null && p < bonferroni;
    }
  }

  const primaryDaily = alignedByTicker.get(primary[0]?.ticker ?? '')?.daily.length ?? 0;
  const primaryWeekly = alignedByTicker.get(primary[0]?.ticker ?? '')?.weekly.length ?? 0;
  const verdict = verdictOf(rows);
  const report: SignalReport = {
    generatedBy: 'src/lib/builder-stock-signal.ts runSignal',
    claimSpecs: CLAIM_SPECS.map((s) => ({ ...s })),
    familySize,
    bonferroni,
    minN: MIN_N,
    trainFraction: TRAIN_FRACTION,
    bootstrapDraws: BOOTSTRAP_DRAWS,
    permutationDraws: PERMUTATION_DRAWS,
    seed: SEED,
    ledgerStart,
    ledgerEnd: ledger[ledger.length - 1].date,
    ledgerDays: ledger.length,
    gaps,
    cleanWeeks,
    contaminatedWeeks: weeks.length - cleanWeeks,
    dailySessionsInWindow: sessions.length,
    dailyPairsPrimary: primaryDaily,
    betas,
    rows,
    coverage: input.coverage,
    stocks: input.stocks.map((s) => {
      const inWindow = s.closes.filter((c) => c.date >= ledgerStart && c.date <= ledger[ledger.length - 1].date);
      return {
        id: s.id,
        name: s.name,
        isin: s.isin,
        ticker: s.ticker,
        role: s.role,
        note: s.note,
        capitalisationEur: s.capitalisationEur,
        sessions: inWindow.length,
        medianVolumeInWindow: median(inWindow.map((c) => c.volume).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))),
      };
    }),
    market: { name: input.market.name, isin: input.market.isin, sessions: input.market.closes.length },
    exploratoryLabels: input.exploratory.map((e) => e.label),
    priceSource: input.priceSource,
    fetchedAt: input.fetchedAt,
    adjustmentNote: input.adjustmentNote,
    minDetectableAbsRDaily: criticalAbsR(primaryDaily),
    minDetectableAbsRWeekly: criticalAbsR(primaryWeekly),
    headline: '',
    verdict: verdict.verdict,
  };
  report.headline = buildHeadline(report);
  return report;
}

export function verdictOf(rows: readonly ResultRow[]): { verdict: SignalReport['verdict']; clearing: ResultRow[]; nominal: ResultRow[] } {
  const claim = rows.filter((r) => r.claim);
  const clearing = claim.filter((r) => r.survives);
  const nominal = claim.filter((r) => !r.survives && r.oosCiExcludesZero && r.sameSign === true);
  if (clearing.length) return { verdict: 'clears-bar', clearing, nominal };
  if (nominal.length) return { verdict: 'nominal', clearing, nominal };
  return { verdict: 'no-evidence', clearing, nominal };
}

function fmt(x: number | null, dp: number): string {
  if (x === null || !Number.isFinite(x)) return 'n/a';
  return x.toFixed(dp);
}

/** Enough decimals that a non-zero bound is not printed as 0.000. */
function fmtBound(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return 'n/a';
  let dp = 3;
  while (dp < 8 && x !== 0 && Number(x.toFixed(dp)) === 0) dp++;
  return x.toFixed(dp);
}

function fmtInterval(low: number | null, high: number | null): string {
  if (low === null || high === null) return 'not reported';
  return `${fmtBound(low)} to ${fmtBound(high)}`;
}

function fmtP(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return 'n/a';
  if (p < 0.001) return '<0.001';
  return p.toFixed(3);
}

function fmtEur(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return 'n/a';
  return `EUR ${Math.round(n).toLocaleString('en-GB')}`;
}

export function buildHeadline(report: SignalReport): string {
  const v = verdictOf(report.rows);
  const span = `${report.ledgerStart} to ${report.ledgerEnd}`;
  const base = `The overlap is ${report.dailyPairsPrimary} paired trading sessions (${report.cleanWeeks} clean weeks) from ${span}.`;
  if (v.verdict === 'clears-bar') {
    const row = v.clearing[0];
    const stat = row.kind === 'correlation'
      ? `r = ${fmt(row.test?.r ?? null, 3)}, out-of-sample n = ${row.testN}, p = ${fmtP(row.test?.p ?? null)}`
      : `out-of-sample mean difference = ${fmt(row.event?.testDiff ?? null, 4)}, permutation p = ${fmtP(row.event?.permutationP ?? null)}`;
    return `One pre-specified test clears the out-of-sample bar (${row.ticker}, ${row.feature}, ${row.lag}; ${stat}). ${base} That is a few months of history, so this is a small-sample result and not evidence of a stable relationship.`;
  }
  if (v.verdict === 'nominal') {
    const detail = v.nominal.map((row) => {
      const p = row.kind === 'event' ? row.event?.permutationP ?? null : row.test?.p ?? null;
      return `${row.ticker} ${row.kind} p = ${fmtP(p)}`;
    }).join('; ');
    const onlyEvents = v.nominal.every((row) => row.kind === 'event');
    return `${v.nominal.length} of ${report.familySize} pre-specified tests have a held-out interval excluding zero and the same sign as the fit window (${detail}). ${onlyEvents ? 'They are event contrasts, not the correlations. ' : ''}None is below the multiple-test bar of p < ${fmt(report.bonferroni, 4)}, so this is not a finding of a signal. ${base}`;
  }
  const detectable = report.minDetectableAbsRDaily === null
    ? ''
    : ` On a single daily test, before that correction, a correlation would need an absolute value of about ${fmt(report.minDetectableAbsRDaily, 2)} or larger before this sample could reject zero at 5%.`;
  return `No evidence of a signal. None of the ${report.familySize} pre-specified tests cleared the out-of-sample bar (same sign as the fit window, a 95% interval excluding zero, and a p-value below ${fmt(report.bonferroni, 4)}). ${base}${detectable}`;
}

const FEATURE_PROSE: Record<string, string> = {
  exit_rate: 'exit rate: listings that left the book, divided by the book',
  cut_rate: 'cut rate: asking-price reductions, divided by the book',
  book_change: 'log change in the number of listings observed',
  new_refs: 'new listing refs, counted on the first day the ref appears in the captured book',
};

function featureProse(feature: string): string {
  return FEATURE_PROSE[feature] ?? feature;
}

export function renderReport(report: SignalReport): string {
  const lines: string[] = [];
  lines.push('# Does the Avena coastal new-build series predict listed Spanish homebuilder stocks?');
  lines.push('');
  lines.push(report.headline);
  lines.push('');
  lines.push('This is a test, not a product claim. An exit from the captured book is a listing that left. It is not a confirmed sale. The capture has no developer name on a listing, so the series is the whole coastal book, not Neinor\'s book or Metrovacesa\'s book.');
  lines.push('');
  lines.push('## What was tested');
  lines.push('');
  lines.push(`Claim family, fixed in \`src/lib/builder-stock-signal.ts\` before the prices were joined: ${report.familySize} tests. The multiple-test bar is ${fmt(report.bonferroni, 4)} (${fmt(ALPHA, 2)} divided by ${report.familySize}).`);
  lines.push('');
  lines.push('For each primary stock the claim tests are:');
  lines.push('');
  lines.push('1. Pearson correlation of the exit rate on session T with the next session\'s excess log return.');
  lines.push('2. The same correlation for the asking-price cut rate.');
  lines.push('3. An event contrast: sessions whose exit rate is above the fit-window 75th percentile, versus the other sessions, on the held-out window. The difference in mean excess return is the statistic. The p-value is a permutation test.');
  lines.push('');
  lines.push(`Excess return is the stock\'s log return minus beta times the IBEX 35 log return. Beta is an ordinary least-squares slope with an intercept, fit only on sessions before ${report.ledgerStart}, and then applied to the test window. It is not refit on the overlap.`);
  lines.push('');
  lines.push(`The out-of-sample split is chronological. The first ${Math.round(report.trainFraction * 100)}% of pairs is the fit window. The rest is held out. A correlation is reported with a p-value and a 95% pair-bootstrap interval only when n is at least ${report.minN}. Below that, the correlation may be shown and is marked as too small to test. Bootstrap draws: ${report.bootstrapDraws}. Permutation draws: ${report.permutationDraws}. Seed: ${report.seed}.`);
  lines.push('');
  lines.push('The capture dated T can be written during the session, so the test does not treat it as known before the open. The outcome is the next session after T.');
  lines.push('');
  lines.push('## Prices');
  lines.push('');
  lines.push(`Source: ${report.priceSource}. Fetched ${report.fetchedAt}. ${report.adjustmentNote}`);
  lines.push('');
  lines.push('Names were checked against the BME listed-companies file on that fetch. Habitat Inmobiliaria and Vía Célere are not in it. AEDAS Homes is still listed. Neinor reported 96.83% ownership after the mandatory tender that settled on 5 March 2026, and the squeeze-out threshold on that tender was not met, so AEDAS was not delisted. It is a secondary name here, not an independent homebuilder. Inmobiliaria del Sur, Realia and Renta Corporación are listed in the same file and are included only as secondary names.');
  lines.push('');
  lines.push('| Ticker | Name | Role | ISIN | Sessions in the window | Median volume | BME capitalisation |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | ---: |');
  for (const s of report.stocks) {
    lines.push(`| ${s.ticker} | ${s.name} | ${s.role} | ${s.isin} | ${s.sessions} | ${s.medianVolumeInWindow === null ? 'n/a' : Math.round(s.medianVolumeInWindow).toLocaleString('en-GB')} | ${fmtEur(s.capitalisationEur)} |`);
  }
  lines.push('');
  lines.push(`Market: ${report.market.name} (${report.market.isin}), ${report.market.sessions} closes in the download.`);
  lines.push('');
  lines.push('Beta, fit before the ledger starts:');
  lines.push('');
  lines.push('| Ticker | Sessions | From | To | Alpha | Beta | R² |');
  lines.push('| --- | ---: | --- | --- | ---: | ---: | ---: |');
  for (const b of report.betas) {
    lines.push(`| ${b.ticker} | ${b.n} | ${b.from ?? 'n/a'} | ${b.to ?? 'n/a'} | ${fmt(b.alpha, 5)} | ${fmt(b.beta, 3)} | ${fmt(b.r2, 3)} |`);
  }
  lines.push('');
  lines.push('## Avena series');
  lines.push('');
  lines.push(`Published movement ledger: ${report.ledgerDays} days, ${report.ledgerStart} to ${report.ledgerEnd}. Clean Monday-start weeks used as features: ${report.cleanWeeks}. Weeks set aside: ${report.contaminatedWeeks}. Trading sessions in the window: ${report.dailySessionsInWindow}. Paired next-session observations for the first primary stock: ${report.dailyPairsPrimary}.`);
  lines.push('');
  if (report.gaps.length) {
    lines.push('Gaps, where the previous observation is more than one calendar day earlier. The later day is a catch-up. Its exits and price changes are not treated as a one-day event, and any week that contains one is dropped.');
    lines.push('');
    for (const g of report.gaps) {
      lines.push(`- ${g.after} then ${g.before} (${g.calendarDays} calendar days)`);
    }
    lines.push('');
  } else {
    lines.push('No multi-day gap in the ledger.');
    lines.push('');
  }
  lines.push(report.coverage.projectIdNote);
  lines.push('');
  lines.push(`Listings scanned for issuer names: ${report.coverage.listingsScanned}. Agency labels on the current book: ${report.coverage.agencyLabels.join(', ') || 'none'}.`);
  lines.push('');
  lines.push('| Name pattern | Listings whose text matched |');
  lines.push('| --- | ---: |');
  for (const [id, n] of Object.entries(report.coverage.issuerMentions.counts)) {
    lines.push(`| ${id} | ${n} |`);
  }
  lines.push('');
  if (report.coverage.issuerMentions.examples.length) {
    lines.push('Examples of those matches, so a zero is not hiding a hit and a hit is not assumed to be the issuer:');
    lines.push('');
    for (const ex of report.coverage.issuerMentions.examples) {
      lines.push(`- ${ex.id} ${ex.ref}: ${ex.snippet}`);
    }
    lines.push('');
  }
  lines.push(`Price-change rows joined to a town: ${report.coverage.mappedMoveTowns}. Rows whose town is not in the town file: ${report.coverage.unmappedMoveTowns}.`);
  lines.push('');
  lines.push('## Claim results');
  lines.push('');
  lines.push('For a correlation row, the interval is a pair bootstrap and the p-value is the Student-t p-value. For an event row, the interval is a bootstrap of the held-out mean difference and the p-value is a permutation p-value. "Diff" is the event-group mean minus the other-group mean.');
  lines.push('');
  lines.push('| Ticker | Test | Fit n | Fit r or diff | Held-out n | Held-out r or diff | Held-out 95% interval | Held-out p | Same sign | Clears bar |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |');
  for (const row of report.rows.filter((r) => r.claim)) {
    if (row.kind === 'correlation') {
      const interval = fmtInterval(row.test?.ciLow ?? null, row.test?.ciHigh ?? null);
      lines.push(`| ${row.ticker} | ${featureProse(row.feature)} | ${row.trainN} | ${fmt(row.train?.r ?? null, 3)} | ${row.testN} | ${fmt(row.test?.r ?? null, 3)} | ${interval} | ${fmtP(row.test?.p ?? null)} | ${row.sameSign === null ? 'n/a' : row.sameSign ? 'yes' : 'no'} | ${row.survives ? 'yes' : 'no'} |`);
    } else {
      const ev = row.event;
      const interval = ev && ev.testCiLow !== null && ev.testCiHigh !== null
        ? `${fmt(ev.testCiLow, 4)} to ${fmt(ev.testCiHigh, 4)}`
        : 'not reported';
      lines.push(`| ${row.ticker} | event, exit rate above fit-window 75th percentile (threshold ${fmt(ev?.threshold ?? null, 5)}; held-out groups ${ev?.testEvents ?? 0} and ${ev?.testOthers ?? 0}) | ${row.trainN} | ${fmt(ev?.trainDiff ?? null, 4)} | ${row.testN} | ${fmt(ev?.testDiff ?? null, 4)} | ${interval} | ${fmtP(ev?.permutationP ?? null)} | ${row.sameSign === null ? 'n/a' : row.sameSign ? 'yes' : 'no'} | ${row.survives ? 'yes' : 'no'} |`);
    }
  }
  lines.push('');
  lines.push('Full-sample correlations for the same claim rows, which are not the test:');
  lines.push('');
  lines.push('| Ticker | Feature | n | r | p | 95% bootstrap interval |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const row of report.rows.filter((r) => r.claim && r.kind === 'correlation')) {
    lines.push(`| ${row.ticker} | ${row.feature} | ${row.full?.n ?? 0} | ${fmt(row.full?.r ?? null, 3)} | ${fmtP(row.full?.p ?? null)} | ${fmtInterval(row.full?.ciLow ?? null, row.full?.ciHigh ?? null)} |`);
  }
  lines.push('');
  const dailyDetect = report.minDetectableAbsRDaily;
  const weeklyDetect = report.minDetectableAbsRWeekly;
  lines.push(`Smallest absolute correlation a single two-sided 5% test could reject, before the multiple-test correction: ${dailyDetect === null ? 'n/a' : fmt(dailyDetect, 2)} on the daily claim sample, ${weeklyDetect === null ? 'n/a (weekly n is below the minimum)' : fmt(weeklyDetect, 2)} on the weekly sample. A result inside that range is a failure to find a large correlation. It is not a proof that the correlation is zero.`);
  lines.push('');
  const fullExcluding = report.rows.filter((r) => {
    if (!r.claim || r.kind !== 'correlation' || !r.full) return false;
    const low = r.full.ciLow;
    const high = r.full.ciHigh;
    return low !== null && high !== null && (low > 0 || high < 0);
  });
  if (fullExcluding.length === 0) {
    lines.push('No full-sample claim correlation has a 95% interval that excludes zero.');
  } else {
    for (const row of fullExcluding) {
      const low = row.full!.ciLow!;
      const high = row.full!.ciHigh!;
      const nearer = Math.min(Math.abs(low), Math.abs(high));
      const hair = nearer < 0.01
        ? ` The bound closer to zero is ${fmtBound(nearer)}, which is inside 0.01, so the interval does not separate the correlation from zero in any practical sense.`
        : '';
      lines.push(`The full-sample interval for ${row.ticker} ${featureProse(row.feature)} excludes zero (${fmtBound(low)} to ${fmtBound(high)}). That is the full sample. The held-out interval is the one in the claim table.${hair}`);
    }
  }
  lines.push('');
  const concentrated = report.rows.filter((r) => r.claim && r.kind === 'event' && r.event && !r.event.degenerate && r.event.top3Share !== null && r.event.top3Share > 0.5);
  for (const row of concentrated) {
    const share = row.event!.top3Share!;
    const over = share > 1 ? ' The share is above 100% because other event days had a negative excess return, so the three largest days more than account for the group sum.' : '';
    lines.push(`The held-out ${row.ticker} event contrast is concentrated. The three largest event-day excess returns are ${fmt(share * 100, 0)}% of the sum of the event-day excess returns.${over} A difference that depends on a few sessions is not a repeated pattern.`);
    lines.push('');
  }
  lines.push('## Sensitivities');
  lines.push('');
  lines.push('These were computed in the same run. They are not in the claim family. A large number here would be a reason to pre-specify a new test on a later, longer sample. It would not be a result of this one.');
  lines.push('');
  lines.push('| Ticker | Role | Frequency | Feature | Outcome | n | r | 95% interval | Held-out n | Held-out r |');
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: |');
  for (const row of report.rows.filter((r) => !r.claim && r.kind === 'correlation')) {
    lines.push(`| ${row.ticker} | ${row.role} | ${row.frequency} | ${featureProse(row.feature)} | ${row.outcome} | ${row.full?.n ?? 0} | ${fmt(row.full?.r ?? null, 3)} | ${fmtInterval(row.full?.ciLow ?? null, row.full?.ciHigh ?? null)} | ${row.testN} | ${fmt(row.test?.r ?? null, 3)} |`);
  }
  lines.push('');
  const powered = report.rows.filter((r) => !r.claim && r.kind === 'correlation' && r.test && !r.test.underpowered && r.test.r !== null);
  if (powered.length) {
    const top = powered.slice().sort((a, b) => Math.abs(b.test!.r!) - Math.abs(a.test!.r!))[0];
    const sign = top.sameSign === false
      ? 'The fit window has the opposite sign, so the held-out number does not replicate.'
      : top.sameSign === true
        ? 'The sign matches the fit window. The row is still outside the claim family, so it is not a result of this test.'
        : 'The fit-window sign is undefined.';
    lines.push(`Largest absolute held-out correlation among sensitivities with a sample large enough to test: ${top.ticker}, ${featureProse(top.feature)}, ${top.outcome} return, ${top.frequency}, held-out r = ${fmt(top.test!.r, 3)} (n = ${top.testN}). ${sign}`);
    lines.push('');
  }
  const weeklyNs = report.rows.filter((r) => r.frequency === 'weekly' && r.full).map((r) => r.full!.n);
  const weeklyN = weeklyNs.length ? Math.max(...weeklyNs) : 0;
  lines.push(`Weekly rows use Monday-to-Sunday sums on weeks with at least five clean days and no catch-up. The outcome is the next week's excess log return. The longest weekly sample in this run is ${weeklyN} pairs, and the held-out slice of that is below the minimum of ${report.minN}, so a weekly correlation is shown and is not tested. Coast rows are counts, not rates, because the published ledger is not split by coast. Correlation does not depend on the unit. Asking-price cut counts are kept only for coasts whose current listings sum to at least 100. Smaller coasts are left out so a handful of listings cannot fill this table. The coasts in this run: ${report.exploratoryLabels.filter((label) => label.startsWith('asking-price cuts')).join('; ') || 'none'}.`);
  const weeklyExcluding = report.rows.filter((r) => {
    if (r.frequency !== 'weekly' || !r.full) return false;
    const low = r.full.ciLow;
    const high = r.full.ciHigh;
    return low !== null && high !== null && (low > 0 || high < 0);
  });
  if (weeklyExcluding.length) {
    const bits = weeklyExcluding.map((r) => `${r.ticker} ${r.feature} (${fmtInterval(r.full?.ciLow ?? null, r.full?.ciHigh ?? null)}, held-out n = ${r.testN})`);
    lines.push('');
    lines.push(`Some weekly full-sample intervals exclude zero. The held-out count on each of them is below ${report.minN}, so none of them is a test: ${bits.join('; ')}.`);
  }
  lines.push('');
  lines.push('## What this does not say');
  lines.push('');
  lines.push('- It does not say the stocks are cheap or expensive, or that anyone should trade them.');
  lines.push('- It does not say an exit was a sale. Many exits are withdrawals.');
  lines.push('- It does not say the coastal book is the land bank of these companies. The text scan above is the overlap we could measure.');
  lines.push('- The p-values assume the pairs are independent. The book is persistent from day to day, so the daily p-values are approximate. The bootstrap resamples pairs the same way and has the same limit. The weekly test is the less dependent one, and its held-out slice is too small to use.');
  lines.push('- A longer ledger could change this. The genuine daily series starts on the first ledger date above.');
  lines.push('');
  lines.push('## Reproduce');
  lines.push('');
  lines.push('```');
  lines.push('npx tsx scripts/builder-stock-signal.ts');
  lines.push('npx tsx scripts/test-builder-stock-signal.ts');
  lines.push('```');
  lines.push('');
  lines.push('The first command reads `public/open-data/movement-ledger.json`, the tombstones, the price-change file, the town file, `data/ref-dev-map.json` and `public/data.json`. It downloads closes from the BME Exchange public market API. No key, and no paid feed. `--prices research/builder-stock-prices.json` reruns the arithmetic without downloading. The test suite recomputes the stored correlations from the stored pairs and does not use the network.');
  lines.push('');
  return lines.join('\n');
}
