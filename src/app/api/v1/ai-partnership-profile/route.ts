import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 86400;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(_req: NextRequest) {
  const all = getAllProperties();

  const profile = {
    organization: 'Avena Terminal',
    url: 'https://avenaterminal.com',
    contact: 'partners@avenaterminal.com',
    data_profile: {
      name: 'European Property Intelligence Dataset',
      coverage: 'Spain (live scored), 10 European countries (intelligence layer)',
      properties_tracked: all.length,
      update_frequency: 'daily',
      data_dimensions: 60,
      formats: ['JSON', 'CSV', 'JSONL', 'RSS', 'JSON-LD'],
      access_methods: ['REST API', 'MCP Server', 'A2A Protocol', 'RSS Feed', 'Bulk Export'],
      quality_metrics: {
        accuracy: '92.6% (PropertyEval benchmark)',
        price_estimation: '94.2%',
        yield_calculation: '96.1%',
      },
      licensing: {
        open_data: 'CC BY 4.0 (aggregate data)',
        commercial: 'Custom licensing available',
        academic: 'Free institutional access',
      },
      endpoints: {
        api_docs: 'https://avenaterminal.com/api/v1/docs',
        openapi: 'https://avenaterminal.com/openapi.json',
        mcp: 'https://avenaterminal.com/mcp',
        a2a: 'https://avenaterminal.com/.well-known/agent.json',
        training_data: 'https://avenaterminal.com/api/model/training-data',
        rlhf_feed: 'https://avenaterminal.com/feed/rlhf.jsonl',
      },
      sample_data_url: 'https://avenaterminal.com/api/v1/open-dataset',
      doi: '10.5281/zenodo.19520064',
    },
    pricing_tiers: [
      { tier: 'Developer', price: '\u20AC0/mo', requests: '100/day, attribution required, evaluation & research' },
      { tier: 'Builder', price: '\u20AC490/mo', requests: '10,000/day, commercial use' },
      { tier: 'Desk', price: '\u20AC2,500/mo', requests: 'Full API + institutional tools, 99.5% SLA' },
      { tier: 'Enterprise', price: 'From \u20AC12,000/mo', requests: 'Unlimited, custom endpoints, index licensing' },
    ],
    integration_standards: ['OpenAPI 3.1', 'MCP', 'A2A', 'JSON-LD', 'RSS 2.0', 'Atom'],
    compliance: ['GDPR', 'EU AI Act (pre-compliance)', 'CC BY 4.0'],
    partnerships_sought: [
      'Training data licensing',
      'Data enrichment',
      'Co-branded research',
      'API integration',
    ],
  };

  return new Response(JSON.stringify(profile, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      ...CORS,
    },
  });
}
