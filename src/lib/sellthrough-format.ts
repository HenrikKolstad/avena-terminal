/** CSV and number formatting for the Sell-Through Monitor. Pure. */
import type { ProjectStats } from './sellthrough';

const cell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join('|') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const PROJECT_COLUMNS: Array<keyof ProjectStats> = [
  'project', 'town', 'region', 'types', 'status', 'delivery', 'firstObserved', 'listingsObserved', 'live',
  'exitsSinceStart', 'exitsWindow', 'cutsSinceStart', 'risesSinceStart', 'cutsWindow', 'netPriceChangePct',
  'medianPm2', 'premiumToTownPct', 'minPrice', 'maxPrice', 'flags',
];

export function projectsToCsv(rows: ProjectStats[]): string {
  return [PROJECT_COLUMNS.join(','), ...rows.map((r) => PROJECT_COLUMNS.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

export const eur = (n: number | null | undefined) =>
  n === null || n === undefined ? '–' : '€' + Math.round(n).toLocaleString('en-GB');
export const pct = (n: number | null | undefined, signed = true) =>
  n === null || n === undefined ? '–' : `${signed && n > 0 ? '+' : ''}${n.toFixed(1)}%`;

export const REGION_LABEL: Record<string, string> = {
  'cb-north': 'Costa Blanca North',
  'cb-south': 'Costa Blanca South',
  'costa-calida': 'Costa Cálida',
  'costa-del-sol': 'Costa del Sol',
};

export const FLAG_LABEL: Record<string, string> = {
  SOLD_OUT: 'All listings gone',
  REPEAT_CUTS: 'Repeated cuts',
  CUTTING_WHILE_TOWN_RISES: 'Cutting while town rises',
  DELIVERY_NEAR_WITH_STOCK: 'Delivery ≤2 quarters, ≥3 listings live',
  EXIT_IN_GAP: 'Exit inside data gap',
};
