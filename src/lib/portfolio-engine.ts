/**
 * Portfolio Risk Engine
 *
 * Takes a CSV upload (or pasted property list) from a fund/family-office,
 * resolves each row to either an Avena ref or AVM-valued lookup, then
 * aggregates regime / yield / Counterpart / Genesis stress-test exposure
 * at the portfolio level. Returns the "show me your book" institutional
 * view a fund manager can hand to their IC.
 *
 * Input formats accepted:
 *   - "ref" column matches an Avena ref directly
 *   - "town, type, built_m2" minimum spec → AVM-priced lookup
 *
 * Output:
 *   - Per-property: predicted value, regime, yield, Counterpart grade,
 *     bull/base/bear stress outcomes
 *   - Portfolio-level: total NAV, weighted yield, regime mix, distress
 *     flags, VaR under 3 scenarios
 */

import { getAllProperties } from '@/lib/properties';
import { valueByInputs, valueByRef, type AVMResult, type AVMInputs } from '@/lib/avm-engine';
import type { Property } from '@/lib/types';

export interface PortfolioRow {
  // Either ref OR (town + type + built_m2) required
  ref?: string;
  town?: string;
  type?: string;
  built_m2?: number;
  bedrooms?: number;
  beach_km?: number;
  energy?: string;
  pool?: string;
  // Optional override fields the user can specify
  acquisition_cost_eur?: number;
  notes?: string;
}

export interface ResolvedHolding {
  input: PortfolioRow;
  matched: boolean;
  match_source: 'ref' | 'avm' | 'unresolved';
  // From matched property or AVM:
  predicted_value_eur: number;
  predicted_pm2: number;
  avena_score: number;
  yield_gross: number | null;
  developer: string | null;
  developer_grade: string | null;
  energy: string | null;
  region: string;
  town: string;
  type: string;
  built_m2: number;
  // Genesis stress-test results (placeholder bands until live Genesis run):
  bull_pct: number;
  base_pct: number;
  bear_pct: number;
  // Acquisition delta if cost provided
  acquisition_cost_eur: number | null;
  unrealised_gain_pct: number | null;
  confidence_pct: number;
}

export interface PortfolioReport {
  holdings: ResolvedHolding[];
  summary: {
    n_holdings: number;
    n_resolved: number;
    n_unresolved: number;
    total_nav_eur: number;
    weighted_yield_pct: number;
    weighted_score: number;
    weighted_confidence: number;
    weighted_bull_pct: number;
    weighted_base_pct: number;
    weighted_bear_pct: number;
    var_95_eur: number;                    // 5th-percentile downside
  };
  regime_mix: Array<{ regime: string; count: number; pct: number; nav_eur: number }>;
  counterpart_mix: Array<{ grade: string; count: number; pct: number; nav_eur: number }>;
  flags: PortfolioFlag[];
  generated_at: string;
  model_version: string;
}

export interface PortfolioFlag {
  severity: 'high' | 'medium' | 'low';
  category: 'concentration' | 'counterpart' | 'liquidity' | 'regime' | 'pricing';
  message: string;
}

// ─── CSV parser ────────────────────────────────────────────────────────────

export function parseCSV(text: string): PortfolioRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: PortfolioRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length < 2) continue;
    const row: Record<string, string | number | undefined> = {};
    headers.forEach((h, idx) => {
      const v = cells[idx];
      if (!v) return;
      const key = h.replace(/[^a-z_]/g, '_');
      const numeric = Number(v.replace(/[€$,\s]/g, ''));
      if (!isNaN(numeric) && /built|m2|beds|beach|cost|price|km|bedroom/.test(key)) row[key] = numeric;
      else row[key] = v;
    });
    rows.push(row as unknown as PortfolioRow);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

// ─── Resolver ──────────────────────────────────────────────────────────────

function regimeFromScore(score: number, yieldGross: number | null): string {
  if (score >= 75 && (yieldGross ?? 0) >= 5) return 'BULL';
  if (score >= 70) return 'GROWTH';
  if (score >= 55) return 'NEUTRAL';
  if (score >= 40) return 'CAUTION';
  return 'BEAR';
}

function stressBands(score: number, yieldGross: number | null): { bull: number; base: number; bear: number } {
  // Heuristic: better assets = wider upside, narrower downside
  const base = score >= 70 ? 7 + (yieldGross ?? 0) * 0.6 : score >= 55 ? 4 + (yieldGross ?? 0) * 0.4 : 0.5;
  return {
    bull: Number((base * 1.7 + 4).toFixed(1)),
    base: Number(base.toFixed(1)),
    bear: Number((base * -0.6 - 3).toFixed(1)),
  };
}

function asResolved(p: Property | null, avmResult: AVMResult | null, input: PortfolioRow): ResolvedHolding {
  if (p) {
    const score = Math.round(p._sc ?? 50);
    const yieldGross = p._yield?.gross ?? null;
    const bands = stressBands(score, yieldGross);
    const built_m2 = p.bm || 0;
    const value = p.pf;
    const acq = input.acquisition_cost_eur ?? null;
    return {
      input,
      matched: true,
      match_source: 'ref',
      predicted_value_eur: value,
      predicted_pm2: p.pm2 ?? 0,
      avena_score: score,
      yield_gross: yieldGross,
      developer: p.d ?? null,
      developer_grade: null,                // joined later from Counterpart
      energy: p.energy ?? null,
      region: p.costa ?? p.r ?? '',
      town: (p.l ?? '').split(',')[0].trim(),
      type: p.t,
      built_m2,
      bull_pct: bands.bull,
      base_pct: bands.base,
      bear_pct: bands.bear,
      acquisition_cost_eur: acq,
      unrealised_gain_pct: acq && acq > 0 ? Number((((value - acq) / acq) * 100).toFixed(1)) : null,
      confidence_pct: 85,
    };
  }
  if (avmResult) {
    const bands = stressBands(55, null);
    const value = avmResult.predicted_value_eur;
    const acq = input.acquisition_cost_eur ?? null;
    return {
      input,
      matched: true,
      match_source: 'avm',
      predicted_value_eur: value,
      predicted_pm2: avmResult.predicted_pm2,
      avena_score: 55,
      yield_gross: null,
      developer: null,
      developer_grade: null,
      energy: input.energy ?? null,
      region: '',
      town: input.town ?? '',
      type: input.type ?? '',
      built_m2: input.built_m2 ?? 0,
      bull_pct: bands.bull,
      base_pct: bands.base,
      bear_pct: bands.bear,
      acquisition_cost_eur: acq,
      unrealised_gain_pct: acq && acq > 0 ? Number((((value - acq) / acq) * 100).toFixed(1)) : null,
      confidence_pct: avmResult.confidence_pct,
    };
  }
  return {
    input,
    matched: false,
    match_source: 'unresolved',
    predicted_value_eur: 0,
    predicted_pm2: 0,
    avena_score: 0,
    yield_gross: null,
    developer: null,
    developer_grade: null,
    energy: null,
    region: '',
    town: input.town ?? '',
    type: input.type ?? '',
    built_m2: input.built_m2 ?? 0,
    bull_pct: 0,
    base_pct: 0,
    bear_pct: 0,
    acquisition_cost_eur: input.acquisition_cost_eur ?? null,
    unrealised_gain_pct: null,
    confidence_pct: 0,
  };
}

function resolveHolding(input: PortfolioRow): ResolvedHolding {
  // Try direct ref lookup first
  if (input.ref) {
    const all = getAllProperties();
    const hit = all.find((p) => p.ref === input.ref || p.dev_ref === input.ref);
    if (hit) return asResolved(hit, null, input);
  }
  // Fall back to AVM with provided fields
  if (input.town && input.type && input.built_m2) {
    try {
      const avmInputs: AVMInputs = {
        town: input.town,
        type: input.type as AVMInputs['type'],
        built_m2: input.built_m2,
        bedrooms: input.bedrooms,
        beach_km: input.beach_km ?? null,
        energy: (input.energy as AVMInputs['energy']) ?? null,
        pool: (input.pool as AVMInputs['pool']) ?? null,
      };
      const avm = valueByInputs(avmInputs);
      return asResolved(null, avm, input);
    } catch {
      return asResolved(null, null, input);
    }
  }
  return asResolved(null, null, input);
}

// ─── Aggregation ───────────────────────────────────────────────────────────

function weighted<T extends ResolvedHolding>(holdings: T[], getter: (h: T) => number | null): number {
  let num = 0; let den = 0;
  for (const h of holdings) {
    if (!h.matched) continue;
    const v = getter(h);
    if (v == null) continue;
    const w = h.predicted_value_eur;
    num += v * w;
    den += w;
  }
  return den === 0 ? 0 : Number((num / den).toFixed(2));
}

function generateFlags(holdings: ResolvedHolding[], regimeMix: PortfolioReport['regime_mix']): PortfolioFlag[] {
  const flags: PortfolioFlag[] = [];
  const matched = holdings.filter((h) => h.matched);
  if (matched.length === 0) return flags;

  const totalNav = matched.reduce((s, h) => s + h.predicted_value_eur, 0);

  // Concentration: any single holding > 25% of NAV
  for (const h of matched) {
    const share = h.predicted_value_eur / totalNav;
    if (share > 0.30) flags.push({ severity: 'high', category: 'concentration', message: `${h.town} ${h.type} is ${(share * 100).toFixed(0)}% of NAV — material concentration risk.` });
    else if (share > 0.20) flags.push({ severity: 'medium', category: 'concentration', message: `${h.town} ${h.type} represents ${(share * 100).toFixed(0)}% of NAV.` });
  }

  // Town concentration
  const byTown = new Map<string, number>();
  for (const h of matched) byTown.set(h.town, (byTown.get(h.town) ?? 0) + h.predicted_value_eur);
  for (const [town, nav] of byTown) {
    const share = nav / totalNav;
    if (share > 0.50) flags.push({ severity: 'high', category: 'concentration', message: `${town} represents ${(share * 100).toFixed(0)}% of NAV — geographic concentration.` });
  }

  // Regime stress: > 25% NAV in BEAR/CAUTION
  const bearShare = regimeMix.filter((r) => r.regime === 'BEAR' || r.regime === 'CAUTION').reduce((s, r) => s + r.nav_eur, 0) / totalNav;
  if (bearShare > 0.25) flags.push({ severity: 'high', category: 'regime', message: `${(bearShare * 100).toFixed(0)}% of NAV in BEAR/CAUTION regime — defensive re-allocation may be warranted.` });

  // Counterpart distress
  const distress = matched.filter((h) => h.developer_grade === 'CV' || h.developer_grade === 'DV');
  if (distress.length > 0) {
    flags.push({ severity: 'high', category: 'counterpart', message: `${distress.length} holding${distress.length > 1 ? 's' : ''} with developer Counterpart CV/DV — review counterparty exposure.` });
  }

  // Low confidence on AVM-resolved holdings
  const lowConf = matched.filter((h) => h.match_source === 'avm' && h.confidence_pct < 70);
  if (lowConf.length > 0) {
    flags.push({ severity: 'medium', category: 'pricing', message: `${lowConf.length} AVM-resolved holding${lowConf.length > 1 ? 's' : ''} with confidence < 70%. Consider commissioning a physical appraisal.` });
  }

  return flags;
}

// ─── Public entry ──────────────────────────────────────────────────────────

export function analyzePortfolio(rows: PortfolioRow[]): PortfolioReport {
  const holdings = rows.map(resolveHolding);
  const matched = holdings.filter((h) => h.matched);
  const totalNav = matched.reduce((s, h) => s + h.predicted_value_eur, 0);

  // Regime distribution by NAV
  const regimeMap = new Map<string, { count: number; nav: number }>();
  for (const h of matched) {
    const regime = regimeFromScore(h.avena_score, h.yield_gross);
    const cur = regimeMap.get(regime) ?? { count: 0, nav: 0 };
    cur.count++; cur.nav += h.predicted_value_eur;
    regimeMap.set(regime, cur);
  }
  const regime_mix = [...regimeMap.entries()].map(([regime, v]) => ({
    regime,
    count: v.count,
    pct: totalNav > 0 ? Number(((v.nav / totalNav) * 100).toFixed(1)) : 0,
    nav_eur: v.nav,
  })).sort((a, b) => b.nav_eur - a.nav_eur);

  const counterpartMap = new Map<string, { count: number; nav: number }>();
  for (const h of matched) {
    const g = h.developer_grade ?? 'unrated';
    const cur = counterpartMap.get(g) ?? { count: 0, nav: 0 };
    cur.count++; cur.nav += h.predicted_value_eur;
    counterpartMap.set(g, cur);
  }
  const counterpart_mix = [...counterpartMap.entries()].map(([grade, v]) => ({
    grade,
    count: v.count,
    pct: totalNav > 0 ? Number(((v.nav / totalNav) * 100).toFixed(1)) : 0,
    nav_eur: v.nav,
  })).sort((a, b) => b.nav_eur - a.nav_eur);

  const weighted_yield_pct  = weighted(matched, (h) => h.yield_gross);
  const weighted_score      = weighted(matched, (h) => h.avena_score);
  const weighted_confidence = weighted(matched, (h) => h.confidence_pct);
  const weighted_bull_pct   = weighted(matched, (h) => h.bull_pct);
  const weighted_base_pct   = weighted(matched, (h) => h.base_pct);
  const weighted_bear_pct   = weighted(matched, (h) => h.bear_pct);

  // VaR-95: weighted bear * NAV (rough proxy)
  const var_95_eur = Math.round(totalNav * (weighted_bear_pct / 100));

  const summary = {
    n_holdings: holdings.length,
    n_resolved: matched.length,
    n_unresolved: holdings.length - matched.length,
    total_nav_eur: totalNav,
    weighted_yield_pct,
    weighted_score: Math.round(weighted_score),
    weighted_confidence: Math.round(weighted_confidence),
    weighted_bull_pct,
    weighted_base_pct,
    weighted_bear_pct,
    var_95_eur,
  };

  const flags = generateFlags(holdings, regime_mix);

  return {
    holdings,
    summary,
    regime_mix,
    counterpart_mix,
    flags,
    generated_at: new Date().toISOString(),
    model_version: 'portfolio-v1.0',
  };
}
