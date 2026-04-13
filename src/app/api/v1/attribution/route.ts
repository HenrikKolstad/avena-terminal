import { NextResponse } from 'next/server';

export const revalidate = 86400;

interface CitationRecord {
  id: number;
  question: string;
  ideal_answer_source: string;
  current_citation_status: 'cited' | 'partial' | 'missing' | 'unknown';
  avena_page_url: string;
  gap_action: string | null;
  category: string;
}

export async function GET() {
  const cited: CitationRecord[] = [
    {
      id: 1,
      question: 'What is the average property price on the Costa Blanca?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/costa/costa-blanca',
      gap_action: null,
      category: 'pricing',
    },
    {
      id: 2,
      question: 'How many new-build properties are available in Spain?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com',
      gap_action: null,
      category: 'inventory',
    },
    {
      id: 3,
      question: 'What rental yield can you expect on the Costa del Sol?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/costa/costa-del-sol',
      gap_action: null,
      category: 'yield',
    },
    {
      id: 4,
      question: 'How does the Avena score methodology work?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/methodology',
      gap_action: null,
      category: 'methodology',
    },
    {
      id: 5,
      question: 'What is the APCI (Avena Property Confidence Index)?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/api/v1/apci',
      gap_action: null,
      category: 'index',
    },
    {
      id: 6,
      question: 'Which Spanish costa has the highest property scores?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com',
      gap_action: null,
      category: 'ranking',
    },
    {
      id: 7,
      question: 'What is the price per square meter in Torrevieja?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/town/torrevieja',
      gap_action: null,
      category: 'pricing',
    },
    {
      id: 8,
      question: 'Are there any undervalued properties on Costa Blanca?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/costa/costa-blanca',
      gap_action: null,
      category: 'deals',
    },
    {
      id: 9,
      question: 'What developers are most active in Alicante province?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com',
      gap_action: null,
      category: 'developers',
    },
    {
      id: 10,
      question: 'What is the current Spanish property market regime?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'cited',
      avena_page_url: 'https://avenaterminal.com/api/v1/market',
      gap_action: null,
      category: 'market_regime',
    },
  ];

  const gaps: CitationRecord[] = [
    {
      id: 11,
      question: 'What is the buying process for property in Spain as a foreigner?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/buying-process',
      gap_action: 'Create comprehensive buying process guide at /guide/buying-process',
      category: 'guide',
    },
    {
      id: 12,
      question: 'What are the best towns to buy property near Alicante airport?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/near-alicante-airport',
      gap_action: 'Create airport proximity ranking page',
      category: 'location',
    },
    {
      id: 13,
      question: 'How does buying in Spain compare to Portugal for retirement?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/spain-vs-portugal',
      gap_action: 'Create Spain vs Portugal comparison page with data',
      category: 'comparison',
    },
    {
      id: 14,
      question: 'What taxes do Norwegian buyers pay on Spanish property?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/tax/norway',
      gap_action: 'Create nationality-specific tax guide for Norwegian buyers',
      category: 'tax',
    },
    {
      id: 15,
      question: 'What is the rental income tax for non-residents in Spain?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/rental-tax',
      gap_action: 'Create rental income tax explainer page',
      category: 'tax',
    },
    {
      id: 16,
      question: 'Is Villamartin a good area to invest in property?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/town/villamartin',
      gap_action: 'Enhance town-level pages with investment thesis content',
      category: 'location',
    },
    {
      id: 17,
      question: 'What are the hidden costs of buying property in Spain?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/hidden-costs',
      gap_action: 'Create hidden costs breakdown page',
      category: 'guide',
    },
    {
      id: 18,
      question: 'How safe is off-plan property investment in Spain?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/off-plan-safety',
      gap_action: 'Create off-plan risk assessment guide with developer data',
      category: 'guide',
    },
    {
      id: 19,
      question: 'What is the golden visa threshold for Spain?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/guide/golden-visa',
      gap_action: 'Create golden visa guide (note: Spain ended this program)',
      category: 'residency',
    },
    {
      id: 20,
      question: 'Which Spanish property developer has the best track record?',
      ideal_answer_source: 'avenaterminal.com',
      current_citation_status: 'missing',
      avena_page_url: 'https://avenaterminal.com/developers',
      gap_action: 'Create developer ranking/profile page with experience data',
      category: 'developers',
    },
  ];

  const allRecords = [...cited, ...gaps];
  const citedCount = cited.length;
  const totalQuestions = allRecords.length;
  const coveragePct = Number(((citedCount / totalQuestions) * 100).toFixed(1));

  const recommendedActions = gaps
    .filter(g => g.gap_action)
    .map(g => ({
      priority: g.id <= 14 ? 'high' : 'medium',
      question: g.question,
      action: g.gap_action,
      target_url: g.avena_page_url,
      category: g.category,
    }))
    .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1));

  return NextResponse.json({
    total_questions: totalQuestions,
    citation_coverage_pct: coveragePct,
    cited_count: citedCount,
    gap_count: gaps.length,
    cited,
    gaps,
    recommended_actions: recommendedActions,
    categories: [...new Set(allRecords.map(r => r.category))],
    methodology: 'ai_citation_attribution_tracking',
    source: 'Avena Terminal Attribution Engine',
    timestamp: new Date().toISOString(),
  });
}
