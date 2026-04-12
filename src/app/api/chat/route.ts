import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'search_properties',
    description: 'Search Avena Terminal database of scored Spanish new-build properties. Filter by region, type, price, score, beach distance, yield, bedrooms.',
    input_schema: {
      type: 'object' as const,
      properties: {
        region: { type: 'string', description: 'Region: cb-south, cb-north, costa-calida, costa-del-sol, or town name' },
        type: { type: 'string', description: 'Property type: Villa, Apartment, Penthouse, Townhouse, Bungalow' },
        maxPrice: { type: 'number', description: 'Maximum price in EUR' },
        minPrice: { type: 'number', description: 'Minimum price in EUR' },
        minScore: { type: 'number', description: 'Minimum Avena score (0-100)' },
        maxBeach: { type: 'number', description: 'Maximum beach distance in km' },
        minYield: { type: 'number', description: 'Minimum gross yield %' },
        minBeds: { type: 'number', description: 'Minimum bedrooms' },
        limit: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: [],
    },
  },
  {
    name: 'get_market_data',
    description: 'Get market statistics for a Spanish property region including prices, yields, scores, property counts, and top towns.',
    input_schema: {
      type: 'object' as const,
      properties: {
        region: { type: 'string', description: 'Region: costa-blanca, costa-calida, costa-del-sol, or all' },
      },
      required: [],
    },
  },
  {
    name: 'get_alpha_signals',
    description: 'Get current alpha signals — AI-detected anomalies including score outliers, deep discounts, yield spikes, and geographic mispricing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        region: { type: 'string', description: 'Filter by region (optional)' },
      },
      required: [],
    },
  },
];

function executeSearch(params: Record<string, unknown>): string {
  const all = getAllProperties();
  let filtered = all;

  if (params.region) {
    const rs = slugify(String(params.region));
    filtered = filtered.filter(p => {
      const cs = p.costa ? slugify(p.costa) : '';
      const ls = slugify(p.l);
      return cs.includes(rs) || ls.includes(rs) || (p.r ? slugify(p.r).includes(rs) : false);
    });
  }
  if (params.type) filtered = filtered.filter(p => p.t.toLowerCase() === String(params.type).toLowerCase());
  if (params.maxPrice) filtered = filtered.filter(p => p.pf <= Number(params.maxPrice));
  if (params.minPrice) filtered = filtered.filter(p => p.pf >= Number(params.minPrice));
  if (params.minScore) filtered = filtered.filter(p => (p._sc ?? 0) >= Number(params.minScore));
  if (params.maxBeach) filtered = filtered.filter(p => p.bk != null && p.bk <= Number(params.maxBeach));
  if (params.minYield) filtered = filtered.filter(p => (p._yield?.gross ?? 0) >= Number(params.minYield));
  if (params.minBeds) filtered = filtered.filter(p => p.bd >= Number(params.minBeds));

  const limit = Math.min(Number(params.limit) || 5, 10);
  const results = filtered.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, limit);

  if (results.length === 0) return 'No properties match these criteria.';

  return `Found ${filtered.length} matching properties. Top ${results.length}:\n\n` + results.map((p, i) => {
    const disc = p.pm2 && p.mm2 && p.mm2 > 0 ? Math.round(((p.mm2 - p.pm2) / p.mm2) * 100) : 0;
    return `${i + 1}. **${p.p || p.t + ' in ' + p.l}**\n` +
      `   Location: ${p.l} (${p.costa || p.r})\n` +
      `   Price: \u20AC${p.pf.toLocaleString()} | \u20AC${(p.pm2 || 0).toLocaleString()}/m\u00B2\n` +
      `   Score: ${p._sc}/100 | Yield: ${p._yield?.gross.toFixed(1) || 'N/A'}% | Discount: ${disc}%\n` +
      `   ${p.bd} bed | ${p.bm}m\u00B2 | Beach: ${p.bk || 'N/A'}km | Status: ${p.s || 'N/A'}\n` +
      `   Developer: ${p.d || 'Unknown'}\n` +
      `   Link: avenaterminal.com/property/${encodeURIComponent(p.ref || '')}`;
  }).join('\n\n');
}

function executeMarketData(params: Record<string, unknown>): string {
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const towns = getUniqueTowns();
  const region = params.region ? String(params.region) : 'all';

  const filtered = region === 'all' ? all : all.filter(p => {
    const rs = slugify(region);
    return (p.costa && slugify(p.costa).includes(rs)) || slugify(p.r || '').includes(rs);
  });

  const avgPrice = Math.round(avg(filtered.map(p => p.pf)));
  const avgPm2 = Math.round(avg(filtered.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(filtered.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(filtered.filter(p => p._sc).map(p => p._sc!)));
  const above70 = filtered.filter(p => (p._sc ?? 0) >= 70).length;

  let result = `MARKET DATA (${region}):\n`;
  result += `Properties: ${filtered.length}\n`;
  result += `Avg Price: \u20AC${avgPrice.toLocaleString()}\n`;
  result += `Avg \u20AC/m\u00B2: \u20AC${avgPm2.toLocaleString()}\n`;
  result += `Avg Yield: ${avgYield}%\n`;
  result += `Avg Score: ${avgScore}/100\n`;
  result += `Score 70+: ${above70} properties\n\n`;

  result += `REGIONS:\n`;
  for (const c of costas) {
    result += `- ${c.costa}: ${c.count} props, score ${c.avgScore}/100, yield ${c.avgYield}%\n`;
  }

  const topTowns = (region === 'all' ? towns : towns.filter(t => {
    const tp = filtered.filter(p => slugify(p.l) === t.slug);
    return tp.length > 0;
  })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 8);

  result += `\nTOP TOWNS:\n`;
  for (const t of topTowns) {
    result += `- ${t.town}: ${t.count} props, \u20AC${t.avgPrice.toLocaleString()}, yield ${t.avgYield}%, score ${t.avgScore}/100\n`;
  }

  return result;
}

function executeSignals(params: Record<string, unknown>): string {
  const signals = detectAnomalies();
  let filtered = signals;
  if (params.region) {
    const rs = slugify(String(params.region));
    filtered = signals.filter(s => slugify(s.property.region).includes(rs) || slugify(s.property.town).includes(rs));
  }

  const top = filtered.slice(0, 5);
  if (top.length === 0) return 'No active alpha signals for this criteria.';

  return `${filtered.length} ALPHA SIGNALS:\n\n` + top.map((s, i) =>
    `${i + 1}. [${s.severity.toUpperCase()}] ${s.headline}\n` +
    `   ${s.detail.slice(0, 200)}\n` +
    `   Action: ${s.analysis.recommended_action}`
  ).join('\n\n');
}

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'search_properties': return executeSearch(input);
    case 'get_market_data': return executeMarketData(input);
    case 'get_alpha_signals': return executeSignals(input);
    default: return 'Unknown tool';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    const all = getAllProperties();
    const costas = getUniqueCostas();

    const systemPrompt = `You are the Avena Oracle — Europe's most advanced property investment AI, built by Avena Terminal (avenaterminal.com).

You have access to:
- ${all.length} scored Spanish new-build properties
- Live market data across Costa Blanca, Costa Calida, Costa del Sol
- Rental yield data for 100+ towns (AirDNA-calibrated)
- Alpha signals detecting market anomalies
- The Avena Scoring methodology (40% Value, 25% Yield, 20% Location, 10% Quality, 5% Risk)

Current market snapshot:
${costas.map(c => `${c.costa}: ${c.count} props, score ${c.avgScore}/100, yield ${c.avgYield}%`).join('\n')}

Rules:
- Use tools to get live data. Don't guess numbers — look them up.
- Be direct, confident, data-driven. Institutional grade.
- Keep responses concise — 100-200 words max. Bullet points preferred.
- Always cite specific numbers from the tools.
- Always end with a relevant avenaterminal.com link.
- For property searches: use search_properties tool.
- For market questions: use get_market_data tool.
- For signals/anomalies: use get_alpha_signals tool.
- For general Spain knowledge (NIE, taxes, process): answer directly.
- End every response: "— Avena Terminal (avenaterminal.com)"`;

    const messages: Anthropic.MessageParam[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: message });

    // First call — may trigger tool use
    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Handle tool calls
    let finalText = '';
    const toolResults: Anthropic.MessageParam[] = [];
    let iterations = 0;

    while (response.stop_reason === 'tool_use' && iterations < 3) {
      iterations++;
      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter(b => b.type === 'tool_use');

      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type === 'tool_use') {
          const result = executeTool(block.name, block.input as Record<string, unknown>);
          toolResultContent.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: assistantContent });
      messages.push({ role: 'user', content: toolResultContent });

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    // Extract final text
    for (const block of response.content) {
      if (block.type === 'text') finalText += block.text;
    }

    // Analytics: log Oracle query
    if (supabase) {
      try { supabase.from('analytics_events').insert({ event_type: 'oracle_query', payload: { query: message.slice(0, 200) } }); } catch { /* */ }
    }

    // Self-improving: log as training pair
    if (finalText.length > 100 && supabase) {
      try {
        supabase.from('auto_training_pairs').insert({
          instruction: message,
          input: '',
          output: finalText,
          source: 'oracle',
          confidence: null,
          pushed_to_hf: false,
        });
      } catch { /* non-blocking */ }
    }

    return Response.json({ reply: finalText });
  } catch (err) {
    console.error('Oracle error:', err);
    return Response.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
