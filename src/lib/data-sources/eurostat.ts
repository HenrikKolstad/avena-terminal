/**
 * Eurostat market context client.
 *
 * Pulls regional statistics (population trend, household income, tourism
 * intensity) for a given NUTS3 region and returns the property_market
 * row payload.
 *
 * Eurostat REST API:
 *   https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}
 *   Format: JSON-stat (annoying but parseable)
 *
 * Free, public, no auth. Conservative cache: monthly refresh per region.
 */

import { getNuts3 } from './nuts3';

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const UA = 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)';

export interface MarketContext {
  population_5yr_change_pct?: number;
  median_household_income_eur?: number;
  tourism_intensity?: number;
  source?: string;
}

interface JsonStatResponse {
  value?: Record<string, number>;
  dimension?: Record<string, {
    category?: {
      index?: Record<string, number>;
      label?: Record<string, string>;
    };
  }>;
}

/** Fetch JSON-stat from Eurostat with bounded retry. */
async function fetchEurostat(dataset: string, filters: Record<string, string | string[]>): Promise<JsonStatResponse | null> {
  const url = new URL(`${EUROSTAT_BASE}/${dataset}`);
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('lang', 'EN');
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) for (const x of v) url.searchParams.append(k, x);
    else url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      next: { revalidate: 86400 * 30 }, // monthly cache
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Compute % change between latest available value and value 5 years prior
 * for a given NUTS3 region. Used for population change trend.
 */
function compute5yrChange(payload: JsonStatResponse | null, regionIdx: number, timeDimKey = 'time'): number | null {
  if (!payload?.value || !payload?.dimension) return null;
  const time = payload.dimension[timeDimKey];
  if (!time?.category?.index) return null;
  const years = Object.entries(time.category.index)
    .map(([year, idx]) => ({ year: parseInt(year, 10), idx }))
    .filter(({ year }) => Number.isFinite(year))
    .sort((a, b) => b.year - a.year);
  if (years.length < 6) return null;

  // Stride/multidim flattening: assume value index = regionIdx * timeStride + timeIdx
  const timeCount = Object.keys(time.category.index).length;
  const latestKey = `${regionIdx * timeCount + years[0].idx}`;
  const fiveYrKey = `${regionIdx * timeCount + years[5].idx}`;
  const latest = payload.value[latestKey];
  const fiveYr = payload.value[fiveYrKey];
  if (latest == null || fiveYr == null || fiveYr === 0) return null;
  return Math.round(((latest - fiveYr) / fiveYr) * 10000) / 100;
}

/**
 * Get the NUTS3 region's index in the geo dimension of a payload.
 */
function getRegionIdx(payload: JsonStatResponse | null, nuts3: string): number | null {
  if (!payload?.dimension) return null;
  const geo = payload.dimension['geo'];
  if (!geo?.category?.index) return null;
  return geo.category.index[nuts3] ?? null;
}

/**
 * Fetch population 5yr change for one NUTS3 region.
 * Eurostat dataset: demo_r_pjangrp3 (population by age and NUTS3)
 */
async function getPopulationChange(nuts3: string): Promise<number | null> {
  const data = await fetchEurostat('demo_r_pjangrp3', {
    geo: nuts3,
    sex: 'T',
    age: 'TOTAL',
  });
  const idx = getRegionIdx(data, nuts3);
  if (idx == null) return null;
  return compute5yrChange(data, idx);
}

/**
 * Fetch median equivalised disposable income for a NUTS2 region.
 * Eurostat dataset: ilc_di04 (median by region — only NUTS2 granular).
 */
async function getMedianIncome(nuts2: string): Promise<number | null> {
  const data = await fetchEurostat('ilc_di04', {
    geo: nuts2,
    indic_il: 'MED_E',
    currency: 'EUR',
  });
  const idx = getRegionIdx(data, nuts2);
  if (idx == null || !data?.value || !data?.dimension) return null;
  // Take the most recent year
  const time = data.dimension['time'];
  if (!time?.category?.index) return null;
  const years = Object.entries(time.category.index)
    .map(([year, ix]) => ({ year: parseInt(year, 10), ix }))
    .filter(({ year }) => Number.isFinite(year))
    .sort((a, b) => b.year - a.year);
  if (!years.length) return null;
  const timeCount = Object.keys(time.category.index).length;
  const key = `${idx * timeCount + years[0].ix}`;
  const v = data.value[key];
  return v != null ? Math.round(v) : null;
}

/**
 * Fetch tourism intensity (tourist nights per inhabitant) for a NUTS2 region.
 * Eurostat dataset: tour_occ_arn2 (arrivals & nights at tourist accommodation, NUTS2).
 *
 * Returns 0-100 normalized score. Higher = more tourist-intensive.
 */
async function getTourismIntensity(nuts2: string): Promise<number | null> {
  const data = await fetchEurostat('tour_occ_nin2', {
    geo: nuts2,
    c_resid: 'TOTAL',
    nace_r2: 'I551-I553',
    unit: 'NR',
  });
  const idx = getRegionIdx(data, nuts2);
  if (idx == null || !data?.value || !data?.dimension) return null;
  const time = data.dimension['time'];
  if (!time?.category?.index) return null;
  const years = Object.entries(time.category.index)
    .map(([y, ix]) => ({ year: parseInt(y, 10), ix }))
    .filter(({ year }) => Number.isFinite(year))
    .sort((a, b) => b.year - a.year);
  if (!years.length) return null;
  const timeCount = Object.keys(time.category.index).length;
  const key = `${idx * timeCount + years[0].ix}`;
  const v = data.value[key];
  if (v == null) return null;
  // Normalize: 100 = 50M+ nights/yr (e.g. mid-tier coastal); cap at 100.
  return Math.min(100, Math.round((v / 500_000) * 1));
}

/**
 * Get a full MarketContext payload for a property.
 * Returns null if we can't determine the NUTS3 region.
 */
export async function getMarketContext(
  country: string | null,
  postalCode: string | null
): Promise<MarketContext | null> {
  const nuts3 = getNuts3(country, postalCode);
  if (!nuts3) return null;
  const nuts2 = nuts3.slice(0, 4);

  // Fetch all in parallel
  const [pop5yr, income, tourism] = await Promise.all([
    getPopulationChange(nuts3),
    getMedianIncome(nuts2),
    getTourismIntensity(nuts2),
  ]);

  const out: MarketContext = { source: 'eurostat' };
  if (pop5yr != null) out.population_5yr_change_pct = pop5yr;
  if (income != null) out.median_household_income_eur = income;
  if (tourism != null) out.tourism_intensity = tourism;
  return out;
}
