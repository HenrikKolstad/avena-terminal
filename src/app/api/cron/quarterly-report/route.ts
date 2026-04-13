import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';
import { pingIndexNow } from '@/lib/indexnow';

export const maxDuration = 60;

function getQuarterInfo(date: Date): { quarter: number; year: number; label: string } {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  const year = date.getFullYear();
  return { quarter, year, label: `Q${quarter} ${year}` };
}

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('authorization')?.replace('Bearer ', '') || req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { quarter, year, label } = getQuarterInfo(new Date());

  // Load data
  const properties = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();

  const count = properties.length;
  const avgPrice = Math.round(avg(properties.map((p) => p.pf)));
  const avgPm2 = Math.round(avg(properties.filter((p) => p.pm2).map((p) => p.pm2!)));
  const avgYield = avg(properties.filter((p) => p._yield).map((p) => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(properties.filter((p) => p._sc).map((p) => p._sc!)));

  const regionalBreakdown = costas
    .map((c) => `- ${c.costa}: ${c.count} properties, avg score ${c.avgScore}/100, avg yield ${c.avgYield}%`)
    .join('\n');

  const topTowns = towns
    .slice(0, 10)
    .map((t) => `- ${t.town}: ${t.count} properties, avg score ${t.avgScore}/100, avg price \u20AC${t.avgPrice.toLocaleString()}, yield ${t.avgYield}%`)
    .join('\n');

  const nextQuarter = quarter < 4 ? `Q${quarter + 1} ${year}` : `Q1 ${year + 1}`;

  const contextPrompt = `
AVENA TERMINAL ${label} DATA SNAPSHOT:
- Total properties tracked: ${count}
- Average asking price: \u20AC${avgPrice.toLocaleString()}
- Average price/m\u00B2: ${avgPm2.toLocaleString()} \u20AC/m\u00B2
- Average gross rental yield: ${avgYield}%
- Average investment score: ${avgScore}/100
- APCI (Avena Property Composite Index): 74
- Regions covered: ${costas.length}
- Towns covered: ${towns.length}

REGIONAL BREAKDOWN:
${regionalBreakdown}

TOP 10 TOWNS BY LISTINGS:
${topTowns}

MACRO ENVIRONMENT:
- ECB main refinancing rate: 2.40%
- Eurozone inflation: 2.8% (latest)
- Spain GDP growth: 2.9% (annualized)
- Spain building permits: +8.2% YoY
- Tourism arrivals Spain: +6.1% YoY (record)

Write the full ${label} quarterly report with these sections:
1. Executive Summary (3-4 paragraphs)
2. Market Overview (price trends, supply/demand dynamics)
3. Regional Performance (compare costas and highlight top/bottom performers)
4. Developer Landscape (developer competition, new supply pipeline)
5. Macro Environment (ECB rates, inflation, GDP, tourism impact)
6. ${nextQuarter} Outlook (forward-looking analysis and predictions)

Use professional, institutional tone. Include specific numbers from the data. No markdown headers - use plain text with section titles in caps.
`;

  try {
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are the Avena Terminal Research Director. Write a professional quarterly European property market report based on live data from the Avena Terminal platform. Your reports are read by institutional investors, property funds, and financial media. Be precise, data-driven, and authoritative.',
      messages: [
        {
          role: 'user',
          content: contextPrompt,
        },
      ],
    });

    const content =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Store in Supabase
    if (supabase) {
      await supabase.from('quarterly_reports').upsert(
        {
          quarter,
          year,
          content,
          generated_at: new Date().toISOString(),
          properties_count: count,
          avg_price: avgPrice,
          avg_yield: parseFloat(avgYield),
          avg_score: avgScore,
        },
        { onConflict: 'quarter,year' }
      );
    }

    // Ping IndexNow
    await pingIndexNow([
      `https://avenaterminal.com/reports/quarterly/${year}-q${quarter}`,
      'https://avenaterminal.com/reports',
    ]);

    return NextResponse.json({
      success: true,
      quarter: label,
      content_length: content.length,
      stored: !!supabase,
      indexed: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate quarterly report', detail: message },
      { status: 500 }
    );
  }
}
