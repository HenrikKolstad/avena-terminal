import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    name: 'Avena Terminal API',
    version: '1.0',
    base_url: '/api/v1',
    authentication: {
      description: 'All endpoints (except /docs and POST /keys) require an API key passed as a "key" query parameter.',
      get_key: 'POST /api/v1/keys with { "email": "you@example.com" }',
      rate_limits: {
        free: '100 requests/day',
        starter: '1,000 requests/day',
        pro: '10,000 requests/day',
        institutional: '999,999 requests/day',
      },
    },
    endpoints: [
      {
        path: '/api/v1/keys',
        methods: {
          POST: {
            description: 'Generate a new API key',
            body: {
              email: { type: 'string', required: true },
              tier: { type: 'string', required: false, default: 'free', options: ['free', 'starter', 'pro', 'institutional'] },
            },
            example_response: {
              key: 'avt_v1_abc123...',
              tier: 'free',
              rate_limit: 100,
            },
          },
          GET: {
            description: 'Validate an existing API key',
            params: {
              key: { type: 'string', required: true, description: 'The API key to validate' },
            },
            example_response: {
              valid: true,
              tier: 'free',
              requests_today: 42,
              rate_limit: 100,
            },
          },
        },
      },
      {
        path: '/api/v1/properties',
        methods: {
          GET: {
            description: 'Search and filter commercial properties',
            params: {
              key: { type: 'string', required: true, description: 'API key' },
              region: { type: 'string', required: false, description: 'Filter by costa/region slug (e.g., costa-blanca)' },
              type: { type: 'string', required: false, description: 'Filter by property type (e.g., apartment, villa)' },
              maxPrice: { type: 'number', required: false, description: 'Maximum price filter' },
              minScore: { type: 'number', required: false, description: 'Minimum Avena score (0-100)' },
              minYield: { type: 'number', required: false, description: 'Minimum gross yield percentage' },
              limit: { type: 'number', required: false, default: 20, description: 'Results per page (max 50)' },
              offset: { type: 'number', required: false, default: 0, description: 'Pagination offset' },
            },
            example_response: {
              total: 500,
              limit: 20,
              offset: 0,
              count: 20,
              properties: ['...'],
              avg_price: 250000,
              avg_score: 65,
            },
          },
        },
      },
      {
        path: '/api/v1/valuations',
        methods: {
          GET: {
            description: 'Automated Valuation Model (AVM) - get fair value estimate for a property',
            params: {
              key: { type: 'string', required: true, description: 'API key' },
              ref: { type: 'string', required: true, description: 'Property reference ID' },
            },
            example_response: {
              ref: 'ABC-123',
              asking_price: 200000,
              fair_value: 235000,
              value_gap_pct: 17.5,
              confidence: 'MEDIUM',
              comparables_count: 8,
              median_comparable_pm2: 2350,
              built_m2: 100,
              methodology: 'comparable_analysis',
              valuation_date: '2026-04-12',
            },
          },
        },
      },
      {
        path: '/api/v1/market',
        methods: {
          GET: {
            description: 'Regional market statistics and analytics',
            params: {
              key: { type: 'string', required: true, description: 'API key' },
              region: { type: 'string', required: false, description: 'Costa/region slug (e.g., costa-blanca). Omit for all regions.' },
            },
            example_response: {
              region: 'Costa Blanca',
              count: 350,
              avg_price: 230000,
              median_price: 199000,
              avg_pm2: 2100,
              avg_yield: 6.8,
              avg_score: 62,
              above_70: 45,
              top_towns: ['...'],
            },
          },
        },
      },
      {
        path: '/api/v1/signals',
        methods: {
          GET: {
            description: 'Alpha signals - anomaly detection for investment opportunities',
            params: {
              key: { type: 'string', required: true, description: 'API key' },
              region: { type: 'string', required: false, description: 'Filter signals by region slug' },
            },
            example_response: {
              count: 10,
              total_signals: 42,
              region: 'all',
              signals: ['...'],
            },
          },
        },
      },
      {
        path: '/api/v1/docs',
        methods: {
          GET: {
            description: 'This documentation endpoint. No API key required.',
            params: {},
          },
        },
      },
    ],
    response_headers: {
      'X-Avena-Version': 'API version (currently 1.0)',
      'X-Request-ID': 'Unique request identifier (UUID)',
      'X-Rate-Limit-Remaining': 'Number of requests remaining in current period',
    },
  });
}
