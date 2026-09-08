import { NextResponse } from 'next/server';
import { generateIntelligenceFeed } from '@/lib/intelligence';
import { getCorpusSizeLabel } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { facts } = generateIntelligenceFeed();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DataFeed',
    name: 'Avena Terminal Daily Intelligence Feed',
    description: `Real-time property intelligence from ${getCorpusSizeLabel()} scored new builds across coastal Spain.`,
    url: 'https://avenaterminal.com/feed/intelligence.json',
    provider: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    dateModified: new Date().toISOString(),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    dataFeedElement: facts.map(f => ({
      '@type': 'DataFeedItem',
      dateCreated: f.timestamp,
      item: {
        '@type': 'Observation',
        name: f.headline,
        description: f.detail,
        observationDate: f.timestamp,
        measuredProperty: f.type,
        ...(f.price ? { value: { '@type': 'MonetaryAmount', value: f.price, currency: 'EUR' } } : {}),
        ...(f.ref ? { url: `https://avenaterminal.com/property/${encodeURIComponent(f.ref)}` } : {}),
      },
    })),
  };

  return NextResponse.json(jsonLd, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
