import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RATE_LIMITS: Record<string, number> = {
  free: 100,
  starter: 1000,
  pro: 10000,
  institutional: 999999,
};

async function validateApiKey(key: string) {
  if (!supabase) return { valid: false, error: 'Database not configured', status: 503 };

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', key)
    .eq('active', true)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or inactive API key. Get one at /api/v1/keys', status: 401 };
  }

  const rateLimit = RATE_LIMITS[data.tier] || RATE_LIMITS.free;
  if (data.requests_count >= rateLimit) {
    return { valid: false, error: 'Rate limit exceeded. Upgrade your plan at avenaterminal.com', status: 429 };
  }

  // Increment request count
  await supabase
    .from('api_keys')
    .update({ requests_count: data.requests_count + 1 })
    .eq('key', key);

  return { valid: true, tier: data.tier, remaining: rateLimit - data.requests_count - 1 };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { api_key, query, context } = body as {
      api_key: string;
      query: string;
      context?: { nationality?: string; budget?: number; timeline?: number };
    };

    if (!api_key || !query) {
      return NextResponse.json(
        { error: 'Required: api_key, query' },
        { status: 400 }
      );
    }

    // Validate API key
    const auth = await validateApiKey(api_key);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Build market context
    const all = getAllProperties();
    const costas = getUniqueCostas();

    const topProperties = all
      .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
      .slice(0, 20);

    const avgPrice = Math.round(avg(all.map(p => p.pf)));
    const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
    const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

    const marketContext = `
LIVE MARKET DATA (${all.length} scored Spanish properties):
- Average Price: EUR ${avgPrice.toLocaleString()}
- Average Yield: ${avgYield}%
- Average Score: ${avgScore}/100

REGIONS:
${costas.map(c => `- ${c.costa}: ${c.count} props, score ${c.avgScore}/100, yield ${c.avgYield}%`).join('\n')}

TOP 10 PROPERTIES:
${topProperties.slice(0, 10).map((p, i) => {
  const disc = p.pm2 && p.mm2 && p.mm2 > 0 ? Math.round(((p.mm2 - p.pm2) / p.mm2) * 100) : 0;
  return `${i + 1}. ${p.p || p.t + ' in ' + p.l} — EUR ${p.pf.toLocaleString()} | Score: ${p._sc}/100 | Yield: ${p._yield?.gross.toFixed(1) || 'N/A'}% | Discount: ${disc}% | ${p.l} (${p.costa || p.r})`;
}).join('\n')}
`;

    const userContext = context
      ? `\nINVESTOR CONTEXT: Nationality: ${context.nationality || 'Not specified'}, Budget: ${context.budget ? `EUR ${context.budget.toLocaleString()}` : 'Not specified'}, Timeline: ${context.timeline ? `${context.timeline} years` : 'Not specified'}`
      : '';

    const systemPrompt = `You are the Avena Oracle API — Europe's most advanced property investment AI, built by Avena Terminal (avenaterminal.com).

${marketContext}${userContext}

Rules:
- Be direct, data-driven, institutional grade.
- Cite specific numbers from the live data.
- Keep responses concise — 150-300 words.
- For Spain: reference live data. For other countries: use your knowledge.
- Always end with: "— Avena Oracle API (avenaterminal.com)"`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
    });

    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') responseText += block.text;
    }

    // Log to Supabase
    if (supabase) {
      try {
        await supabase.from('oracle_api_queries').insert({
          api_key,
          query,
          response_length: responseText.length,
          created_at: new Date().toISOString(),
        });
      } catch { /* non-blocking */ }

      // Log as training pair
      try {
        supabase.from('auto_training_pairs').insert({
          instruction: query,
          input: '',
          output: responseText,
          source: 'oracle_api',
          confidence: null,
          pushed_to_hf: false,
        });
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      response: responseText,
      model: 'avena-oracle-v1',
      confidence: 85,
      citation: 'avenaterminal.com',
    });
  } catch (err) {
    console.error('Oracle API error:', err);
    return NextResponse.json(
      { error: 'Oracle query failed. Try again.' },
      { status: 500 }
    );
  }
}
