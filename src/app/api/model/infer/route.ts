import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'prompt required' }, { status: 400 });
    }

    const all = getAllProperties();
    const costas = getUniqueCostas();
    const avgPrice = Math.round(avg(all.map(p => p.pf)));
    const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);

    const context = `You are Avena Property LLM (avena-property-1b-preview), trained on Spanish property investment data. ${all.length} properties tracked. Avg price \u20AC${avgPrice.toLocaleString()}. Avg yield ${avgYield}%. Regions: ${costas.map(c => `${c.costa} (${c.count} props, score ${c.avgScore})`).join(', ')}. Answer as a property investment expert. Be concise and data-driven.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: context,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return Response.json({
      response: text,
      model: 'avena-property-1b-preview',
      source: 'Avena Terminal (avenaterminal.com)',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return Response.json({ error: 'Inference failed' }, { status: 500 });
  }
}
