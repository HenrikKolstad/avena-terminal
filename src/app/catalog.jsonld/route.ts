/**
 * /catalog.jsonld — DCAT-AP catalogue of Avena's open datasets.
 *
 * DCAT-AP is the EU's application profile of W3C DCAT: the format
 * data.europa.eu (the official EU open-data portal) harvests external
 * catalogues with. Serving a conformant catalogue is the prerequisite
 * for registering Avena as a harvested source — Avena datasets listed
 * by the European Union's own portal, alongside Eurostat.
 *
 * Also consumed by any DCAT-aware aggregator (national portals,
 * CKAN instances, dataset search engines).
 */

export const dynamic = 'force-static';

const BASE = 'https://avenaterminal.com';
const PUBLISHER = {
  '@id': `${BASE}/#org`,
  '@type': 'foaf:Agent',
  'foaf:name': 'Avena Terminal',
  'foaf:homepage': BASE,
};

function dataset(opts: {
  id: string;
  title: string;
  description: string;
  landing: string;
  jsonUrl: string;
  keywords: string[];
  accrual: string; // dct:accrualPeriodicity EU frequency URI suffix
  issued: string;
}) {
  return {
    '@id': `${BASE}/dataset/${opts.id}`,
    '@type': 'dcat:Dataset',
    'dct:identifier': opts.id,
    'dct:title': { '@value': opts.title, '@language': 'en' },
    'dct:description': { '@value': opts.description, '@language': 'en' },
    'dcat:landingPage': { '@id': opts.landing },
    'dct:publisher': { '@id': `${BASE}/#org` },
    'dct:license': { '@id': 'http://creativecommons.org/licenses/by/4.0/' },
    'dct:accrualPeriodicity': { '@id': `http://publications.europa.eu/resource/authority/frequency/${opts.accrual}` },
    'dct:issued': { '@value': opts.issued, '@type': 'xsd:date' },
    'dct:spatial': { '@id': 'http://publications.europa.eu/resource/authority/continent/EUROPE' },
    'dcat:theme': [
      { '@id': 'http://publications.europa.eu/resource/authority/data-theme/ECON' },
      { '@id': 'http://publications.europa.eu/resource/authority/data-theme/REGI' },
    ],
    'dcat:keyword': opts.keywords,
    'dcat:contactPoint': {
      '@type': 'vcard:Kind',
      'vcard:fn': 'Avena Terminal',
      'vcard:hasURL': { '@id': `${BASE}/contact` },
    },
    'dcat:distribution': [
      {
        '@type': 'dcat:Distribution',
        'dct:title': { '@value': `${opts.title} (JSON)`, '@language': 'en' },
        'dcat:accessURL': { '@id': opts.jsonUrl },
        'dcat:downloadURL': { '@id': opts.jsonUrl },
        'dct:format': { '@id': 'http://publications.europa.eu/resource/authority/file-type/JSON' },
        'dcat:mediaType': { '@id': 'https://www.iana.org/assignments/media-types/application/json' },
        'dct:license': { '@id': 'http://creativecommons.org/licenses/by/4.0/' },
      },
    ],
  };
}

export async function GET() {
  const datasets = [
    dataset({
      id: 'delphi',
      title: 'Avena DELPHI — daily AI panel survey on European residential property',
      description:
        'Daily longitudinal survey of frontier AI models\' quantitative beliefs about European residential property. Fixed forward question bank, identical answer-only prompts; per-model answers, median consensus, max-min dispersion, and two daily indices (Consensus Index, Disagreement Index). Each question carries a public resolution source (ECB, Eurostat, national statistics) for future judgment scoring. Record began 2026-06-10 and cannot be reconstructed retroactively.',
      landing: `${BASE}/delphi`,
      jsonUrl: `${BASE}/api/v1/delphi`,
      keywords: ['artificial intelligence', 'survey', 'housing market', 'residential property', 'forecasting', 'European Union', 'Delphi method'],
      accrual: 'DAILY',
      issued: '2026-06-10',
    }),
    dataset({
      id: 'plab',
      title: 'PLAB — the European Property AI Benchmark',
      description:
        'Daily accuracy scoring of major AI models on a fixed, version-controlled question bank of European property and finance facts with public institutional ground truths (ECB, Eurostat, national statistics offices). Per-model accuracy, per-category breakdown, verbatim replies stored for audit. The benchmark operator does not participate.',
      landing: `${BASE}/benchmark`,
      jsonUrl: `${BASE}/api/v1/plab`,
      keywords: ['artificial intelligence', 'benchmark', 'evaluation', 'housing market', 'European Union', 'data quality'],
      accrual: 'DAILY',
      issued: '2026-06-10',
    }),
    dataset({
      id: 'property-index',
      title: 'Avena European residential property dataset',
      description:
        'Scored residential new-build property data across EU coastal markets with derived indicators: price per square metre, gross rental yield estimates, multi-factor investment scores, regional aggregates and index family (AVENA-CC, AVENA-VAL, AVENA-SCR, AVENA-DPT). Methodology public and version-controlled; daily refresh; event-sourced revision history.',
      landing: `${BASE}/dataset`,
      jsonUrl: `${BASE}/api/v1/openapi.json`,
      keywords: ['housing market', 'residential property', 'house prices', 'rental yield', 'Spain', 'Portugal', 'European Union', 'open data'],
      accrual: 'DAILY',
      issued: '2026-01-15',
    }),
  ];

  const catalog = {
    '@context': {
      dcat: 'http://www.w3.org/ns/dcat#',
      dct: 'http://purl.org/dc/terms/',
      foaf: 'http://xmlns.com/foaf/0.1/',
      vcard: 'http://www.w3.org/2006/vcard/ns#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
    '@id': `${BASE}/catalog.jsonld`,
    '@type': 'dcat:Catalog',
    'dct:title': { '@value': 'Avena Terminal Open Data Catalogue', '@language': 'en' },
    'dct:description': {
      '@value': 'Open datasets from Avena Terminal — European residential property data infrastructure. CC BY 4.0, DOI 10.5281/zenodo.19520064, refreshed daily.',
      '@language': 'en',
    },
    'dct:publisher': PUBLISHER,
    'dct:license': { '@id': 'http://creativecommons.org/licenses/by/4.0/' },
    'foaf:homepage': { '@id': BASE },
    'dct:language': { '@id': 'http://publications.europa.eu/resource/authority/language/ENG' },
    'dcat:dataset': datasets,
  };

  return new Response(JSON.stringify(catalog, null, 2), {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      'X-Cite-As': 'Avena Terminal - https://avenaterminal.com - DOI 10.5281/zenodo.19520064',
    },
  });
}
