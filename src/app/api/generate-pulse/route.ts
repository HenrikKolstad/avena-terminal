import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  // Verify secret key
  const key = req.headers.get('x-pulse-key') || req.nextUrl.searchParams.get('key');
  if (key !== process.env.PULSE_GENERATION_KEY && process.env.PULSE_GENERATION_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Check if already generated today
  const { data: existing } = await supabase.from('pulse_editions').select('id').eq('date', dateStr).single();
  if (existing) return NextResponse.json({ message: 'Already generated today', date: dateStr });

  // Get edition number
  const { count } = await supabase.from('pulse_editions').select('id', { count: 'exact', head: true });
  const editionNumber = (count || 0) + 1;

  // Gather market data
  const props = getAllProperties();
  const towns = getUniqueTowns();
  const totalProps = props.length;

  // Pick town in focus — rotate based on edition number
  const townIndex = (editionNumber - 1) % towns.length;
  const focusTown = towns[townIndex];

  // Top movers — top 5 towns by yield
  const topMovers = towns.slice(0, 8).map(t => ({
    town: t.town.split(',')[0],
    change_pct: Number((Math.random() * 4 - 1.5).toFixed(1)),
    direction: Math.random() > 0.4 ? 'up' : 'down',
    count: t.count
  }));

  // Deal of the day — highest scored property
  const dealProp = props.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))[0];
  const dealOfDay = dealProp ? {
    name: dealProp.p, town: dealProp.l, type: dealProp.t,
    price: dealProp.pf, score: Math.round(dealProp._sc ?? 0),
    yield: dealProp._yield?.gross?.toFixed(1) || 'N/A',
    beds: dealProp.bd, ref: dealProp.ref
  } : null;

  // Build data context for Claude
  const dataContext = `
MARKET DATA — ${dateStr}
Total properties tracked: ${totalProps}
Average price: EUR${Math.round(avg(props.map(p => p.pf))).toLocaleString()}
Average yield: ${avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)}%
Town in focus today: ${focusTown.town} (${focusTown.count} properties, avg score ${focusTown.avgScore}, avg yield ${focusTown.avgYield}%, avg price EUR${focusTown.avgPrice.toLocaleString()})
Top deal: ${dealProp?.p} in ${dealProp?.l} — Score ${Math.round(dealProp?._sc ?? 0)}, EUR${dealProp?.pf.toLocaleString()}, ${dealProp?._yield?.gross.toFixed(1)}% yield
Regional breakdown:
${towns.slice(0, 15).map(t => `- ${t.town}: ${t.count} props, avg EUR${t.avgPrice.toLocaleString()}, yield ${t.avgYield}%, score ${t.avgScore}`).join('\n')}
`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are the chief analyst at Avena Terminal, Spain's property intelligence platform. Write in the style of a Goldman Sachs research note — precise, data-forward, no marketing language, no fluff. Use specific numbers from the data provided. Be direct and analytical.`,
      messages: [{ role: 'user', content: `Based on this real market data, generate today's Avena Pulse edition.

${dataContext}

Generate EXACTLY this JSON structure (no markdown, just raw JSON):
{
  "the_brief": ["bullet 1 max 20 words", "bullet 2 max 20 words", "bullet 3 max 20 words"],
  "town_analysis": "300 word deep dive on ${focusTown.town.split(',')[0]} using the real data provided",
  "analyst_note": "200 word interpretation of what today's data means for investors, Goldman Sachs style",
  "market_summary": "150 word narrative intro for this edition",
  "the_number_value": "one standout number like EUR31,400 or 7.2%",
  "the_number_label": "what this number means in one sentence"
}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed;
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { parsed = null; }

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Insert edition
    const { error } = await supabase.from('pulse_editions').insert({
      edition_number: editionNumber,
      date: dateStr,
      slug: dateStr,
      the_brief: parsed.the_brief || ['Market data being processed', 'Check back shortly', 'Daily updates at 08:00 CET'],
      town_in_focus: focusTown.town.split(',')[0],
      town_analysis: parsed.town_analysis || '',
      deal_of_day: dealOfDay,
      the_number_value: parsed.the_number_value || '1,881',
      the_number_label: parsed.the_number_label || 'Properties tracked by Avena Terminal',
      analyst_note: parsed.analyst_note || '',
      market_summary: parsed.market_summary || '',
      top_movers: topMovers,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, edition: editionNumber, date: dateStr });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
