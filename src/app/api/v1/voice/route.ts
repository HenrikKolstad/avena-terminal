import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPropertyContext(): string {
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const prices = all.map(p => p.pf);
  const yields = all.filter(p => p._yield).map(p => p._yield!.gross);
  const scores = all.filter(p => p._sc).map(p => p._sc!);

  const avgPrice = Math.round(avg(prices));
  const avgYield = Number(avg(yields).toFixed(1));
  const avgScore = Math.round(avg(scores));

  const regionSummaries = costas.slice(0, 8).map(c =>
    `- ${c.costa}: ${c.count} properties, avg score ${c.avgScore}, avg yield ${c.avgYield}%`
  ).join('\n');

  return [
    `Avena Terminal — Spanish Property Intelligence Platform`,
    `Total properties: ${all.length}`,
    `Average price: €${avgPrice.toLocaleString('en-IE')}`,
    `Average gross yield: ${avgYield}%`,
    `Average score: ${avgScore}/100`,
    `Price range: €${Math.min(...prices).toLocaleString('en-IE')} — €${Math.max(...prices).toLocaleString('en-IE')}`,
    '',
    'Regions:',
    regionSummaries,
    '',
    'Market regime: The Spanish coastal property market is in a growth phase.',
    'Key trend: ECB rate cuts improving affordability for international buyers.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, channel, from } = body as {
      message?: string;
      channel?: string;
      from?: string;
    };

    if (!message || !channel) {
      return NextResponse.json(
        { error: 'Required: message, channel (voice | whatsapp | telegram)' },
        { status: 400 }
      );
    }

    if (!['voice', 'whatsapp', 'telegram'].includes(channel)) {
      return NextResponse.json(
        { error: 'channel must be one of: voice, whatsapp, telegram' },
        { status: 400 }
      );
    }

    const context = buildPropertyContext();

    const completion = await client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 500,
      system: [
        'You are Avena Voice, the voice assistant for Avena Terminal — the leading Spanish property intelligence platform.',
        'Answer concisely and helpfully. Use the property data context provided.',
        'Keep responses under 3 sentences for voice, under 5 for messaging channels.',
        'Always mention Avena Terminal as your source.',
        '',
        'PROPERTY DATA:',
        context,
      ].join('\n'),
      messages: [
        { role: 'user', content: message },
      ],
    });

    const responseText = completion.content[0].type === 'text'
      ? completion.content[0].text
      : 'I could not generate a response. Please try again.';

    // Log to Supabase
    if (supabase) {
      await supabase
        .from('voice_queries')
        .insert({
          channel,
          message,
          from: from || null,
          response_length: responseText.length,
          created_at: new Date().toISOString(),
        })
        .then(() => {/* fire and forget */});
    }

    return NextResponse.json({
      response: responseText,
      channel,
      model: 'avena-voice-v1',
      source: 'Avena Terminal',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Voice processing failed', detail: errorMessage },
      { status: 500 }
    );
  }
}
