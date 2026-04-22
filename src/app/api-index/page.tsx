import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Public API Index — Avena Terminal',
  description:
    'Every public Avena endpoint. The machine-readable data layer for European property — scored, ranked, and open.',
  alternates: { canonical: 'https://avenaterminal.com/api-index' },
};

const BASE = 'https://avenaterminal.com';

const categories = [
  {
    title: 'Core data',
    items: [
      ['Properties', '/api/v1/properties', 'Full dataset — 1,881 scored European new builds'],
      ['Market aggregates', '/api/v1/market', 'Regional stats (price, yield, score)'],
      ['10-country comparison', '/api/v1/europe/comparison', 'Cross-EU snapshot'],
      ['Rankings', '/api/v1/europe/rankings', 'Ranked by yield / score / discount'],
    ],
  },
  {
    title: 'Indices',
    items: [
      ['APCI', '/api/v1/apci', 'Property Consciousness Index — 0-100 market timing'],
      ['All indices', '/api/v1/indices', 'APCI / APYI / APLI / APRI / APSI'],
      ['Yield curve', '/api/v1/yield-curve', 'Yield by beach-distance band'],
      ['Bubble scanner', '/api/v1/bubble-scanner', '30-city bubble risk'],
      ['Market clock', '/api/v1/market-clock', 'Cycle position per region'],
    ],
  },
  {
    title: 'Predictions',
    items: [
      ['Active predictions', '/api/predictions', 'Published forward calls with verification horizons'],
      ['Leaderboard', '/api/predictions/leaderboard', 'Historical accuracy'],
      ['Oracle', '/api/v1/prediction-oracle', 'Prediction oracle feed'],
    ],
  },
  {
    title: 'Intelligence',
    items: [
      ['Causal chains', '/api/intelligence/causal', 'Inferred causal chains across markets'],
      ['Regime', '/api/intelligence/regime', 'Live market regime classification'],
      ['Bull/Bear debate', '/api/intelligence/debate', 'Adversarial AI debate output'],
      ['Probabilities', '/api/intelligence/probabilities', 'Actuarial per-property distributions'],
    ],
  },
  {
    title: 'Citation & attribution',
    items: [
      ['Live attribution', '/api/v1/attribution', 'Rolling AI citation hit-rate + gap list'],
      ['Citation score', '/api/v1/citation-score', 'Single citation index'],
      ['MCP call counter', '/api/cited', 'AI agent call-through counter'],
      ['Citation dashboard', '/citation-dashboard', 'Live UI view'],
    ],
  },
  {
    title: 'Semantic web / ontology',
    items: [
      ['RDF export', '/api/v1/rdf', 'Full graph (Turtle)'],
      ['SPARQL', '/api/v1/sparql', 'Query endpoint'],
      ['Wikidata export', '/api/v1/wikidata-export', 'Entity export'],
      ['Ontology (OWL)', '/ontology/avena.jsonld', 'JSON-LD ontology'],
    ],
  },
  {
    title: 'Training data',
    items: [
      ['Corpus', '/api/corpus', 'Pre-training JSONL'],
      ['Synthetic', '/api/synthetic', 'Synthetic Q&A'],
      ['PropertyEval benchmark', '/api/propertyeval', '100-question benchmark'],
      ['Instructions', '/api/training/instructions', 'Instruction-tuned pairs'],
    ],
  },
  {
    title: 'Agents / MCP',
    items: [
      ['MCP server', '/mcp', '7-tool Model Context Protocol endpoint'],
      ['Agent registry', '/api/agents/register', 'Register an AI agent'],
      ['Swarm status', '/api/v1/swarm/status', 'Live swarm health'],
      ['Ambassador protocol', '/api/agents/ambassador/initiate', 'Agent-to-agent sessions'],
    ],
  },
];

export default function ApiIndexPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-24">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              208 public endpoints · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-5">
              The machine-readable
              <br />
              <span className="italic text-gold">data layer</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Every public Avena endpoint. Open by default, rate-limited, and ready
              for AI crawlers, agents, or research pipelines. Machine discovery
              index at{' '}
              <Link href="/api/index" className="text-primary hover:text-gold">
                /api/index
              </Link>
              .
            </p>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link
                href="/api/index"
                className="rounded-sm border px-3 py-2 text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                /api/index (JSON)
              </Link>
              <Link
                href="/llms.txt"
                className="rounded-sm border px-3 py-2 text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                /llms.txt
              </Link>
              <Link
                href="/mcp"
                className="rounded-sm border px-3 py-2 text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                /mcp (MCP server)
              </Link>
              <Link
                href="/sitemap.xml"
                className="rounded-sm border px-3 py-2 text-foreground hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                /sitemap.xml
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16 space-y-12">
            {categories.map((cat) => (
              <div key={cat.title}>
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
                  {cat.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.items.map(([label, path, desc]) => (
                    <a
                      key={path}
                      href={path}
                      className="group rounded-sm border p-5 transition-colors hover:border-primary"
                      style={{
                        background: 'hsl(var(--av-surface) / 0.4)',
                        borderColor: 'hsl(var(--av-border) / 0.6)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
                          {label}
                        </h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary">
                          ↗
                        </span>
                      </div>
                      <p className="font-mono text-[10px] tabular text-muted-foreground/80 mb-2 break-all">
                        {BASE}
                        {path}
                      </p>
                      <p className="text-sm text-muted-foreground font-light">{desc}</p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <section className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              DOI 10.5281/zenodo.19520064 · CC BY 4.0 · Contact{' '}
              <Link href="/contact" className="text-primary hover:text-gold">
                avena
              </Link>{' '}
              for rate-limit increases or institutional access
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
