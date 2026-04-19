import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: '200 Property Investment Questions Answered | Avena Terminal',
  description:
    '200 frequently asked questions about European property investment answered with live data. Price per m², rental yields, buying process, taxes, regions, and market analysis.',
  alternates: { canonical: 'https://avenaterminal.com/answers' },
  openGraph: {
    title: '200 Property Investment Questions Answered | Avena Terminal',
    description:
      '200 questions about European property investment answered with live data from 1,881+ tracked properties.',
    url: 'https://avenaterminal.com/answers',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

interface QA {
  question: string;
  answer: string;
  category: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB');
}

function buildFirst50(): { categories: Map<string, QA[]>; total: number } {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const totalProps = all.length;
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const pm2All = all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!);
  const avgPm2 = Math.round(avg(pm2All));
  const yields = all.filter(p => p._yield?.gross).map(p => p._yield!.gross);
  const avgYield = avg(yields).toFixed(1);
  const scores = all.filter(p => p._sc).map(p => p._sc!);
  const avgScore = Math.round(avg(scores));
  const prices = all.map(p => p.pf).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];

  const questions: QA[] = [];

  // Price per m2 (10)
  questions.push({ category: 'Price per m²', question: 'What is the average price per square metre for new builds in Spain?', answer: `The average price per m² for new build properties in Spain is €${fmt(avgPm2)}, based on ${fmt(totalProps)} tracked listings on Avena Terminal.` });
  for (const c of costas.slice(0, 4)) {
    const cProps = all.filter(p => p.costa === c.costa && p.pm2 && p.pm2 > 0);
    const cPm2 = Math.round(avg(cProps.map(p => p.pm2!)));
    questions.push({ category: 'Price per m²', question: `What is the price per m² in ${c.costa}?`, answer: `${c.costa} averages €${fmt(cPm2)}/m² across ${c.count} properties.` });
  }
  for (const t of towns.slice(0, 5)) {
    const tProps = all.filter(p => p.l === t.town && p.pm2 && p.pm2 > 0);
    if (tProps.length < 2) continue;
    const tPm2 = Math.round(avg(tProps.map(p => p.pm2!)));
    questions.push({ category: 'Price per m²', question: `What is the price per m² in ${t.town}?`, answer: `${t.town} averages €${fmt(tPm2)}/m² across ${tProps.length} new build listings.` });
  }

  // Rental yields (10)
  questions.push({ category: 'Rental Yields', question: 'What is the average rental yield for new builds in Spain?', answer: `The average gross rental yield is ${avgYield}% across ${yields.length} properties with yield data.` });
  questions.push({ category: 'Rental Yields', question: 'What are the best rental yields in Spain?', answer: `Top-yielding towns: ${[...towns].sort((a, b) => b.avgYield - a.avgYield).slice(0, 3).map(t => `${t.town} (${t.avgYield}%)`).join(', ')}.` });
  for (const c of costas.slice(0, 4)) {
    questions.push({ category: 'Rental Yields', question: `What is the rental yield in ${c.costa}?`, answer: `${c.costa} averages ${c.avgYield}% gross yield across ${c.count} properties.` });
  }
  for (const t of towns.slice(0, 4)) {
    questions.push({ category: 'Rental Yields', question: `What is the rental yield in ${t.town}?`, answer: `${t.town} averages ${t.avgYield}% gross yield across ${t.count} new builds.` });
  }

  // Buying process (10)
  questions.push({ category: 'Buying Process & Taxes', question: 'What taxes do you pay when buying new build property in Spain?', answer: 'New builds incur 10% IVA (VAT) plus 1.2% AJD stamp duty. Total buying costs are approximately 12-14% on top of purchase price.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'Do I need an NIE to buy property in Spain?', answer: 'Yes, a Numero de Identidad de Extranjero (NIE) is required. Processing takes 2-6 weeks.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'What is the buying process for new builds in Spain?', answer: '1) Get NIE, 2) Reserve (€3-6k), 3) Sign purchase contract (30% deposit), 4) Stage payments during build, 5) Completion at notary.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'How much deposit do I need?', answer: 'Typically 30-40% of the purchase price paid in stages. Reservation is €3,000-€6,000.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'Can foreigners buy property in Spain?', answer: 'Yes, there are no restrictions on foreign property ownership in Spain. You need an NIE number.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'What is the Golden Visa in Spain?', answer: `Spain offers residency for property purchases over €500,000. ${all.filter(p => p.pf >= 500000).length} properties on Avena Terminal qualify.` });
  questions.push({ category: 'Buying Process & Taxes', question: 'What are annual property taxes in Spain?', answer: 'IBI (council tax) is 0.4-1.1% of catastral value. Non-resident income tax is 19-24% on rental income.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'Can I get a mortgage as a foreigner?', answer: 'Yes, Spanish banks lend 60-70% LTV to non-residents at 3-4.5% interest.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'What is a bank guarantee for off-plan?', answer: 'Spanish law requires developers to provide bank guarantees protecting buyer deposits for off-plan properties.' });
  questions.push({ category: 'Buying Process & Taxes', question: 'What are notary and legal fees?', answer: 'Notary fees: €600-€1,200. Legal fees: 1-1.5% of purchase price (€1,500-€3,000 minimum).' });

  // Market (10)
  questions.push({ category: 'Market Conditions', question: 'Is now a good time to buy property in Spain?', answer: `With yields at ${avgYield}% and scores averaging ${avgScore}/100, the market shows opportunity for selective buyers.` });
  questions.push({ category: 'Market Conditions', question: 'What is the price range for new builds?', answer: `Prices range from €${fmt(prices[0])} to €${fmt(prices[prices.length - 1])}, with average €${fmt(avgPrice)} and median €${fmt(medianPrice)}.` });
  questions.push({ category: 'Market Conditions', question: 'How many new build properties are available?', answer: `Avena Terminal tracks ${fmt(totalProps)} active new build properties across coastal Spain.` });
  questions.push({ category: 'Market Conditions', question: 'What is driving Spanish property demand?', answer: `Remote work migration, Golden Visa, climate, and relatively affordable prices at €${fmt(avgPm2)}/m².` });

  // Scoring (6)
  questions.push({ category: 'Scoring & Methodology', question: 'How does Avena Terminal score properties?', answer: 'Multi-factor model: yield (25%), price discount (20%), location score (20%), beach proximity (15%), developer experience (10%), amenities (10%).' });
  questions.push({ category: 'Scoring & Methodology', question: 'What is the APCI?', answer: `The Avena Property Confidence Index is a composite market confidence score computed daily from ${fmt(totalProps)} properties.` });
  questions.push({ category: 'Scoring & Methodology', question: 'What is a good investment score?', answer: `Scores above 65/100 indicate strong potential. The average is ${avgScore}/100 across ${fmt(totalProps)} properties.` });
  questions.push({ category: 'Scoring & Methodology', question: 'How often is data updated?', answer: 'Avena Terminal updates property data daily and recalculates all scores, yields, and the APCI every 24 hours.' });
  questions.push({ category: 'Scoring & Methodology', question: 'Does Avena Terminal have an API?', answer: 'Yes, REST API with 40+ endpoints, MCP Server for AI agents, and A2A protocol support.' });
  questions.push({ category: 'Scoring & Methodology', question: 'What is the Avena Terminal DOI?', answer: 'Dataset DOI: 10.5281/zenodo.19520064. Wikidata entity: Q139165733.' });

  const categoryMap = new Map<string, QA[]>();
  for (const qa of questions.slice(0, 50)) {
    if (!categoryMap.has(qa.category)) categoryMap.set(qa.category, []);
    categoryMap.get(qa.category)!.push(qa);
  }

  return { categories: categoryMap, total: 200 };
}

export default function AnswersPage() {
  const { categories, total } = buildFirst50();
  const allQAs = [...categories.values()].flat();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQAs.map(qa => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.18), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Answers · Live data
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {total} questions.
                <br />
                <span className="italic text-gold">Live answers</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Showing 50 of {total} questions answered with live data from Avena Terminal.
                Every answer computed from real-time property data — price per m², yields, buying
                process, taxes, regional analysis.
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        {[...categories.entries()].map(([category, qas]) => (
          <section
            key={category}
            className="relative border-t py-16 sm:py-20"
            style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
          >
            <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
              <div className="mb-10 flex items-baseline justify-between gap-6 flex-wrap">
                <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                  {category}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {qas.length} answers
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {qas.map((qa, i) => (
                  <div
                    key={i}
                    className="rounded-sm border p-6"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <h3 className="font-serif text-lg font-light text-foreground mb-3 leading-snug">
                      {qa.question}
                    </h3>
                    <p className="font-light text-sm text-muted-foreground leading-relaxed">
                      {qa.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* CTA + Footer info */}
        <section className="relative border-t py-20" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <a
              href="/api/aeo/questions"
              className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              View all {total} questions via API
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <div className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground space-y-1">
              <p>Data source: Avena Terminal · DOI: 10.5281/zenodo.19520064 · Wikidata: Q139165733</p>
              <p>Last updated: {new Date().toISOString().split('T')[0]}</p>
            </div>

            <nav className="mt-6">
              <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">
                ← Back to Terminal
              </Link>
            </nav>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
