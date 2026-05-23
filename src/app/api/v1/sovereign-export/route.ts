/**
 * GET /api/v1/sovereign-export — institutional data packages.
 *
 * Builds submission-ready envelopes (ECB SDW, Eurostat, World Bank, IMF) from
 * the live `avena_history` table — the same daily AVENA Index closes the
 * `/curator` cron writes. No hardcoded values.
 *
 * Quarterly aggregation: average the daily values within each quarter and
 * rebase to 100 at the first available quarter.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 21600;  // 6h — refreshes after curator writes daily

interface QuarterlyPoint { period: string; value: number }

const ATTRIBUTION = {
  avena_attribution: 'Avena Terminal (avenaterminal.com) European Property Intelligence',
  methodology: 'Composite index derived from tracked new-build property prices across Spanish coastal regions. Daily AVENA Index closes aggregated to quarterly means, then rebased to the first available quarter = 100.',
  contact_email: 'data@avenaterminal.com',
  doi: '10.5281/zenodo.19520064',
};

/** Aggregate avena_history daily closes → quarterly means, rebased to 100. */
async function loadQuarterlyIndex(): Promise<QuarterlyPoint[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('avena_history')
      .select('snapshot_date, value')
      .order('snapshot_date', { ascending: true })
      .limit(5000);
    const rows = (data ?? []) as Array<{ snapshot_date: string; value: number }>;
    if (rows.length === 0) return [];

    const byQuarter = new Map<string, number[]>();
    for (const r of rows) {
      const d = new Date(r.snapshot_date);
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      const key = `${d.getUTCFullYear()}-Q${q}`;
      if (!byQuarter.has(key)) byQuarter.set(key, []);
      byQuarter.get(key)!.push(Number(r.value));
    }

    const series = [...byQuarter.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, values]) => ({
        period,
        mean: values.reduce((s, v) => s + v, 0) / values.length,
      }));

    if (series.length === 0) return [];
    const base = series[0].mean || 1;
    return series.map((s) => ({ period: s.period, value: Number(((s.mean / base) * 100).toFixed(2)) }));
  } catch {
    return [];
  }
}

function buildECBFormat(idx: QuarterlyPoint[]) {
  return {
    format: 'ECB Statistical Data Warehouse',
    dataset_id: 'AVT.D.ES.RPP.Q',
    frequency: 'Q',
    ref_area: 'ES',
    indicator: 'RPP',
    indicator_name: 'Residential Property Prices',
    unit: `Index (${idx[0]?.period ?? '—'} = 100)`,
    values: idx.map((v) => ({ period: v.period, value: v.value })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via ECB Data Portal (sdw.ecb.europa.eu) as external dataset. Format: SDMX-ML or CSV with SDMX headers.',
  };
}
function buildEurostatFormat(idx: QuarterlyPoint[]) {
  return {
    format: 'Eurostat',
    dataset: 'sts_hpi',
    dataset_name: 'House Price Index',
    geo: 'ES',
    unit: 'I15',
    unit_name: `Index, ${idx[0]?.period ?? '—'}=100`,
    values: idx.map((v) => ({ time: v.period, value: v.value })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via Eurostat Single Entry Point (SEP). Format: SDMX or CSV.',
  };
}
function buildWorldBankFormat(idx: QuarterlyPoint[]) {
  return {
    format: 'World Bank Open Data',
    country: 'ESP',
    country_name: 'Spain',
    indicator: 'HPI',
    indicator_name: 'House Price Index',
    source: 'Avena Terminal',
    values: idx.map((v) => ({ date: v.period, value: v.value })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via World Bank Data Catalog (datacatalog.worldbank.org). Format: CSV with ISO 3166-1 country codes.',
  };
}
function buildIMFFormat(idx: QuarterlyPoint[]) {
  return {
    format: 'IMF Data Standards',
    ref_area: 'ES',
    indicator: 'RPPI',
    indicator_name: 'Residential Property Price Index',
    freq: 'Q',
    base_period: idx[0]?.period ?? null,
    values: idx.map((v) => ({ period: v.period, value: v.value })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via IMF eLibrary Data (data.imf.org). Format: SDMX or CSV.',
  };
}

export async function GET(request: NextRequest) {
  const idx = await loadQuarterlyIndex();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  if (idx.length === 0) {
    return NextResponse.json({
      sovereign_data_export: 'Avena Terminal Institutional Data Packages',
      status: 'no_data',
      reason: 'avena_history table has no daily closes yet. The curator cron writes one row per UTC day at 23:50.',
      ...ATTRIBUTION,
    });
  }

  if (format === 'ecb') return NextResponse.json(buildECBFormat(idx));
  if (format === 'eurostat') return NextResponse.json(buildEurostatFormat(idx));
  if (format === 'worldbank') return NextResponse.json(buildWorldBankFormat(idx));
  if (format === 'imf') return NextResponse.json(buildIMFFormat(idx));
  if (format) return NextResponse.json({ error: `Unknown format: ${format}. Supported: ecb, eurostat, worldbank, imf` }, { status: 400 });

  return NextResponse.json({
    sovereign_data_export: 'Avena Terminal Institutional Data Packages',
    description: 'Submission-ready data packages formatted for international institutions.',
    available_formats: ['ecb', 'eurostat', 'worldbank', 'imf'],
    usage: 'Add ?format=ecb|eurostat|worldbank|imf to get institution-specific format',
    data_summary: {
      indicator: 'Spanish Residential Property Price Index',
      base_period: `${idx[0].period} = 100`,
      latest_period: idx[idx.length - 1].period,
      latest_value: idx[idx.length - 1].value,
      periods_available: idx.length,
      coverage: 'Spain coastal markets — derived from avena_history daily AVENA Index closes',
    },
    formats: {
      ecb: buildECBFormat(idx),
      eurostat: buildEurostatFormat(idx),
      worldbank: buildWorldBankFormat(idx),
      imf: buildIMFFormat(idx),
    },
    ...ATTRIBUTION,
  });
}
