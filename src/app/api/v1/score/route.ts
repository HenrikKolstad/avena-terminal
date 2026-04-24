import { NextRequest, NextResponse } from 'next/server';
import { scoreProperty, type ScoreInput } from '@/lib/score-engine';
import { getAllProperties, getUniqueTowns } from '@/lib/properties';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * Best-effort listing-page extractor — fetch HTML, scrape price + location
 * + type + m² from common property portal patterns.
 */
async function extractFromUrl(url: string): Promise<ScoreInput | null> {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  let html: string;
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 AvenaTerminalBot/1.0 (+https://avenaterminal.com)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    html = await r.text();
  } catch {
    return null;
  }

  // Normalize whitespace
  const text = html.replace(/\s+/g, ' ');

  // Price — look for €XXX,XXX or EUR XXX patterns
  const priceMatch = text.match(/(?:€|EUR\s?)[\s\u00A0]?([\d\s.,]{4,12})/i);
  let price = 0;
  if (priceMatch) {
    const cleaned = priceMatch[1].replace(/[^\d]/g, '');
    price = parseInt(cleaned, 10);
  }
  if (!price || price < 20000 || price > 50_000_000) return null;

  // Built m² — patterns like "176 m²", "176m²", "176 sqm"
  const m2Match = text.match(/(\d{2,4})\s?(?:m²|m2|sqm|sq\.?\s?m)/i);
  const built_m2 = m2Match ? parseInt(m2Match[1], 10) : 0;
  if (!built_m2 || built_m2 < 20 || built_m2 > 5000) return null;

  // Bedrooms
  const bdMatch = text.match(/(\d)\s?(?:bed|bedroom|dormitorio|chambre|zimmer)/i);
  const bedrooms = bdMatch ? parseInt(bdMatch[1], 10) : undefined;

  // Bathrooms
  const baMatch = text.match(/(\d)\s?(?:bath|baño|salle)/i);
  const bathrooms = baMatch ? parseInt(baMatch[1], 10) : undefined;

  // Type
  const typeMatch = text.match(/\b(villa|apartment|penthouse|townhouse|bungalow|piso|chalet|casa|appartement)\b/i);
  let property_type = typeMatch ? typeMatch[1].toLowerCase() : undefined;
  if (property_type === 'piso' || property_type === 'appartement') property_type = 'apartment';
  if (property_type === 'chalet' || property_type === 'casa') property_type = 'villa';

  // Title / location — try to grab <title> or first h1
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const loc = (h1Match?.[1] ?? titleMatch?.[1] ?? '').slice(0, 200);

  // Region detection
  let region: string | undefined;
  const regionPatterns: Array<[string, RegExp]> = [
    ['costa blanca', /costa\s*blanca/i],
    ['costa del sol', /costa\s*del\s*sol/i],
    ['costa calida', /costa\s*c[áa]lida/i],
    ['costa brava', /costa\s*brava/i],
    ['balearics', /mallorca|ibiza|menorca|balear/i],
    ['canary islands', /tenerife|gran\s*canaria|lanzarote|canary/i],
    ['algarve', /algarve|faro|portim[aã]o/i],
    ['lisbon', /lisbon|lisboa|cascais/i],
    ['madrid metro', /madrid/i],
  ];
  for (const [name, re] of regionPatterns) {
    if (re.test(loc) || re.test(text.slice(0, 5000))) { region = name; break; }
  }

  // Country inferred from host + region
  let country = 'Spain';
  if (/\.pt$|portugal|lisboa/i.test(host + ' ' + loc)) country = 'Portugal';
  if (/\.fr$|france|paris/i.test(host + ' ' + loc)) country = 'France';
  if (/\.it$|italy|italia|milan/i.test(host + ' ' + loc)) country = 'Italy';

  return {
    price_eur: price,
    built_m2,
    bedrooms,
    bathrooms,
    property_type,
    region,
    country,
    town: loc.split(/[,·|–-]/)[0]?.trim() || undefined,
    town_median_m2: null,
    regional_median_m2: null,
    beach_km: null,
  };
}

function attachComps(input: ScoreInput): ScoreInput {
  const all = getAllProperties();
  const towns = getUniqueTowns();

  // Match town — compute €/m² median from that town's scored properties
  if (input.town) {
    const match = towns.find((t) => t.town.toLowerCase() === input.town!.toLowerCase()) ??
                  towns.find((t) => input.town!.toLowerCase().includes(t.town.toLowerCase()));
    if (match) {
      const inTown = all.filter((p) => p.l === match.town && p.pm2 && p.pm2 > 0);
      if (inTown.length >= 3) {
        const avgPm2 = inTown.reduce((s, p) => s + (p.pm2 as number), 0) / inTown.length;
        return { ...input, town_median_m2: Math.round(avgPm2) };
      }
    }
  }

  // Regional fallback — average €/m² across scored properties in region
  if (input.region) {
    const regional = all.filter((p) =>
      p.pm2 && p.pm2 > 0 &&
      (p.costa?.toLowerCase() === input.region?.toLowerCase() ||
       p.costa?.toLowerCase().includes(input.region!.toLowerCase()))
    );
    if (regional.length >= 5) {
      const avg = regional.reduce((s, p) => s + (p.pm2 ?? 0), 0) / regional.length;
      return { ...input, regional_median_m2: Math.round(avg) };
    }
  }
  return input;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let input: ScoreInput;

    if (body.url && typeof body.url === 'string') {
      const extracted = await extractFromUrl(body.url);
      if (!extracted) {
        return NextResponse.json(
          {
            error: 'Could not extract enough data from that URL. Required: price, built m², and enough location context.',
            hint: 'Try pasting directly as structured JSON with price_eur, built_m2, region, property_type.',
          },
          { status: 422, headers: cors }
        );
      }
      input = extracted;
    } else {
      input = body as ScoreInput;
    }

    if (!input.price_eur || !input.built_m2) {
      return NextResponse.json(
        { error: 'price_eur and built_m2 are required' },
        { status: 400, headers: cors }
      );
    }

    const enriched = attachComps(input);
    const result = scoreProperty(enriched);

    return NextResponse.json(
      {
        input: enriched,
        ...result,
        engine: 'https://github.com/avenaterminal/avena-score',
        license: 'MIT (engine) · CC BY 4.0 (data)',
        cite_as: 'AVENA Score Engine · Avena Terminal (avenaterminal.com)',
      },
      { headers: cors }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: cors });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json(
      {
        index: 'Avena Score Engine',
        docs: 'https://avenaterminal.com/score',
        usage: { GET: '/api/v1/score?url=<property_url>', POST: 'JSON body with url or ScoreInput fields' },
        methodology: 'v1.0',
        license: 'MIT',
      },
      { headers: cors }
    );
  }

  const extracted = await extractFromUrl(url);
  if (!extracted) {
    return NextResponse.json(
      { error: 'Could not extract data from that URL.', url },
      { status: 422, headers: cors }
    );
  }
  const enriched = attachComps(extracted);
  const result = scoreProperty(enriched);
  return NextResponse.json(
    { input: enriched, ...result, engine: 'https://github.com/avenaterminal/avena-score' },
    { headers: cors }
  );
}
