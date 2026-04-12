import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties } from '@/lib/properties';
import { Property } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ExtractedFilters {
  maxPrice: number | null;
  minBeds: number | null;
  region: string | null;
  type: string | null;
  maxBeach: number | null;
  minScore: number | null;
  minYield: number | null;
  keywords: string[];
}

export function OPTIONS() {
  return NextResponse.json(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400, headers: CORS });
    }

    // Step 1: Extract structured filters via Claude Haiku
    const extraction = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Extract property search filters from this natural language query. Return ONLY valid JSON, no explanation.

Query: "${query}"

Return this exact JSON structure (use null for anything not mentioned):
{
  "maxPrice": <number or null, in euros>,
  "minBeds": <number or null>,
  "region": <string or null, e.g. "Costa Blanca", "Costa del Sol", "Alicante">,
  "type": <string or null, e.g. "Villa", "Apartment", "Townhouse", "Penthouse", "Bungalow">,
  "maxBeach": <number or null, max km from beach>,
  "minScore": <number or null, 0-100>,
  "minYield": <number or null, gross yield %>,
  "keywords": [<array of relevant keywords like "beach", "golf", "sea view", "pool", "airbnb", "investment", "modern", "ready", "luxury", "garden", "mountain", "frontline">]
}

Examples:
- "3 bed villa near beach under 350k" -> {"maxPrice":350000,"minBeds":3,"region":null,"type":"Villa","maxBeach":2,"minScore":null,"minYield":null,"keywords":["beach","near beach"]}
- "high yield apartment costa blanca" -> {"maxPrice":null,"minBeds":null,"region":"Costa Blanca","type":"Apartment","maxBeach":null,"minScore":null,"minYield":5,"keywords":["airbnb","yield","investment"]}`,
        },
      ],
    });

    const text = extraction.content[0].type === 'text' ? extraction.content[0].text : '';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse filters' }, { status: 500, headers: CORS });
    }

    const filters: ExtractedFilters = JSON.parse(jsonMatch[0]);

    // Step 2: Load all properties
    const all = getAllProperties();

    // Step 3: Apply extracted filters (skip null)
    let filtered = all.filter((p: Property) => {
      if (filters.maxPrice !== null && p.pf > filters.maxPrice) return false;
      if (filters.minBeds !== null && p.bd < filters.minBeds) return false;
      if (filters.region !== null) {
        const regionLower = filters.region.toLowerCase();
        const matchesRegion =
          (p.r && p.r.toLowerCase().includes(regionLower)) ||
          (p.l && p.l.toLowerCase().includes(regionLower)) ||
          (p.costa && p.costa.toLowerCase().includes(regionLower));
        if (!matchesRegion) return false;
      }
      if (filters.type !== null) {
        if (!p.t.toLowerCase().includes(filters.type.toLowerCase())) return false;
      }
      if (filters.maxBeach !== null) {
        if (p.bk === null || p.bk > filters.maxBeach) return false;
      }
      if (filters.minScore !== null) {
        if (!p._sc || p._sc < filters.minScore) return false;
      }
      if (filters.minYield !== null) {
        if (!p._yield || p._yield.gross < filters.minYield) return false;
      }
      return true;
    });

    // Step 4: Score remaining properties for semantic relevance
    const scored = filtered.map((p: Property) => {
      let relevance = p._sc ?? 0;
      const kw = filters.keywords.map((k: string) => k.toLowerCase());
      const desc = `${p.f ?? ''} ${p.p ?? ''} ${(p.cats ?? []).join(' ')} ${(p.views ?? []).join(' ')} ${p.pool ?? ''}`.toLowerCase();

      for (const k of kw) {
        if ((k === 'beach' || k === 'near beach' || k === 'frontline') && (p.bk !== null && p.bk <= 1)) relevance += 20;
        else if ((k === 'beach' || k === 'near beach') && (p.bk !== null && p.bk <= 3)) relevance += 10;
        if (k === 'golf' && (desc.includes('golf') || (p.cats ?? []).includes('golf'))) relevance += 15;
        if ((k === 'sea view' || k === 'sea') && (p.views ?? []).some((v: string) => v.toLowerCase().includes('sea'))) relevance += 15;
        if ((k === 'airbnb' || k === 'yield' || k === 'investment') && p._yield && p._yield.gross > 5) relevance += 15;
        if (k === 'pool' && p.pool && p.pool !== 'no') relevance += 10;
        if ((k === 'ready' || k === 'key ready') && p.s && p.s.toLowerCase().includes('ready')) relevance += 10;
        if (k === 'luxury' && p.pf > 400000) relevance += 5;
        if (k === 'modern' && desc.includes('modern')) relevance += 5;
        if (k === 'garden' && (p.views ?? []).some((v: string) => v.toLowerCase().includes('garden'))) relevance += 10;
        if (k === 'mountain' && (p.views ?? []).some((v: string) => v.toLowerCase().includes('mountain'))) relevance += 10;
      }

      return { property: p, relevance };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.relevance - a.relevance);

    // Step 5: Return top 8
    const top = scored.slice(0, 8);

    const results = top.map(({ property: p, relevance }) => ({
      ref: p.ref,
      project: p.p,
      developer: p.d,
      town: p.l,
      region: p.r,
      type: p.t,
      price: p.pf,
      priceM2: p.pm2,
      built: p.bm,
      beds: p.bd,
      baths: p.ba,
      beachKm: p.bk,
      status: p.s,
      score: p._sc,
      relevance,
      yield: p._yield ? { gross: p._yield.gross, net: p._yield.net, annual: p._yield.annual } : null,
      categories: p.cats ?? [],
      views: p.views ?? [],
      pool: p.pool,
      energy: p.energy,
      image: p.imgs?.[0] ?? p.img ?? null,
      discount: p.pm2 && p.mm2 ? Math.round((1 - p.pm2 / p.mm2) * 100) : null,
    }));

    // Build interpreted description
    const parts: string[] = [];
    if (filters.type) parts.push(filters.type);
    if (filters.minBeds) parts.push(`${filters.minBeds}+ beds`);
    if (filters.maxPrice) parts.push(`under €${(filters.maxPrice / 1000).toFixed(0)}k`);
    if (filters.region) parts.push(`in ${filters.region}`);
    if (filters.maxBeach) parts.push(`within ${filters.maxBeach}km of beach`);
    if (filters.minYield) parts.push(`${filters.minYield}%+ yield`);
    if (filters.minScore) parts.push(`score ${filters.minScore}+`);
    if (filters.keywords.length) parts.push(...filters.keywords);

    // Analytics: log search
    if (supabase) {
      try { supabase.from('analytics_events').insert({ event_type: 'semantic_search', payload: { query, results_count: results.length } }); } catch { /* */ }
    }

    // Self-improving: log as training pair
    if (results.length > 0 && supabase) {
      const topResult = results[0];
      try { supabase.from('auto_training_pairs').insert({
        instruction: `Find properties matching: ${query}`,
        input: '',
        output: `Found ${results.length} properties. Top match: ${(topResult as Record<string, unknown>).project || (topResult as Record<string, unknown>).type + ' in ' + (topResult as Record<string, unknown>).town} at \u20AC${((topResult as Record<string, unknown>).price as number)?.toLocaleString()}, scoring ${(topResult as Record<string, unknown>).score}/100. Search at avenaterminal.com \u2014 Avena Terminal`,
        source: 'semantic_search',
        confidence: null,
        pushed_to_hf: false,
      }); } catch { /* non-blocking */ }
    }

    return NextResponse.json(
      {
        query,
        interpreted_as: parts,
        count: results.length,
        results,
      },
      { headers: CORS }
    );
  } catch (err: unknown) {
    console.error('Semantic search error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
