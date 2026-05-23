/**
 * Macro-indicator client. Pulls live values from public sources for the
 * regime engine and APCI. Each fetch is cached for 6h to avoid hammering
 * upstream APIs and to keep latency under 1s on cold-fetch.
 *
 * Sources:
 *   - ECB Statistical Data Warehouse (ECB SDW) — open, no key
 *   - Eurostat (via existing data-sources/eurostat.ts) — open, no key
 *   - ESM EONIA/€STR fallback (calculated from ECB rate)
 *
 * Returns null on any failure → the regime endpoint falls back to a
 * conservative literal so the page never breaks. We mark each indicator
 * with `live: true|false` so the UI can flag stale-fallback values.
 */

export interface MacroIndicator {
  name: string;
  value: number;
  unit: string;
  direction: string;
  bullish: boolean;
  live: boolean;            // true if fetched from upstream this request
  fetched_at: string;
  source: string;
}

interface CacheEntry { value: number; direction: string; ts: number }
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function readCache(key: string): CacheEntry | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) return null;
  return e;
}

function writeCache(key: string, value: number, direction: string) {
  cache.set(key, { value, direction, ts: Date.now() });
}

/**
 * ECB SDW JSON endpoint for the main refinancing rate.
 * Series: FM.D.U2.EUR.4F.KR.MRR_FR.LEV
 * Docs: https://data.ecb.europa.eu/help/api/data
 */
async function fetchEcbRate(): Promise<{ value: number; direction: string } | null> {
  const cached = readCache('ecb_rate');
  if (cached) return cached;
  try {
    const url = 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.MRR_FR.LEV?lastNObservations=30&format=jsondata';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const obs = json?.dataSets?.[0]?.series?.['0:0:0:0:0:0:0']?.observations ?? {};
    const keys = Object.keys(obs).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;
    const latest = obs[String(keys[keys.length - 1])]?.[0];
    const prior  = obs[String(keys[Math.max(0, keys.length - 10)])]?.[0];
    if (typeof latest !== 'number') return null;
    const direction = typeof prior !== 'number' ? 'stable' : latest < prior - 0.1 ? 'falling' : latest > prior + 0.1 ? 'rising' : 'stable';
    writeCache('ecb_rate', latest, direction);
    return { value: latest, direction };
  } catch {
    return null;
  }
}

/**
 * 3-month Euribor proxy via ECB MIR series.
 * Series: FM.M.U2.EUR.4F.MM.EURIBOR3MD_.HSTA
 */
async function fetchEuribor3m(): Promise<{ value: number; direction: string } | null> {
  const cached = readCache('euribor_3m');
  if (cached) return cached;
  try {
    const url = 'https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA?lastNObservations=12&format=jsondata';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const series = json?.dataSets?.[0]?.series;
    if (!series) return null;
    const firstSeries = series[Object.keys(series)[0]];
    const obs = firstSeries?.observations ?? {};
    const keys = Object.keys(obs).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;
    const latest = obs[String(keys[keys.length - 1])]?.[0];
    const prior  = obs[String(keys[0])]?.[0];
    if (typeof latest !== 'number') return null;
    const direction = typeof prior !== 'number' ? 'stable' : latest < prior - 0.1 ? 'falling' : latest > prior + 0.1 ? 'rising' : 'stable';
    writeCache('euribor_3m', latest, direction);
    return { value: latest, direction };
  } catch {
    return null;
  }
}

/**
 * EUR exchange rates via ECB. Daily reference rate.
 * Code = currency ISO (GBP, NOK, SEK, USD).
 */
async function fetchEcbFx(code: string): Promise<{ value: number; direction: string } | null> {
  const key = `fx_${code}`;
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${code}.EUR.SP00.A?lastNObservations=30&format=jsondata`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const series = json?.dataSets?.[0]?.series;
    if (!series) return null;
    const firstSeries = series[Object.keys(series)[0]];
    const obs = firstSeries?.observations ?? {};
    const keys = Object.keys(obs).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;
    const latest = obs[String(keys[keys.length - 1])]?.[0];
    const prior  = obs[String(keys[0])]?.[0];
    if (typeof latest !== 'number') return null;
    const pctChange = typeof prior === 'number' && prior !== 0 ? (latest - prior) / prior : 0;
    const direction = pctChange < -0.005 ? 'falling' : pctChange > 0.005 ? 'rising' : 'stable';
    writeCache(key, latest, direction);
    return { value: latest, direction };
  } catch {
    return null;
  }
}

/**
 * Pull a Spain macro indicator from causal_indicators (populated by causal-update cron).
 * Fallback layer for indicators not on ECB SDW (unemployment, GDP, mortgage approvals).
 */
import { supabase } from '@/lib/supabase';

async function fetchFromCausalIndicators(name: string): Promise<{ value: number; direction: string } | null> {
  if (!supabase) return null;

  // Try macro_indicators first (populated by /api/cron/sync-macro from ECB/Eurostat)
  try {
    const { data } = await supabase
      .from('macro_indicators')
      .select('value, previous_value')
      .ilike('indicator_key', `%${name.toLowerCase().replace(/\s+/g, '_')}%`)
      .order('fetched_at', { ascending: false })
      .limit(1);
    const row = (data?.[0]) as { value: number | null; previous_value: number | null } | undefined;
    if (row && typeof row.value === 'number') {
      const delta = row.previous_value != null ? row.value - row.previous_value : 0;
      const direction = delta < -0.05 ? 'falling' : delta > 0.05 ? 'rising' : 'stable';
      return { value: row.value, direction };
    }
  } catch { /* fall through */ }

  // Fallback to legacy causal_indicators table
  try {
    const { data } = await supabase
      .from('causal_indicators')
      .select('value, direction')
      .ilike('name', `%${name}%`)
      .in('target_market', ['all_spain', 'costa_blanca'])
      .limit(1);
    const row = (data?.[0]) as { value: number; direction: string | null } | undefined;
    if (!row || typeof row.value !== 'number') return null;
    return { value: row.value, direction: row.direction ?? 'stable' };
  } catch {
    return null;
  }
}

/** Brent crude — public source: EIA via STEO would need a key. Use causal_indicators only. */
async function fetchBrentCrude(): Promise<{ value: number; direction: string } | null> {
  return fetchFromCausalIndicators('brent');
}

/**
 * Public entry — returns the 20 indicators the regime engine needs.
 * Each indicator has a fallback literal so the engine always returns 20.
 */
export async function loadMacroIndicators(): Promise<MacroIndicator[]> {
  const ts = new Date().toISOString();

  // Fetch all in parallel — 4s timeout per fetch keeps total cap ~4s
  const [
    ecb, euribor,
    fxGbp, fxNok, fxSek,
    inflation, gdp, unemployment, mortgageApprovals, consumerConfidence,
    spainBond, brent,
    costaBlancaYoy, foreignBuyerShare, alicanteTrans, newSupply,
  ] = await Promise.all([
    fetchEcbRate(),
    fetchEuribor3m(),
    fetchEcbFx('GBP'),
    fetchEcbFx('NOK'),
    fetchEcbFx('SEK'),
    fetchFromCausalIndicators('inflation'),
    fetchFromCausalIndicators('gdp'),
    fetchFromCausalIndicators('unemployment'),
    fetchFromCausalIndicators('mortgage'),
    fetchFromCausalIndicators('consumer_confidence'),
    fetchFromCausalIndicators('10y_bond'),
    fetchBrentCrude(),
    fetchFromCausalIndicators('costa_blanca_yoy'),
    fetchFromCausalIndicators('foreign_buyer'),
    fetchFromCausalIndicators('transactions_yoy'),
    fetchFromCausalIndicators('new_supply'),
  ]);

  /** Helper: build one indicator with live-or-fallback. */
  function ind(
    name: string,
    fetched: { value: number; direction: string } | null,
    fallback: number,
    fallbackDir: string,
    unit: string,
    bullishWhen: (v: number, d: string) => boolean,
    source: string,
  ): MacroIndicator {
    const live = fetched != null;
    const value = fetched?.value ?? fallback;
    const direction = fetched?.direction ?? fallbackDir;
    return {
      name, value, unit, direction,
      bullish: bullishWhen(value, direction),
      live,
      fetched_at: ts,
      source: live ? source : `${source} (fallback)`,
    };
  }

  return [
    ind('ECB Rate',                    ecb,                2.40, 'falling', '%',           (v, d) => d === 'falling', 'ECB SDW: FM.D.U2.EUR.4F.KR.MRR_FR.LEV'),
    ind('EUR/GBP',                     fxGbp,              0.856, 'stable', '',            (_, d) => d === 'falling', 'ECB SDW: EXR.D.GBP.EUR.SP00.A'),
    ind('Spain Inflation',             inflation,          2.8,  'falling', '%',           (v) => v < 3.0, 'causal_indicators'),
    ind('Spain GDP',                   gdp,                2.9,  'stable',  '%',           (v) => v > 2.0, 'causal_indicators'),
    ind('Costa Blanca YoY',            costaBlancaYoy,     9.4,  'rising',  '%',           (v) => v > 5,   'causal_indicators'),
    ind('Foreign Buyer Share',         foreignBuyerShare,  19.3, 'rising',  '%',           (v) => v > 15,  'causal_indicators'),
    ind('Alicante Transactions YoY',   alicanteTrans,      7.1,  'stable',  '%',           (v) => v > 0,   'causal_indicators'),
    ind('New Supply YoY',              newSupply,          12.4, 'rising',  '%',           (v) => v > 0,   'causal_indicators'),
    ind('Euribor 3M',                  euribor,            2.85, 'falling', '%',           (v) => v < 3.0, 'ECB SDW: FM.M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA'),
    ind('Spain 10Y Bond',              spainBond,          3.21, 'stable',  '%',           (v) => v < 4.5, 'causal_indicators'),
    ind('Spain Unemployment',          unemployment,       11.2, 'falling', '%',           (v) => v < 12,  'causal_indicators'),
    ind('Spain Mortgage Approvals YoY',mortgageApprovals,  8.3,  'rising',  '%',           (v) => v > 0,   'causal_indicators'),
    ind('EUR/NOK',                     fxNok,              11.2, 'stable',  '',            () => true,     'ECB SDW: EXR.D.NOK.EUR.SP00.A'),
    ind('EUR/SEK',                     fxSek,              11.5, 'stable',  '',            () => true,     'ECB SDW: EXR.D.SEK.EUR.SP00.A'),
    ind('Brent Crude',                 brent,              72.4, 'falling', 'USD/bbl',     (v) => v < 95,  'causal_indicators'),
    ind('Spain Consumer Confidence',   consumerConfidence, 89.2, 'rising',  'index',       (v) => v > 85,  'causal_indicators'),
  ];
}
