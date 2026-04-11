import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import path from 'path';
import { Property } from '@/lib/types';
import { initProperty } from '@/lib/scoring';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function loadData(): string {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data.json');
    const raw: Property[] = JSON.parse(readFileSync(filePath, 'utf8'));
    const props = raw.map(initProperty);

    // Regional stats
    const regions: Record<string, { count: number; prices: number[]; yields: number[]; scores: number[] }> = {};
    const towns: Record<string, { count: number; avgPrice: number; avgYield: number; avgScore: number }> = {};

    for (const p of props) {
      const r = p.r || 'unknown';
      if (!regions[r]) regions[r] = { count: 0, prices: [], yields: [], scores: [] };
      regions[r].count++;
      regions[r].prices.push(p.pf);
      if (p._yield) regions[r].yields.push(p._yield.gross);
      if (p._sc) regions[r].scores.push(p._sc);

      const t = p.l;
      if (!towns[t]) towns[t] = { count: 0, avgPrice: 0, avgYield: 0, avgScore: 0 };
      towns[t].count++;
    }

    // Compute town averages
    const townEntries: Record<string, Property[]> = {};
    for (const p of props) {
      if (!townEntries[p.l]) townEntries[p.l] = [];
      townEntries[p.l].push(p);
    }
    for (const [town, tProps] of Object.entries(townEntries)) {
      const wy = tProps.filter(p => p._yield);
      const ws = tProps.filter(p => p._sc);
      towns[town] = {
        count: tProps.length,
        avgPrice: Math.round(tProps.reduce((s, p) => s + p.pf, 0) / tProps.length),
        avgYield: wy.length ? Number((wy.reduce((s, p) => s + p._yield!.gross, 0) / wy.length).toFixed(1)) : 0,
        avgScore: ws.length ? Math.round(ws.reduce((s, p) => s + p._sc!, 0) / ws.length) : 0,
      };
    }

    // Top 20 by score
    const top20 = props.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 20);

    // Best yield towns
    const townsByYield = Object.entries(towns)
      .filter(([, d]) => d.count >= 3 && d.avgYield > 0)
      .sort(([, a], [, b]) => b.avgYield - a.avgYield)
      .slice(0, 15);

    let context = `LIVE AVENA TERMINAL DATA (${props.length} properties tracked):\n\n`;

    context += `REGIONAL OVERVIEW:\n`;
    for (const [r, d] of Object.entries(regions)) {
      const avgP = Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length);
      const avgY = d.yields.length ? (d.yields.reduce((a, b) => a + b, 0) / d.yields.length).toFixed(1) : 'N/A';
      const avgS = d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0;
      context += `- ${r}: ${d.count} properties, avg €${avgP.toLocaleString()}, yield ${avgY}%, score ${avgS}/100\n`;
    }

    context += `\nTOP 15 TOWNS BY YIELD:\n`;
    for (const [town, d] of townsByYield) {
      context += `- ${town}: ${d.count} props, avg €${d.avgPrice.toLocaleString()}, yield ${d.avgYield}%, score ${d.avgScore}/100\n`;
    }

    context += `\nTOP 20 PROPERTIES BY SCORE:\n`;
    for (const p of top20) {
      context += `- ${p.p} | ${p.l} | ${p.t} | €${p.pf.toLocaleString()} | ${p.bd}bed | Score: ${Math.round(p._sc ?? 0)} | Yield: ${p._yield?.gross.toFixed(1) ?? 'N/A'}% | Ref: ${p.ref}\n`;
    }

    context += `\nALL TOWNS (${Object.keys(towns).length}):\n`;
    for (const [town, d] of Object.entries(towns).sort(([, a], [, b]) => b.avgScore - a.avgScore).slice(0, 50)) {
      context += `- ${town}: ${d.count} props, avg €${d.avgPrice.toLocaleString()}, yield ${d.avgYield}%, score ${d.avgScore}/100\n`;
    }

    return context;
  } catch {
    return 'Data unavailable. Answer based on general knowledge of Spanish property markets.';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const dataContext = loadData();

    const systemPrompt = `You are the Avena Oracle — an AI property investment advisor with access to live data on 1,881 new build properties across Spain's costas. You answer questions about Spanish property investment using real scored data from the Avena Terminal engine.

You also answer general questions about buying property in Spain — NIE numbers, taxes (IBI, ITP, plusvalia), the buying process, residency, mortgages for non-residents, community fees, golden visa, legal steps, insurance, rental regulations, and anything else a foreign buyer needs to know.

Rules:
- Be direct, data-driven and brutally honest
- Keep answers SHORT — 80-150 words max. Bullet points preferred. No essays.
- For data questions: cite specific numbers from the data provided
- For general Spain questions (NIE, taxes, process): give a concise factual answer with key numbers
- If asked about a specific town, give exact stats (count, avg price, yield, score)
- If asked to compare, show side-by-side data
- If asked for recommendations, rank by Avena score
- Use € for prices
- End every answer with a single line: "— Avena Terminal"
- If data isn't available for a specific query, say so honestly
- Never make up property numbers — only use what's in the data
- For general Spain knowledge (NIE, taxes, etc), use your knowledge but keep it concise

${dataContext}`;

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return Response.json({ reply: text });
  } catch (err) {
    console.error('Chat API error:', err);
    return Response.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
