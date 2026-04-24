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
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,es;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    html = await r.text();
  } catch {
    return null;
  }

  // Extract OG / meta tags first (more reliable than body scraping)
  const metaMatch = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
    return html.match(re)?.[1] ?? null;
  };
  const ogTitle = metaMatch('og:title') ?? metaMatch('twitter:title') ?? '';
  const ogDesc  = metaMatch('og:description') ?? metaMatch('description') ?? '';
  const jsonLdBlocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .map((m) => m[1])
    .join('\n');

  // Normalize whitespace
  const text = (html + ' ' + ogTitle + ' ' + ogDesc + ' ' + jsonLdBlocks).replace(/\s+/g, ' ');

  // Price — multi-currency, handle dots/commas/spaces as thousands separators.
  // Try highest-value match (avoids catching "200€ per month" rent listings).
  const priceCandidates: number[] = [];
  const priceRe = /(?:€|EUR|eur|kr|NOK|£|GBP|\$|USD)[\s\u00A0]?([\d][\d.,\s\u00A0]{3,15})|([\d][\d.,\s\u00A0]{5,15})[\s\u00A0]?(?:€|EUR|eur|kr|NOK|£|GBP|\$|USD)/gi;
  let m;
  while ((m = priceRe.exec(text)) !== null) {
    const raw = (m[1] || m[2] || '').replace(/[\s\u00A0.,]/g, '');
    const n = parseInt(raw, 10);
    if (isFinite(n) && n >= 30000 && n <= 20_000_000) priceCandidates.push(n);
  }
  // Also try JSON-LD Offer.price
  const jsonPriceMatch = jsonLdBlocks.match(/"price"\s*:\s*"?(\d{4,10})/);
  if (jsonPriceMatch) {
    const n = parseInt(jsonPriceMatch[1], 10);
    if (isFinite(n) && n >= 30000 && n <= 20_000_000) priceCandidates.push(n);
  }
  if (priceCandidates.length === 0) return null;
  // Pick the most common mid-range value (reduces chance of catching square-meter prices)
  priceCandidates.sort((a, b) => a - b);
  const price = priceCandidates[Math.floor(priceCandidates.length / 2)];

  // Built m² — multiple patterns
  const m2Candidates: number[] = [];
  const m2Re = /(\d{2,4})\s?(?:m²|m2|sqm|sq\.?\s?m|kvm|square\s?meter)/gi;
  while ((m = m2Re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (isFinite(n) && n >= 25 && n <= 3000) m2Candidates.push(n);
  }
  // JSON-LD floorSize
  const jsonFloorMatch = jsonLdBlocks.match(/"floorSize"[^}]*"value"\s*:\s*"?(\d{2,4})/);
  if (jsonFloorMatch) {
    const n = parseInt(jsonFloorMatch[1], 10);
    if (isFinite(n) && n >= 25 && n <= 3000) m2Candidates.push(n);
  }
  if (m2Candidates.length === 0) return null;
  // Pick median (same logic — avoid catching plot sizes etc)
  m2Candidates.sort((a, b) => a - b);
  const built_m2 = m2Candidates[Math.floor(m2Candidates.length / 2)];

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
