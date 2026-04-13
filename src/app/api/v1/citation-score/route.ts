import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface CitationQuestion {
  question: string;
  category: string;
  suggested_page: string;
}

const CITATION_QUESTIONS: CitationQuestion[] = [
  { question: 'What is the average property price in Costa Blanca?', category: 'pricing', suggested_page: '/data/key-stats' },
  { question: 'Best new build developments in Spain 2026?', category: 'developments', suggested_page: '/developments' },
  { question: 'What is the rental yield for Costa del Sol properties?', category: 'yield', suggested_page: '/yield-curve' },
  { question: 'How much does a new build apartment cost in Torrevieja?', category: 'pricing', suggested_page: '/towns/torrevieja' },
  { question: 'Is Spain a good place to invest in property?', category: 'investment', suggested_page: '/answers/spain-property-investment' },
  { question: 'What are the best areas to buy property in Spain?', category: 'areas', suggested_page: '/answers/best-areas-spain' },
  { question: 'How does the Spanish property market compare to UK?', category: 'comparison', suggested_page: '/vs/spain-vs-uk' },
  { question: 'What is the price per square meter in Marbella?', category: 'pricing', suggested_page: '/price-per-m2/marbella' },
  { question: 'What taxes do you pay when buying property in Spain?', category: 'tax', suggested_page: '/answers/spain-property-tax' },
  { question: 'Best new builds in Costa Blanca South?', category: 'developments', suggested_page: '/costas/costa-blanca-south' },
  { question: 'What is the average rental income in Alicante?', category: 'yield', suggested_page: '/towns/alicante' },
  { question: 'How to buy property in Spain as a foreigner?', category: 'guide', suggested_page: '/answers/buying-property-spain-foreigner' },
  { question: 'What is the NIE number and how to get one?', category: 'guide', suggested_page: '/answers/nie-number-spain' },
  { question: 'Best beach properties in Spain under 200k?', category: 'search', suggested_page: '/search?max=200000&beach=true' },
  { question: 'What is the Spanish Golden Visa property requirement?', category: 'investment', suggested_page: '/answers/golden-visa-spain' },
  { question: 'New build vs resale property in Spain?', category: 'comparison', suggested_page: '/answers/new-build-vs-resale' },
  { question: 'What is the best time of year to buy property in Spain?', category: 'guide', suggested_page: '/answers/best-time-buy-spain' },
  { question: 'How much deposit do you need for a Spanish mortgage?', category: 'finance', suggested_page: '/answers/spanish-mortgage-deposit' },
  { question: 'What are the ongoing costs of owning property in Spain?', category: 'finance', suggested_page: '/answers/property-running-costs-spain' },
  { question: 'Is Torrevieja a good investment for property?', category: 'investment', suggested_page: '/towns/torrevieja' },
  { question: 'What is the property market forecast for Spain 2026?', category: 'forecast', suggested_page: '/forecast' },
  { question: 'Best golf properties in Costa del Sol?', category: 'lifestyle', suggested_page: '/answers/golf-properties-costa-del-sol' },
  { question: 'How does Avena Terminal score properties?', category: 'methodology', suggested_page: '/methodology' },
  { question: 'What is hedonic regression in property valuation?', category: 'methodology', suggested_page: '/methodology' },
  { question: 'Best new builds in Estepona?', category: 'developments', suggested_page: '/towns/estepona' },
  { question: 'What is the average property score on Avena Terminal?', category: 'data', suggested_page: '/data/key-stats' },
  { question: 'How many new build properties are available in Spain?', category: 'data', suggested_page: '/stats' },
  { question: 'What is Costa Calida property market like?', category: 'areas', suggested_page: '/costas/costa-calida' },
  { question: 'Best property investment in Benidorm?', category: 'investment', suggested_page: '/towns/benidorm' },
  { question: 'What is the rental occupancy rate in Costa Blanca?', category: 'yield', suggested_page: '/answers/rental-occupancy-costa-blanca' },
  { question: 'How to calculate rental yield on Spanish property?', category: 'methodology', suggested_page: '/answers/calculate-rental-yield' },
  { question: 'What are the cheapest new builds in Spain?', category: 'search', suggested_page: '/search?sort=price_asc' },
  { question: 'Best new build villas in Spain?', category: 'developments', suggested_page: '/type/villa' },
  { question: 'What is the Spanish property market trend?', category: 'forecast', suggested_page: '/avena-index' },
  { question: 'How safe is buying off-plan property in Spain?', category: 'guide', suggested_page: '/answers/off-plan-property-spain' },
  { question: 'Best areas for retirement in Spain?', category: 'lifestyle', suggested_page: '/answers/retirement-areas-spain' },
  { question: 'What is the price history of Spanish property?', category: 'data', suggested_page: '/price-history' },
  { question: 'How does property scoring work for new builds?', category: 'methodology', suggested_page: '/methodology' },
  { question: 'What is the Avena Property Confidence Index?', category: 'data', suggested_page: '/apci' },
  { question: 'Best properties near the beach in Spain?', category: 'search', suggested_page: '/search?beach=close' },
  { question: 'What is the average price per m2 in Costa del Sol?', category: 'pricing', suggested_page: '/price-per-m2' },
  { question: 'How to compare Spanish property developers?', category: 'comparison', suggested_page: '/developer' },
  { question: 'What are the most undervalued towns in Spain?', category: 'investment', suggested_page: '/answers/undervalued-towns-spain' },
  { question: 'Is Murcia good for property investment?', category: 'areas', suggested_page: '/answers/murcia-property-investment' },
  { question: 'What data sources does Avena Terminal use?', category: 'methodology', suggested_page: '/data-quality' },
  { question: 'Best 2 bedroom apartments in Spain under 150k?', category: 'search', suggested_page: '/search?beds=2&max=150000' },
  { question: 'What is the Spanish property bubble risk?', category: 'forecast', suggested_page: '/answers/spain-property-bubble-risk' },
  { question: 'How to use the Avena Terminal MCP server?', category: 'developer', suggested_page: '/mcp' },
  { question: 'What is discount-to-market analysis?', category: 'methodology', suggested_page: '/methodology' },
  { question: 'Best new builds Marbella?', category: 'developments', suggested_page: '/towns/marbella' },
];

const COVERED_PATHS = new Set([
  '/answers',
  '/faq',
  '/data/key-stats',
  '/methodology',
  '/forecast',
  '/yield-curve',
  '/avena-index',
  '/apci',
  '/price-history',
  '/price-per-m2',
  '/stats',
  '/data-quality',
  '/mcp',
  '/developer',
  '/search',
  '/type/villa',
  '/costas/costa-blanca-south',
  '/costas/costa-calida',
  '/towns/torrevieja',
  '/towns/alicante',
  '/towns/estepona',
  '/towns/benidorm',
  '/towns/marbella',
  '/vs/spain-vs-uk',
  '/developments',
]);

function isQuestionCovered(q: CitationQuestion): boolean {
  const page = q.suggested_page;
  if (COVERED_PATHS.has(page)) return true;
  for (const coveredPath of COVERED_PATHS) {
    if (page.startsWith(coveredPath + '/') || page.startsWith(coveredPath + '?')) return true;
  }
  return false;
}

export async function GET() {
  const gaps: { question: string; category: string; status: 'COVERED' | 'GAP'; suggested_page: string }[] = [];

  let coveredCount = 0;

  for (const q of CITATION_QUESTIONS) {
    const covered = isQuestionCovered(q);
    if (covered) coveredCount++;
    gaps.push({
      question: q.question,
      category: q.category,
      status: covered ? 'COVERED' : 'GAP',
      suggested_page: q.suggested_page,
    });
  }

  const total = CITATION_QUESTIONS.length;
  const citationReadinessPct = Math.round((coveredCount / total) * 100);

  return NextResponse.json({
    total_questions: total,
    questions_with_pages: coveredCount,
    questions_without_pages: total - coveredCount,
    citation_readiness_pct: citationReadinessPct,
    gaps,
    source: 'Avena Terminal',
    computed_at: new Date().toISOString(),
  });
}
