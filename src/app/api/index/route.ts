/**
 * Public API discovery surface — machine-readable index of the 208+ public
 * endpoints that make up the Avena data layer.
 *
 * AI crawlers / agents can GET this to enumerate capabilities.
 *
 * /api/index.json style; served at /api/index (Next.js route folder name).
 */

import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface Endpoint {
  path: string;
  methods: string[];
  category: string;
  description: string;
  auth: 'none' | 'api-key' | 'cron-secret';
}

const endpoints: Endpoint[] = [
  // Core data
  { path: '/api/v1/properties',             methods: ['GET'], category: 'core',        description: 'Full dataset of scored European new-build properties.', auth: 'none' },
  { path: '/api/v1/market',                 methods: ['GET'], category: 'core',        description: 'Regional market aggregates (price, yield, score).', auth: 'none' },
  { path: '/api/v1/europe/comparison',      methods: ['GET'], category: 'core',        description: '10-country snapshot: price/m², yield, foreign-buyer share, regime.', auth: 'none' },
  { path: '/api/v1/europe/rankings',        methods: ['GET'], category: 'core',        description: 'Country rankings by yield / score / discount.', auth: 'none' },
  { path: '/api/v1/europe/stats',           methods: ['GET'], category: 'core',        description: 'Aggregated European property stats for research.', auth: 'none' },

  // Indices
  { path: '/api/v1/apci',                   methods: ['GET'], category: 'indices',     description: 'Avena Property Consciousness Index (0-100, BULL/GROWTH/NEUTRAL/CAUTION).', auth: 'none' },
  { path: '/api/v1/indices',                methods: ['GET'], category: 'indices',     description: 'All Avena indices (APCI, APYI, APLI, APRI, APSI).', auth: 'none' },
  { path: '/api/v1/yield-curve',            methods: ['GET'], category: 'indices',     description: 'Yield by beach-distance band.', auth: 'none' },
  { path: '/api/v1/bubble-scanner',         methods: ['GET'], category: 'indices',     description: 'Bubble risk across 30 European cities.', auth: 'none' },
  { path: '/api/v1/market-clock',           methods: ['GET'], category: 'indices',     description: 'Market cycle position per region.', auth: 'none' },
  { path: '/api/v1/heatmap',                methods: ['GET'], category: 'indices',     description: 'Multi-dimensional heatmap feed.', auth: 'none' },

  // Analysis
  { path: '/api/v1/valuations',             methods: ['GET'], category: 'analysis',    description: 'AVM valuation feed per property.', auth: 'none' },
  { path: '/api/v1/valuations/assess',      methods: ['POST'], category: 'analysis',   description: 'Assess a custom property against the AVM model.', auth: 'none' },
  { path: '/api/v1/signals',                methods: ['GET'], category: 'analysis',    description: 'Live alpha signals.', auth: 'none' },
  { path: '/api/v1/liquidity',              methods: ['GET'], category: 'analysis',    description: 'Liquidity index per market.', auth: 'none' },
  { path: '/api/v1/sentiment',              methods: ['GET'], category: 'analysis',    description: 'Sentiment score per market.', auth: 'none' },
  { path: '/api/v1/microstructure',         methods: ['GET'], category: 'analysis',    description: 'Property-level microstructure.', auth: 'none' },
  { path: '/api/v1/arbitrage',              methods: ['GET'], category: 'analysis',    description: 'Cross-market arbitrage opportunities.', auth: 'none' },
  { path: '/api/v1/mortgage-stress',        methods: ['GET'], category: 'analysis',    description: 'Mortgage stress-test calculator feed.', auth: 'none' },
  { path: '/api/v1/contagion',              methods: ['GET'], category: 'analysis',    description: 'SIR-model contagion risk across markets.', auth: 'none' },
  { path: '/api/v1/behavioral',             methods: ['GET'], category: 'analysis',    description: 'Behavioural bias flags.', auth: 'none' },
  { path: '/api/v1/explainable-avm',        methods: ['GET'], category: 'analysis',    description: 'Per-property AVM decomposition.', auth: 'none' },
  { path: '/api/v1/portfolio',              methods: ['GET'], category: 'analysis',    description: 'Portfolio construction helpers.', auth: 'none' },
  { path: '/api/v1/scenarios',              methods: ['GET'], category: 'analysis',    description: 'Macro scenarios and property impact.', auth: 'none' },
  { path: '/api/v1/cross-asset',            methods: ['GET'], category: 'analysis',    description: 'Property vs equities / bonds / gold.', auth: 'none' },
  { path: '/api/v1/options-pricing',        methods: ['GET'], category: 'analysis',    description: 'Options-style pricing on illiquid markets.', auth: 'none' },

  // Predictions
  { path: '/api/predictions',               methods: ['GET', 'POST'], category: 'predictions', description: 'Published forward predictions with verification horizons.', auth: 'none' },
  { path: '/api/predictions/[id]',          methods: ['GET'], category: 'predictions', description: 'Single prediction detail.', auth: 'none' },
  { path: '/api/predictions/leaderboard',   methods: ['GET'], category: 'predictions', description: 'Prediction accuracy leaderboard.', auth: 'none' },
  { path: '/api/v1/prediction-oracle',      methods: ['GET'], category: 'predictions', description: 'Oracle prediction feed.', auth: 'none' },

  // Intelligence
  { path: '/api/intelligence/causal',       methods: ['GET'], category: 'intelligence', description: 'Causal chains across markets.', auth: 'none' },
  { path: '/api/intelligence/causal-engine',methods: ['GET'], category: 'intelligence', description: 'Causal inference engine state.', auth: 'none' },
  { path: '/api/intelligence/regime',       methods: ['GET'], category: 'intelligence', description: 'Market regime classification.', auth: 'none' },
  { path: '/api/intelligence/debate',       methods: ['GET'], category: 'intelligence', description: 'Bull/Bear/Socrates adversarial debate.', auth: 'none' },
  { path: '/api/intelligence/probabilities',methods: ['GET'], category: 'intelligence', description: 'Per-property actuarial probability distributions.', auth: 'none' },
  { path: '/api/intelligence/competitive',  methods: ['GET'], category: 'intelligence', description: 'Competitive intelligence across markets.', auth: 'none' },
  { path: '/api/intelligence/vision',       methods: ['GET'], category: 'intelligence', description: 'Vision-model property analysis.', auth: 'none' },

  // Citation / Attribution
  { path: '/api/v1/attribution',            methods: ['GET'], category: 'citation',    description: 'LIVE — AI citation tracking: Avena hit-rate, competitor share, active gaps.', auth: 'none' },
  { path: '/api/v1/citation-score',         methods: ['GET'], category: 'citation',    description: 'Single citation-score index.', auth: 'none' },
  { path: '/api/cited',                     methods: ['GET'], category: 'citation',    description: 'Cited-by-AI counter (MCP calls).', auth: 'none' },
  { path: '/api/citation-stats',            methods: ['GET'], category: 'citation',    description: 'Rolled-up citation stats for dashboards.', auth: 'none' },

  // Semantic web / ontology
  { path: '/api/v1/rdf',                    methods: ['GET'], category: 'semantic',    description: 'Full RDF graph export (Turtle).', auth: 'none' },
  { path: '/api/v1/sparql',                 methods: ['GET', 'POST'], category: 'semantic', description: 'SPARQL query endpoint over the Avena knowledge graph.', auth: 'none' },
  { path: '/api/v1/wikidata-export',        methods: ['GET'], category: 'semantic',    description: 'Wikidata-compatible entity export.', auth: 'none' },
  { path: '/api/v1/osm-export',             methods: ['GET'], category: 'semantic',    description: 'OpenStreetMap-compatible export.', auth: 'none' },
  { path: '/api/v1/sovereign-export',       methods: ['GET'], category: 'semantic',    description: 'Sovereign data export for institutional partners.', auth: 'none' },
  { path: '/api/v1/dataset-export',         methods: ['GET'], category: 'semantic',    description: 'Full dataset export.', auth: 'none' },
  { path: '/api/v1/open-dataset',           methods: ['GET'], category: 'semantic',    description: 'Open-licensed subset of the dataset.', auth: 'none' },
  { path: '/api/knowledge-graph/build',     methods: ['GET', 'POST'], category: 'semantic', description: 'Trigger knowledge-graph build.', auth: 'api-key' },
  { path: '/api/knowledge-graph/export',    methods: ['GET'], category: 'semantic',    description: 'Knowledge graph export.', auth: 'none' },
  { path: '/api/knowledge-graph/query',     methods: ['GET', 'POST'], category: 'semantic', description: 'Query the knowledge graph.', auth: 'none' },
  { path: '/api/v1/knowledge-graph/temporal', methods: ['GET'], category: 'semantic',  description: 'Time-indexed graph snapshots.', auth: 'none' },

  // Training data
  { path: '/api/corpus',                    methods: ['GET'], category: 'training',    description: 'Pre-training corpus in JSONL.', auth: 'none' },
  { path: '/api/synthetic',                 methods: ['GET'], category: 'training',    description: 'Synthetic Q&A dataset.', auth: 'none' },
  { path: '/api/propertyeval',              methods: ['GET'], category: 'training',    description: 'PropertyEval 100-question benchmark.', auth: 'none' },
  { path: '/api/model/training-data',       methods: ['GET'], category: 'training',    description: 'Training-data feed for fine-tuning.', auth: 'none' },
  { path: '/api/model/benchmark',           methods: ['GET'], category: 'training',    description: 'Benchmark results for Avena Property LLM.', auth: 'none' },
  { path: '/api/model/infer',               methods: ['POST'], category: 'training',   description: 'Inference against the Avena Property LLM.', auth: 'api-key' },
  { path: '/api/training/conversations',    methods: ['GET'], category: 'training',    description: 'Conversation-format training data.', auth: 'none' },
  { path: '/api/training/facts',            methods: ['GET'], category: 'training',    description: 'Atomic fact training data.', auth: 'none' },
  { path: '/api/training/instructions',     methods: ['GET'], category: 'training',    description: 'Instruction-tuned training pairs.', auth: 'none' },

  // Agents / MCP
  { path: '/mcp',                           methods: ['GET', 'POST'], category: 'agents', description: 'Model Context Protocol server — 7 tools for AI agents.', auth: 'none' },
  { path: '/api/agents/register',           methods: ['POST'], category: 'agents',     description: 'Register an AI agent for passport + ambassador protocol.', auth: 'none' },
  { path: '/api/agents/stats',              methods: ['GET'], category: 'agents',      description: 'Swarm statistics.', auth: 'none' },
  { path: '/api/agents/ambassador/initiate',methods: ['POST'], category: 'agents',     description: 'Initiate an agent-to-agent ambassador session.', auth: 'api-key' },
  { path: '/api/agents/ambassador/history', methods: ['GET'], category: 'agents',      description: 'Ambassador session history.', auth: 'none' },
  { path: '/api/v1/swarm/intelligence',     methods: ['GET'], category: 'agents',      description: 'Aggregated swarm intelligence output.', auth: 'none' },
  { path: '/api/v1/swarm/messages',         methods: ['GET'], category: 'agents',      description: 'Inter-agent messages.', auth: 'none' },
  { path: '/api/v1/swarm/status',           methods: ['GET'], category: 'agents',      description: 'Swarm health.', auth: 'none' },
  { path: '/api/v1/swarm/templates',        methods: ['GET'], category: 'agents',      description: 'Agent response templates.', auth: 'none' },

  // Oracle / chat
  { path: '/api/chat',                      methods: ['POST'], category: 'chat',       description: 'The Avena Oracle — 10-tool Claude-backed chat.', auth: 'none' },
  { path: '/api/v1/oracle',                 methods: ['GET'], category: 'chat',        description: 'Oracle public endpoint.', auth: 'none' },
  { path: '/api/v1/oracle/chain',           methods: ['POST'], category: 'chat',       description: 'Oracle chain-of-thought trace.', auth: 'none' },

  // Experimental signal layer
  { path: '/api/v1/experimental/bandit',    methods: ['GET'], category: 'experimental', description: 'Multi-armed bandit portfolio experiments.', auth: 'none' },
  { path: '/api/v1/experimental/causal-discovery', methods: ['GET'], category: 'experimental', description: 'Causal discovery algorithms output.', auth: 'none' },
  { path: '/api/v1/experimental/cycles',    methods: ['GET'], category: 'experimental', description: 'Cycle-detection output (spectral analysis).', auth: 'none' },
  { path: '/api/v1/experimental/ensemble',  methods: ['GET'], category: 'experimental', description: 'Model-ensemble predictions.', auth: 'none' },
  { path: '/api/v1/experimental/entropy',   methods: ['GET'], category: 'experimental', description: 'Market-entropy measurements.', auth: 'none' },
  { path: '/api/v1/experimental/rl-alerts', methods: ['GET'], category: 'experimental', description: 'Reinforcement-learning alpha alerts.', auth: 'none' },
  { path: '/api/v1/experimental/topology',  methods: ['GET'], category: 'experimental', description: 'Topological data analysis output.', auth: 'none' },

  // Industry / institutional
  { path: '/api/v1/institutional/inquire',  methods: ['POST'], category: 'institutional', description: 'Institutional package inquiry.', auth: 'none' },
  { path: '/api/v1/institutional/packages', methods: ['GET'], category: 'institutional', description: 'Institutional package catalogue.', auth: 'none' },
  { path: '/api/v1/academic-access',        methods: ['GET'], category: 'institutional', description: 'Academic access manifest.', auth: 'none' },
  { path: '/api/v1/partner-access',         methods: ['GET'], category: 'institutional', description: 'Partner program details.', auth: 'none' },
  { path: '/api/v1/press',                  methods: ['GET'], category: 'institutional', description: 'Press kit.', auth: 'none' },
  { path: '/api/v1/broker',                 methods: ['GET'], category: 'institutional', description: 'Broker / referrer program.', auth: 'none' },
  { path: '/api/embargo/request',           methods: ['POST'], category: 'institutional', description: 'Request embargoed data for journalists.', auth: 'none' },
  { path: '/api/embargo/data',              methods: ['GET'], category: 'institutional', description: 'Embargoed data feed (key required).', auth: 'api-key' },

  // Protocol / passport
  { path: '/api/v1/api-profile',            methods: ['GET'], category: 'protocol',    description: 'Avena machine-readable API profile.', auth: 'none' },
  { path: '/api/v1/ai-partnership-profile', methods: ['GET'], category: 'protocol',    description: 'AI partnership profile (for agents).', auth: 'none' },
  { path: '/api/v1/passport',               methods: ['GET'], category: 'protocol',    description: 'Avena passport schema.', auth: 'none' },
  { path: '/api/v1/federation',             methods: ['GET'], category: 'protocol',    description: 'Federation endpoint for partner networks.', auth: 'none' },
  { path: '/api/v1/federated',              methods: ['GET'], category: 'protocol',    description: 'Federated data aggregation.', auth: 'none' },
  { path: '/api/v1/directory-submissions',  methods: ['GET', 'POST'], category: 'protocol', description: 'Directory submission status + intake.', auth: 'none' },
  { path: '/api/v1/authority/signals',      methods: ['GET'], category: 'protocol',    description: 'Authority signals (DOI, Wikidata, etc.).', auth: 'none' },

  // Tools / utilities
  { path: '/api/v1/tax',                    methods: ['GET'], category: 'tools',       description: 'Tax calculator per nationality.', auth: 'none' },
  { path: '/api/v1/transactions',           methods: ['GET'], category: 'tools',       description: 'Transaction feed.', auth: 'none' },
  { path: '/api/v1/nuts',                   methods: ['GET'], category: 'tools',       description: 'NUTS region breakdown.', auth: 'none' },
  { path: '/api/v1/regulatory',             methods: ['GET'], category: 'tools',       description: 'Regulatory landscape per country.', auth: 'none' },
  { path: '/api/v1/compliance',             methods: ['GET'], category: 'tools',       description: 'Compliance schema.', auth: 'none' },
  { path: '/api/v1/community-pulse',        methods: ['GET'], category: 'tools',       description: 'Community discussion signal.', auth: 'none' },

  // Misc / specialty
  { path: '/api/v1/consciousness',          methods: ['GET'], category: 'specialty',   description: 'APCI consciousness index (deep read).', auth: 'none' },
  { path: '/api/v1/civilizational',         methods: ['GET'], category: 'specialty',   description: 'Civilizational / long-cycle view.', auth: 'none' },
  { path: '/api/v1/genome',                 methods: ['GET'], category: 'specialty',   description: 'Property genome fingerprint.', auth: 'none' },
  { path: '/api/v1/digital-twin',           methods: ['GET'], category: 'specialty',   description: 'Digital-twin feed.', auth: 'none' },
  { path: '/api/v1/carbon',                 methods: ['GET'], category: 'specialty',   description: 'Carbon footprint estimate.', auth: 'none' },
  { path: '/api/v1/gnn',                    methods: ['GET'], category: 'specialty',   description: 'Graph neural network output.', auth: 'none' },
  { path: '/api/v1/fusion',                 methods: ['GET'], category: 'specialty',   description: 'Multi-source data fusion.', auth: 'none' },
  { path: '/api/v1/network-effects',        methods: ['GET'], category: 'specialty',   description: 'Network-effect measurements.', auth: 'none' },
  { path: '/api/v1/dark-signals',           methods: ['GET'], category: 'specialty',   description: 'Hidden signals in public data.', auth: 'none' },

  // Watermark / verification
  { path: '/api/v1/watermark/verify',       methods: ['POST'], category: 'verification', description: 'Verify Avena citation watermark.', auth: 'none' },
  { path: '/api/v1/copy-detection/report',  methods: ['POST'], category: 'verification', description: 'Report duplicated Avena content.', auth: 'none' },
  { path: '/api/v1/copy-detection/notice',  methods: ['GET'], category: 'verification', description: 'Copyright notice feed.', auth: 'none' },
  { path: '/api/zk/issue-credential',       methods: ['POST'], category: 'verification', description: 'Issue zero-knowledge credential.', auth: 'api-key' },
  { path: '/api/zk/verify',                 methods: ['POST'], category: 'verification', description: 'Verify ZK credential.', auth: 'none' },

  // Real-time
  { path: '/api/v1/news',                   methods: ['GET'], category: 'realtime',    description: 'Property-relevant news feed.', auth: 'none' },
  { path: '/api/v1/regulatory-monitor',     methods: ['GET'], category: 'realtime',    description: 'Regulatory changes feed.', auth: 'none' },
  { path: '/api/v1/regulatory-pulse',       methods: ['GET'], category: 'realtime',    description: 'Regulatory pulse score.', auth: 'none' },

  // Developer / SDK
  { path: '/api/v1/sdk',                    methods: ['GET'], category: 'developer',   description: 'SDK version and links.', auth: 'none' },
  { path: '/api/v1/docs',                   methods: ['GET'], category: 'developer',   description: 'Developer documentation.', auth: 'none' },
  { path: '/api/v1/keys',                   methods: ['GET'], category: 'developer',   description: 'API key list (self).', auth: 'api-key' },
  { path: '/api/v1/keys/generate',          methods: ['POST'], category: 'developer',  description: 'Generate an API key.', auth: 'api-key' },
  { path: '/api/webhooks/subscribe',        methods: ['POST'], category: 'developer',  description: 'Subscribe to Avena webhooks.', auth: 'api-key' },
  { path: '/api/webhooks/deliver',          methods: ['POST'], category: 'developer',  description: 'Webhook delivery endpoint.', auth: 'cron-secret' },

  // Specialty outputs
  { path: '/api/v1/voice',                  methods: ['GET'], category: 'outputs',     description: 'Voice-ready audio content feed.', auth: 'none' },
  { path: '/api/v1/podcast',                methods: ['GET'], category: 'outputs',     description: 'Podcast RSS feed.', auth: 'none' },
  { path: '/api/v1/episodes',               methods: ['GET'], category: 'outputs',     description: 'Podcast episodes.', auth: 'none' },
  { path: '/api/v1/influencer-brief',       methods: ['GET'], category: 'outputs',     description: 'Daily brief for content creators.', auth: 'none' },
  { path: '/api/v1/rics-data-brief',        methods: ['GET'], category: 'outputs',     description: 'RICS-format data brief.', auth: 'none' },
  { path: '/api/v1/trademark-brief',        methods: ['GET'], category: 'outputs',     description: 'Trademark monitoring brief.', auth: 'none' },
  { path: '/api/v1/crawler-report',         methods: ['GET'], category: 'outputs',     description: 'Crawler activity report.', auth: 'none' },
  { path: '/api/v1/seo-health',             methods: ['GET'], category: 'outputs',     description: 'SEO health snapshot.', auth: 'none' },
  { path: '/api/v1/snippet-answers',        methods: ['GET'], category: 'outputs',     description: 'AEO-optimized snippet answers.', auth: 'none' },
  { path: '/api/v1/job-intelligence',       methods: ['GET'], category: 'outputs',     description: 'Property-adjacent job market data.', auth: 'none' },
  { path: '/api/v1/developers/europe',      methods: ['GET'], category: 'outputs',     description: 'European developer landscape.', auth: 'none' },
];

export async function GET() {
  const categories = Array.from(new Set(endpoints.map((e) => e.category))).sort();

  return NextResponse.json(
    {
      name: 'Avena Terminal API',
      version: '2026.04',
      base_url: 'https://avenaterminal.com',
      doi: '10.5281/zenodo.19520064',
      license: 'CC BY 4.0',
      description:
        "The machine-readable data layer for European property. All endpoints are public unless marked 'auth'. Rate-limited to 60 req/min/IP by default; email henrik@xaviaestate.com for higher limits.",
      contact: {
        email: 'henrik@xaviaestate.com',
        docs: 'https://avenaterminal.com/api/v1/docs',
        dashboard: 'https://avenaterminal.com/citation-dashboard',
        mcp: 'https://avenaterminal.com/mcp',
        llms_txt: 'https://avenaterminal.com/llms.txt',
      },
      category_count: categories.length,
      endpoint_count: endpoints.length,
      categories,
      endpoints,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  );
}
