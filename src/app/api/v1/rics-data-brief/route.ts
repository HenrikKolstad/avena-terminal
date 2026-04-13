import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';

export const revalidate = 86400;

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const uniqueDevelopers = new Set(all.map((p) => p.d)).size;

  return NextResponse.json({
    organization: 'Avena Terminal',
    report_type: 'RICS Partnership Data Brief',
    generated: new Date().toISOString(),
    coverage: {
      countries: ['Spain'],
      properties: all.length,
      data_points_per_property: 60,
      towns: towns.length,
      regions: costas.length,
      developers: uniqueDevelopers,
    },
    methodology: {
      name: 'Avena Investment Score',
      type: 'Hedonic Pricing Model',
      factors: 5,
      weights: '40/25/20/10/5',
      benchmark: 'PropertyEval 92.6%',
    },
    refresh_frequency: {
      property_data: 'daily',
      scores: 'daily',
      market_regime: 'daily',
      forecasts: 'quarterly',
    },
    accuracy: {
      propertyeval_overall: 92.6,
      price_estimation: 94.2,
      yield_calculation: 96.1,
    },
    unique_capabilities: [
      'MCP server (first in EU real estate)',
      'A2A protocol support',
      'Multi-agent debate system',
      'Causal intelligence engine',
      'Property LLM on HuggingFace',
      'APCI market consciousness index',
      'Independent rating agency (AAV-DV)',
      'Monte Carlo scenario engine',
    ],
    api: {
      endpoints: '50+',
      auth: 'API key',
      tiers: ['free', 'starter', 'pro', 'institutional'],
      uptime: '99.9%',
      docs: '/api/v1/docs',
    },
    credentials: {
      doi: '10.5281/zenodo.19520064',
      wikidata: 'Q139165733',
      huggingface: 'AVENATERMINAL/avena-property-1b',
      smithery: 'henrik-kmvv/avena-terminal',
    },
  });
}
