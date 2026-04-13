import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

type Sentiment = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
type SignalType = 'PRICE' | 'DEMAND' | 'SUPPLY' | 'REGULATION' | 'MACRO';
type Urgency = 'BREAKING' | 'STANDARD' | 'BACKGROUND';

interface NewsItem {
  id: string;
  country: string;
  title: string;
  summary: string;
  sentiment: Sentiment;
  signal_type: SignalType;
  source: string;
  date: string;
  urgency: Urgency;
  avena_relevance: number;
}

const NEWS_ITEMS: NewsItem[] = [
  // Spain (4)
  {
    id: 'eu-news-001',
    country: 'es',
    title: 'Spanish coastal property prices surge 8.3% as northern European demand intensifies',
    summary: 'Average prices along the Costa del Sol and Costa Blanca have risen sharply driven by record-level foreign buyer activity. Scandinavian and British buyers account for the largest share of new transactions.',
    sentiment: 'BULLISH',
    signal_type: 'PRICE',
    source: 'Idealista Market Report',
    date: '2026-04-10',
    urgency: 'STANDARD',
    avena_relevance: 95,
  },
  {
    id: 'eu-news-002',
    country: 'es',
    title: 'ECB holds rates steady at 2.5%, Spanish mortgage market remains competitive',
    summary: 'The European Central Bank maintained its benchmark rate, keeping Spanish variable mortgage rates near historic lows. Fixed-rate products remain available below 3% for qualified buyers.',
    sentiment: 'BULLISH',
    signal_type: 'MACRO',
    source: 'ECB Press Conference',
    date: '2026-04-08',
    urgency: 'BREAKING',
    avena_relevance: 88,
  },
  {
    id: 'eu-news-003',
    country: 'es',
    title: 'Major new-build development approved for Estepona beachfront with 450 units',
    summary: 'Planning permission granted for a large-scale residential complex on the Estepona coast. The development will include premium apartments and penthouses targeting international buyers.',
    sentiment: 'BULLISH',
    signal_type: 'SUPPLY',
    source: 'Ayuntamiento de Estepona',
    date: '2026-04-05',
    urgency: 'STANDARD',
    avena_relevance: 82,
  },
  {
    id: 'eu-news-004',
    country: 'es',
    title: 'Spain introduces new short-term rental registration requirements nationwide',
    summary: 'The Spanish government has finalized regulations requiring all tourist rental properties to register on a national platform. Existing operators have six months to comply with the new rules.',
    sentiment: 'NEUTRAL',
    signal_type: 'REGULATION',
    source: 'BOE Official Gazette',
    date: '2026-04-02',
    urgency: 'STANDARD',
    avena_relevance: 78,
  },
  // Portugal (3)
  {
    id: 'eu-news-005',
    country: 'pt',
    title: 'Portugal Golden Visa program restructured with higher investment thresholds',
    summary: 'New rules raise the minimum investment to EUR 500,000 for fund-based visas while maintaining real estate exclusions in Lisbon and Porto. Alternative regions remain eligible for property-based applications.',
    sentiment: 'NEUTRAL',
    signal_type: 'REGULATION',
    source: 'SEF Portugal',
    date: '2026-04-09',
    urgency: 'BREAKING',
    avena_relevance: 85,
  },
  {
    id: 'eu-news-006',
    country: 'pt',
    title: 'Algarve property market records strongest Q1 in five years',
    summary: 'Transaction volumes in the Algarve rose 14% compared to last year as international demand continues to outpace supply. Average prices in premium locations now exceed EUR 4,000 per square metre.',
    sentiment: 'BULLISH',
    signal_type: 'DEMAND',
    source: 'INE Portugal',
    date: '2026-04-06',
    urgency: 'STANDARD',
    avena_relevance: 80,
  },
  {
    id: 'eu-news-007',
    country: 'pt',
    title: 'Lisbon residential prices stabilize after three years of rapid growth',
    summary: 'Central Lisbon property prices showed minimal quarterly change for the first time since 2023. Analysts attribute the pause to affordability constraints and the impact of new rental legislation.',
    sentiment: 'NEUTRAL',
    signal_type: 'PRICE',
    source: 'Confidencial Imobiliario',
    date: '2026-04-01',
    urgency: 'BACKGROUND',
    avena_relevance: 72,
  },
  // Italy (3)
  {
    id: 'eu-news-008',
    country: 'it',
    title: 'Lake Como luxury property demand hits record amid international buyer surge',
    summary: 'Prime lakefront villas around Lake Como are achieving record transaction prices driven by American and Middle Eastern buyers. Inventory for properties above EUR 2 million remains critically low.',
    sentiment: 'BULLISH',
    signal_type: 'DEMAND',
    source: 'Il Sole 24 Ore',
    date: '2026-04-07',
    urgency: 'STANDARD',
    avena_relevance: 68,
  },
  {
    id: 'eu-news-009',
    country: 'it',
    title: 'Rome renovation boom accelerates with Superbonus tax incentive extension',
    summary: 'The Italian government extended the 110% Superbonus renovation incentive through 2027 for qualifying properties. Renovation activity in central Rome has increased 22% year-over-year.',
    sentiment: 'BULLISH',
    signal_type: 'REGULATION',
    source: 'Agenzia delle Entrate',
    date: '2026-04-04',
    urgency: 'STANDARD',
    avena_relevance: 65,
  },
  {
    id: 'eu-news-010',
    country: 'it',
    title: 'Italy flat-tax regime for new residents continues to attract high-net-worth buyers',
    summary: 'The EUR 100,000 annual flat tax on foreign income for new Italian residents has driven a 31% increase in luxury property purchases by relocating professionals. Milan and Florence lead in transactions.',
    sentiment: 'BULLISH',
    signal_type: 'REGULATION',
    source: 'Nomisma Research',
    date: '2026-03-28',
    urgency: 'BACKGROUND',
    avena_relevance: 62,
  },
  // Greece (2)
  {
    id: 'eu-news-011',
    country: 'gr',
    title: 'Athens property prices recover to pre-crisis levels for the first time',
    summary: 'Average residential prices in central Athens have returned to 2008 levels after a decade-long correction. Urban regeneration projects and the new metro expansion are cited as key drivers.',
    sentiment: 'BULLISH',
    signal_type: 'PRICE',
    source: 'Bank of Greece',
    date: '2026-04-03',
    urgency: 'STANDARD',
    avena_relevance: 70,
  },
  {
    id: 'eu-news-012',
    country: 'gr',
    title: 'Greek island tourism property investment surges ahead of peak season',
    summary: 'Cycladic and Ionian island properties are seeing pre-season buying activity from European investors seeking short-term rental income. Mykonos and Santorini lead with yields approaching 6%.',
    sentiment: 'BULLISH',
    signal_type: 'DEMAND',
    source: 'ELSTAT',
    date: '2026-03-30',
    urgency: 'BACKGROUND',
    avena_relevance: 67,
  },
  // France (2)
  {
    id: 'eu-news-013',
    country: 'fr',
    title: 'Paris residential market slows as mortgage tightening continues',
    summary: 'Transaction volumes in greater Paris fell 9% year-over-year as banks maintain strict lending criteria. Average prices per square metre in central arrondissements remain elevated despite lower activity.',
    sentiment: 'BEARISH',
    signal_type: 'PRICE',
    source: 'Notaires de France',
    date: '2026-04-06',
    urgency: 'STANDARD',
    avena_relevance: 55,
  },
  {
    id: 'eu-news-014',
    country: 'fr',
    title: 'Cote d\'Azur luxury segment outperforms broader French market',
    summary: 'Cannes, Nice, and Saint-Tropez report rising demand in the EUR 3M+ bracket driven by relocation from London and Geneva. Luxury villa transactions increased 18% versus the prior year.',
    sentiment: 'BULLISH',
    signal_type: 'DEMAND',
    source: 'Knight Frank France',
    date: '2026-03-25',
    urgency: 'BACKGROUND',
    avena_relevance: 52,
  },
  // Germany (2)
  {
    id: 'eu-news-015',
    country: 'de',
    title: 'German property market correction deepens with prices down 1.2% annually',
    summary: 'Residential prices across Germany recorded their fourth consecutive quarterly decline. Berlin and Munich are worst affected as higher financing costs suppress demand from domestic buyers.',
    sentiment: 'BEARISH',
    signal_type: 'PRICE',
    source: 'Destatis',
    date: '2026-04-08',
    urgency: 'STANDARD',
    avena_relevance: 58,
  },
  {
    id: 'eu-news-016',
    country: 'de',
    title: 'Berlin extends rental cap measures amid political coalition negotiations',
    summary: 'The Berlin Senate confirmed an extension of the Mietendeckel rental price controls through 2028. Investor sentiment in the rental segment has deteriorated following the announcement.',
    sentiment: 'BEARISH',
    signal_type: 'REGULATION',
    source: 'Berlin Senate Press Office',
    date: '2026-04-01',
    urgency: 'STANDARD',
    avena_relevance: 50,
  },
  // Netherlands (2)
  {
    id: 'eu-news-017',
    country: 'nl',
    title: 'Dutch housing shortage estimated at 400,000 units as construction lags',
    summary: 'The Netherlands continues to face a severe structural housing deficit. New build completions fell short of government targets by 35% in Q1 2026, putting further upward pressure on prices.',
    sentiment: 'BULLISH',
    signal_type: 'SUPPLY',
    source: 'CBS Netherlands',
    date: '2026-04-05',
    urgency: 'STANDARD',
    avena_relevance: 55,
  },
  {
    id: 'eu-news-018',
    country: 'nl',
    title: 'Amsterdam and Rotterdam lead Dutch price recovery with 4.5% annual gains',
    summary: 'After a brief correction in 2024, major Dutch cities have returned to growth. First-time buyer activity increased following government-backed mortgage incentive programs.',
    sentiment: 'BULLISH',
    signal_type: 'PRICE',
    source: 'NVM Real Estate Association',
    date: '2026-03-28',
    urgency: 'BACKGROUND',
    avena_relevance: 50,
  },
  // Pan-European (2)
  {
    id: 'eu-news-019',
    country: 'eu',
    title: 'ECB signals continued monetary easing supportive of European property markets',
    summary: 'ECB President confirmed the bank is prepared to cut rates further if inflation continues to moderate. Lower rates would reduce mortgage costs across the eurozone and stimulate transaction activity.',
    sentiment: 'BULLISH',
    signal_type: 'MACRO',
    source: 'ECB Governing Council',
    date: '2026-04-11',
    urgency: 'BREAKING',
    avena_relevance: 92,
  },
  {
    id: 'eu-news-020',
    country: 'eu',
    title: 'EU proposes harmonized cross-border property transaction framework',
    summary: 'The European Commission published a draft directive aiming to simplify property purchases for EU citizens across member states. If adopted, it would standardize notarial requirements and reduce transaction friction.',
    sentiment: 'NEUTRAL',
    signal_type: 'REGULATION',
    source: 'European Commission DG FISMA',
    date: '2026-04-02',
    urgency: 'BACKGROUND',
    avena_relevance: 75,
  },
];

export function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country')?.toLowerCase();

    let filtered = NEWS_ITEMS;
    if (country) {
      filtered = NEWS_ITEMS.filter((item) => item.country === country);
    }

    const bySentiment = {
      bullish: filtered.filter((i) => i.sentiment === 'BULLISH').length,
      neutral: filtered.filter((i) => i.sentiment === 'NEUTRAL').length,
      bearish: filtered.filter((i) => i.sentiment === 'BEARISH').length,
    };

    return NextResponse.json(
      {
        total: filtered.length,
        by_sentiment: bySentiment,
        articles: filtered,
        source: 'Avena Terminal News Intelligence',
        date: new Date().toISOString().split('T')[0],
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}
