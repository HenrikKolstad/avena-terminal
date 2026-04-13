import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET — generate or fetch latest digest
export async function GET(req: NextRequest) {
  const generate = req.nextUrl.searchParams.get('generate') === 'true';
  const authHeader = req.headers.get('authorization');

  if (generate && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  // If not generating, return latest digest
  if (!generate) {
    const { data } = await supabase
      .from('digest_issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return Response.json(data[0], { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } });
    }
    return Response.json({ message: 'No digest published yet' });
  }

  // Generate new digest
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const signals = detectAnomalies();
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;

  const topSignals = signals.slice(0, 3).map(s => `[${s.severity.toUpperCase()}] ${s.headline}`).join('\n');
  const regionData = costas.map(c => `${c.costa}: ${c.count} props, score ${c.avgScore}, yield ${c.avgYield}%`).join('\n');

  const now = new Date();
  const weekNum = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
  const weekLabel = `Week ${weekNum}, ${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: 'You are the Avena Terminal Journalist Agent. Write a professional weekly property intelligence digest. Goldman Sachs research style. Concise. Data-driven. Each section 2-3 sentences max.',
    messages: [{
      role: 'user',
      content: `Write the Avena Intelligence Digest for ${weekLabel}.

DATA:
${all.length} properties tracked. Avg price: \u20AC${avgPrice.toLocaleString()}. Avg yield: ${avgYield}%. Avg score: ${avgScore}/100. ${above70} score above 70.

REGIONS:
${regionData}

TOP SIGNALS:
${topSignals}

MACRO: ECB rate 2.40% (falling), EUR/GBP 0.856, Spain inflation 2.8%, GDP 2.9%, foreign buyers 19.3%.

Write these sections:
1. MARKET REGIME STATUS (current regime + change from last week)
2. TOP SIGNALS THIS WEEK (top 3 with brief analysis)
3. MACRO SNAPSHOT (ECB, FX, inflation — what it means for buyers)
4. REGIONAL PULSE (1 sentence per costa)
5. THE NUMBER (one surprising stat from the data)
6. AVENA INSIGHT (one forward-looking observation nobody else has)

End with: "— Avena Terminal Intelligence Digest | avenaterminal.com"`,
    }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';

  const slug = `week-${weekNum}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await supabase.from('digest_issues').upsert({
    slug,
    week_label: weekLabel,
    content,
    total_properties: all.length,
    avg_score: avgScore,
    avg_yield: Number(avgYield),
    signals_count: signals.length,
    created_at: now.toISOString(),
  }, { onConflict: 'slug' });

  return Response.json({
    success: true,
    slug,
    week: weekLabel,
    content_length: content.length,
  });
}
