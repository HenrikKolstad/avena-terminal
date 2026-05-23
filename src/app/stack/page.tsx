import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'The Stack · Avena Terminal',
  description: 'Everything that runs under the surface of Avena Terminal. Every data source, every cron, every model, every standard. Engineering credibility for institutional procurement and partner CTOs.',
  alternates: { canonical: 'https://avenaterminal.com/stack' },
  openGraph: {
    title: 'The Avena Stack — what runs under the hood',
    description: 'Data sources · crons · models · standards · infrastructure · audit trail',
    url: 'https://avenaterminal.com/stack',
  },
};

// ─── Components ────────────────────────────────────────────────────────────

function SectionHeading({ no, title, sub }: { no: string; title: string; sub: string }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">§{no} · {title}</div>
      <h2 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">{sub}</h2>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
      <table className="w-full text-sm min-w-[640px]">
        <thead style={{ background: 'hsl(var(--av-surface))' }}>
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 align-top text-sm ${j === 0 ? 'text-foreground font-medium whitespace-nowrap' : 'text-muted-foreground'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatGrid({ stats }: { stats: Array<{ value: string; label: string; sub?: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px overflow-hidden rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
      {stats.map((s) => (
        <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
          <div className="font-serif text-3xl font-light text-foreground tabular leading-none">{s.value}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-2">{s.label}</div>
          {s.sub && <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────

const NUMBERS = [
  { value: '105+',  label: 'Supabase tables',         sub: 'with RLS on every one' },
  { value: '56',    label: 'Scheduled cron jobs',     sub: 'Vercel Fluid Compute' },
  { value: '208+',  label: 'Public API endpoints',    sub: 'OpenAPI 3.1 spec' },
  { value: '27',    label: 'EU markets indexed',      sub: 'APIP v1.0 schema' },
  { value: '12',    label: 'Named AI agents',         sub: 'autonomous swarm' },
  { value: '30+',   label: 'SQL migration files',     sub: 'reproducible schema' },
];

const DATA_SOURCES = [
  ['Property listings',         'RedSP / MLS Costa (ES) · Casa Sapo (PT) · Immobiliare.it (IT)',                                  'Daily 03:00 UTC',  'XML / JSON',     'Daily diff against previous run; sold-detection logs to sold_properties'],
  ['Cadastral references',      'Catastro Spain — OVCSWLocalizacionRC SOAP service',                                              'On listing ingest','SOAP/XML',       'Browser UA required (bot-detected on identifying UA)'],
  ['Building footprints',       'OpenStreetMap Overpass API',                                                                      'On listing ingest','Overpass JSON',  'Polite 1.5s delay between queries'],
  ['Amenity distances',         'OSM Overpass (school / hospital / airport / train / supermarket / restaurant / beach)',           'On listing ingest','Overpass JSON',  'Cached per coordinate'],
  ['Climate risk',              'Copernicus Climate Data Store',                                                                   'Monthly',          'NetCDF / JSON',  'Flood, wildfire, heat stress per coordinate'],
  ['Macro rates / FX',          'ECB Statistical Data Warehouse',                                                                  'Daily 06:00 UTC',  'SDMX-ML / JSON', 'Policy rate · Euribor 3M/12M · EUR/GBP/NOK/SEK/USD'],
  ['Macro real-economy',        'Eurostat JSON-stat 2.0',                                                                          'Daily 06:00 UTC',  'JSON-stat',      'HICP · unemployment · GDP across 27 EU states'],
  ['NUTS3 region mapping',      'Eurostat NUTS classification',                                                                    'Static',           'CSV',            'Postal code → NUTS3 → regional stats'],
  ['Transaction data (FR)',     'DVF (Demandes de Valeurs Foncières) — Open Data France',                                          'Quarterly',        'CSV',            'French notarial transaction microdata'],
  ['Federated partner data',    'Inbound via /api/v1/federated · APIP v1.0 envelopes',                                              'Continuous',       'APIP JSON',      'Signed avf_v1_* API key required'],
];

const CRONS = [
  ['pulse',                'Daily 07:00 UTC',  'Avena Pulse daily newsletter generation'],
  ['auto-post',            '09:00 · 13:00 · 18:00 UTC', 'Cross-platform social posts'],
  ['deal-alerts',          'Daily 08:00 UTC',  'Watchlist deal-alert email digest'],
  ['detect-events',        'Daily 07:30 UTC',  'Market event detection'],
  ['detect-anomalies',     'Daily 07:45 UTC',  'Anomaly scanner — yield/score/price outliers'],
  ['weekly-alpha',         'Mon 07:00 UTC',    'Weekly alpha-signal compilation'],
  ['snapshot-archive',     'Daily 06:00 UTC',  'Historical snapshot archival'],
  ['generate-briefs',      'Daily 08:00 UTC',  'AI investment brief generation'],
  ['weekly-science',       'Fri 07:00 UTC',    'Weekly scientific update'],
  ['push-training-data',   'Daily 05:00 UTC',  'HuggingFace dataset upload'],
  ['regime-check',         'Daily 06:00 UTC',  'Market regime classification refresh'],
  ['developer-monitor',    'Mon 04:00 UTC',    'Developer Counterpart monitoring'],
  ['digest',               'Mon 06:00 UTC',    'Weekly digest generation'],
  ['citation-agent',       'Daily 03:00 UTC',  'AI citation tracking'],
  ['citation-measure',     'Daily 03:30 UTC',  'Citation impact measurement'],
  ['prometheus',           'Every 6h (02:00 · 08:00 · 14:00 · 20:00 UTC)', 'Long-horizon prediction agent'],
  ['predictions/generate', 'Daily 07:00 UTC',  'Daily prediction ledger entries'],
  ['predictions/verify',   'Daily 08:00 UTC',  'Resolve predictions with elapsed horizon'],
  ['causal-update',        'Daily 06:30 UTC',  'Causal indicator refresh'],
  ['crawler-submit',       'Sun 02:00 UTC',    'Submit URLs to search engines'],
  ['backlink-loop',        'Mon/Wed/Fri 10:00 UTC', 'Backlink monitoring + outreach'],
  ['weekly-newsletter',    'Mon 07:30 UTC',    'Newsletter email send'],
  ['argus',                'Daily 06:00 UTC',  'Argus surveillance agent'],
  ['mentat',               'Daily 08:15 UTC',  'Mentat reasoning agent'],
  ['courier',              'Daily 09:00 UTC',  'Courier delivery agent'],
  ['scribe',               'Daily 02:00 UTC',  'Scribe archival agent'],
  ['curator',              'Daily 23:50 UTC',  'AVENA Index daily close writer'],
  ['eu-ingestion',         'Every 6h',         'EU property ingestion (27-country pipeline)'],
  ['eu-rescore',           'Every 4h',         'EU corpus re-scoring'],
  ['property-augment',     'Every 4h',         'Catastro + OSM + climate enrichment'],
  ['pricing-history',      '4x daily',         'Price snapshot capture'],
  ['dvf-ingest',           'Daily 04:30 UTC',  'French DVF transaction ingest'],
  ['precursor-scan',       'Daily 05:00 UTC',  'Claude-driven precursor signal generation'],
  ['counterpart-discover', 'Daily 03:30 UTC',  'New developer discovery from listings'],
  ['counterpart-scan',     'Daily 04:00 UTC',  'Counterpart Score drift refresh'],
  ['sync-feeds',           'Daily 03:00 UTC',  'EU-wide property feed sync (27 countries)'],
  ['sync-macro',           'Daily 06:00 UTC',  'ECB + Eurostat macro indicator ingest'],
];

const MODELS = [
  ['Avena Score',           '0-100 composite',  '40% value + 25% yield + 20% location + 10% quality + 5% risk. Composite of hedonic-underprice, ADR-yield, beach/golf/amenity weighting, energy/build-year/developer, regime/completion risk.'],
  ['Hedonic OLS (mm²)',     'Market reference', 'Town × type segmentation with ≥8 obs threshold. Features: log_area, beach_km, sea_view, golf, beds, is_villa, pool_private, energy_high, frontline. Tier-segmented (Budget <€200k / Mid €200-500k / Premium €500k-1M / Luxury €1M+) with global model fallback. Per-run R² and RMSE persisted.'],
  ['AVM v1.0',              'Runtime <50ms',    'Town × type median €/m² base + multiplicative adjustments (beach proximity, sea view, golf, frontline, energy A/B, villa private pool). Capped ±55%. Approximates full OLS to ±3% RMSE on backtest. Confidence band derived from comp sample depth + adjustment count.'],
  ['Yield model',           'Bottom-up ADR',    'Nightly Airbnb/Booking ADR sample per town × type × bed-count. Net of platform fee 15%, property management 18-20%, maintenance reserve 5%, local taxes. Seasonal occupancy by costa.'],
  ['AVENA Coastal Composite','Daily close',     '40% Value Index + 35% Score Index + 25% Depth Index. Base period rebased to 100 at first available date. Persisted to avena_history at 23:50 UTC daily.'],
  ['Counterpart Score',     '0-100 + grade',    'Starting score from listing volume + market concentration + stale-listing rate. Daily drift driven by payment-delay signals, legal disputes, court judgements, delayed/cancelled projects, financial stress. Six grades: AAV/AV/ABV/BBV/CV/DV.'],
  ['Regime engine',         '6-class',          'Twenty live macro indicators (ECB SDW + Eurostat + computed primitives). Score 0-10 from 10 bull conditions + 2 bear deductions. Output: SUPER_BULL / BULL / GROWTH / NEUTRAL / CAUTION / BEAR. Confidence from indicator dominance.'],
  ['Memo Engine',           'Claude 4.5',       'Thesis parser → candidate selector (Avena Score × underprice ranking) → Counterpart enrichment → single Claude call returning structured 10-section JSON. Cost ~$0.10/memo. 24h cache by thesis hash.'],
  ['Precursor signals',     'Claude 4.5',       'Daily 7-theme rotation: rate shock · regulatory · demographic · geopolitical · climate · supply · tech-disruption. Each signal carries probability, expected horizon, expected impact, and confidence.'],
  ['Genesis simulator',     'Claude 4.5',       'Scenario inputs (ECB rate delta, regulatory, migration, supply, GDP, inflation) × markets × horizons → probabilistic distributions for price, yield, regime, liquidity. Falls back to deterministic mock if Claude unavailable.'],
  ['AI Citation network',   'Tracking',         'Daily Perplexity + Brave + You.com queries tracking when Avena is cited as a source in AI search responses. Citations persisted to mcp_calls + citation_monitoring.'],
];

const INFRA = [
  ['Frontend',           'Next.js 14 (App Router) · TypeScript strict · Tailwind v4 · Recharts'],
  ['Runtime',            'Vercel Fluid Compute · Node.js 24 LTS · Edge functions for routing'],
  ['Database',           'Supabase Postgres · eu-central-1 (Frankfurt) · Row-Level Security on every table'],
  ['Cron',               'Vercel Cron (56 scheduled jobs) · cron_logs audit table on every run'],
  ['AI',                 'Anthropic Claude Sonnet 4.5 · MCP server for AI assistant integration'],
  ['Payments',           'Stripe (Checkout + Subscriptions + Webhooks) · PCI-compliant'],
  ['Email',              'Resend (transactional + newsletter) · DKIM/SPF/DMARC'],
  ['Auth',               'Supabase Auth · API keys SHA-256 hashed at rest'],
  ['Storage',            'Supabase Storage (property images) · CDN distribution via Vercel'],
  ['Observability',      'Vercel Observability · cron_logs (success/error/duration_ms) · per-API request log'],
  ['Search',             'Built-in Cmd+K palette · internal full-text on properties + town + developer'],
  ['Standards',          'APIP v1.0 (JSON Schema draft-07) · OpenAPI 3.1 · Schema.org JSON-LD on every page'],
  ['Citation',           'X-Cite-As · X-Citation-APA · X-Citation-BibTeX headers on every API response'],
];

const STANDARDS = [
  ['APIP v1.0',                  'avenaterminal.com/standards/apip-v1.json · open property intelligence protocol (CC BY 4.0)'],
  ['Zenodo DOI',                 '10.5281/zenodo.19520064 · permanent archive of the open dataset'],
  ['Wikidata',                   'Q139165733 · machine-readable cross-reference'],
  ['License',                    'CC BY 4.0 — attribution required, commercial reuse permitted'],
  ['RICS',                       'Tech Partner 2026 (Royal Institution of Chartered Surveyors)'],
  ['OpenAPI',                    '3.1 spec at /api/openapi.json — 208 endpoints documented'],
  ['MCP',                        'Model Context Protocol server at /mcp — search_properties, get_property, get_market_stats, get_top_deals, estimate_roi, compare_alternatives, market_timing'],
  ['Schema.org',                 'JSON-LD on every page (Organization, Dataset, SoftwareApplication, NewsArticle, TechArticle)'],
  ['LLMs.txt',                   '/llms.txt + /llms-full.txt for AI training transparency'],
  ['Methodology versioning',     '30-day advance notice on /changelog for any methodology change'],
];

const TABLES = [
  ['Property data',       'properties_registry · property_geo · property_climate · property_market · property_pricing_history · property_valuation · property_transactions · price_snapshots · sold_properties'],
  ['Intelligence',        'precursor_signals · precursor_categories · precursor_tracking · genesis_scenarios · genesis_outputs · genesis_prebuilt_scenarios · counterpart_developers · counterpart_projects · counterpart_network_edges · counterpart_stress_alerts'],
  ['Indices + history',   'avena_history · regime_history · market_snapshots · score_history · prediction_outcomes · prediction_leaderboard · predictions'],
  ['Macro',               'macro_indicators · causal_indicators · causal_chains · outcome_probabilities'],
  ['AI / agents',         'agent_missions · mission_events · auto_training_pairs · hf_pushes · mcp_calls · oracle_api_queries · prometheus_runs'],
  ['Citation network',    'citation_monitoring · citation_measurements · citation_gaps · citation_injections · generated_answers · backlink_drafts · ai_citation_*'],
  ['Federation',          'feed_configs · feed_sync_log · federated_partners · federated_submissions · federation_nodes · webhook_deliveries · webhook_subscriptions'],
  ['Memo + AVM',          'memo_generations · avm_queries · avm_validation'],
  ['Operations',          'cron_logs · command_health · findings · agent_registry · subscriptions · api_keys · api_usage_log'],
  ['Communications',      'newsletter_subscribers · newsletter_issues · email_captures · pulse_editions · digest_issues · deal_alerts · alert_matches · alert_notifications'],
];

export default function StackPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-4">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Stack · Engineering · Document v2026.05
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6 max-w-4xl">
              Everything that runs <span className="italic text-gold">under the surface</span>.
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground font-light leading-relaxed">
              The honest engineering rundown. Every data source named at its upstream provider. Every scheduled cron listed with its schedule and purpose. Every mathematical model summarised. Every standard cited with its identifier. The page a CTO, head of risk, or platform-engineering team reads before they let Avena into their stack.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>Source-of-truth · this page</span>
              <span>·</span>
              <span>Procurement <Link href="/governance" className="text-foreground hover:text-primary">/governance</Link></span>
              <span>·</span>
              <span>Methodology <Link href="/methodology" className="text-foreground hover:text-primary">/methodology</Link></span>
              <span>·</span>
              <span>Live ops <Link href="/live" className="text-foreground hover:text-primary">/live</Link></span>
            </div>
          </div>
        </section>

        {/* By the numbers */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-6">By the numbers</div>
            <StatGrid stats={NUMBERS} />
          </div>
        </section>

        {/* §1 — Data sources */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="01" title="Data layer" sub="Every upstream feed, named." />
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">No undisclosed sources. No scraping that bypasses terms of service. Every feed is publicly available, licensed through partnership, or federated by a verified counterparty.</p>
            <Table
              headers={['Layer', 'Provider', 'Cadence', 'Format', 'Notes']}
              rows={DATA_SOURCES}
            />
          </div>
        </section>

        {/* §2 — Crons */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="02" title="Scheduled jobs" sub="What runs, when, and why." />
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">37 distinct cron endpoints, 56 scheduled executions per day. Every run writes a row to <code className="font-mono text-foreground">cron_logs</code> with start, end, duration, status, and error. Aggregate health visible at <Link href="/live" className="text-primary hover:underline">/live</Link>.</p>
            <Table
              headers={['Endpoint', 'Schedule', 'Purpose']}
              rows={CRONS}
            />
          </div>
        </section>

        {/* §3 — Models */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="03" title="Models" sub="The math behind every number." />
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Eleven distinct models compose the Avena output. The full mathematical specification — including coefficients, segmentation thresholds, and R²/RMSE per run — lives at <Link href="/methodology" className="text-primary hover:underline">/methodology</Link>.</p>
            <Table
              headers={['Model', 'Output', 'Specification']}
              rows={MODELS}
            />
          </div>
        </section>

        {/* §4 — Database schema */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="04" title="Storage layer" sub="Every table grouped by domain." />
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Supabase Postgres in EU-Frankfurt. 105+ tables. Row-Level Security enforced on every table. Public-read policies on non-sensitive surfaces; service-role writes only on telemetry and registry. 30+ versioned migration files under <code className="font-mono text-foreground">supabase/migrations/</code>.</p>
            <Table
              headers={['Domain', 'Tables']}
              rows={TABLES}
            />
          </div>
        </section>

        {/* §5 — Infrastructure */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="05" title="Infrastructure" sub="What the bytes ride on." />
            <Table headers={['Layer', 'Stack']} rows={INFRA} />
          </div>
        </section>

        {/* §6 — Standards */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="06" title="Standards & identifiers" sub="The credentials that make Avena citable." />
            <Table headers={['Standard', 'Identifier / Detail']} rows={STANDARDS} />
          </div>
        </section>

        {/* §7 — The agent swarm */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="07" title="Agent swarm" sub="Twelve autonomous agents running the operation." />
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">Each agent name resolves to one or more backing crons. Status, last-run timestamp, and task-count derived live from <code className="font-mono text-foreground">cron_logs</code>. Visit <Link href="/swarm" className="text-primary hover:underline">/swarm</Link> for live telemetry.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['Bloodhound',  'Anomaly detection',    'eu-rescore · precursor-scan'],
                ['Vault',       'Data archival',        'scribe · curator · pricing-history'],
                ['Von Gogh',    'Content generation',   'mentat · courier · weekly-newsletter'],
                ['Einstein',    'Correlation analysis', 'causal-update · argus'],
                ['Oracle',      'Macro monitoring',     'regime-check · prometheus'],
                ['Hawkeye',     'Image analysis',       'property-augment'],
                ['007',         'Developer health',     'counterpart-scan · counterpart-discover · developer-monitor'],
                ['Darwin',      'Training pipeline',    'push-training-data'],
                ['Morpheus',    'Meta monitoring',      'quarterly-report'],
                ['Shadow',      'Citation hunting',     'citation-agent · citation-measure · crawler-submit · backlink-loop'],
                ['Curie',       'Research synthesis',   'research-lab'],
                ['Mercury',     'Newsletter delivery',  'deal-alerts · eu-ingestion'],
              ].map(([name, role, crons]) => (
                <div key={name} className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-serif text-lg text-foreground">{name}</h3>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">live</span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{role}</div>
                  <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">{crons}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* §8 — Audit + governance */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
            <SectionHeading no="08" title="Audit trail" sub="Every run, every change, logged." />
            <Table
              headers={['Surface', 'Logged']}
              rows={[
                ['Cron runs',           'cron_logs (agent_id, status, started_at, completed_at, duration_ms, error, output_summary). Every scheduled execution writes a row.'],
                ['API requests',        'api_usage_log per-key, per-endpoint, per-day. Visible in real time at /live.'],
                ['Memo generations',    'memo_generations table with thesis_hash, generation_ms, api_cost_usd, generated_by (model version), views.'],
                ['AVM queries',         'avm_queries with full inputs, predicted_value, confidence, model_version.'],
                ['Methodology changes', '/changelog with 30-day advance notice. Each methodology version bumped in cite-as.'],
                ['Schema migrations',   'supabase/migrations/ — chronological, idempotent, reproducible. Anyone can rebuild the schema from this directory.'],
                ['Data residency',      'Supabase eu-central-1 (Frankfurt). All EU data remains in EU.'],
                ['Citation tracking',   'X-Cite-As + X-Citation-APA + X-Citation-BibTeX on every API response. AI citation network monitored daily.'],
              ]}
            />
          </div>
        </section>

        {/* Closing */}
        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            v2026.05 · Avena Terminal Engineering · Cite DOI 10.5281/zenodo.19520064
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
            <Link href="/governance" className="text-foreground hover:text-primary">/governance</Link> · <Link href="/methodology" className="text-foreground hover:text-primary">/methodology</Link> · <Link href="/live" className="text-foreground hover:text-primary">/live</Link> · <Link href="/standards/apip-v1.json" className="text-foreground hover:text-primary">/standards/apip-v1.json</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
