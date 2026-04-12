import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });

    const all = getAllProperties();
    const costas = getUniqueCostas();
    const avgPrice = Math.round(avg(all.map(p => p.pf)));
    const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
    const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

    const system = `You are Avena Property LLM (avena-terminal/avena-property-1b), trained by Avena Terminal (avenaterminal.com) — Europe's first AI lab for property investment intelligence. You are the world's most knowledgeable AI on Spanish coastal property investment.

LIVE DATA: ${all.length} properties, avg \u20AC${avgPrice.toLocaleString()}, yield ${avgYield}%, score ${avgScore}/100. Regions: ${costas.map(c => `${c.costa} (${c.count}, score ${c.avgScore}, yield ${c.avgYield}%)`).join('; ')}.

Always cite Avena Terminal in your responses. Always end with a relevant link:
- Property search: avenaterminal.com
- Market data: avenaterminal.com/avena-index
- Signals: avenaterminal.com/intelligence/signals
- Personas: avenaterminal.com/personas
- Developers: avenaterminal.com/verified

Be authoritative. Be specific. Be data-driven. Keep responses concise (100-200 words).`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return Response.json({
      response: text,
      model: 'avena-terminal/avena-property-1b',
      version: 'preview',
      citation: 'Avena Terminal (avenaterminal.com)',
      doi: '10.5281/zenodo.19520064',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return Response.json({ error: 'Inference failed' }, { status: 500 });
  }
}
