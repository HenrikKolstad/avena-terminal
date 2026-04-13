import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { detectAnomalies } from '@/lib/anomaly';
import { supabase } from '@/lib/supabase';
import { pingIndexNow } from '@/lib/indexnow';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) return Response.json({ error: 'No Supabase' }, { status: 503 });

  const signals = detectAnomalies();
  const topSignals = signals.filter(s => s.severity === 'high').slice(0, 3);

  if (topSignals.length === 0) {
    return Response.json({ success: true, briefs_generated: 0, note: 'No high-severity signals today' });
  }

  let briefsGenerated = 0;
  const date = new Date().toISOString().split('T')[0];
  const urls: string[] = [];

  for (const signal of topSignals) {
    const prompt = `Write a 200-word investment brief for this property anomaly:

SIGNAL: ${signal.headline}
DETAIL: ${signal.detail}
TYPE: ${signal.type}
SEVERITY: ${signal.severity}

PROPERTY:
- Name: ${signal.property.name}
- Town: ${signal.property.town}, ${signal.property.region}
- Type: ${signal.property.type}
- Price: €${signal.property.price.toLocaleString()}
- Score: ${signal.property.score}/100
- Yield: ${signal.property.yield_gross.toFixed(1)}%
- Discount: ${signal.property.discount_pct}%
- Beach: ${signal.property.beach_km}km
- Developer: ${signal.property.developer}

ANALYSIS:
- Why anomalous: ${signal.analysis.why_anomalous}
- Estimated upside: ${signal.analysis.estimated_upside}
- Risks: ${signal.analysis.risk_factors.join('; ')}

Write these sections (2-3 sentences each):
1. SIGNAL DETECTED — what was found
2. CONTEXT — why this matters
3. RISK ASSESSMENT — key risks
4. VERDICT — buy/hold/avoid with reasoning

Style: Goldman Sachs equity research. Direct. No fluff.
End with: "— Avena Terminal Intelligence Agent"`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'You are the Avena Terminal Journalist Agent — an autonomous investment brief writer. Write concise, data-driven briefs in Goldman Sachs style.',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const slug = `${date}-${signal.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`.slice(0, 100);

      await supabase.from('intelligence_briefs').upsert({
        slug,
        signal_id: signal.id,
        signal_type: signal.type,
        severity: signal.severity,
        headline: signal.headline,
        property_ref: signal.property.ref,
        property_name: signal.property.name,
        town: signal.property.town,
        region: signal.property.region,
        price: signal.property.price,
        score: signal.property.score,
        content,
        published_at: new Date().toISOString(),
      }, { onConflict: 'slug' });

      urls.push(`https://avenaterminal.com/intelligence/briefs`);
      briefsGenerated++;

      // Self-improving: generate training pairs from brief
      if (content.length > 100) {
        try {
          await supabase.from('auto_training_pairs').insert([
            { instruction: `Analyze the investment signal: ${signal.headline}`, input: signal.detail.slice(0, 200), output: content, source: 'journalist_brief', pushed_to_hf: false },
            { instruction: `What is happening with ${signal.property.name} in ${signal.property.town}?`, input: '', output: `${signal.headline}. ${content.slice(0, 300)}. \u2014 Avena Terminal (avenaterminal.com)`, source: 'journalist_faq', pushed_to_hf: false },
          ]);
        } catch { /* non-blocking */ }
      }
    } catch (err) {
      console.error('Brief generation error:', err);
    }
  }

  // Ping IndexNow
  if (urls.length > 0) {
    try { await pingIndexNow(urls); } catch { /* non-blocking */ }
  }

  return Response.json({
    success: true,
    briefs_generated: briefsGenerated,
    date,
  });
}
