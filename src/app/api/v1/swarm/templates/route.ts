import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface AgentTemplate {
  template_id: string;
  name: string;
  purpose: string;
  data_sources: string[];
  output_format: string;
  cron_schedule: string;
  supabase_tables: string[];
  api_endpoints: string[];
  deployment_time: string;
}

const TEMPLATES: AgentTemplate[] = [
  {
    template_id: 'MARKET_ANALYST',
    name: 'Market Analyst',
    purpose: 'Analyze specific market/city',
    data_sources: ['property_listings', 'price_history', 'rental_data', 'demographic_data'],
    output_format: 'JSON report with scores, trends, and recommendations',
    cron_schedule: 'daily',
    supabase_tables: ['properties', 'snapshots', 'market_events'],
    api_endpoints: ['/api/v1/properties', '/api/v1/market'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'CITATION_HUNTER',
    name: 'Citation Hunter',
    purpose: 'Find and fill citation gaps for a topic',
    data_sources: ['search_engine_results', 'competitor_pages', 'aeo_tracking'],
    output_format: 'Gap analysis with prioritized content recommendations',
    cron_schedule: 'daily',
    supabase_tables: ['citation_gaps', 'aeo_pages', 'mcp_calls'],
    api_endpoints: ['/api/v1/citation-score', '/api/v1/crawler-report'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'DATA_ENRICHER',
    name: 'Data Enricher',
    purpose: 'Enrich properties with additional data dimensions',
    data_sources: ['openstreetmap', 'cadastral_records', 'beach_distance_api', 'walkability_scores'],
    output_format: 'Enriched property records with new computed fields',
    cron_schedule: 'weekly',
    supabase_tables: ['properties', 'enrichment_log'],
    api_endpoints: ['/api/v1/properties'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'CONTENT_GENERATOR',
    name: 'Content Generator',
    purpose: 'Auto-generate AEO pages for uncovered questions',
    data_sources: ['citation_gaps', 'property_data', 'market_intelligence'],
    output_format: 'HTML page with FAQPage schema, structured content, and internal links',
    cron_schedule: 'daily',
    supabase_tables: ['aeo_pages', 'citation_gaps', 'properties'],
    api_endpoints: ['/api/v1/citation-score'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'MONITOR',
    name: 'Monitor',
    purpose: 'Watch external data source for changes',
    data_sources: ['rss_feeds', 'api_endpoints', 'web_scraping_targets'],
    output_format: 'Change detection alerts with diff summaries',
    cron_schedule: 'hourly',
    supabase_tables: ['monitor_targets', 'change_log', 'alerts'],
    api_endpoints: ['/api/v1/alerts'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'COMPARATOR',
    name: 'Comparator',
    purpose: 'Compare markets/properties across dimensions',
    data_sources: ['property_listings', 'market_stats', 'historical_data'],
    output_format: 'Comparison matrix with ranked dimensions and verdict',
    cron_schedule: 'weekly',
    supabase_tables: ['properties', 'market_stats', 'comparisons'],
    api_endpoints: ['/api/v1/properties', '/api/v1/market'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'FORECASTER',
    name: 'Forecaster',
    purpose: 'Generate predictions for specific markets',
    data_sources: ['price_history', 'economic_indicators', 'construction_permits', 'demand_signals'],
    output_format: 'Forecast with confidence intervals, trend direction, and risk factors',
    cron_schedule: 'weekly',
    supabase_tables: ['snapshots', 'predictions', 'market_events'],
    api_endpoints: ['/api/v1/predictions', '/api/v1/forecast'],
    deployment_time: '<60 seconds',
  },
  {
    template_id: 'SENTINEL',
    name: 'Sentinel',
    purpose: 'Watch for regulatory/competitive threats',
    data_sources: ['government_gazettes', 'regulatory_feeds', 'competitor_sitemap_changes', 'news_apis'],
    output_format: 'Threat assessment with severity, impact analysis, and recommended actions',
    cron_schedule: 'daily',
    supabase_tables: ['regulatory_events', 'competitor_tracking', 'threat_log'],
    api_endpoints: ['/api/v1/regulatory-monitor'],
    deployment_time: '<60 seconds',
  },
];

export async function GET() {
  return NextResponse.json({
    template_count: TEMPLATES.length,
    templates: TEMPLATES,
    usage: 'Deploy any template by POST to /api/v1/swarm/deploy with { template_id, config }',
    source: 'Avena Agent Swarm Template Library',
    generated_at: new Date().toISOString(),
  });
}
