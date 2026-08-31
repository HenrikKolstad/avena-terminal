import { NextResponse } from 'next/server';

export const revalidate = 86400;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

/**
 * Property news feed.
 *
 * Until 2026-08-31 this route published twenty hardcoded "articles" with
 * invented headlines, summaries, dates and sentiment labels, each attributed
 * to a real named publisher or institution it did not come from — Idealista
 * Market Report, ECB Press Conference, BOE Official Gazette, INE Portugal,
 * SEF Portugal, Ayuntamiento de Estepona, European Commission DG FISMA,
 * Confidencial Imobiliario and others. Avena runs no news ingest and none of
 * those articles exist.
 *
 * The most quotable item was the worst: "Spanish coastal property prices
 * surge 8.3% as northern European demand intensifies", attributed to an
 * Idealista market report. 8.3% is a specific, checkable market statistic
 * that Avena never measured, published in a headline that was never written,
 * under the name of a real company — on a surface built to be read by AI
 * assistants.
 *
 * Removed rather than corrected, per the be4a736 precedent: editing figures
 * inside an invented dataset makes the fabrication more plausible, not less.
 *
 * Avena publishes what it does observe — daily listing prices, price moves
 * and delistings — at /open-data/dataset.json and /api/v1/deltas.
 */

const NOT_PUBLISHED = {
  articles:
    'Removed 2026-08-31. Were twenty hardcoded items attributed to Idealista, ' +
    'the ECB, the BOE, INE Portugal, SEF Portugal, the European Commission ' +
    'and others. None were real and Avena runs no news ingest.',
  by_sentiment:
    'Removed 2026-08-31. Was a tally of hand-set sentiment labels on the ' +
    'invented articles above. Avena performs no sentiment analysis.',
  avena_relevance:
    'Removed 2026-08-31. Was a hand-set 0-100 score on each invented item.',
} as const;

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      total: 0,
      articles: [],
      coverage:
        'Avena runs no news ingest and publishes no articles. This route ' +
        'returns an empty set rather than invented items.',
      see_instead: {
        observation_ledger: 'https://avenaterminal.com/open-data/dataset.json',
        price_moves: 'https://avenaterminal.com/api/v1/deltas',
        regulatory_signals: 'https://avenaterminal.com/regulatory-radar',
        description:
          'Daily listing prices, observed price moves and delistings for the ' +
          'Spanish coastal new-build book — what Avena actually records.',
      },
      not_published: NOT_PUBLISHED,
      date: new Date().toISOString().split('T')[0],
    },
    { headers: CORS_HEADERS }
  );
}
