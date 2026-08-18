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
  live: boolean;            // true if the SOURCE is currently updating (see STALE_AFTER_DAYS)
  fetched_at: string;
  source: string;
  /** When the underlying source last observed this value. null = no source, pure literal. */
  as_of: string | null;
  /** Age of `as_of` in whole days. null when `as_of` is null. */
  age_days: number | null;
  /** true when the value is a literal or its source has not updated in STALE_AFTER_DAYS. */
  stale: boolean;
}

/**
 * A source that has not produced a new observation in this many days is not
 * "live", whatever table it sits in. `causal_indicators` froze 2026-05-23;
 * without this threshold every value in it reads as a current market reading.
 */
const STALE_AFTER_DAYS = 45;

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

/** `as_of` omitted means the value was fetched from upstream during this request. */
interface SourcedValue { value: number; direction: string; as_of?: string | null }

/**
 * Exact indicator-name → `macro_indicators.indicator_key` map.
 *
 * This replaces an `ilike '%<name>%'` lookup that matched on substring and
 * published two wrong numbers:
 *   - `%gdp%` matched `ea_gdp_chained_meur` — Euro Area GDP in chained
 *     millions of euros — and served it as "Spain GDP: 3335689.7 %".
 *   - `%inflation%` matched all seven country HICP keys at once. They share a
 *     single `fetched_at`, so `order(fetched_at).limit(1)` picked an arbitrary
 *     country; in production it resolved to `gr_inflation_yoy` (Greece).
 *
 * A key belongs here only when both its COUNTRY and its UNIT match the
 * indicator being published. "Spain GDP" is deliberately absent: no key in
 * `macro_indicators` carries Spanish GDP growth, so it has no live source.
 */
const MACRO_KEY_BY_INDICATOR: Readonly<Record<string, string>> = {
  'Spain Inflation':    'spain_inflation_yoy',
  'Spain Unemployment': 'spain_unemployment_rate',
};

/** Read one exactly-keyed row from macro_indicators (written nightly by /api/cron/sync-macro). */
async function fetchFromMacroIndicators(indicatorName: string): Promise<SourcedValue | null> {
  if (!supabase) return null;
  const key = MACRO_KEY_BY_INDICATOR[indicatorName];
  if (!key) return null;
  try {
    const { data, error } = await supabase
      .from('macro_indicators')
      .select('value, previous_value, fetched_at')
      .eq('indicator_key', key)
      .order('fetched_at', { ascending: false })
      .limit(1);
    if (error) return null;
    const row = data?.[0] as
      { value: number | null; previous_value: number | null; fetched_at: string | null } | undefined;
    if (!row || typeof row.value !== 'number') return null;
    const delta = row.previous_value != null ? row.value - row.previous_value : 0;
    const direction = delta < -0.05 ? 'falling' : delta > 0.05 ? 'rising' : 'stable';
    return { value: row.value, direction, as_of: row.fetched_at };
  } catch {
    return null;
  }
}

/**
 * Legacy `causal_indicators` fallback.
 *
 * The previous version selected `value, direction` — neither column exists on
 * this table (they are `current_value` and `signal`), so every call 400'd into
 * an empty catch and returned null. The table has therefore never served a
 * single value; every indicator labelled "causal_indicators (fallback)" was in
 * fact the hardcoded literal in the `ind()` call below.
 *
 * The columns are now correct, but the table itself froze 2026-05-23, so
 * anything it returns is aged by the caller and will not be marked live.
 */
async function fetchFromCausalIndicators(namePattern: string): Promise<SourcedValue | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('causal_indicators')
      .select('current_value, signal, last_updated')
      .ilike('name', `%${namePattern}%`)
      .in('target_market', ['all_spain', 'costa_blanca'])
      .limit(1);
    if (error) return null;
    const row = data?.[0] as
      { current_value: number | null; signal: string | null; last_updated: string | null } | undefined;
    if (!row || typeof row.current_value !== 'number') return null;
    return { value: row.current_value, direction: row.signal ?? 'stable', as_of: row.last_updated };
  } catch {
    return null;
  }
}

/** Try the nightly table first, then the frozen legacy one. */
async function fetchMacro(indicatorName: string, legacyPattern: string): Promise<SourcedValue | null> {
  return (await fetchFromMacroIndicators(indicatorName)) ?? (await fetchFromCausalIndicators(legacyPattern));
}

/** Brent crude — public source: EIA via STEO would need a key. Use causal_indicators only. */
async function fetchBrentCrude(): Promise<SourcedValue | null> {
  return fetchFromCausalIndicators('Brent');
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
    fetchMacro('Spain Inflation',    'Spain HICP Inflation'),
    fetchMacro('Spain GDP',          'Spain GDP Growth'),
    fetchMacro('Spain Unemployment', 'Spain Unemployment'),
    fetchFromCausalIndicators('Spain Mortgage Approvals'),
    fetchFromCausalIndicators('Spain Consumer Confidence'),
    fetchFromCausalIndicators('Spain 10Y Bond'),
    fetchBrentCrude(),
    fetchFromCausalIndicators('Costa Blanca YoY'),
    fetchFromCausalIndicators('Foreign Buyer Share'),
    fetchFromCausalIndicators('Alicante Transactions YoY'),
    fetchFromCausalIndicators('New Supply YoY'),
  ]);

  const now = Date.now();

  /**
   * Build one indicator, carrying its true provenance.
   *
   * `live` now means "a source produced this value and that source is still
   * updating". Previously it meant only "a query returned a row", so values
   * frozen since 2026-05-23 were published as current readings, and literals
   * that no table ever produced were labelled `causal_indicators (fallback)`
   * — naming a table that had not been read successfully.
   */
  function ind(
    name: string,
    fetched: SourcedValue | null,
    fallback: number,
    fallbackDir: string,
    unit: string,
    bullishWhen: (v: number, d: string) => boolean,
    source: string,
  ): MacroIndicator {
    const value = fetched?.value ?? fallback;
    const direction = fetched?.direction ?? fallbackDir;
    const asOf = fetched?.as_of ?? (fetched ? ts : null);

    let ageDays: number | null = null;
    if (asOf) {
      const parsed = Date.parse(asOf);
      if (Number.isFinite(parsed)) ageDays = Math.floor((now - parsed) / 86_400_000);
    }

    // No source at all, or a source that has gone quiet, is not live.
    const stale = fetched == null || ageDays == null || ageDays > STALE_AFTER_DAYS;
    const live = !stale;

    let label: string;
    if (fetched == null)   label = `${source} (unavailable — published literal)`;
    else if (stale)        label = `${source} (stale: ${ageDays}d old)`;
    else                   label = source;

    return {
      name, value, unit, direction,
      bullish: bullishWhen(value, direction),
      live,
      fetched_at: ts,
      source: label,
      as_of: asOf,
      age_days: ageDays,
      stale,
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
    // Rising new supply is bearish for prices, not bullish. `causal_indicators`
    // itself stores signal='bearish' for this row at 12.4; the predicate said
    // `v > 0`, so Avena published the same indicator as bullish on one surface
    // and bearish on another.
    ind('New Supply YoY',              newSupply,          12.4, 'rising',  '%',           (v) => v <= 0,  'causal_indicators'),
    ind('Euribor 3M',                  euribor,            2.85, 'falling', '%',           (v) => v < 3.0, 'ECB SDW: FM.M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA'),
    ind('Spain 10Y Bond',              spainBond,          3.21, 'stable',  '%',           (v) => v < 4.5, 'causal_indicators'),
    ind('Spain Unemployment',          unemployment,       11.2, 'falling', '%',           (v) => v < 12,  'causal_indicators'),
    ind('Spain Mortgage Approvals YoY',mortgageApprovals,  8.3,  'rising',  '%',           (v) => v > 0,   'causal_indicators'),
    // Both were `() => true` — bullish at every possible exchange rate, which
    // is not a signal, just a vote. A falling EUR cross means the buyer's
    // currency strengthened and Spain got cheaper for them, the same rule the
    // EUR/GBP row above already applies.
    ind('EUR/NOK',                     fxNok,              11.2, 'stable',  '',            (_, d) => d === 'falling', 'ECB SDW: EXR.D.NOK.EUR.SP00.A'),
    ind('EUR/SEK',                     fxSek,              11.5, 'stable',  '',            (_, d) => d === 'falling', 'ECB SDW: EXR.D.SEK.EUR.SP00.A'),
    ind('Brent Crude',                 brent,              72.4, 'falling', 'USD/bbl',     (v) => v < 95,  'causal_indicators'),
    ind('Spain Consumer Confidence',   consumerConfidence, 89.2, 'rising',  'index',       (v) => v > 85,  'causal_indicators'),
  ];
}
