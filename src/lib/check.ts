/**
 * Property check — the one question the new front answers:
 * "Is this listing overpriced?"
 *
 * Why this doesn't just call the AVM: the AVM's €/m² is on INTERIOR area
 * (`bm`), while every portal shows TOTAL built area incl. terraces
 * (`bm_full`, ~20% larger on this book). A buyer pastes the portal number,
 * so we compare on `bm_full`. The AVM's relative premiums (golf, pool, sea
 * view) are still applied as a multiplier.
 *
 * Results are stateless: inputs encode into a short URL-safe id so every
 * result is a shareable page without a database write.
 */

import { valueByInputs, listTowns, type AVMInputs } from '@/lib/avm-engine';
import { getAllProperties } from '@/lib/properties';
import type { Property } from '@/lib/types';

export type CheckType = AVMInputs['type'];
export const CHECK_TYPES: CheckType[] = ['Villa', 'Townhouse', 'Bungalow', 'Apartment', 'Penthouse', 'Studio'];
export type Condition = 'new' | 'resale';

export interface CheckInputs {
  town: string;
  type: CheckType;
  built_m2: number;        // total built, as the portal shows it
  asking_eur: number;
  condition: Condition;
  bedrooms?: number;
  pool?: 'private' | 'communal' | 'none';
  sea_view?: boolean;
  golf?: boolean;
  source_url?: string;
}

export type Verdict = 'below' | 'fair' | 'above';
export type BaseSource = 'town' | 'region' | 'coast';

export interface CheckComp {
  ref: string;
  name: string;
  location: string;
  type: string;
  built_m2: number;
  price_eur: number;
  pm2: number;
  url: string;
}

export interface CheckResult {
  id: string;
  inputs: CheckInputs;
  estimate_eur: number;
  gap_pct: number; // + = listed above our estimate
  verdict: Verdict;
  headline: string;
  reasons: string[];
  confidence_note: string | null;
  asking_pm2: number;
  base_pm2: number;
  base_source: BaseSource;
  base_n: number;
  multiplier: number;
  comps: CheckComp[];
}

// ─── id encoding ─────────────────────────────────────────────────────────

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}

export function encodeCheckId(i: CheckInputs): string {
  const compact: Record<string, unknown> = { t: i.town, y: i.type, m: i.built_m2, a: i.asking_eur };
  if (i.condition === 'resale') compact.r = 1;
  if (i.bedrooms) compact.b = i.bedrooms;
  if (i.pool) compact.p = i.pool;
  if (i.sea_view) compact.s = 1;
  if (i.golf) compact.g = 1;
  if (i.source_url) compact.u = i.source_url;
  return b64url(JSON.stringify(compact));
}

export function decodeCheckId(id: string): CheckInputs | null {
  try {
    const c = JSON.parse(unb64url(id));
    const parsed = normaliseInputs({
      town: c.t, type: c.y, built_m2: c.m, asking_eur: c.a, condition: c.r ? 'resale' : 'new',
      bedrooms: c.b, pool: c.p, sea_view: !!c.s, golf: !!c.g, source_url: c.u,
    });
    return parsed.ok ? parsed.inputs : null;
  } catch {
    return null;
  }
}

export function listTownsForClient(): string[] {
  return listTowns();
}

// ─── validation ──────────────────────────────────────────────────────────

export type Normalised = { ok: true; inputs: CheckInputs } | { ok: false; error: string; missing: string[] };

/** Names buyers use that aren't town names in the data. */
const TOWN_ALIASES: Record<string, string> = {
  'la finca': 'Algorfa', 'la finca golf': 'Algorfa',
  'villamartin': 'Orihuela Costa', 'villamartín': 'Orihuela Costa', 'la zenia': 'Orihuela Costa',
  'playa flamenca': 'Orihuela Costa', 'cabo roig': 'Orihuela Costa', 'punta prima': 'Orihuela Costa',
  'campoamor': 'Orihuela Costa', 'dehesa de campoamor': 'Orihuela Costa', 'las ramblas': 'Orihuela Costa',
  'los dolses': 'Orihuela Costa', 'lomas de cabo roig': 'Orihuela Costa',
  'quesada': 'Ciudad Quesada', 'xabia': 'Jávea Xàbia', 'javea': 'Jávea Xàbia', 'jávea': 'Jávea Xàbia',
  'moraira': 'Moraira_Teulada', 'teulada': 'Moraira_Teulada', 'la nucia': 'la Nucia', 'la nucía': 'la Nucia',
  'malaga': 'Málaga', 'velez malaga': 'Vélez Málaga', 'el albir': 'Alfas del Pi', 'albir': 'Alfas del Pi',
  'guardamar': 'Guardamar del Segura', 'pilar de la horadada': 'Pilar de La Horadada', 'mil palmeras': 'Pilar de La Horadada',
  'torre de la horadada': 'Pilar de La Horadada', 'la mata': 'Torrevieja', 'los balcones': 'Torrevieja', 'la siesta': 'Torrevieja',
  'san miguel': 'San Miguel de Salinas', 'la manga': 'La Manga del Mar Menor', 'mar menor': 'Los Alcazares',
  'alfaz del pi': 'Alfas del Pi', "l'alfas del pi": 'Alfas del Pi', 'alhaurin de la torre': 'Alhaurín De La Torre',
};

export function matchTown(raw: string): string | null {
  const q = (raw || '').trim().toLowerCase();
  if (!q) return null;
  if (TOWN_ALIASES[q]) return TOWN_ALIASES[q];
  for (const [k, v] of Object.entries(TOWN_ALIASES)) if (q.includes(k)) return v;
  const towns = listTowns();
  const exact = towns.find((t) => t.toLowerCase() === q);
  if (exact) return exact;
  const starts = towns.filter((t) => t.toLowerCase().startsWith(q));
  if (starts.length === 1) return starts[0];
  const contains = towns.find((t) => q.includes(t.toLowerCase()));
  return contains ?? (starts[0] ?? null);
}

export function normaliseInputs(raw: Partial<CheckInputs> & Record<string, unknown>): Normalised {
  const missing: string[] = [];
  const town = matchTown(String(raw.town ?? ''));
  if (!town) missing.push('town');
  const type = CHECK_TYPES.includes(raw.type as CheckType) ? (raw.type as CheckType) : null;
  if (!type) missing.push('type');
  const m2 = Number(raw.built_m2);
  if (!Number.isFinite(m2) || m2 < 20 || m2 > 5000) missing.push('built_m2');
  const asking = Number(raw.asking_eur);
  if (!Number.isFinite(asking) || asking < 20_000 || asking > 50_000_000) missing.push('asking_eur');
  if (missing.length) return { ok: false, error: 'Missing or invalid: ' + missing.join(', '), missing };

  const beds = Number(raw.bedrooms);
  const pool = ['private', 'communal', 'none'].includes(String(raw.pool)) ? (raw.pool as CheckInputs['pool']) : undefined;
  const url = typeof raw.source_url === 'string' && /^https?:\/\//.test(raw.source_url) ? raw.source_url.slice(0, 500) : undefined;

  return {
    ok: true,
    inputs: {
      town: town!, type: type!, built_m2: Math.round(m2), asking_eur: Math.round(asking),
      condition: raw.condition === 'resale' ? 'resale' : 'new',
      bedrooms: Number.isFinite(beds) && beds > 0 ? Math.round(beds) : undefined,
      pool, sea_view: !!raw.sea_view, golf: !!raw.golf, source_url: url,
    },
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────

export function fmtEur(n: number): string {
  // "€372 000" — space thousands, the way a Scandinavian reads a number.
  return '€' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
}

const TYPE_PLURAL: Record<CheckType, string> = {
  Villa: 'villas', Townhouse: 'townhouses', Bungalow: 'bungalows',
  Apartment: 'apartments', Penthouse: 'penthouses', Studio: 'studios',
};
const VILLA_GROUP = ['Villa', 'Townhouse', 'Bungalow'];
const isVilla = (t: string) => VILLA_GROUP.includes(t);
const townOf = (p: Property) => (p.l || '').split(',')[0].trim();
const fullM2 = (p: Property) => (p.bm_full && p.bm_full > 0 ? p.bm_full : p.bm);
const fullPm2 = (p: Property) => (fullM2(p) > 0 && p.pf > 0 ? p.pf / fullM2(p) : 0);
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pickPool(inputs: CheckInputs, all: Property[]): { pool: Property[]; source: BaseSource } {
  const want = inputs.town.toLowerCase();
  const seg = isVilla(inputs.type);
  const usable = all.filter((p) => fullPm2(p) > 0 && isVilla(p.t) === seg);
  const town = usable.filter((p) => townOf(p).toLowerCase() === want);
  if (town.length >= 5) return { pool: town, source: 'town' };
  const sample = all.find((p) => townOf(p).toLowerCase() === want);
  const region = sample ? sample.costa || sample.r : null;
  const reg = region ? usable.filter((p) => (p.costa || p.r) === region) : [];
  if (reg.length >= 10) return { pool: reg, source: 'region' };
  return { pool: usable, source: 'coast' };
}

// ─── the check ───────────────────────────────────────────────────────────

export function runCheck(inputs: CheckInputs): CheckResult {
  const all = getAllProperties();
  const { pool, source } = pickPool(inputs, all);
  const basePm2 = Math.round(median(pool.map(fullPm2)));

  // Relative premiums from the AVM (golf, pool, sea view…), as a multiplier.
  const avm = valueByInputs({
    town: inputs.town, type: inputs.type, built_m2: inputs.built_m2, bedrooms: inputs.bedrooms,
    sea_view: inputs.sea_view, golf: inputs.golf, pool: inputs.pool ?? null,
  });
  const multiplier = avm.base_pm2 > 0 ? Math.max(0.7, Math.min(1.55, avm.predicted_pm2 / avm.base_pm2)) : 1;

  const estimate = Math.round((basePm2 * multiplier * inputs.built_m2) / 1000) * 1000;
  const gap = Math.round(((inputs.asking_eur - estimate) / estimate) * 100);
  const verdict: Verdict = gap <= -8 ? 'below' : gap >= 8 ? 'above' : 'fair';
  const abs = Math.abs(gap);
  const vs = inputs.condition === 'resale' ? 'new-build prices' : 'market';
  const headline =
    verdict === 'fair' ? `Priced in line with ${inputs.condition === 'resale' ? 'new-build prices' : 'the market'}`
    : verdict === 'above' ? `Listed ${abs}% above ${vs}`
    : `Listed ${abs}% below ${vs}`;

  const askingPm2 = Math.round(inputs.asking_eur / inputs.built_m2);
  const plural = TYPE_PLURAL[inputs.type];
  const where = source === 'town' ? inputs.town : source === 'region' ? 'the region' : 'the coast';

  const reasons: string[] = [];
  reasons.push(`New-build ${plural} in ${where} ask ${fmtEur(basePm2)}/m² on total built area; this one asks ${fmtEur(askingPm2)}/m²`);
  const relPct = Math.round((multiplier - 1) * 100);
  if (avm.adjustments.length === 0 && relPct <= -5) {
    reasons.push(`No sea view, beach or golf premium noted, so we price it about ${Math.abs(relPct)}% under the typical listing in ${where}`);
  } else {
    for (const adj of avm.adjustments.slice(0, 2)) {
      reasons.push(`${adj.factor} ${adj.pct > 0 ? 'adds about' : 'takes off about'} ${Math.abs(adj.pct)}% in our model`);
    }
  }
  if (inputs.condition === 'resale' && reasons.length < 3) {
    reasons.push('Resales usually trade below new-build asking prices, so some discount is normal');
  }
  if (reasons.length < 2) {
    reasons.push(`Based on ${pool.length} comparable ${plural} on the market today`);
  }

  let confidenceNote: string | null = null;
  if (source !== 'town') {
    confidenceNote = `Few comparable ${plural} in ${inputs.town}, so this estimate uses ${where} and is rough.`;
  } else if (pool.length < 10) {
    confidenceNote = `Only ${pool.length} comparable ${plural} in ${inputs.town}; treat the estimate as rough.`;
  }
  if (inputs.condition === 'resale') {
    confidenceNote = (confidenceNote ? confidenceNote + ' ' : '') + 'We compare with new-build asking prices; a resale is normally cheaper, so read this as an upper bound.';
  }

  // Comps: the three closest in size, from the same pool.
  const comps: CheckComp[] = [...pool]
    .sort((a, b) => Math.abs(fullM2(a) - inputs.built_m2) - Math.abs(fullM2(b) - inputs.built_m2))
    .slice(0, 3)
    .map((p) => ({
      ref: p.ref ?? '', name: p.p || p.d || p.ref || 'New build', location: p.l, type: p.t,
      built_m2: fullM2(p), price_eur: p.pf, pm2: Math.round(fullPm2(p)), url: p.ref ? `/property/${p.ref}` : '/prices',
    }));

  return {
    id: encodeCheckId(inputs),
    inputs,
    estimate_eur: estimate,
    gap_pct: gap,
    verdict, headline,
    reasons: reasons.slice(0, 3),
    confidence_note: confidenceNote,
    asking_pm2: askingPm2,
    base_pm2: basePm2, base_source: source, base_n: pool.length,
    multiplier, comps,
  };
}
