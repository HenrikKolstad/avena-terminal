/** Display helpers for the sample report and track record. Null stays blank. */

export function fmtCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
}

export function fmtEur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return '€' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
}

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).replace(/,/g, ' ');
}

/** `ratio` is a fraction (0.012 → 1.2%). Null is not zero. */
export function fmtPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Percent points already, such as a 4.2 gross yield. */
export function fmtPoints(points: number | null | undefined, digits = 1): string {
  if (points == null || !Number.isFinite(points)) return '—';
  return `${points.toFixed(digits)}%`;
}

export function fmtSignedPct(ratio: number | null | undefined, digits = 2): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  const pct = ratio * 100;
  const body = `${Math.abs(pct).toFixed(digits)}%`;
  if (pct > 0) return `+${body}`;
  if (pct < 0) return `-${body}`;
  return `${(0).toFixed(digits)}%`;
}
