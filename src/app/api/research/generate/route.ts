import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

const ROTATING_TOPICS = [
  { month: 0, topic: 'ECB Rate Sensitivity', prompt: 'Analyze how ECB interest rate changes impact Spanish coastal new-build property demand, pricing, and mortgage accessibility. Model the transmission mechanism from rate cuts to transaction volume.' },
  { month: 1, topic: 'Avena Score Validity', prompt: 'Evaluate the statistical validity of the Avena Score as a composite property rating. Test correlation with price appreciation, yield performance, and buyer satisfaction across different costas.' },
  { month: 2, topic: 'Foreign Demand Dynamics', prompt: 'Examine foreign buyer demand patterns in Spanish coastal property. Analyze nationality mix, FX sensitivity, seasonal patterns, and the impact of golden visa changes on transaction volumes.' },
  { month: 3, topic: 'Developer Stress Indicators', prompt: 'Identify early warning signals of developer financial stress in the Spanish new-build market. Analyze completion delays, discount patterns, and balance sheet indicators across the developer universe.' },
  { month: 4, topic: 'Yield Optimization Strategies', prompt: 'Model optimal rental yield strategies for Spanish coastal new builds. Compare short-term vs long-term rental, seasonal pricing, and the impact of location, property type, and amenities on net yield.' },
  { month: 5, topic: 'Vision AI for Property Valuation', prompt: 'Explore how computer vision and AI can enhance property valuation accuracy. Analyze image-based quality signals, view premiums, and finish-level detection in new-build listings.' },
  { month: 6, topic: 'ECB Rate Sensitivity', prompt: 'Analyze how ECB interest rate changes impact Spanish coastal new-build property demand, pricing, and mortgage accessibility. Model the transmission mechanism from rate cuts to transaction volume.' },
  { month: 7, topic: 'Avena Score Validity', prompt: 'Evaluate the statistical validity of the Avena Score as a composite property rating. Test correlation with price appreciation, yield performance, and buyer satisfaction across different costas.' },
  { month: 8, topic: 'Foreign Demand Dynamics', prompt: 'Examine foreign buyer demand patterns in Spanish coastal property. Analyze nationality mix, FX sensitivity, seasonal patterns, and the impact of golden visa changes on transaction volumes.' },
  { month: 9, topic: 'Developer Stress Indicators', prompt: 'Identify early warning signals of developer financial stress in the Spanish new-build market. Analyze completion delays, discount patterns, and balance sheet indicators across the developer universe.' },
  { month: 10, topic: 'Yield Optimization Strategies', prompt: 'Model optimal rental yield strategies for Spanish coastal new builds. Compare short-term vs long-term rental, seasonal pricing, and the impact of location, property type, and amenities on net yield.' },
  { month: 11, topic: 'Vision AI for Property Valuation', prompt: 'Explore how computer vision and AI can enhance property valuation accuracy. Analyze image-based quality signals, view premiums, and finish-level detection in new-build listings.' },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentMonth = new Date().getMonth();

    let topic: string;
    let researchPrompt: string;

    if (body.topic) {
      const match = ROTATING_TOPICS.find(t => t.topic.toLowerCase() === body.topic.toLowerCase());
      topic = match?.topic ?? body.topic;
      researchPrompt = match?.prompt ?? `Write an in-depth research paper on: ${body.topic}`;
    } else {
      const rotation = ROTATING_TOPICS[currentMonth];
      topic = rotation.topic;
      researchPrompt = rotation.prompt;
    }

    // Build live market context
    const all = getAllProperties();
    const towns = getUniqueTowns();
    const costas = getUniqueCostas();
    const avgPrice = avg(all.map(p => p.pf));
    const avgPm2 = avg(all.filter(p => p.pm2 && p.pm2 > 0).map(p => p.pm2!));
    const avgScore = avg(all.filter(p => p._sc != null).map(p => p._sc!));
    const avgYield = avg(all.filter(p => p._yield).map(p => p._yield!.gross));
    const developers = [...new Set(all.map(p => p.d))];

    const marketContext = [
      `LIVE MARKET DATA (as of ${new Date().toISOString().split('T')[0]}):`,
      `- Total properties tracked: ${all.length}`,
      `- Unique towns: ${towns.length}`,
      `- Unique costas: ${costas.length}`,
      `- Developers tracked: ${developers.length}`,
      `- Average price: EUR ${Math.round(avgPrice).toLocaleString()}`,
      `- Average price/m2: EUR ${Math.round(avgPm2)}`,
      `- Average Avena Score: ${Math.round(avgScore)}/100`,
      `- Average gross yield: ${avgYield.toFixed(1)}%`,
      `- Top towns by volume: ${towns.slice(0, 5).map(t => `${t.town} (${t.count})`).join(', ')}`,
      `- Top costas: ${costas.slice(0, 5).map(c => `${c.costa} (${c.count})`).join(', ')}`,
      `- ECB rate: 2.40% (falling)`,
      `- EUR/GBP: 0.856`,
      `- Spain tourism: 96M annual visitors`,
      `- Costa Blanca YoY price growth: +9.4%`,
      `- Foreign buyer share: 19.3%`,
    ].join('\n');

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are a senior property research analyst at Avena Terminal, a quantitative real estate intelligence platform focused on Spanish coastal new builds. Write academic-quality research papers (800-1200 words) with rigorous analysis. Use the live market data provided as primary evidence. Structure every paper with these exact sections:

## Abstract
## 1. Introduction
## 2. Data & Methodology
## 3. Key Findings
## 4. Conclusion

Use specific numbers from the data. Be quantitative, not qualitative. Cite the Avena dataset as your primary source. Write in third person academic style.`,
      messages: [
        {
          role: 'user',
          content: `${researchPrompt}\n\n${marketContext}`,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const wordCount = content.split(/\s+/).length;

    // Extract title from first line or generate one
    const firstLine = content.split('\n').find(l => l.trim().length > 0) ?? topic;
    const title = firstLine.replace(/^#+\s*/, '').trim();

    // Store in Supabase
    if (supabase) {
      await supabase.from('research_papers_auto').insert({
        title,
        topic,
        content,
        word_count: wordCount,
        generated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      title,
      topic,
      content,
      word_count: wordCount,
      generated_at: new Date().toISOString(),
      market_snapshot: {
        total_properties: all.length,
        avg_score: Math.round(avgScore),
        avg_pm2: Math.round(avgPm2),
        avg_yield: Number(avgYield.toFixed(1)),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
