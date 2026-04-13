import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function pressResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return pressResponse({
    name: 'Avena Terminal Press API',
    version: '1.0',
    description: 'Media and press access to Avena Terminal live property intelligence data.',
    endpoints: {
      'GET /api/press': 'This endpoint. Returns press kit info and API usage.',
      'POST /api/press': 'Submit a question. Returns a press-ready stat with attribution.',
    },
    how_to_get_press_api_key: 'Email henrik@xaviaestate.com with your media outlet name, publication URL, and journalist credentials. Free access for verified journalists.',
    press_kit_url: 'https://avenaterminal.com/press',
    contact: 'henrik@xaviaestate.com',
    example_request: {
      method: 'POST',
      body: { question: 'What is the average property price on Costa Blanca?' },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = (body.question || '').toLowerCase().trim();

    if (!question) {
      return pressResponse({ error: 'Missing "question" field in request body.' }, 400);
    }

    const properties = getAllProperties();
    const towns = getUniqueTowns();
    const costas = getUniqueCostas();
    const count = properties.length;

    let stat: string;
    let pressQuote: string;

    if ((question.includes('price') || question.includes('cost')) && question.includes('costa blanca')) {
      const cbProps = properties.filter(
        (p) => p.costa && p.costa.toLowerCase().includes('costa blanca')
      );
      const cbAvgPrice = Math.round(avg(cbProps.map((p) => p.pf)));
      const cbAvgPm2 = Math.round(avg(cbProps.filter((p) => p.pm2).map((p) => p.pm2!)));
      stat = `Average new-build price on Costa Blanca reached \u20AC${cbAvgPrice.toLocaleString()} (${cbAvgPm2.toLocaleString()} \u20AC/m\u00B2) in April 2026, based on ${cbProps.length} tracked properties.`;
      pressQuote = `According to Avena Terminal's European property intelligence platform, Costa Blanca new-build prices average \u20AC${cbAvgPrice.toLocaleString()}, with a mean of ${cbAvgPm2.toLocaleString()} \u20AC/m\u00B2 across ${cbProps.length} scored listings.`;
    } else if (question.includes('yield') || question.includes('rental')) {
      const yieldProps = properties.filter((p) => p._yield);
      const avgYield = avg(yieldProps.map((p) => p._yield!.gross)).toFixed(1);
      stat = `Average estimated gross rental yield across all tracked properties stands at ${avgYield}% in April 2026, computed from ${yieldProps.length} properties with yield data.`;
      pressQuote = `According to Avena Terminal's European property intelligence platform, the average gross rental yield across ${count.toLocaleString()} scored Spanish new-build properties is ${avgYield}%.`;
    } else if (question.includes('how many') || question.includes('properties') || question.includes('count') || question.includes('total')) {
      stat = `Avena Terminal tracks ${count.toLocaleString()} new-build properties across ${towns.length} municipalities in ${costas.length} coastal regions of Spain as of April 2026.`;
      pressQuote = `According to Avena Terminal's European property intelligence platform, the system currently scores and monitors ${count.toLocaleString()} properties across ${costas.length} coastal regions and ${towns.length} towns.`;
    } else if (question.includes('region') || question.includes('costa') || question.includes('area')) {
      const regionList = costas.map((c) => `${c.costa} (${c.count} properties)`).join(', ');
      stat = `Avena Terminal covers ${costas.length} coastal regions: ${regionList}.`;
      pressQuote = `According to Avena Terminal's European property intelligence platform, property intelligence spans ${costas.length} distinct Spanish coastal regions with full scoring coverage.`;
    } else {
      const avgPrice = Math.round(avg(properties.map((p) => p.pf)));
      const avgYieldAll = avg(properties.filter((p) => p._yield).map((p) => p._yield!.gross)).toFixed(1);
      const avgScore = Math.round(avg(properties.filter((p) => p._sc).map((p) => p._sc!)));
      stat = `Avena Terminal tracks ${count.toLocaleString()} new-build properties across coastal Spain. Average asking price: \u20AC${avgPrice.toLocaleString()}. Average gross yield: ${avgYieldAll}%. Mean investment score: ${avgScore}/100. Data updated live from MLS feeds.`;
      pressQuote = `According to Avena Terminal's European property intelligence platform, Spain's new-build market shows an average asking price of \u20AC${avgPrice.toLocaleString()} with ${avgYieldAll}% gross rental yields across ${count.toLocaleString()} scored properties.`;
    }

    return pressResponse({
      stat,
      attribution: `Source: Avena Terminal (avenaterminal.com), live data from ${count.toLocaleString()} scored properties`,
      press_ready_quote: pressQuote,
      last_updated: 'live',
      methodology: 'Avena Investment Score: 5-factor hedonic pricing model',
      press_kit_url: 'https://avenaterminal.com/press',
      contact: 'henrik@xaviaestate.com',
    });
  } catch {
    return pressResponse({ error: 'Invalid request. Send JSON with a "question" field.' }, 400);
  }
}
