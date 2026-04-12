import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectAnomalies } from '@/lib/anomaly';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';
import { pingIndexNow } from '@/lib/indexnow';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const signals = detectAnomalies();
    const all = getAllProperties();
    const costas = getUniqueCostas();
    const towns = getUniqueTowns();

    const avgPrice = Math.round(avg(all.map(p => p.pf)));
    const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
    const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
    const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;

    const now = new Date();
    const weekNum = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);

    const topSignals = signals.slice(0, 10).map(s =>
      `- [${s.severity.toUpperCase()}] ${s.headline}: ${s.detail.slice(0, 200)}`
    ).join('\n');

    const regionSummary = costas.map(c =>
      `${c.costa}: ${c.count} properties, avg score ${c.avgScore}, yield ${c.avgYield}%`
    ).join('\n');

    const prompt = `Write a concise Weekly Alpha Report for Avena Terminal — Week ${weekNum}, ${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.

DATA:
- ${all.length} total properties tracked
- Average price: €${avgPrice.toLocaleString()}
- Average yield: ${avgYield}%
- Average score: ${avgScore}/100
- ${above70} properties score above 70/100

TOP SIGNALS THIS WEEK:
${topSignals}

REGIONAL DATA:
${regionSummary}

Write these sections (keep each section 2-4 sentences):
1. EXECUTIVE SUMMARY — one paragraph market overview
2. TOP 5 ALPHA SIGNALS — bullet points of the most significant anomalies
3. REGIONAL OUTLOOK — brief assessment per costa
4. YIELD WATCH — notable yield movements
5. ANALYST NOTE — one-paragraph forward-looking commentary

Style: Goldman Sachs research note. Direct. Data-heavy. No fluff.
End with: "— Avena Terminal Intelligence Agent"`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are the Avena Terminal Intelligence Agent — an autonomous property market analyst. Write concise, data-driven research notes in Goldman Sachs style.',
      messages: [{ role: 'user', content: prompt }],
    });

    const report = response.content[0].type === 'text' ? response.content[0].text : '';

    if (supabase && report) {
      const slug = `week-${weekNum}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await supabase.from('weekly_alpha').upsert({
        slug,
        week_num: weekNum,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        content: report,
        signals_count: signals.length,
        high_count: signals.filter(s => s.severity === 'high').length,
        total_properties: all.length,
        avg_score: avgScore,
        avg_yield: Number(avgYield),
        published_at: now.toISOString(),
      }, { onConflict: 'slug' });

      try {
        await pingIndexNow([`https://avenaterminal.com/intelligence/signals`]);
      } catch { /* non-blocking */ }
    }

    return Response.json({
      success: true,
      week: weekNum,
      signals_analyzed: signals.length,
      report_length: report.length,
    });
  } catch (err) {
    console.error('Weekly alpha error:', err);
    return Response.json({ error: 'Report generation failed' }, { status: 500 });
  }
}
