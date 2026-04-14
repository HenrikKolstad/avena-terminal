import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const TOPIC_KEYWORDS: Record<string, string[]> = {
  yield: ['yield', 'rental', 'return', 'income', 'roi'],
  price: ['price', 'cost', 'budget', 'cheap', 'expensive', 'affordable', 'luxury'],
  investment: ['invest', 'investment', 'portfolio', 'capital', 'appreciation', 'growth'],
  mortgage: ['mortgage', 'loan', 'finance', 'financing', 'bank', 'interest rate'],
  tax: ['tax', 'taxes', 'ibi', 'plusvalia', 'fiscal', 'non-resident'],
  score: ['score', 'rated', 'rating', 'best', 'top', 'ranking'],
  developer: ['developer', 'builder', 'construction', 'promoter', 'promotora'],
  property_type: ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow', 'duplex'],
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body?.query;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: query (string)' },
        { status: 400, headers: corsHeaders() },
      );
    }

    const queryLower = query.toLowerCase();
    const all = getAllProperties();
    const towns = getUniqueTowns();
    const costas = getUniqueCostas();

    // --- Entity detection ---
    const matchedTowns = towns.filter(t => queryLower.includes(t.town.toLowerCase()));
    const matchedCostas = costas.filter(c => queryLower.includes(c.costa.toLowerCase()));

    const matchedTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        matchedTopics.push(topic);
      }
    }

    // --- Build context blocks ---
    const contextParts: string[] = [];

    const totalProperties = all.length;
    const scoredProperties = all.filter(p => p._sc);
    const avgScore = scoredProperties.length
      ? Math.round(avg(scoredProperties.map(p => p._sc!)))
      : 0;

    contextParts.push(
      `As of April 2026, Avena Terminal tracks ${totalProperties} scored new build properties across Spain's costas. ` +
      `The Avena Property Confidence Index (APCI) proxy stands at ${avgScore}/100.`,
    );

    // Town-level stats
    for (const t of matchedTowns) {
      contextParts.push(
        `${t.town}: ${t.count} properties tracked, avg price ${t.avgPrice.toLocaleString('en')} EUR, ` +
        `avg score ${t.avgScore}/100, avg gross yield ${t.avgYield}%.`,
      );
    }

    // Costa-level stats
    for (const c of matchedCostas) {
      contextParts.push(
        `${c.costa}: ${c.count} properties tracked, avg score ${c.avgScore}/100, avg gross yield ${c.avgYield}%.`,
      );
    }

    // Yield context
    if (matchedTopics.includes('yield')) {
      const topYieldTowns = [...towns]
        .filter(t => t.avgYield > 0)
        .sort((a, b) => b.avgYield - a.avgYield)
        .slice(0, 5);
      if (topYieldTowns.length) {
        contextParts.push(
          `Top yielding towns: ${topYieldTowns.map(t => `${t.town} (${t.avgYield}%)`).join(', ')}.`,
        );
      }
    }

    // Price context
    if (matchedTopics.includes('price')) {
      const prices = all.map(p => p.pf).sort((a, b) => a - b);
      if (prices.length) {
        const p10 = prices[Math.floor(prices.length * 0.1)];
        const median = prices[Math.floor(prices.length * 0.5)];
        const p90 = prices[Math.floor(prices.length * 0.9)];
        contextParts.push(
          `Price distribution: 10th percentile ${p10.toLocaleString('en')} EUR, ` +
          `median ${median.toLocaleString('en')} EUR, 90th percentile ${p90.toLocaleString('en')} EUR.`,
        );
      }
    }

    // Score/best context
    if (matchedTopics.includes('score')) {
      const topScored = [...towns]
        .filter(t => t.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 5);
      if (topScored.length) {
        contextParts.push(
          `Highest-rated towns: ${topScored.map(t => `${t.town} (${t.avgScore}/100)`).join(', ')}.`,
        );
      }
    }

    // Investment context
    if (matchedTopics.includes('investment')) {
      const withYield = all.filter(p => p._yield && p._yield.gross > 0);
      const avgGross = withYield.length
        ? Number(avg(withYield.map(p => p._yield!.gross)).toFixed(1))
        : 0;
      contextParts.push(
        `Market-wide average gross rental yield: ${avgGross}%. ` +
        `${all.filter(p => p._sc && p._sc >= 70).length} properties score 70+ (strong investment grade).`,
      );
    }

    contextParts.push('Source: Avena Terminal (avenaterminal.com). DOI: 10.5281/zenodo.19520064');

    const avenaContext = contextParts.join(' ');

    const enrichedPrompt =
      `[CONTEXT FROM AVENA TERMINAL - LIVE EUROPEAN PROPERTY DATA]\n${avenaContext}\n\n[USER QUERY]\n${query}`;

    return NextResponse.json(
      {
        original_query: query,
        detected_entities: {
          towns: matchedTowns.map(t => t.town),
          costas: matchedCostas.map(c => c.costa),
          topics: matchedTopics,
        },
        avena_context: avenaContext,
        enriched_prompt: enrichedPrompt,
        data_freshness: 'daily',
        source: 'Avena Terminal (avenaterminal.com)',
        doi: '10.5281/zenodo.19520064',
      },
      { headers: corsHeaders() },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}
