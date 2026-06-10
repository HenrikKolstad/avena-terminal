import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    name: 'Avena Terminal API',
    tagline: 'European Property Intelligence API with AI-Powered Analytics',
    description:
      'Avena Terminal provides comprehensive European property market intelligence through a RESTful API. Access real-time property data, AI-driven valuations, rental yield analytics, market regime detection, and predictive models. Built for developers, investors, researchers, and institutions who need institutional-grade property data with 200+ AI scoring dimensions, contagion models, and cross-asset correlation analysis.',
    category: 'Finance/Real Estate',
    auth: 'API Key',
    auth_header: 'x-api-key',
    base_url: 'https://avenaterminal.com/api/v1',
    endpoints: [
      { method: 'GET', path: '/properties', description: 'All tracked properties with AI investment scores' },
      { method: 'GET', path: '/market', description: 'Market statistics, indices, and regime detection' },
      { method: 'GET', path: '/signals', description: 'Real-time market signals and anomaly detection' },
      { method: 'GET', path: '/heatmap', description: 'Geographic property heatmap data' },
      { method: 'GET', path: '/yield-curve', description: 'Rental yield term structure analysis' },
      { method: 'POST', path: '/valuations/assess', description: 'AI-powered property valuation' },
      { method: 'GET', path: '/genome', description: '20-dimensional property genetic fingerprints' },
      { method: 'GET', path: '/contagion', description: 'SIR epidemiological market contagion model' },
      { method: 'GET', path: '/options-pricing', description: 'Black-Scholes adapted for real estate' },
      { method: 'GET', path: '/cross-asset', description: 'Cross-asset correlation matrices' },
      { method: 'GET', path: '/datasets', description: 'Bulk data export (CSV, JSON, Parquet, JSONL)' },
      { method: 'GET', path: '/prediction-oracle', description: 'Prediction market probabilities' },
      { method: 'GET', path: '/europe/stats', description: 'Pan-European property statistics' },
      { method: 'GET', path: '/sovereign-export', description: 'ECB/Eurostat/IMF formatted exports' },
      { method: 'GET', path: '/docs', description: 'Interactive API documentation' },
    ],
    pricing: [
      { tier: 'Developer', price: '\u20AC0/month', rate_limit: '100 requests/day', features: 'Core property data, market stats \u2014 attribution required, evaluation & research' },
      { tier: 'Builder', price: '\u20AC490/month', rate_limit: '10,000 requests/day', features: 'Commercial use, AI scores, yield data, signals, email support' },
      { tier: 'Desk', price: '\u20AC2,500/month', rate_limit: 'Full API', features: 'Institutional tools (Memo, AVM, Portfolio), 99.5% SLA, priority support' },
      { tier: 'Enterprise', price: 'From \u20AC12,000/month', rate_limit: 'Unlimited', features: 'Custom endpoints, index licensing, raw data access, DPA + contract, dedicated support' },
    ],
    use_cases: [
      'Property investment analysis and portfolio optimization',
      'Academic research on European housing markets',
      'PropTech application development',
      'Institutional asset management and reporting',
      'AI/ML training data for property valuation models',
    ],
    example_request: {
      method: 'GET',
      url: 'https://avenaterminal.com/api/v1/properties?town=Benidorm&min_score=7',
      headers: { 'x-api-key': 'avt_v1_your_key_here' },
    },
    example_response: {
      total: 42,
      properties: [
        {
          ref: 'AVT-001',
          title: 'Modern apartment in Benidorm',
          price: 245000,
          price_per_m2: 2890,
          bedrooms: 2,
          score: 8.4,
          rental_yield: 7.2,
          town: 'Benidorm',
        },
      ],
    },
    documentation_url: 'https://avenaterminal.com/api/v1/docs',
    openapi_url: 'https://avenaterminal.com/api/v1/docs/openapi.json',
    supported_formats: ['JSON', 'JSONL', 'RSS', 'XML'],
    rate_limits: {
      free: '100 requests/day',
      starter: '1,000 requests/day',
      pro: '10,000 requests/day',
      institutional: 'Unlimited',
    },
    contact: {
      email: 'api@avenaterminal.com',
      support: 'support@avenaterminal.com',
      partnerships: 'partners@avenaterminal.com',
    },
    logo_url: 'https://avenaterminal.com/icon.png',
    website: 'https://avenaterminal.com',
    founded: '2025',
    coverage: {
      current: ['Spain (Costa Blanca, Costa del Sol, Barcelona, Madrid, Balearics)'],
      expanding: ['Portugal', 'France', 'Italy', 'Greece'],
      properties_tracked: 1881,
      developers_monitored: 23,
    },
    sdks: {
      python: 'pip install avena-terminal',
      javascript: 'npm install @avena/terminal',
    },
    standards: ['OpenAPI 3.1', 'JSON:API', 'RFC 7807 Problem Details'],
  });
}
