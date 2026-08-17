/**
 * GET /api/cron/sync-macro — daily 06:00 UTC.
 *
 * Pulls live macro indicators from public APIs (no key required) and
 * upserts them to `macro_indicators` (one row per indicator). The regime
 * engine + APCI read this table — no more hardcoded literals.
 *
 * Sources hit on every run:
 *   - ECB SDW: policy rate, Euribor 3M/12M, EUR/GBP, EUR/NOK, EUR/SEK, EUR/USD
 *   - Eurostat: Spain HICP (inflation), Spain unemployment, EA GDP growth
 *   - OECD: composite leading indicator (Spain)
 *
 * Each fetch has a 6s timeout. Failures are logged but never block the cron.
 */
import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Snapshot {
  indicator_key: string;
  indicator_name: string;
  value: number | null;
  previous_value: number | null;
  country_code: string | null;
  source_url: string;
  valid_for_date: string | null;
}

/*
 * Returns null on any failure — but says WHY on the way out. Previously a
 * 404, a 500 and a timeout were all the same silent null, so a series key
 * that had been retired upstream looked exactly like a slow network and
 * neither was visible anywhere.
 */
async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { 'User-Agent': 'AvenaTerminalBot/1.0', Accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`macro fetch HTTP ${res.status} — ${url}`);
      return null;
    }
    return res;
  } catch (e) {
    console.warn(`macro fetch failed (${e instanceof Error ? e.message : 'unknown'}) — ${url}`);
    return null;
  }
}

/** ECB SDW JSON: latest + N observations back, returns {latest, previous, valid_for}. */
async function ecbSdw(seriesKey: string, lastN = 12): Promise<{ latest: number | null; previous: number | null; valid_for: string | null }> {
  const url = `https://data-api.ecb.europa.eu/service/data/${seriesKey}?lastNObservations=${lastN}&format=jsondata`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res) return { latest: null, previous: null, valid_for: null };
  try {
    const json = await res.json();
    const series = json?.dataSets?.[0]?.series;
    if (!series) return { latest: null, previous: null, valid_for: null };
    const seriesKeys = Object.keys(series);
    if (seriesKeys.length === 0) return { latest: null, previous: null, valid_for: null };
    const obs = series[seriesKeys[0]]?.observations ?? {};
    const dimensions = json?.structure?.dimensions?.observation?.[0]?.values ?? [];
    const indices = Object.keys(obs).map(Number).sort((a, b) => a - b);
    if (!indices.length) return { latest: null, previous: null, valid_for: null };
    const latest = obs[String(indices[indices.length - 1])]?.[0] as number | undefined;
    const previous = indices.length >= 2 ? (obs[String(indices[indices.length - 2])]?.[0] as number | undefined) : undefined;
    const validIdx = indices[indices.length - 1];
    const validFor = dimensions[validIdx]?.id ?? null;
    return { latest: latest ?? null, previous: previous ?? null, valid_for: validFor };
  } catch {
    return { latest: null, previous: null, valid_for: null };
  }
}

/** Eurostat JSON-stat 2.0 endpoint — generic value extractor for monthly indicators. */
async function eurostat(dataset: string, params: string, label: string): Promise<{ latest: number | null; previous: number | null; valid_for: string | null }> {
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${params}`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res) return { latest: null, previous: null, valid_for: null };
  try {
    const json = await res.json();
    const dim = json?.dimension?.time?.category;
    if (!dim) {
      console.warn(`eurostat ${label}: no time dimension`);
      return { latest: null, previous: null, valid_for: null };
    }
    const periods: string[] = Object.keys(dim.index).sort();
    const values = json.value as Record<string, number>;

    /*
     * AUDIT 2026-08-17 — this used to take periods[last] blindly and read
     * values[index[last]]. Eurostat publishes the period LABEL before the
     * observation, so the newest period in `dimension.time` routinely
     * carries no value: `une_rt_m` for Spain listed 2026-07 with nothing
     * against it while 2026-06 held 10.1. The old code therefore stored
     * value=null stamped valid_for_date=2026-07, and — worse — filled
     * previous_value from 2026-06, so the row claimed the CURRENT reading
     * was unknown while the PRIOR one was 10.1. Same fault emptied
     * gr_inflation_yoy. A null here is not harmless: macro_support in
     * /api/v1/apci counts an indicator as unavailable and drops it from
     * the measured weight.
     *
     * Select the newest period that actually carries an observation, and
     * report THAT period as valid_for. A trailing labelled-but-empty
     * period is a publication lag, not missing data.
     */
    const observed = periods.filter((p) => {
      const v = values[String(dim.index[p])];
      return typeof v === 'number' && Number.isFinite(v);
    });
    if (observed.length === 0) {
      console.warn(`eurostat ${label}: ${periods.length} periods, none carrying an observation`);
      return { latest: null, previous: null, valid_for: null };
    }
    const lastPeriod = observed[observed.length - 1];
    const prevPeriod = observed.length >= 2 ? observed[observed.length - 2] : null;
    return {
      latest: values[String(dim.index[lastPeriod])],
      previous: prevPeriod != null ? values[String(dim.index[prevPeriod])] : null,
      valid_for: lastPeriod,
    };
  } catch {
    return { latest: null, previous: null, valid_for: null };
  }
}

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && !isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const log = await startCronLog('sync-macro', '/api/cron/sync-macro');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const snapshots: Snapshot[] = [];

  // ─── ECB SDW ─────────────────────────────────────────────────────────────
  const ecbRate = await ecbSdw('FM/D.U2.EUR.4F.KR.MRR_FR.LEV', 30);
  snapshots.push({ indicator_key: 'ecb_main_refi_rate', indicator_name: 'ECB Main Refinancing Rate', value: ecbRate.latest, previous_value: ecbRate.previous, country_code: 'EA', source_url: 'https://data-api.ecb.europa.eu/service/data/FM/D.U2.EUR.4F.KR.MRR_FR.LEV', valid_for_date: ecbRate.valid_for });

  const euribor3m = await ecbSdw('FM/M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA', 12);
  snapshots.push({ indicator_key: 'euribor_3m', indicator_name: 'Euribor 3-Month', value: euribor3m.latest, previous_value: euribor3m.previous, country_code: 'EA', source_url: 'https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA', valid_for_date: euribor3m.valid_for });

  const euribor12m = await ecbSdw('FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA', 12);
  snapshots.push({ indicator_key: 'euribor_12m', indicator_name: 'Euribor 12-Month', value: euribor12m.latest, previous_value: euribor12m.previous, country_code: 'EA', source_url: 'https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA', valid_for_date: euribor12m.valid_for });

  for (const ccy of ['GBP', 'NOK', 'SEK', 'USD']) {
    const fx = await ecbSdw(`EXR/D.${ccy}.EUR.SP00.A`, 30);
    snapshots.push({ indicator_key: `fx_eur_${ccy.toLowerCase()}`, indicator_name: `EUR/${ccy}`, value: fx.latest, previous_value: fx.previous, country_code: 'EA', source_url: `https://data-api.ecb.europa.eu/service/data/EXR/D.${ccy}.EUR.SP00.A`, valid_for_date: fx.valid_for });
  }

  // ─── Eurostat ─────────────────────────────────────────────────────────────
  const esInflation = await eurostat('prc_hicp_manr', 'geo=ES&coicop=CP00&unit=RCH_A', 'spain_inflation');
  snapshots.push({ indicator_key: 'spain_inflation_yoy', indicator_name: 'Spain HICP Inflation YoY', value: esInflation.latest, previous_value: esInflation.previous, country_code: 'ES', source_url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr', valid_for_date: esInflation.valid_for });

  const esUnemp = await eurostat('une_rt_m', 'geo=ES&age=TOTAL&sex=T&unit=PC_ACT&s_adj=SA', 'spain_unemployment');
  snapshots.push({ indicator_key: 'spain_unemployment_rate', indicator_name: 'Spain Unemployment Rate', value: esUnemp.latest, previous_value: esUnemp.previous, country_code: 'ES', source_url: 'https://ec.europa.eu/eurostat/databrowser/view/une_rt_m', valid_for_date: esUnemp.valid_for });

  const eaGdp = await eurostat('namq_10_gdp', 'geo=EA&unit=CLV20_MEUR&s_adj=SCA&na_item=B1GQ', 'ea_gdp');
  snapshots.push({ indicator_key: 'ea_gdp_chained_meur', indicator_name: 'Euro Area GDP (chained M€)', value: eaGdp.latest, previous_value: eaGdp.previous, country_code: 'EA', source_url: 'https://ec.europa.eu/eurostat/databrowser/view/namq_10_gdp', valid_for_date: eaGdp.valid_for });

  // Per-country HICP for major EU markets — feeds country-specific regime layers
  for (const cc of ['DE', 'FR', 'IT', 'NL', 'PT', 'GR']) {
    const hicp = await eurostat('prc_hicp_manr', `geo=${cc}&coicop=CP00&unit=RCH_A`, `${cc}_inflation`);
    snapshots.push({ indicator_key: `${cc.toLowerCase()}_inflation_yoy`, indicator_name: `${cc} HICP Inflation YoY`, value: hicp.latest, previous_value: hicp.previous, country_code: cc, source_url: 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr', valid_for_date: hicp.valid_for });
  }

  // Upsert all snapshots
  const fetched_at = new Date().toISOString();
  const rows = snapshots.map((s) => ({ ...s, fetched_at }));
  const { error } = await supabase.from('macro_indicators').upsert(rows, { onConflict: 'indicator_key,valid_for_date' });
  if (error) {
    await finishCronLog(log, 'error', { fetched: snapshots.length }, error);
    return NextResponse.json({ ok: false, error: error.message, fetched: snapshots.length }, { status: 500 });
  }

  const summary = {
    fetched: snapshots.length,
    live: snapshots.filter((s) => s.value != null).length,
    missing: snapshots.filter((s) => s.value == null).length,
    indicators: snapshots.map((s) => ({ key: s.indicator_key, value: s.value, valid_for: s.valid_for_date })),
  };
  await finishCronLog(log, 'success', summary);
  return NextResponse.json({ ok: true, ...summary });
}
