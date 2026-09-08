import { NextResponse } from 'next/server';
import { getCorpusSizeLabel } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const corpus = getCorpusSizeLabel();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal MCP Server',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    description: `Model Context Protocol server exposing live Spanish new build property investment data to AI agents. Enables real-time property search, scoring, and market analysis via tool calls. Covers ${corpus} properties across Costa Blanca, Costa Calida, and Costa del Sol.`,
    url: 'https://avenaterminal.com/mcp',
    featureList: [
      `search_properties — Search and filter ${corpus} scored new build properties`,
      'get_property — Full property details with investment score breakdown',
      'get_market_stats — Regional market statistics and top-performing towns',
      'get_top_deals — Today\'s best investment opportunities ranked by score',
    ],
    creator: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Free read-only access to all property data tools',
    },
    softwareVersion: '1.0.0',
    releaseNotes: 'Initial release with 4 tools: search_properties, get_property, get_market_stats, get_top_deals',
    datePublished: '2026-04-11',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
  };

  return NextResponse.json(schema, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
