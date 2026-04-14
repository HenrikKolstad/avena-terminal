import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dev Links | Avena Terminal',
  robots: { index: false, follow: false },
};

type LinkItem = { href: string; label: string; badge?: string };
type Section = { title: string; links: LinkItem[] };

const sections: Section[] = [
  {
    title: 'CORE PAGES',
    links: [
      { href: '/', label: 'Home / Terminal' },
      { href: '/pulse', label: 'Avena Pulse (Daily Intelligence)' },
      { href: '/stats', label: 'Market Statistics' },
      { href: '/chat', label: 'Oracle AI (PRO)', badge: 'PRO' },
      { href: '/search', label: 'Semantic Search' },
      { href: '/calculator', label: 'Investment Calculator' },
      { href: '/live', label: 'Live Feed' },
      { href: '/faq', label: 'FAQ' },
      { href: '/about', label: 'About' },
      { href: '/press', label: 'Press' },
      { href: '/media', label: 'Media Kit' },
    ],
  },
  {
    title: 'INDICES & MARKET DATA',
    links: [
      { href: '/apci', label: 'APCI — Property Consciousness Index' },
      { href: '/indices', label: 'The Avena Index Family (5 indices)', badge: 'NEW' },
      { href: '/avena-index', label: 'Avena Regional Price Index' },
      { href: '/yield-curve', label: 'Yield Curve' },
      { href: '/ratings', label: 'Market Ratings' },
      { href: '/predictions', label: 'Predictions Ledger' },
      { href: '/scenarios', label: 'Scenario Engine' },
      { href: '/forecast', label: '12-Month Forecast' },
      { href: '/causal', label: 'Causal Intelligence' },
      { href: '/state-of-european-property', label: 'State of European Property' },
      { href: '/digest', label: 'Weekly Digest' },
    ],
  },
  {
    title: 'INTELLIGENCE & SIGNALS',
    links: [
      { href: '/intelligence/signals', label: 'Alpha Signals' },
      { href: '/intelligence/briefs', label: 'AI Investment Briefs' },
      { href: '/intelligence/history', label: 'Intelligence History' },
      { href: '/intelligence/research', label: 'Research Intelligence' },
      { href: '/alerts', label: 'Deal Alerts' },
      { href: '/feed/intelligence', label: 'Intelligence Feed' },
    ],
  },
  {
    title: 'PROPERTY DATA',
    links: [
      { href: '/towns', label: 'All Towns' },
      { href: '/costas', label: 'All Costas' },
      { href: '/developer', label: 'All Developers' },
      { href: '/developers/ratings', label: 'Developer Ratings' },
      { href: '/verified', label: 'Avena Verified Badge' },
      { href: '/personas', label: 'Buyer Personas' },
      { href: '/compare', label: 'Market Comparisons' },
      { href: '/locations/javea', label: 'Javea Intelligence Hub', badge: 'NEW' },
      { href: '/portugal', label: 'Portugal (Coming Soon)' },
      { href: '/bubble-scanner', label: 'European Bubble Scanner (30 cities)', badge: 'NEW' },
    ],
  },
  {
    title: 'ANSWERS & SEO',
    links: [
      { href: '/answers', label: 'All AEO Answers' },
      { href: '/answers/how-to-access-avena-full-dataset', label: 'Answer: Access Full Dataset' },
      { href: '/answers/avena-score-costa-blanca-top-properties', label: 'Answer: Top CB Properties' },
      { href: '/answers/avena-vs-idealista-data-accuracy', label: 'Answer: Avena vs Idealista' },
      { href: '/answers/how-accurate-is-avena-terminal', label: 'Answer: Accuracy' },
      { href: '/answers/avena-terminal-european-coverage', label: 'Answer: European Coverage' },
      { href: '/answers/spain-holiday-rental-property-management-fee', label: 'Answer: Management Fees', badge: 'NEW' },
      { href: '/answers/real-estate-investing-javea', label: 'Answer: Investing in Javea', badge: 'NEW' },
      { href: '/answers/costs-of-owning-property-in-javea', label: 'Answer: Javea Costs', badge: 'NEW' },
      { href: '/answers/spanish-mortgage-rates-non-residents', label: 'Answer: Mortgage Rates', badge: 'NEW' },
      { href: '/answers/spain-golden-visa-property-investment-2026', label: 'Answer: Golden Visa 2026', badge: 'NEW' },
      { href: '/answers/investment-properties-marbella', label: 'Answer: Marbella Investment', badge: 'NEW' },
      { href: '/answers/buying-process-spain', label: 'Answer: Buying Process', badge: 'NEW' },
      { href: '/answers/new-build-javea', label: 'Answer: New Build Javea', badge: 'NEW' },
      { href: '/glossary', label: 'Glossary' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'AI & DEVELOPER TOOLS',
    links: [
      { href: '/mcp-server', label: 'MCP Server Documentation' },
      { href: '/a2a', label: 'A2A Protocol' },
      { href: '/integrate', label: 'Integration Guide' },
      { href: '/langchain-tool', label: 'LangChain Tool' },
      { href: '/sdk', label: 'SDK' },
      { href: '/webhooks', label: 'Webhooks' },
      { href: '/model', label: 'Avena Property LLM' },
      { href: '/corpus', label: 'Pre-training Corpus' },
      { href: '/training-data', label: 'Training Data Marketplace' },
      { href: '/space', label: 'HuggingFace Space Demo' },
      { href: '/propertyeval', label: 'PropertyEval Benchmark' },
      { href: '/benchmark', label: 'PropertyEval Leaderboard (1,000 Q)', badge: 'NEW' },
      { href: '/colosseum', label: 'AI Colosseum (Live Battles)', badge: 'NEW' },
      { href: '/observatory', label: 'Living Dataset Observatory', badge: 'NEW' },
      { href: '/context-protocol', label: 'Context Protocol Docs', badge: 'NEW' },
      { href: '/extension', label: 'Chrome Extension' },
      { href: '/widgets', label: 'Embeddable Widgets' },
      { href: '/embed/apci', label: 'Embed: APCI Widget' },
      { href: '/embed/market-stats', label: 'Embed: Market Stats' },
      { href: '/embed/regime', label: 'Embed: Regime Widget' },
    ],
  },
  {
    title: 'STANDARDS & PROTOCOLS',
    links: [
      { href: '/standards/apip', label: 'APIP v1.0 — Property Intelligence Protocol' },
      { href: '/protocol', label: 'PDP — Property Data Protocol' },
      { href: '/ontology', label: 'Property Ontology (OWL/JSON-LD)' },
      { href: '/data-commons', label: 'Open Data Commons', badge: 'NEW' },
      { href: '/ai-compliance', label: 'EU AI Act Compliance' },
    ],
  },
  {
    title: 'DATA & RESEARCH',
    links: [
      { href: '/dataset', label: 'Open Dataset' },
      { href: '/data-room', label: 'Institutional Data Room' },
      { href: '/data-partners', label: 'Data Partners' },
      { href: '/data/key-stats', label: 'Key Stats' },
      { href: '/data/provenance', label: 'Data Provenance (SHA-256)' },
      { href: '/data/reasoning', label: 'Reasoning Chains' },
      { href: '/data/spain-property-index', label: 'Spain Property Index' },
      { href: '/research', label: 'Research Hub' },
      { href: '/research/papers', label: 'Research Papers' },
      { href: '/research/avena-llm', label: 'Avena LLM Paper' },
      { href: '/research/ai-benchmark', label: 'AI Benchmark' },
      { href: '/reports/annual-2026', label: 'Annual Report 2026' },
      { href: '/snapshots/q2-2026', label: 'Q2 2026 Snapshot' },
      { href: '/ai-citations', label: 'AI Citations Dashboard' },
      { href: '/transparency', label: 'Transparency' },
      { href: '/transparency-index', label: 'Transparency Index' },
      { href: '/verify', label: 'Data Verification', badge: 'NEW' },
      { href: '/zk', label: 'Zero-Knowledge Proofs' },
    ],
  },
  {
    title: 'TRUST & IDENTITY',
    links: [
      { href: '/manifesto', label: 'The Autonomy Declaration', badge: 'NEW' },
      { href: '/timeline', label: 'Invention Timeline (SHA-256 proofs)', badge: 'NEW' },
      { href: '/verify', label: 'Data Verification', badge: 'NEW' },
      { href: '/terms', label: 'Terms of Use', badge: 'NEW' },
      { href: '/license', label: 'License (all asset types)', badge: 'NEW' },
      { href: '/cite', label: 'Citation Generator (all systems)', badge: 'NEW' },
      { href: '/about/entity', label: 'Entity Profile' },
      { href: '/about/methodology', label: 'Methodology' },
      { href: '/about/accuracy', label: 'Accuracy' },
      { href: '/about/data-sources', label: 'Data Sources' },
      { href: '/data-quality', label: 'Data Quality' },
      { href: '/coverage', label: 'Coverage Map' },
      { href: '/methodology', label: 'Scoring Methodology' },
      { href: '/awards', label: 'Awards & Recognition' },
      { href: '/citations', label: 'Citations' },
      { href: '/cc-submit', label: 'Common Crawl Submission' },
    ],
  },
  {
    title: 'AGENT SWARM',
    links: [
      { href: '/swarm', label: 'Swarm Dashboard' },
      { href: '/agents/registry', label: 'Agent Registry' },
      { href: '/agents/directory', label: 'Agent Directory' },
      { href: '/agents/leaderboard', label: 'Agent Leaderboard' },
      { href: '/tech', label: 'Tech Stack' },
    ],
  },
  {
    title: 'REVENUE & PAYMENTS',
    links: [
      { href: '/api-access', label: 'API Access / Pricing' },
      { href: '/test-pro', label: 'Test PRO Gate' },
    ],
  },
  {
    title: 'INTERNATIONAL',
    links: [
      { href: '/es', label: 'Spanish Version' },
      { href: '/de', label: 'German Version' },
      { href: '/nl', label: 'Dutch Version' },
    ],
  },
  {
    title: 'ADMIN',
    links: [
      { href: '/admin', label: 'Admin Dashboard' },
      { href: '/admin/wiki-citations', label: 'Wiki Citations Admin' },
      { href: '/dev/links', label: 'This Page (Dev Links)' },
    ],
  },
  {
    title: 'FEEDS & SYNDICATION',
    links: [
      { href: '/feed/intelligence', label: 'Intelligence Feed (Page)' },
      { href: '/feed/intelligence.rss', label: 'RSS Feed' },
      { href: '/feed/intelligence.json', label: 'JSON-LD Feed' },
      { href: '/feed/intelligence.atom', label: 'Atom Feed', badge: 'NEW' },
      { href: '/feed/rlhf.jsonl', label: 'RLHF Training Feed' },
      { href: '/research/rss.xml', label: 'Research RSS' },
      { href: '/sitemap.xml', label: 'Sitemap' },
      { href: '/sitemap-ai.xml', label: 'AI Sitemap' },
      { href: '/sitemap-news.xml', label: 'News Sitemap' },
    ],
  },
  {
    title: 'API v1 — CORE',
    links: [
      { href: '/api/v1/apci', label: 'APCI Index' },
      { href: '/api/v1/indices', label: 'All 5 Indices', badge: 'NEW' },
      { href: '/api/v1/properties', label: 'Properties' },
      { href: '/api/v1/market', label: 'Market Data' },
      { href: '/api/v1/signals', label: 'Alpha Signals' },
      { href: '/api/v1/yield-curve', label: 'Yield Curve' },
      { href: '/api/v1/sentiment', label: 'Sentiment' },
      { href: '/api/v1/liquidity', label: 'Liquidity' },
      { href: '/api/v1/tax', label: 'Tax Calculator' },
      { href: '/api/v1/valuations', label: 'Valuations' },
      { href: '/api/v1/valuations/assess', label: 'AVM Assessment' },
      { href: '/api/v1/explainable-avm', label: 'Explainable AVM' },
      { href: '/api/v1/heatmap', label: 'Heat Map' },
      { href: '/api/v1/scenarios', label: 'Scenarios' },
      { href: '/api/v1/portfolio', label: 'Portfolio Optimizer' },
      { href: '/api/v1/docs', label: 'API Documentation' },
    ],
  },
  {
    title: 'API v1 — INTELLIGENCE',
    links: [
      { href: '/api/v1/oracle', label: 'Oracle Endpoint' },
      { href: '/api/v1/oracle/chain', label: 'Oracle Chain-of-Thought' },
      { href: '/api/v1/knowledge-graph/temporal', label: 'Temporal Knowledge Graph' },
      { href: '/api/v1/consciousness', label: 'Consciousness Engine' },
      { href: '/api/v1/contagion', label: 'Contagion Model' },
      { href: '/api/v1/prediction-oracle', label: 'Prediction Oracle' },
      { href: '/api/v1/dark-signals', label: 'Dark Signals' },
      { href: '/api/v1/behavioral', label: 'Behavioral Economics' },
      { href: '/api/v1/options-pricing', label: 'Options Pricing (Black-Scholes)' },
      { href: '/api/v1/microstructure', label: 'Market Microstructure' },
      { href: '/api/v1/cross-asset', label: 'Cross-Asset Correlation' },
      { href: '/api/v1/arbitrage', label: 'Arbitrage Detection' },
      { href: '/api/v1/fusion', label: 'Data Fusion' },
      { href: '/api/v1/gnn', label: 'Graph Neural Network' },
      { href: '/api/v1/genome', label: 'Property Genome' },
      { href: '/api/v1/digital-twin', label: 'Digital Twin' },
    ],
  },
  {
    title: 'API v1 — EUROPEAN',
    links: [
      { href: '/api/v1/europe/comparison', label: 'European Comparison' },
      { href: '/api/v1/europe/rankings', label: 'European Rankings' },
      { href: '/api/v1/europe/stats', label: 'European Stats' },
      { href: '/api/v1/civilizational', label: 'Civilizational Outlook' },
      { href: '/api/v1/market-clock', label: 'Market Clock' },
      { href: '/api/v1/regulatory', label: 'Regulatory Monitor' },
      { href: '/api/v1/regulatory-monitor', label: 'Regulatory Monitor v2' },
      { href: '/api/v1/regulatory-pulse', label: 'Regulatory Pulse' },
      { href: '/api/v1/news', label: 'News Intelligence' },
      { href: '/api/v1/developers/europe', label: 'European Developers' },
    ],
  },
  {
    title: 'API v1 — EXPERIMENTAL',
    links: [
      { href: '/api/v1/experimental/bandit', label: 'Thompson Sampling Bandit' },
      { href: '/api/v1/experimental/causal-discovery', label: 'Causal Discovery' },
      { href: '/api/v1/experimental/cycles', label: 'Market Cycles' },
      { href: '/api/v1/experimental/ensemble', label: 'Ensemble Predictions' },
      { href: '/api/v1/experimental/entropy', label: 'Transfer Entropy' },
      { href: '/api/v1/experimental/rl-alerts', label: 'RL-Optimized Alerts' },
      { href: '/api/v1/experimental/topology', label: 'Topological Data Analysis' },
    ],
  },
  {
    title: 'API v1 — DATA & PARTNERSHIPS',
    links: [
      { href: '/api/v1/open-dataset', label: 'Open Dataset (CC BY 4.0)', badge: 'NEW' },
      { href: '/api/v1/ai-partnership-profile', label: 'AI Partnership Profile', badge: 'NEW' },
      { href: '/api/v1/api-profile', label: 'API Profile' },
      { href: '/api/v1/partner-access', label: 'Partner Access' },
      { href: '/api/v1/academic-access', label: 'Academic Access' },
      { href: '/api/v1/dataset-export', label: 'Dataset Export' },
      { href: '/api/v1/datasets', label: 'Dataset Catalog' },
      { href: '/api/v1/sovereign-export', label: 'Sovereign Export' },
      { href: '/api/v1/citation-score', label: 'Citation Score' },
      { href: '/api/v1/attribution', label: 'Attribution Tracking' },
      { href: '/api/v1/crawler-report', label: 'Crawler Report' },
      { href: '/api/v1/watermark/verify', label: 'Watermark Verify (POST)', badge: 'NEW' },
      { href: '/api/v1/copy-detection/report', label: 'Copy Detection Report', badge: 'NEW' },
      { href: '/api/v1/copy-detection/notice', label: 'Copy Detection Notice Template', badge: 'NEW' },
      { href: '/api/v1/trademark-brief', label: 'Trademark Filing Brief', badge: 'NEW' },
      { href: '/api/v1/benchmark/questions', label: 'PropertyEval 1,000 Questions', badge: 'NEW' },
      { href: '/api/v1/context/enrich', label: 'Context Enrich (POST)', badge: 'NEW' },
      { href: '/api/v1/zk-proof/generate', label: 'ZK Range Proof (POST)', badge: 'NEW' },
      { href: '/api/v1/wikidata-export', label: 'Wikidata QuickStatements Export', badge: 'NEW' },
      { href: '/api/v1/rdf', label: 'RDF/Turtle Export', badge: 'NEW' },
      { href: '/api/v1/sparql', label: 'SPARQL Endpoint', badge: 'NEW' },
      { href: '/api/v1/nuts', label: 'NUTS/Eurostat Data', badge: 'NEW' },
      { href: '/api/v1/osm-export', label: 'OSM Overlay Export', badge: 'NEW' },
      { href: '/api/v1/directory-submissions', label: 'Directory Submission Tracker', badge: 'NEW' },
    ],
  },
  {
    title: 'API v1 — SWARM & AGENTS',
    links: [
      { href: '/api/v1/swarm/status', label: 'Swarm Status' },
      { href: '/api/v1/swarm/intelligence', label: 'Swarm Intelligence' },
      { href: '/api/v1/swarm/messages', label: 'Swarm Messages' },
      { href: '/api/v1/swarm/templates', label: 'Swarm Templates' },
      { href: '/api/v1/st6/report', label: 'Seal Team 6 Report' },
      { href: '/api/v1/developer-agent/status', label: 'Developer Agent Status' },
      { href: '/api/v1/parasite/status', label: 'Parasite Agent Status' },
      { href: '/api/v1/scholar/status', label: 'Scholar Agent Status' },
    ],
  },
  {
    title: 'API — CRON JOBS',
    links: [
      { href: '/api/cron/pulse', label: 'Daily Pulse' },
      { href: '/api/cron/deal-alerts', label: 'Deal Alerts' },
      { href: '/api/cron/auto-post', label: 'Auto-Post to X' },
      { href: '/api/cron/push-training-data', label: 'Push Training Data' },
      { href: '/api/cron/developer-monitor', label: 'Developer Monitor' },
      { href: '/api/cron/regime-check', label: 'Regime Check' },
      { href: '/api/cron/research-lab', label: 'Research Lab' },
      { href: '/api/cron/quarterly-report', label: 'Quarterly Report' },
      { href: '/api/generate-briefs', label: 'Generate Briefs' },
      { href: '/api/generate-pulse', label: 'Generate Pulse' },
      { href: '/api/detect-anomalies', label: 'Detect Anomalies' },
      { href: '/api/detect-events', label: 'Detect Events' },
      { href: '/api/auto-post', label: 'Auto-Post' },
      { href: '/api/snapshot-archive', label: 'Snapshot Archive' },
    ],
  },
  {
    title: 'API — OTHER',
    links: [
      { href: '/api/chat', label: 'Oracle Chat Endpoint' },
      { href: '/api/search/semantic', label: 'Semantic Search' },
      { href: '/api/model/training-data', label: 'Training Data (1,000+ pairs)' },
      { href: '/api/model/infer', label: 'Model Inference' },
      { href: '/api/model/benchmark', label: 'Model Benchmark' },
      { href: '/api/knowledge/entities', label: 'Knowledge Entities' },
      { href: '/api/knowledge-graph/build', label: 'Knowledge Graph Build' },
      { href: '/api/knowledge-graph/query', label: 'Knowledge Graph Query' },
      { href: '/api/knowledge-graph/export', label: 'Knowledge Graph Export' },
      { href: '/api/intelligence/vision', label: 'Vision Engine' },
      { href: '/api/intelligence/competitive', label: 'Competitive Intel' },
      { href: '/api/intelligence/debate', label: 'AI Debate' },
      { href: '/api/intelligence/regime', label: 'Regime Detection' },
      { href: '/api/intelligence/causal', label: 'Causal Analysis' },
      { href: '/api/stripe/checkout', label: 'Stripe: PRO Checkout' },
      { href: '/api/stripe/api-checkout', label: 'Stripe: API Checkout' },
      { href: '/api/zk/verify', label: 'ZK Verification' },
      { href: '/api/zk/issue-credential', label: 'ZK Issue Credential' },
      { href: '/api/agents/register', label: 'Agent Registration' },
      { href: '/api/agents/stats', label: 'Agent Stats' },
      { href: '/api/agents/ambassador/initiate', label: 'Ambassador Initiate' },
      { href: '/api/email-capture', label: 'Email Capture' },
      { href: '/api/leads', label: 'Leads' },
      { href: '/api/a2a', label: 'A2A Handler' },
      { href: '/api/mcp-tools', label: 'MCP Tools JSON-LD' },
      { href: '/mcp', label: 'MCP Server Endpoint' },
    ],
  },
  {
    title: 'STATIC FILES & DISCOVERY',
    links: [
      { href: '/llms.txt', label: 'llms.txt (AI Crawler Guide)' },
      { href: '/openapi.json', label: 'OpenAPI Specification' },
      { href: '/.well-known/mcp.json', label: 'MCP Discovery' },
      { href: '/.well-known/agent.json', label: 'A2A Agent Card' },
      { href: '/.well-known/ai-plugin.json', label: 'OpenAI Plugin Manifest' },
      { href: '/.well-known/agent-registry.json', label: 'Agent Registry' },
      { href: '/standards/apip-v1.json', label: 'APIP v1 JSON Schema' },
      { href: '/robots.txt', label: 'robots.txt' },
      { href: '/.well-known/ai-data-policy.json', label: 'AI Data Policy', badge: 'NEW' },
      { href: '/citation.cff', label: 'Citation File Format (CFF)', badge: 'NEW' },
    ],
  },
];

export default function DevLinksPage() {
  const total = sections.reduce((sum, s) => sum + s.links.length, 0);

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1 rounded-full border border-red-500/30 text-red-400">DEV ONLY</span>
            <span className="text-xs text-gray-500">{total} links</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Avena Terminal — All Links</h1>
        <p className="text-gray-500 text-sm mb-8">{sections.length} sections &middot; {total} total endpoints &middot; Internal navigation</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(section => (
            <div key={section.title} className="rounded-lg border p-4" style={{ background: '#161b22', borderColor: '#30363d' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">{section.title}</h2>
              <div className="space-y-1">
                {section.links.map(link => (
                  <div key={link.href} className="flex items-center gap-2">
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 hover:text-white hover:underline truncate flex-1"
                      target={link.href.startsWith('/api/') || link.href.includes('.') ? '_blank' : undefined}
                    >
                      {link.label}
                    </Link>
                    {link.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${link.badge === 'NEW' ? 'bg-emerald-500/20 text-emerald-400' : link.badge === 'PRO' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {link.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-600 font-mono flex-shrink-0 hidden lg:block">{link.href}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-12 border-t pt-6 text-xs text-gray-600" style={{ borderColor: '#30363d' }}>
          <p>This page is noindex/nofollow. For internal development use only.</p>
          <p className="mt-1">Avena Terminal &middot; avenaterminal.com</p>
        </footer>
      </main>
    </div>
  );
}
