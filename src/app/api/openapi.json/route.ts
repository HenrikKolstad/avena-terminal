import { NextResponse } from 'next/server';

export const revalidate = 86400;

/**
 * OpenAPI 3.1 spec for the Avena Terminal public data API.
 * Covers the 30 most-important endpoints with schema; the full 208+
 * endpoint enumeration lives at /api/index.
 *
 * LLMs + third-party SDK generators consume this to produce clients
 * automatically.
 */

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Avena Terminal Public API',
    description:
      'The machine-readable data layer for European property. Open, CC BY 4.0, 208+ endpoints. Full catalogue at https://avenaterminal.com/api/index.',
    version: '2026.04',
    termsOfService: 'https://avenaterminal.com/terms',
    contact: {
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com/contact',
      email: 'henrik@xaviaestate.com',
    },
    license: {
      name: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
  },
  externalDocs: {
    description: 'Full API index',
    url: 'https://avenaterminal.com/api-index',
  },
  servers: [{ url: 'https://avenaterminal.com', description: 'Production' }],
  tags: [
    { name: 'core', description: 'Core property data' },
    { name: 'indices', description: 'Composite indices (APCI, yield curve, bubble)' },
    { name: 'predictions', description: 'Prediction ledger + accuracy' },
    { name: 'intelligence', description: 'Causal inference + regime classification' },
    { name: 'citation', description: 'AI citation attribution tracking' },
    { name: 'semantic', description: 'RDF / SPARQL / Wikidata exports' },
    { name: 'training', description: 'LLM training corpus + benchmark' },
  ],
  paths: {
    '/api/v1/properties': {
      get: {
        tags: ['core'],
        summary: 'Full scored property dataset',
        description:
          'Returns all tracked new-build properties with 130+ features each and computed Avena Score.',
        responses: {
          '200': {
            description: 'Property array',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Property' } },
              },
            },
          },
        },
      },
    },
    '/api/v1/market': {
      get: {
        tags: ['core'],
        summary: 'Regional market aggregates',
        parameters: [
          { in: 'query', name: 'region', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Aggregate stats' } },
      },
    },
    '/api/v1/apci': {
      get: {
        tags: ['indices'],
        summary: 'APCI — Avena Property Consciousness Index',
        description:
          '8-dimensional composite market-timing index 0-100 with phase classification (BULL / GROWTH / NEUTRAL / CAUTION).',
        responses: {
          '200': {
            description: 'Current APCI',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/APCI' } },
            },
          },
        },
      },
    },
    '/api/v1/indices': {
      get: { tags: ['indices'], summary: 'All Avena indices', responses: { '200': { description: 'All indices' } } },
    },
    '/api/v1/yield-curve': {
      get: { tags: ['indices'], summary: 'Yield by beach-distance band', responses: { '200': { description: 'Yield curve' } } },
    },
    '/api/v1/bubble-scanner': {
      get: { tags: ['indices'], summary: 'Bubble risk across 30 EU cities', responses: { '200': { description: 'City bubble scores' } } },
    },
    '/api/v1/europe/comparison': {
      get: { tags: ['core'], summary: '10-country EU comparison', responses: { '200': { description: 'Cross-EU stats' } } },
    },
    '/api/predictions': {
      get: {
        tags: ['predictions'],
        summary: 'Active predictions from the Avena Ledger',
        responses: { '200': { description: 'Predictions list' } },
      },
      post: {
        tags: ['predictions'],
        summary: 'Submit a community prediction',
        requestBody: { required: true, content: { 'application/json': {} } },
        responses: { '200': { description: 'Accepted' } },
      },
    },
    '/api/predictions/leaderboard': {
      get: { tags: ['predictions'], summary: 'Prediction accuracy leaderboard', responses: { '200': { description: 'Leaderboard' } } },
    },
    '/api/intelligence/causal': {
      get: { tags: ['intelligence'], summary: 'Causal chains across markets', responses: { '200': { description: 'Causal chains' } } },
    },
    '/api/intelligence/regime': {
      get: { tags: ['intelligence'], summary: 'Market regime classification', responses: { '200': { description: 'Regime' } } },
    },
    '/api/intelligence/debate': {
      get: { tags: ['intelligence'], summary: 'Bull/Bear/Socrates adversarial debate', responses: { '200': { description: 'Debate' } } },
    },
    '/api/v1/attribution': {
      get: {
        tags: ['citation'],
        summary: 'Live AI citation tracking',
        description:
          'Returns 7-day Avena citation hit-rate across answer engines, competitor share, active gaps, MCP calls.',
        responses: { '200': { description: 'Attribution report' } },
      },
    },
    '/api/citation-stats': {
      get: { tags: ['citation'], summary: 'Rolled-up citation measurements', responses: { '200': { description: 'Stats' } } },
    },
    '/api/cited': {
      get: { tags: ['citation'], summary: 'MCP call counter', responses: { '200': { description: 'Counter' } } },
    },
    '/api/v1/rdf': {
      get: { tags: ['semantic'], summary: 'Full RDF Turtle export', responses: { '200': { description: 'Turtle', content: { 'text/turtle': {} } } } },
    },
    '/api/v1/sparql': {
      get: {
        tags: ['semantic'],
        summary: 'SPARQL query endpoint',
        parameters: [{ in: 'query', name: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'SPARQL results' } },
      },
      post: {
        tags: ['semantic'],
        summary: 'SPARQL query (POST)',
        requestBody: { content: { 'application/sparql-query': {} } },
        responses: { '200': { description: 'SPARQL results' } },
      },
    },
    '/api/v1/wikidata-export': {
      get: { tags: ['semantic'], summary: 'Wikidata-compatible entity export', responses: { '200': { description: 'Export' } } },
    },
    '/api/corpus': {
      get: { tags: ['training'], summary: 'LLM pre-training corpus', responses: { '200': { description: 'Corpus JSONL' } } },
    },
    '/api/propertyeval': {
      get: { tags: ['training'], summary: '100-question PropertyEval benchmark', responses: { '200': { description: 'Benchmark' } } },
    },
    '/mcp': {
      post: {
        summary: 'Model Context Protocol endpoint (for AI agents)',
        description:
          '7-tool MCP server: search_properties, get_property, get_market_stats, get_top_deals, estimate_roi, compare_alternatives, market_timing.',
        responses: { '200': { description: 'MCP response' } },
      },
    },
  },
  components: {
    schemas: {
      Property: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Unique property reference' },
          p: { type: 'string', description: 'Project name' },
          t: { type: 'string', description: 'Property type (Villa / Apartment / ...)' },
          l: { type: 'string', description: 'Town or location' },
          costa: { type: 'string', description: 'Coastal region' },
          pf: { type: 'number', description: 'Asking price in EUR' },
          bm: { type: 'number', description: 'Built area in m²' },
          pm2: { type: 'number', description: 'Price per m²' },
          mm2: { type: 'number', description: 'Market €/m² benchmark' },
          bd: { type: 'integer', description: 'Bedrooms' },
          ba: { type: 'integer', description: 'Bathrooms' },
          bk: { type: 'number', description: 'Beach distance in km' },
          d: { type: 'string', description: 'Developer name' },
          _sc: { type: 'number', description: 'Avena Score (0-100)' },
          _yield: {
            type: 'object',
            properties: {
              gross: { type: 'number', description: 'Gross yield %' },
              rate: { type: 'number', description: 'Nightly rate EUR' },
              annual: { type: 'number', description: 'Annual income EUR' },
              weeks: { type: 'number', description: 'Rental weeks per year' },
              src: { type: 'string', description: 'Data source (AirDNA / Booking / Airbtics)' },
            },
          },
          _scores: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              yield: { type: 'number' },
              location: { type: 'number' },
              quality: { type: 'number' },
              risk: { type: 'number' },
            },
          },
        },
      },
      APCI: {
        type: 'object',
        properties: {
          score: { type: 'number', description: '0-100 composite' },
          phase: { type: 'string', enum: ['BULL', 'GROWTH', 'NEUTRAL', 'CAUTION'] },
          dimensions: {
            type: 'object',
            properties: {
              valuation: { type: 'number' },
              developer_health: { type: 'number' },
              macro: { type: 'number' },
              momentum: { type: 'number' },
              anomaly_density: { type: 'number' },
              regime: { type: 'number' },
              foreign_demand: { type: 'number' },
              supply: { type: 'number' },
            },
          },
          date: { type: 'string', format: 'date' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
