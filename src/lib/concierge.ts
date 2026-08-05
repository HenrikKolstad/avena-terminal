/**
 * Avena Concierge — server-side brain (2026-08-05).
 *
 * Deterministic by design: preference extraction is rule-based, property
 * search is a hard-filter + soft-rank layer over the REAL feed
 * (getAllProperties). No language model generates property facts — every
 * card field comes straight from the dataset, and missing values are
 * omitted, never invented. An LLM can later be slotted in front of
 * extractPreferences for richer free-text handling without touching the
 * search layer.
 */

import { getAllProperties } from './properties';
import type { Property } from './types';

export interface ConciergePrefs {
  regions?: string[];        // costa names and/or towns, as typed keys
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
  purposes?: Array<'lifestyle' | 'investment'>;
  timeline?: 'ready' | 'within12' | 'offplan_ok';
  features?: string[];       // 'sea' | 'golf' | 'pool' | 'frontline'
}

export interface ConciergeCard {
  propertyId: string;
  slug: string;              // /property/{ref}
  name: string;
  location: string;
  imageUrl: string | null;
  priceFrom: number;
  bedrooms: number | null;
  completion: string | null;
  avenaScore: number | null;
  matchReasons: string[];
}

export interface ConciergeTurn {
  prefs: ConciergePrefs;
  missing: string[];
  ask?: { question: string; quickReplies: string[] };
  recommendations?: ConciergeCard[];
  resultNote?: string;
}

const COSTA_KEYS: Array<{ match: RegExp; costa: RegExp; label: string }> = [
  { match: /costa\s*del\s*sol|del sol/i, costa: /del sol/i, label: 'Costa del Sol' },
  { match: /costa\s*blanca/i, costa: /blanca/i, label: 'Costa Blanca' },
  { match: /costa\s*c(a|á)lida|calida/i, costa: /c(a|á)lida/i, label: 'Costa Cálida' },
  { match: /costa\s*tropical|tropical/i, costa: /tropical/i, label: 'Costa Tropical' },
  { match: /almer(i|í)a/i, costa: /almer/i, label: 'Costa de Almería' },
];

/** Parse a money amount like "650000", "650k", "€650,000", "650.000", "0.65m". */
function money(raw: string): number | null {
  const m = raw.toLowerCase().match(/([\d][\d.,\s]*)\s*(k|m)?/);
  if (!m) return null;
  // Strip spaces + thousands separators (comma always; dot only before a 3-digit group).
  const num = parseFloat(m[1].replace(/[\s,]/g, '').replace(/\.(?=\d{3}\b)/g, ''));
  if (!Number.isFinite(num)) return null;
  if (m[2] === 'm') return Math.round(num * 1_000_000);
  if (m[2] === 'k') return Math.round(num * 1_000);
  // Bare small numbers like "650" in a budget context mean thousands.
  return num < 10_000 ? Math.round(num * 1_000) : Math.round(num);
}

/** Accumulate preferences across every user message (later messages win). */
export function extractPreferences(userTexts: string[]): ConciergePrefs {
  const prefs: ConciergePrefs = {};
  const towns = getUserTownIndex();

  for (const text of userTexts) {
    const t = text.toLowerCase();

    // Regions — costas first, then exact town names
    for (const c of COSTA_KEYS) {
      if (c.match.test(t)) {
        prefs.regions = uniq([...(prefs.regions ?? []), c.label]);
      }
    }
    for (const [townKey, townLabel] of towns) {
      if (t.includes(townKey)) prefs.regions = uniq([...(prefs.regions ?? []), townLabel]);
    }
    if (/anywhere|whole coast|all (of )?spain|open to any/i.test(t)) prefs.regions = [];

    // Budget — ranges, "up to", "under", "max", "between"
    const range = t.match(/([\d][\d.,\s]*\s*[km]?)\s*(?:-|–|to|and)\s*(€?\s*[\d][\d.,\s]*\s*[km]?)/i);
    const upTo = t.match(/(?:up to|under|max(?:imum)?|below|budget of|budget)\s*€?\s*([\d][\d.,\s]*\s*[km]?)/i);
    if (range) {
      const lo = money(range[1]); const hi = money(range[2]);
      if (lo && hi && hi > lo) { prefs.minPrice = lo; prefs.maxPrice = hi; }
    } else if (upTo) {
      const v = money(upTo[1]);
      if (v) prefs.maxPrice = v;
    } else {
      const bare = t.match(/€\s*([\d][\d.,\s]*\s*[km]?)/i);
      if (bare) { const v = money(bare[1]); if (v) prefs.maxPrice = v; }
    }

    // Bedrooms
    const beds = t.match(/(\d)\s*(?:\+\s*)?(?:bed|bedroom|br\b|soverom)/i);
    if (beds) prefs.bedrooms = parseInt(beds[1], 10);

    // Purpose
    const wantsLifestyle = /lifestyle|holiday|vacation|live there|retire|family home/i.test(t);
    const wantsInvestment = /invest|yield|rental|return|roi/i.test(t);
    if (/\bboth\b/i.test(t) || (wantsLifestyle && wantsInvestment)) prefs.purposes = ['lifestyle', 'investment'];
    else if (wantsInvestment) prefs.purposes = ['investment'];
    else if (wantsLifestyle) prefs.purposes = ['lifestyle'];

    // Timeline
    if (/ready now|key.?ready|move in now|immediately/i.test(t)) prefs.timeline = 'ready';
    else if (/12 months|within a year|next year|ready within/i.test(t)) prefs.timeline = 'within12';
    else if (/off.?plan|no rush|flexible|any time|whenever/i.test(t)) prefs.timeline = 'offplan_ok';

    // Features
    const feats: string[] = [...(prefs.features ?? [])];
    if (/near the sea|sea view|by the sea|beach|frontline|seafront|coast(al)? view/i.test(t)) feats.push('sea');
    if (/golf/i.test(t)) feats.push('golf');
    if (/pool/i.test(t)) feats.push('pool');
    if (/frontline/i.test(t)) feats.push('frontline');
    if (feats.length) prefs.features = uniq(feats);
  }
  return prefs;
}

let _townIndex: Array<[string, string]> | null = null;
function getUserTownIndex(): Array<[string, string]> {
  if (_townIndex) return _townIndex;
  const seen = new Set<string>();
  const idx: Array<[string, string]> = [];
  for (const p of getAllProperties()) {
    if (!p.l) continue;
    const townOnly = p.l.split(',')[0].trim();
    const key = townOnly.toLowerCase();
    if (key.length < 4 || seen.has(key)) continue; // avoid 3-letter false matches
    seen.add(key);
    idx.push([key, p.l]);
  }
  _townIndex = idx;
  return idx;
}

const uniq = <T,>(a: T[]) => [...new Set(a)];

function matchesRegion(p: Property, regions: string[]): boolean {
  if (!regions.length) return true;
  for (const r of regions) {
    const costa = COSTA_KEYS.find((c) => c.label === r);
    if (costa && p.costa && costa.costa.test(p.costa)) return true;
    if (!costa && p.l === r) return true; // exact town label
  }
  return false;
}

function completionYear(p: Property): number | null {
  const m = (p.c || '').match(/20\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}
function isReady(p: Property): boolean {
  return /ready|key/i.test(p.s || '') || /ready/i.test(p.c || '');
}

const DISPLAY_CAP_PCT = 35; // same credibility cap as deals.ts / property page

/** Hard-filter then soft-rank the real inventory. Never exceeds maxPrice. */
export function searchProperties(prefs: ConciergePrefs, limit = 3): ConciergeCard[] {
  const nowYear = new Date().getFullYear();
  let pool = getAllProperties().filter((p) => p.ref && p.pf > 0);

  // ── Hard constraints ──
  if (prefs.maxPrice) pool = pool.filter((p) => p.pf <= prefs.maxPrice!);
  if (prefs.minPrice) pool = pool.filter((p) => p.pf >= prefs.minPrice!);
  if (prefs.regions?.length) pool = pool.filter((p) => matchesRegion(p, prefs.regions!));
  if (prefs.bedrooms) pool = pool.filter((p) => p.bd >= prefs.bedrooms!);
  if (prefs.timeline === 'ready') pool = pool.filter(isReady);
  if (prefs.timeline === 'within12') pool = pool.filter((p) => isReady(p) || (completionYear(p) !== null && completionYear(p)! <= nowYear + 1));

  // ── Soft ranking ──
  const invest = prefs.purposes?.includes('investment') ?? false;
  const life = prefs.purposes?.includes('lifestyle') ?? false;
  const wantSea = prefs.features?.includes('sea') ?? false;
  const wantGolf = prefs.features?.includes('golf') ?? false;
  const wantPool = prefs.features?.includes('pool') ?? false;

  const scored = pool.map((p) => {
    let s = p._sc ?? 0; // Avena Score as the base
    const disc = p.pm2 && p.mm2 && p.mm2 > p.pm2 ? Math.min(Math.round((1 - p.pm2 / p.mm2) * 100), DISPLAY_CAP_PCT) : 0;
    const hasSea = (p.views ?? []).some((v) => /sea/i.test(v)) || (p.bk != null && p.bk <= 1) || (p.cats ?? []).some((c) => /beach|frontline/i.test(c));
    const hasGolf = (p.cats ?? []).some((c) => /golf/i.test(c));
    const hasPool = !!p.pool && p.pool !== 'no';

    if (invest) s += disc * 0.8 + (p._yield?.gross ?? 0) * 3;
    if (life) s += (hasSea ? 12 : 0) + (hasPool ? 4 : 0);
    if (wantSea && hasSea) s += 15;
    if (wantGolf && hasGolf) s += 15;
    if (wantPool && hasPool) s += 6;
    if (prefs.timeline === 'ready' && isReady(p)) s += 5;

    // Real, verifiable match reasons only.
    const reasons: string[] = [];
    if (hasSea && (wantSea || life)) reasons.push((p.views ?? []).some((v) => /sea/i.test(v)) ? 'Sea view' : 'Near the beach');
    if (wantGolf && hasGolf) reasons.push('Golf nearby');
    if (disc > 0) reasons.push(`${disc}% below market benchmark`);
    if (prefs.maxPrice && p.pf <= prefs.maxPrice) reasons.push('Within budget');
    if (isReady(p)) reasons.push('Key ready');
    else if (p.c) reasons.push(`Completion ${p.c}`);
    if (invest && p._yield?.gross) reasons.push(`Est. ${p._yield.gross.toFixed(1)}% gross yield`);

    return { p, s, reasons };
  });

  scored.sort((a, b) => b.s - a.s);

  return scored.slice(0, limit).map(({ p, reasons }) => ({
    propertyId: p.ref as string,
    slug: `/property/${encodeURIComponent(p.ref as string)}`,
    name: p.p || `${p.t} in ${p.l}`,
    location: p.l,
    imageUrl: p.imgs?.[0] ?? null,
    priceFrom: Math.round(p.pf),
    bedrooms: p.bd ?? null,
    completion: isReady(p) ? 'Key ready' : p.c || null,
    avenaScore: p._sc != null ? Math.round(p._sc) : null,
    matchReasons: reasons.slice(0, 3),
  }));
}

/**
 * Sanitize preference objects from untrusted sources (the AI's structured
 * output, or prefs echoed back by the client for cross-turn persistence).
 * Everything is re-validated: regions must match real costas/towns, numbers
 * must be finite and in sane bounds, enums are whitelisted.
 */
export function sanitizePrefs(raw: unknown): Partial<ConciergePrefs> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const prefs: Partial<ConciergePrefs> = {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 10_000 && v <= 50_000_000 ? Math.round(v) : undefined);

  if (Array.isArray(r.regions)) {
    const valid = validateRegions(r.regions.filter((x): x is string => typeof x === 'string').slice(0, 5));
    if (valid.length) prefs.regions = valid;
  }
  const maxP = num(r.maxPrice); if (maxP) prefs.maxPrice = maxP;
  const minP = num(r.minPrice); if (minP) prefs.minPrice = minP;
  if (typeof r.bedrooms === 'number' && r.bedrooms >= 1 && r.bedrooms <= 10) prefs.bedrooms = Math.round(r.bedrooms);
  if (Array.isArray(r.purposes)) {
    const p = r.purposes.filter((x): x is 'lifestyle' | 'investment' => x === 'lifestyle' || x === 'investment');
    if (p.length) prefs.purposes = [...new Set(p)];
  }
  if (r.timeline === 'ready' || r.timeline === 'within12' || r.timeline === 'offplan_ok') prefs.timeline = r.timeline;
  if (Array.isArray(r.features)) {
    const f = r.features.filter((x): x is string => ['sea', 'golf', 'pool', 'frontline'].includes(x as string));
    if (f.length) prefs.features = [...new Set(f)];
  }
  return prefs;
}

/** Validate AI-proposed region labels against the real dataset (costas + towns). */
export function validateRegions(regions: string[]): string[] {
  const towns = new Set(getUserTownIndex().map(([, label]) => label));
  const townByLower = new Map(getUserTownIndex().map(([key, label]) => [key, label]));
  const out: string[] = [];
  for (const r of regions) {
    if (typeof r !== 'string') continue;
    const costa = COSTA_KEYS.find((c) => c.match.test(r));
    if (costa) { out.push(costa.label); continue; }
    if (towns.has(r)) { out.push(r); continue; }
    const byName = townByLower.get(r.toLowerCase().split(',')[0].trim());
    if (byName) out.push(byName);
  }
  return [...new Set(out)];
}

/** One conversational turn: extract → decide what to ask next, or search. */
export function conciergeTurn(userTexts: string[]): ConciergeTurn {
  return turnFromPrefs(extractPreferences(userTexts));
}

/** The deterministic decision step, callable with (possibly AI-merged) prefs. */
export function turnFromPrefs(prefs: ConciergePrefs): ConciergeTurn {
  const missing: string[] = [];
  if (!prefs.regions) missing.push('region');
  if (!prefs.maxPrice) missing.push('budget');
  if (!prefs.purposes) missing.push('purpose');
  if (!prefs.timeline) missing.push('timeline');

  // Ask ONE focused question at a time, with adaptive quick replies.
  if (!prefs.regions) {
    return { prefs, missing, ask: {
      question: 'Welcome. Where in Spain are you looking?',
      quickReplies: ['Costa del Sol, near the sea. Up to €650,000.', 'Costa del Sol', 'Costa Blanca', 'Costa Cálida', 'Anywhere coastal'],
    } };
  }
  if (!prefs.maxPrice) {
    return { prefs, missing, ask: {
      question: 'What budget should I work with?',
      quickReplies: ['Up to €400,000', '€400,000–€650,000', '€650,000–€1,000,000', 'Above €1,000,000'],
    } };
  }
  if (!prefs.purposes) {
    return { prefs, missing, ask: {
      question: 'Are you buying for lifestyle, investment, or both?',
      quickReplies: ['Lifestyle', 'Investment', 'Both'],
    } };
  }
  if (!prefs.timeline) {
    return { prefs, missing, ask: {
      question: 'When would you like the home to be ready?',
      quickReplies: ['Ready now', 'Within 12 months', 'Open to off-plan'],
    } };
  }

  const recommendations = searchProperties(prefs);
  if (recommendations.length === 0) {
    return { prefs, missing, recommendations,
      resultNote: 'Nothing in the live inventory matches all of that. Would you like to widen the budget or the area?',
      ask: { question: 'Nothing in the live inventory matches all of that — shall we widen the search?', quickReplies: ['Increase budget by €100,000', 'Any coastal region', 'Open to off-plan'] } };
  }
  return { prefs, missing, recommendations,
    resultNote: `${recommendations.length} strong ${recommendations.length === 1 ? 'match' : 'matches'} from ${getAllProperties().length.toLocaleString('en-US')} scored new-builds — ranked by fit, score and value.` };
}
