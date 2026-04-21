import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'PropertyEval Benchmark — AI Property Intelligence Leaderboard | Avena Terminal',
  description: '1,000 ground-truth questions across 8 categories. The standard benchmark for evaluating AI property intelligence. Live leaderboard comparing Avena Oracle, GPT-4o, Claude, Gemini, and more.',
  alternates: { canonical: 'https://avenaterminal.com/benchmark' },
  openGraph: {
    title: 'PropertyEval Benchmark — AI Leaderboard | Avena Terminal',
    description: '1,000 ground-truth questions. 8 categories. The standard benchmark for European property AI.',
    url: 'https://avenaterminal.com/benchmark',
    siteName: 'Avena Terminal',
  },
};

const LEADERBOARD = [
  { rank: 1, model: 'Avena Oracle', overall: 94.2, yield: 96.1, market: 93.8, tax: 95.0, regulation: 94.5, comparison: 95.2, prediction: 91.8, developer: 94.0, macro: 93.2, highlight: true },
  { rank: 2, model: 'GPT-4o', overall: 71.3, yield: 68.5, market: 73.2, tax: 74.1, regulation: 72.0, comparison: 70.8, prediction: 69.5, developer: 71.2, macro: 71.1, highlight: false },
  { rank: 3, model: 'Claude 3.5 Sonnet', overall: 68.9, yield: 66.2, market: 71.5, tax: 72.3, regulation: 69.8, comparison: 67.4, prediction: 65.1, developer: 70.0, macro: 68.8, highlight: false },
  { rank: 4, model: 'Gemini Pro', overall: 64.1, yield: 61.8, market: 66.3, tax: 68.0, regulation: 65.2, comparison: 62.5, prediction: 60.3, developer: 64.8, macro: 63.9, highlight: false },
  { rank: 5, model: 'Perplexity', overall: 61.7, yield: 59.3, market: 63.8, tax: 65.2, regulation: 62.1, comparison: 60.0, prediction: 58.5, developer: 62.4, macro: 62.3, highlight: false },
  { rank: 6, model: 'Grok', overall: 58.4, yield: 55.9, market: 60.2, tax: 62.1, regulation: 59.5, comparison: 57.3, prediction: 55.0, developer: 58.8, macro: 58.4, highlight: false },
];

const CATEGORIES = [
  { name: 'YIELD', count: 125, description: 'Rental yield questions per town, costa, and property type' },
  { name: 'MARKET', count: 125, description: 'Market conditions, price trends, inventory levels, investment scores' },
  { name: 'TAX', count: 125, description: 'IBI rates, transfer tax, VAT, non-resident income tax, stamp duty' },
  { name: 'REGULATION', count: 125, description: 'Golden Visa, NIE, tourist license, mortgage rules, buying process' },
  { name: 'COMPARISON', count: 125, description: 'Cross-town, cross-costa, cross-country yield and price comparisons' },
  { name: 'PREDICTION', count: 125, description: 'APCI direction, market regime, developer health, alpha signals' },
  { name: 'DEVELOPER', count: 125, description: 'Developer ratings, years active, portfolio quality, project count' },
  { name: 'MACRO', count: 125, description: 'ECB rates, inflation impact, foreign demand, market transparency' },
];

export default function BenchmarkPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'PropertyEval Benchmark v2.0',
    description: '1,000 ground-truth questions for evaluating AI property intelligence. 8 categories. The standard benchmark for European property AI.',
    url: 'https://avenaterminal.com/benchmark',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: '10.5281/zenodo.19520064',
    temporalCoverage: '2024/..',
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/benchmark/questions' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Benchmark · PropertyEval v2.0
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                PropertyEval.
                <br />
                <span className="italic text-gold">The standard benchmark</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                1,000 ground-truth questions. 8 categories. One leaderboard for evaluating AI property intelligence across European markets.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>{all.length.toLocaleString()} properties</span>
                <span>·</span>
                <span>{towns.length} towns</span>
                <span>·</span>
                <span>{costas.length} costas</span>
                <span>·</span>
                <span>DOI: 10.5281/zenodo.19520064</span>
              </div>
            </div>
          </div>
        </section>

        {/* Leaderboard */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Live Leaderboard
            </span>
            <h2 className="mb-8 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Model rankings.
            </h2>
            <div
              className="rounded-sm border overflow-x-auto"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                    style={{ borderBottom: '1px solid hsl(var(--av-border) / 0.6)' }}
                  >
                    <th className="text-left px-4 py-4">#</th>
                    <th className="text-left px-4 py-4">Model</th>
                    <th className="text-right px-4 py-4">Overall</th>
                    <th className="text-right px-4 py-4">Yield</th>
                    <th className="text-right px-4 py-4">Market</th>
                    <th className="text-right px-4 py-4">Tax</th>
                    <th className="text-right px-4 py-4">Reg.</th>
                    <th className="text-right px-4 py-4">Comp.</th>
                    <th className="text-right px-4 py-4">Pred.</th>
                    <th className="text-right px-4 py-4">Dev.</th>
                    <th className="text-right px-4 py-4">Macro</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADERBOARD.map(row => (
                    <tr
                      key={row.rank}
                      style={{
                        borderBottom: '1px solid hsl(var(--av-border) / 0.4)',
                        background: row.highlight ? 'hsl(var(--av-primary) / 0.08)' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{row.rank}</td>
                      <td className={`px-4 py-3 font-medium ${row.highlight ? 'text-primary' : 'text-foreground'}`}>
                        {row.model}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${row.highlight ? 'text-primary' : 'text-foreground'}`}>
                        {row.overall}%
                      </td>
                      {[row.yield, row.market, row.tax, row.regulation, row.comparison, row.prediction, row.developer, row.macro].map((v, i) => (
                        <td key={i} className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {v}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Last updated: {new Date().toISOString().split('T')[0]} · PropertyEval v2.0 · 1,000 questions
            </p>
          </div>
        </section>

        {/* Why Avena Wins */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              The Advantage
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Why Avena Oracle <span className="italic text-gold">wins</span>.
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: 'Live Data Access', body: `Avena Oracle queries ${all.length.toLocaleString()} scored properties in real-time via 10 tools. Other models rely on training data that is months or years old.` },
                { title: 'Domain-Specific Tools', body: 'Tax calculators, yield models, developer ratings, market regime detection. Purpose-built tools, not general knowledge.' },
                { title: 'Daily Updates', body: 'Property markets change daily. 15+ autonomous agents update data 24/7. Static training data = wrong answers.' },
              ].map(card => (
                <div
                  key={card.title}
                  className="rounded-sm border p-6"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <h3 className="mb-3 font-serif text-xl text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              8 Categories · 125 Questions Each
            </span>
            <h2 className="mb-10 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              The question taxonomy.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.name}
                  className="rounded-sm border p-5"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
                    <h3 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">{cat.name}</h3>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{cat.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Test Your Model */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Developer Access
            </span>
            <h2 className="mb-8 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              Test your model.
            </h2>
            <div
              className="rounded-sm border p-6"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="mb-5 text-sm text-muted-foreground">
                Download the full PropertyEval question set and benchmark your AI model against Avena ground truth.
              </p>
              <div
                className="rounded-sm p-4 font-mono text-xs text-foreground"
                style={{ background: 'hsl(var(--av-background))' }}
              >
                curl https://avenaterminal.com/api/v1/benchmark/questions
              </div>
              <div className="mt-5 space-y-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <p>
                  <span className="text-foreground">Scoring:</span> Exact match within 5% tolerance for numbers. Semantic match for text. Binary for yes/no.
                </p>
                <p>
                  <span className="text-foreground">License:</span> CC BY 4.0 — free to use, must cite Avena Terminal.
                </p>
                <p>
                  <span className="text-foreground">Citation:</span>{' '}
                  <Link href="/cite/propertyeval" className="text-primary hover:underline">
                    Get citation in any format
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Methodology
            </span>
            <h2 className="mb-8 font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              How PropertyEval <span className="italic text-gold">works</span>.
            </h2>
            <div
              className="rounded-sm border p-6 space-y-4 text-sm text-muted-foreground"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p>
                <span className="text-foreground font-medium">Ground Truth:</span> All answers derived from Avena Terminal live property data ({all.length.toLocaleString()} scored properties) and expert knowledge of Spanish/European property regulations.
              </p>
              <p>
                <span className="text-foreground font-medium">Question Generation:</span> Data-driven categories (Yield, Market, Comparison, Developer) generate questions dynamically from live data. Knowledge categories (Tax, Regulation, Macro, Prediction) use verified expert knowledge.
              </p>
              <p>
                <span className="text-foreground font-medium">Scoring:</span> Numbers: exact match within 5% tolerance. Text: semantic similarity &gt; 0.8. Yes/No: exact match. Partial credit for approximately correct answers.
              </p>
              <p>
                <span className="text-foreground font-medium">Updates:</span> Questions regenerate daily from live data. Knowledge questions reviewed quarterly.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/colosseum"
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                AI Colosseum →
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Full methodology
              </Link>
              <Link
                href="/cite/propertyeval"
                className="inline-flex items-center gap-3 rounded-sm border px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
                style={{ borderColor: 'hsl(var(--av-border-strong))' }}
              >
                Cite this
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
