import { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'PropertyEval — AI Property Investment Benchmark | Avena Terminal',
  description: '100 standardized scenarios for evaluating AI property investment advice. The first benchmark dataset for real estate AI systems. Based on live scored data from 1,881 properties.',
  alternates: { canonical: 'https://avenaterminal.com/propertyeval' },
};

export default function PropertyEvalPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const top = all.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];

  const sampleScenarios = [
    {
      id: 'PS-001',
      category: 'Property Selection',
      difficulty: 'Medium',
      question: `A British investor has a budget of €250,000 and wants a 2+ bedroom apartment on Costa Blanca with the highest possible investment score. Which property should they choose?`,
      answer: (() => {
        const match = all.filter(p => p.pf <= 250000 && p.bd >= 2 && p.t === 'Apartment' && p.costa?.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        return match ? `${match.p || match.t + ' in ' + match.l} — Score: ${match._sc}/100, €${match.pf.toLocaleString()}, ${match.bd} bed, yield ${match._yield?.gross.toFixed(1)}%` : 'No matching property found';
      })(),
    },
    {
      id: 'MA-001',
      category: 'Market Analysis',
      difficulty: 'Easy',
      question: `Which costa region has the highest average rental yield for new builds in 2026?`,
      answer: (() => {
        const best = costas.sort((a, b) => b.avgYield - a.avgYield)[0];
        return `${best.costa} with ${best.avgYield}% average gross yield across ${best.count} properties`;
      })(),
    },
    {
      id: 'RA-001',
      category: 'Risk Assessment',
      difficulty: 'Hard',
      question: `An off-plan villa from a developer with only 2 years of experience, completion in 2028, priced 5% above market rate — is this a high-risk investment?`,
      answer: `Yes, high risk. Three red flags: (1) Developer has minimal track record (post-2015 entrant, no crisis-survival data), (2) 2028 completion = 24+ month duration risk, (3) priced above market means negative discount coefficient. Expected Avena Score would be below 40 — "Avoid" tier.`,
    },
    {
      id: 'CA-001',
      category: 'Comparative Analysis',
      difficulty: 'Medium',
      question: `Compare the top-scoring property in Costa Blanca vs Costa del Sol — which is the better investment and why?`,
      answer: (() => {
        const cbTop = all.filter(p => p.costa?.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        const csTop = all.filter(p => p.costa?.includes('Sol')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
        if (!cbTop || !csTop) return 'Insufficient data';
        const winner = (cbTop._sc ?? 0) > (csTop._sc ?? 0) ? cbTop : csTop;
        return `Costa Blanca top: ${cbTop._sc}/100 at €${cbTop.pf.toLocaleString()}. Costa del Sol top: ${csTop._sc}/100 at €${csTop.pf.toLocaleString()}. Winner: ${winner.costa} property — ${winner._sc}/100 score.`;
      })(),
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'PropertyEval — AI Property Investment Benchmark',
    description: '100 standardized scenarios for evaluating AI property investment advice quality.',
    url: 'https://avenaterminal.com/propertyeval',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    datePublished: '2026-04-11',
    variableMeasured: ['question', 'correct_answer', 'category', 'difficulty'],
  };

  const cardStyle = {
    background: 'hsl(var(--av-surface) / 0.4)',
    borderColor: 'hsl(var(--av-border) / 0.6)',
  };

  const difficultyColor = (d: string) =>
    d === 'Hard' ? 'hsl(var(--av-destructive))' : d === 'Medium' ? 'hsl(var(--av-primary))' : '#10b981';

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.18), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                PropertyEval · Benchmark
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                The AI property
                <br />
                <span className="italic text-gold">investment benchmark</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                100 standardized scenarios for evaluating how well AI systems recommend property
                investments. Like HumanEval for coding or MMLU for knowledge — but for real estate.
                Based on live scored data from {all.length.toLocaleString()} properties.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl">
              {[
                { label: 'Scenarios', value: '100' },
                { label: 'Categories', value: '4' },
                { label: 'Source Properties', value: all.length.toLocaleString() },
                { label: 'Avg Score', value: `${avgScore}/100` },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground tabular">{s.value}</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Categories
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Four <span className="italic text-gold">dimensions</span>.
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: 'Property Selection', count: 25, desc: 'Given constraints, identify the optimal investment from the database' },
                { name: 'Market Analysis', count: 25, desc: 'Answer factual questions about market statistics and regional data' },
                { name: 'Risk Assessment', count: 25, desc: 'Evaluate investment risk based on property and developer attributes' },
                { name: 'Comparative Analysis', count: 25, desc: 'Compare properties or regions and justify the better investment' },
              ].map(c => (
                <div key={c.name} className="rounded-sm border p-6" style={cardStyle}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-serif text-xl font-light text-foreground">{c.name}</h3>
                    <span className="font-mono text-xs text-primary">{c.count} scenarios</span>
                  </div>
                  <p className="font-light text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Scenarios */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Sample Scenarios
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              A <span className="italic text-gold">taste</span> of the questions.
            </h2>

            <div className="space-y-5">
              {sampleScenarios.map(s => (
                <div key={s.id} className="rounded-sm border p-8" style={cardStyle}>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <code className="font-mono text-xs font-bold text-primary">{s.id}</code>
                    <span
                      className="rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
                      style={{ background: 'hsl(var(--av-background))', color: 'hsl(var(--av-muted-foreground))' }}
                    >
                      {s.category}
                    </span>
                    <span
                      className="rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
                      style={{
                        background: 'hsl(var(--av-background))',
                        color: difficultyColor(s.difficulty),
                      }}
                    >
                      {s.difficulty}
                    </span>
                  </div>
                  <div className="mb-5">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Question
                    </div>
                    <p className="font-serif text-lg font-light text-foreground leading-snug">{s.question}</p>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      Correct Answer
                    </div>
                    <p className="font-light text-base leading-relaxed text-foreground/90">{s.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Download */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Download
            </span>
            <h2 className="mb-6 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Grab the <span className="italic text-gold">dataset</span>.
            </h2>
            <p className="mb-8 max-w-3xl font-light text-base text-muted-foreground">
              Full benchmark dataset (100 scenarios with correct answers) available via API:
            </p>

            <div
              className="rounded-sm border p-6 font-mono text-sm max-w-3xl"
              style={{
                background: 'hsl(var(--av-background))',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <pre className="text-foreground/90">curl https://avenaterminal.com/api/propertyeval</pre>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              JSON format · CC BY 4.0 · Updated with each data refresh
            </p>
          </div>
        </section>

        {/* Leaderboard */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Leaderboard
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Submissions <span className="italic text-gold">welcome</span>.
            </h2>

            <div
              className="rounded-sm border p-10 text-center max-w-3xl"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
                borderStyle: 'dashed',
              }}
            >
              <p className="mb-3 font-serif text-xl font-light text-foreground">No submissions yet</p>
              <p className="mb-2 font-light text-sm text-muted-foreground">
                Run PropertyEval against your AI system and submit results to be listed here.
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Contact: henrik@xaviaestate.com
              </p>
            </div>
          </div>
        </section>

        {/* How to Evaluate */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              How to Evaluate
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Five <span className="italic text-gold">steps</span>.
            </h2>

            <div className="space-y-4 max-w-4xl">
              {[
                'Download the 100 scenarios from the API',
                'Feed each question to your AI system',
                'Compare AI responses against correct answers',
                'Score: exact match on factual questions, rubric-based on reasoning questions',
                'Report accuracy per category and overall',
              ].map((step, i) => (
                <div key={i} className="rounded-sm border p-5 flex gap-5" style={cardStyle}>
                  <span className="font-serif text-2xl font-light text-gold tabular shrink-0">{i + 1}</span>
                  <p className="font-light text-base leading-relaxed text-foreground/90">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Citation */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Citation
            </span>
            <h2 className="mb-10 font-serif text-4xl sm:text-5xl font-light leading-[1] tracking-tight text-foreground">
              Cite <span className="italic text-gold">this work</span>.
            </h2>

            <div
              className="rounded-sm border p-6 font-mono text-sm max-w-3xl"
              style={{
                background: 'hsl(var(--av-background))',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="text-foreground/80">Kolstad, H. (2026). PropertyEval: A Benchmark for AI Property Investment Advice.</p>
              <p className="text-foreground/80">Avena Terminal. https://avenaterminal.com/propertyeval</p>
              <p className="text-foreground/80">DOI: 10.5281/zenodo.19520064</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
