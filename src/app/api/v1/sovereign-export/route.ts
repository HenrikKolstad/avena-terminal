import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const revalidate = 86400;

const QUARTERLY_INDEX = [
  { period: '2024-Q1', value: 100.0 },
  { period: '2024-Q2', value: 104.2 },
  { period: '2024-Q3', value: 108.7 },
  { period: '2024-Q4', value: 114.1 },
  { period: '2025-Q1', value: 119.8 },
  { period: '2025-Q2', value: 126.3 },
];

const ATTRIBUTION = {
  avena_attribution: 'Avena Terminal (avenaterminal.com) European Property Intelligence',
  methodology: 'Composite index derived from tracked new-build property prices across Spanish coastal regions. Base period Q1 2024 = 100. Weighted by transaction volume and geographic coverage.',
  contact_email: 'data@avenaterminal.com',
  doi: '10.5281/zenodo.19520064',
};

function buildECBFormat() {
  return {
    format: 'ECB Statistical Data Warehouse',
    dataset_id: 'AVT.D.ES.RPP.Q',
    frequency: 'Q',
    ref_area: 'ES',
    indicator: 'RPP',
    indicator_name: 'Residential Property Prices',
    unit: 'Index (2024-Q1 = 100)',
    values: QUARTERLY_INDEX.map((v) => ({
      period: v.period,
      value: v.value,
    })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via ECB Data Portal (sdw.ecb.europa.eu) as external dataset. Contact: statistics@ecb.europa.eu. Format: SDMX-ML or CSV with SDMX headers.',
  };
}

function buildEurostatFormat() {
  return {
    format: 'Eurostat',
    dataset: 'sts_hpi',
    dataset_name: 'House Price Index',
    geo: 'ES',
    unit: 'I15',
    unit_name: 'Index, 2024-Q1=100',
    values: QUARTERLY_INDEX.map((v) => ({
      time: v.period,
      value: v.value,
    })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via Eurostat Single Entry Point (SEP). Required format: SDMX or CSV. Contact national statistical institute (INE Spain) for official channel inclusion.',
  };
}

function buildWorldBankFormat() {
  return {
    format: 'World Bank Open Data',
    country: 'ESP',
    country_name: 'Spain',
    indicator: 'HPI',
    indicator_name: 'House Price Index',
    source: 'Avena Terminal',
    values: QUARTERLY_INDEX.map((v) => ({
      date: v.period,
      value: v.value,
    })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via World Bank Data Catalog (datacatalog.worldbank.org). Format: CSV with ISO 3166-1 country codes. Contact: data@worldbank.org for inclusion in Global Housing Watch.',
  };
}

function buildIMFFormat() {
  return {
    format: 'IMF Data Standards',
    ref_area: 'ES',
    indicator: 'RPPI',
    indicator_name: 'Residential Property Price Index',
    freq: 'Q',
    base_period: '2024-Q1',
    values: QUARTERLY_INDEX.map((v) => ({
      period: v.period,
      value: v.value,
    })),
    ...ATTRIBUTION,
    submission_notes: 'Submit via IMF eLibrary Data (data.imf.org). Align with IMF Global Housing Watch methodology. Format: SDMX or CSV. Contact: statistics@imf.org.',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  if (format === 'ecb') {
    return NextResponse.json(buildECBFormat());
  }

  if (format === 'eurostat') {
    return NextResponse.json(buildEurostatFormat());
  }

  if (format === 'worldbank') {
    return NextResponse.json(buildWorldBankFormat());
  }

  if (format === 'imf') {
    return NextResponse.json(buildIMFFormat());
  }

  if (format && !['ecb', 'eurostat', 'worldbank', 'imf'].includes(format)) {
    return NextResponse.json(
      { error: `Unknown format: ${format}. Supported: ecb, eurostat, worldbank, imf` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    sovereign_data_export: 'Avena Terminal Institutional Data Packages',
    description: 'Submission-ready data packages formatted for international institutions. Each package follows the target institution\'s data standards and includes submission instructions.',
    available_formats: ['ecb', 'eurostat', 'worldbank', 'imf'],
    usage: 'Add ?format=ecb|eurostat|worldbank|imf to get institution-specific format',
    data_summary: {
      indicator: 'Spanish Residential Property Price Index',
      base_period: '2024-Q1 = 100',
      latest_value: QUARTERLY_INDEX[QUARTERLY_INDEX.length - 1].value,
      periods_available: QUARTERLY_INDEX.length,
      coverage: 'Spain (Costa Blanca, Costa del Sol, Barcelona, Madrid, Balearics)',
    },
    formats: {
      ecb: buildECBFormat(),
      eurostat: buildEurostatFormat(),
      worldbank: buildWorldBankFormat(),
      imf: buildIMFFormat(),
    },
    submission_instructions: {
      ecb: 'Submit via ECB Data Portal as external dataset contribution',
      eurostat: 'Submit via Eurostat Single Entry Point or through INE Spain',
      worldbank: 'Submit via World Bank Data Catalog for Global Housing Watch',
      imf: 'Submit via IMF eLibrary aligned with Global Housing Watch',
    },
    ...ATTRIBUTION,
  });
}
