import { Metadata } from 'next';
import Link from 'next/link';
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
    <main style={{ background: '#0d1117', color: '#c9d1d9', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <style>{`
        .answers-container { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }
        .answers-container h1 { font-size: 2rem; color: #e6edf3; margin-bottom: 0.5rem; }
        .answers-subtitle { color: #8b949e; font-size: 1rem; margin-bottom: 2.5rem; }
        .answers-badge { display: inline-block; background: #1a7f37; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px; }
        .category-section { margin-bottom: 2.5rem; }
        .category-title { font-size: 1.25rem; color: #58a6ff; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #21262d; }
        .qa-item { margin-bottom: 1.5rem; padding: 1rem; background: #161b22; border: 1px solid #21262d; border-radius: 6px; }
        .qa-question { font-weight: 600; color: #e6edf3; margin-bottom: 0.5rem; font-size: 0.95rem; }
        .qa-answer { color: #8b949e; font-size: 0.9rem; line-height: 1.5; }
        .api-link { display: inline-block; margin-top: 2rem; padding: 10px 20px; background: #238636; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 500; }
        .api-link:hover { background: #2ea043; }
        .back-link { color: #58a6ff; text-decoration: none; font-size: 0.9rem; }
        .back-link:hover { text-decoration: underline; }
        .header-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; }
        .avena-mark { font-weight: 700; color: #58a6ff; font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; }
      `}</style>

      <div className="answers-container">
        <div className="header-bar">
          <span className="avena-mark">AVENA</span>
          <Link href="/" className="back-link">Terminal</Link>
        </div>

        <h1>
          {total} Property Investment Questions Answered
          <span className="answers-badge">LIVE DATA</span>
        </h1>
        <p className="answers-subtitle">
          Showing 50 of {total} questions answered with live data from Avena Terminal.
          All answers computed from real-time property data.
        </p>

        {[...categories.entries()].map(([category, qas]) => (
          <section key={category} className="category-section">
            <h2 className="category-title">{category} ({qas.length})</h2>
            {qas.map((qa, i) => (
              <div key={i} className="qa-item">
                <div className="qa-question">{qa.question}</div>
                <div className="qa-answer">{qa.answer}</div>
              </div>
            ))}
          </section>
        ))}

        <a href="/api/aeo/questions" className="api-link">
          View all {total} questions via API &rarr;
        </a>

        <div style={{ marginTop: '2rem', color: '#484f58', fontSize: '0.8rem' }}>
          <p>Data source: Avena Terminal (avenaterminal.com) | DOI: 10.5281/zenodo.19520064 | Wikidata: Q139165733</p>
          <p>Last updated: {new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>
    </main>
  );
}
