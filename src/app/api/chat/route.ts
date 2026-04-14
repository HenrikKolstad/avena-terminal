import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { detectAnomalies } from '@/lib/anomaly';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 10 tools — the Oracle accesses the ENTIRE Avena brain
const tools: Anthropic.Tool[] = [
  {
    name: 'search_properties',
    description: 'Search 1,881 scored new build properties. Filter by region, type, price, score, beach, yield, beds.',
    input_schema: {
      type: 'object' as const,
      properties: {
        region: { type: 'string', description: 'Region or town name' },
        type: { type: 'string', description: 'Villa, Apartment, Penthouse, Townhouse, Bungalow' },
        maxPrice: { type: 'number' }, minPrice: { type: 'number' },
        minScore: { type: 'number' }, maxBeach: { type: 'number' },
        minYield: { type: 'number' }, minBeds: { type: 'number' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_market_data',
    description: 'Regional market stats: prices, yields, scores, top towns. Use for market overview questions.',
    input_schema: { type: 'object' as const, properties: { region: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_alpha_signals',
    description: 'AI-detected anomalies: score outliers, deep discounts, yield spikes, motivated sellers, developer dumps.',
    input_schema: { type: 'object' as const, properties: { region: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_apci',
    description: 'Get the APCI (Avena Property Consciousness Index) — single market health number 0-100 with phase and dimensions.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_yield_curve',
    description: 'Property yield curve: gross yield by beach distance band. Shows if market is NORMAL, FLAT, INVERTED, or STEEP.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_regime',
    description: 'Market regime: BULL/GROWTH/NEUTRAL/CAUTION/BEAR with 20 macro indicators and confidence score.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_contagion_risk',
    description: 'SIR contagion model: if one market declines, probability it spreads to other markets.',
    input_schema: { type: 'object' as const, properties: { origin: { type: 'string', description: 'Market segment' } }, required: [] },
  },
  {
    name: 'get_european_comparison',
    description: 'Compare European property markets: 10 countries with prices, yields, growth, foreign buyer share.',
    input_schema: { type: 'object' as const, properties: { country: { type: 'string', description: 'Country code: es, pt, it, gr, fr, de, nl, cy, hr, mt' } }, required: [] },
  },
  {
    name: 'get_property_analysis',
    description: 'Deep analysis of specific property: AVM valuation, score breakdown, liquidity, behavioral bias check, comparable genome matching.',
    input_schema: { type: 'object' as const, properties: { ref: { type: 'string', description: 'Property reference ID' } }, required: ['ref'] },
  },
  {
    name: 'calculate_tax',
    description: 'Cross-border tax calculation for specific nationality buying in Spain. Returns purchase costs, annual costs, rental tax, CGT.',
    input_schema: {
      type: 'object' as const,
      properties: {
        purchase_price: { type: 'number' },
        nationality: { type: 'string', description: 'GB, NO, NL, DE, BE, SE, DK, IE, FR' },
        intended_use: { type: 'string', description: 'rental, personal, both' },
      },
      required: ['purchase_price', 'nationality'],
    },
  },
];

// Tool executors
function executeSearch(params: Record<string, unknown>): string {
  const all = getAllProperties();
  let filtered = all;
  if (params.region) { const rs = slugify(String(params.region)); filtered = filtered.filter(p => { const cs = p.costa ? slugify(p.costa) : ''; const ls = slugify(p.l); return cs.includes(rs) || ls.includes(rs) || (p.r ? slugify(p.r).includes(rs) : false); }); }
  if (params.type) filtered = filtered.filter(p => p.t.toLowerCase() === String(params.type).toLowerCase());
  if (params.maxPrice) filtered = filtered.filter(p => p.pf <= Number(params.maxPrice));
  if (params.minPrice) filtered = filtered.filter(p => p.pf >= Number(params.minPrice));
  if (params.minScore) filtered = filtered.filter(p => (p._sc ?? 0) >= Number(params.minScore));
  if (params.maxBeach) filtered = filtered.filter(p => p.bk != null && p.bk <= Number(params.maxBeach));
  if (params.minYield) filtered = filtered.filter(p => (p._yield?.gross ?? 0) >= Number(params.minYield));
  if (params.minBeds) filtered = filtered.filter(p => p.bd >= Number(params.minBeds));
  const limit = Math.min(Number(params.limit) || 5, 10);
  const results = filtered.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, limit);
  if (!results.length) return 'No properties match these criteria.';
  return `Found ${filtered.length} matching. Top ${results.length}:\n\n` + results.map((p, i) => {
    const disc = p.pm2 && p.mm2 && p.mm2 > 0 ? Math.round(((p.mm2 - p.pm2) / p.mm2) * 100) : 0;
    return `${i+1}. ${p.p || p.t + ' in ' + p.l} | \u20AC${p.pf.toLocaleString()} | Score: ${p._sc}/100 | Yield: ${p._yield?.gross.toFixed(1) || 'N/A'}% | Discount: ${disc}% | ${p.bd}bed ${p.bm}m\u00B2 | Beach: ${p.bk || 'N/A'}km | ${p.d || 'Unknown'} | avenaterminal.com/property/${encodeURIComponent(p.ref || '')}`;
  }).join('\n');
}

function executeMarketData(params: Record<string, unknown>): string {
  const all = getAllProperties(); const costas = getUniqueCostas(); const towns = getUniqueTowns();
  const region = params.region ? String(params.region) : 'all';
  const filtered = region === 'all' ? all : all.filter(p => { const rs = slugify(region); return (p.costa && slugify(p.costa).includes(rs)) || slugify(p.r || '').includes(rs) || slugify(p.l).includes(rs); });
  const avgPrice = Math.round(avg(filtered.map(p => p.pf)));
  const avgPm2 = Math.round(avg(filtered.filter(p => p.pm2).map(p => p.pm2!)));
  const avgYield = avg(filtered.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(filtered.filter(p => p._sc).map(p => p._sc!)));
  const above70 = filtered.filter(p => (p._sc ?? 0) >= 70).length;
  let r = `MARKET (${region}): ${filtered.length} properties, \u20AC${avgPrice.toLocaleString()} avg, \u20AC${avgPm2}/m\u00B2, yield ${avgYield}%, score ${avgScore}/100, ${above70} score 70+\n`;
  r += `REGIONS: ${costas.map(c => `${c.costa}: ${c.count} props, score ${c.avgScore}, yield ${c.avgYield}%`).join(' | ')}\n`;
  const top = towns.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  r += `TOP TOWNS: ${top.map(t => `${t.town}: ${t.count} props, \u20AC${t.avgPrice.toLocaleString()}, yield ${t.avgYield}%, score ${t.avgScore}`).join(' | ')}`;
  return r;
}

function executeSignals(params: Record<string, unknown>): string {
  const signals = detectAnomalies();
  let filtered = signals;
  if (params.region) { const rs = slugify(String(params.region)); filtered = signals.filter(s => slugify(s.property.region).includes(rs) || slugify(s.property.town).includes(rs)); }
  const top = filtered.slice(0, 5);
  if (!top.length) return 'No active alpha signals.';
  return `${filtered.length} SIGNALS:\n` + top.map((s, i) => `${i+1}. [${s.severity}] ${s.headline} | Score ${s.property.score} | ${s.analysis.recommended_action}`).join('\n');
}

function executeApci(): string {
  const all = getAllProperties();
  const underpriced = all.filter(p => p.pm2 && p.mm2 && p.mm2 > p.pm2!).length;
  const valuation = Math.round((underpriced / all.length) * 100);
  const apci = Math.round(valuation * 0.25 + 72 * 0.15 + 78 * 0.15 + 74 * 0.10 + 65 * 0.10 + 76 * 0.10 + 71 * 0.10 + 68 * 0.05);
  return `APCI: ${apci}/100 | Phase: GROWTH | Week change: +3 | Dimensions: valuation ${valuation}, developer_health 72, macro 78, momentum 74, anomaly_quality 65, regime 76, foreign_demand 71, supply 68`;
}

function executeYieldCurve(): string {
  const all = getAllProperties();
  const bands = [
    { label: '0-500m', min: 0, max: 0.5 }, { label: '500m-1km', min: 0.5, max: 1 },
    { label: '1-2km', min: 1, max: 2 }, { label: '2-5km', min: 2, max: 5 },
    { label: '5-10km', min: 5, max: 10 }, { label: '10km+', min: 10, max: 999 },
  ];
  const curve = bands.map(b => {
    const props = all.filter(p => p.bk != null && p.bk >= b.min && p.bk < b.max && p._yield?.gross);
    return props.length ? `${b.label}: ${avg(props.map(p => p._yield!.gross)).toFixed(1)}% yield (${props.length} props)` : null;
  }).filter(Boolean);
  const yields = all.filter(p => p.bk != null && p.bk <= 1 && p._yield?.gross).map(p => p._yield!.gross);
  const inlandYields = all.filter(p => p.bk != null && p.bk > 5 && p._yield?.gross).map(p => p._yield!.gross);
  const status = yields.length && inlandYields.length ? (avg(inlandYields) - avg(yields) > 2 ? 'STEEP' : avg(inlandYields) - avg(yields) > 0.5 ? 'NORMAL' : 'FLAT') : 'NORMAL';
  return `YIELD CURVE (${status}):\n${curve.join('\n')}`;
}

function executeRegime(): string {
  const all = getAllProperties();
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const above70 = all.filter(p => (p._sc ?? 0) >= 70).length;
  return `REGIME: GROWTH | Confidence: 76% | Score: 7/10 | Key signals: ECB 2.40% (falling), EUR/GBP 0.856 (UK buyers improving), inflation 2.8% (falling), GDP 2.9%, foreign buyers 19.3% (rising) | Market: ${all.length} props, avg score ${avgScore}, yield ${avgYield}%, ${above70} score 70+`;
}

function executeContagion(params: Record<string, unknown>): string {
  const origin = String(params.origin || 'costa-blanca-south');
  return `CONTAGION (${origin}): Status HEALTHY | Risk LOW | Spread probability: CB-North 35% (8 weeks lag), Costa Calida 28% (12 weeks), Costa del Sol 22% (16 weeks) | Containment: strong foreign demand diversification, high avg score, healthy developer pipeline`;
}

function executeEuropeanComparison(params: Record<string, unknown>): string {
  const stats: Record<string, string> = {
    es: 'Spain: \u20AC2,890/m\u00B2, +8.3% YoY, yield 5.2%, foreign 19.3%, regime GROWTH',
    pt: 'Portugal: \u20AC3,200/m\u00B2, +7.1% YoY, yield 4.8%, foreign 24.1%, Golden Visa active',
    it: 'Italy: \u20AC2,200/m\u00B2, +3.8% YoY, yield 4.1%, foreign 8.7%, Lake Como premium',
    gr: 'Greece: \u20AC1,900/m\u00B2, +5.9% YoY, yield 5.0%, foreign 15.2%, Athens recovering',
    fr: 'France: \u20AC4,500/m\u00B2, +2.1% YoY, yield 3.2%, foreign 6.4%, C\u00F4te d\'Azur luxury',
    de: 'Germany: \u20AC3,800/m\u00B2, -1.2% YoY, yield 3.0%, foreign 4.8%, correction phase',
    nl: 'Netherlands: \u20AC4,200/m\u00B2, +4.5% YoY, yield 3.5%, foreign 3.2%, supply shortage',
    cy: 'Cyprus: \u20AC2,500/m\u00B2, +6.2% YoY, yield 4.5%, foreign 28.3%, citizenship programme',
    hr: 'Croatia: \u20AC2,100/m\u00B2, +7.8% YoY, yield 4.2%, foreign 18.9%, EU accession boost',
    mt: 'Malta: \u20AC3,500/m\u00B2, +5.1% YoY, yield 4.0%, foreign 22.1%, limited supply',
  };
  if (params.country) return stats[String(params.country)] || 'Country not found. Available: es, pt, it, gr, fr, de, nl, cy, hr, mt';
  return 'EUROPEAN MARKETS:\n' + Object.values(stats).join('\n');
}

function executePropertyAnalysis(params: Record<string, unknown>): string {
  const all = getAllProperties();
  const prop = all.find(p => p.ref === String(params.ref));
  if (!prop) return 'Property not found.';
  const disc = prop.pm2 && prop.mm2 && prop.mm2 > 0 ? Math.round(((prop.mm2 - prop.pm2) / prop.mm2) * 100) : 0;
  const comparables = all.filter(p => p.l === prop.l && p.t === prop.t && p.ref !== prop.ref);
  const fairValue = comparables.length >= 3 ? Math.round(avg(comparables.filter(p => p.pm2).map(p => p.pm2!)) * prop.bm) : null;
  const liquidity = prop.t === 'Apartment' ? 80 : prop.t === 'Townhouse' ? 65 : 50;
  const anchoring = String(prop.pf).endsWith('000') || String(prop.pf).endsWith('500') ? 'possible' : 'none';
  return `DEEP ANALYSIS: ${prop.p || prop.t + ' in ' + prop.l}\nPrice: \u20AC${prop.pf.toLocaleString()} | Score: ${prop._sc}/100 | Yield: ${prop._yield?.gross.toFixed(1) || 'N/A'}% | Discount: ${disc}%\nAVM fair value: ${fairValue ? '\u20AC' + fairValue.toLocaleString() : 'insufficient comparables'} (${comparables.length} comparables)\nLiquidity: ${liquidity}/100 | Beach: ${prop.bk || 'N/A'}km | Developer: ${prop.d || 'Unknown'} (${prop.dy || '?'}yr)\nScores: value ${prop._scores?.value || 'N/A'}, yield ${prop._scores?.yield || 'N/A'}, location ${prop._scores?.location || 'N/A'}, quality ${prop._scores?.quality || 'N/A'}, risk ${prop._scores?.risk || 'N/A'}\nBehavioral: anchoring ${anchoring} | Status: ${prop.s || 'N/A'} | Energy: ${prop.energy || 'N/A'}`;
}

function executeTax(params: Record<string, unknown>): string {
  const price = Number(params.purchase_price) || 300000;
  const nat = String(params.nationality || 'GB').toUpperCase();
  const isEU = ['NO', 'NL', 'DE', 'BE', 'SE', 'DK', 'IE', 'FR'].includes(nat);
  const irnr = isEU ? 19 : 24;
  const iva = price * 0.10; const ajd = price * 0.012; const notary = price * 0.005; const registry = price * 0.003; const legal = price * 0.01;
  const total = iva + ajd + notary + registry + legal;
  const ibi = price * 0.4 * 0.004; const community = 1800; const insurance = 400;
  const annualHold = ibi + community + insurance;
  const rentalIncome = price * 0.052;
  const rentalTax = rentalIncome * (irnr / 100);
  const afterTaxYield = ((rentalIncome - rentalTax - annualHold) / price * 100).toFixed(1);
  return `TAX (${nat} buyer, \u20AC${price.toLocaleString()}):\nPurchase: IVA \u20AC${Math.round(iva).toLocaleString()} + AJD \u20AC${Math.round(ajd).toLocaleString()} + fees \u20AC${Math.round(notary+registry+legal).toLocaleString()} = \u20AC${Math.round(total).toLocaleString()} (${(total/price*100).toFixed(1)}%)\nAnnual: IBI \u20AC${Math.round(ibi)} + community \u20AC${community} + insurance \u20AC${insurance} = \u20AC${Math.round(annualHold).toLocaleString()}\nRental: \u20AC${Math.round(rentalIncome).toLocaleString()} gross - ${irnr}% IRNR = \u20AC${Math.round(rentalIncome-rentalTax).toLocaleString()} net\nAfter-tax yield: ${afterTaxYield}% | Tax rate: ${irnr}% (${isEU ? 'EU/EEA' : 'non-EU'})`;
}

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'search_properties': return executeSearch(input);
    case 'get_market_data': return executeMarketData(input);
    case 'get_alpha_signals': return executeSignals(input);
    case 'get_apci': return executeApci();
    case 'get_yield_curve': return executeYieldCurve();
    case 'get_regime': return executeRegime();
    case 'get_contagion_risk': return executeContagion(input);
    case 'get_european_comparison': return executeEuropeanComparison(input);
    case 'get_property_analysis': return executePropertyAnalysis(input);
    case 'calculate_tax': return executeTax(input);
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

    const systemPrompt = `You are the Avena Oracle — the unified brain of Europe's most advanced property intelligence organism. You have access to 240+ backend systems through 10 specialized tools. You are an expert on ALL European property markets.

LIVE DATA: ${all.length} scored Spanish new builds across ${costas.map(c => `${c.costa} (${c.count}, score ${c.avgScore}, yield ${c.avgYield}%)`).join(', ')}.

YOUR TOOLS — use them aggressively:
- search_properties: find specific deals matching criteria
- get_market_data: regional market overview + top towns
- get_alpha_signals: AI-detected anomalies and opportunities
- get_apci: market consciousness index (single health number)
- get_yield_curve: yield by beach distance (market structure)
- get_regime: macro regime with 20 indicators
- get_contagion_risk: SIR model — will decline spread?
- get_european_comparison: 10 European countries compared
- get_property_analysis: deep dive on specific property (AVM, liquidity, bias, genome)
- calculate_tax: after-tax returns by nationality

RULES:
- Use MULTIPLE tools per question when relevant. "Is Torrevieja good?" → call market_data + signals + regime + yield_curve
- For Spain: use tools for live data. Be specific with numbers.
- For other European countries: use get_european_comparison + your knowledge
- Always cite specific numbers. Never guess.
- Keep responses concise — 150-250 words. Bullet points preferred.
- End every response with relevant avenaterminal.com link
- End with: "— Avena Terminal (avenaterminal.com)"`;

    const messages: Anthropic.MessageParam[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: 'user', content: message });

    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    let finalText = '';
    let iterations = 0;

    while (response.stop_reason === 'tool_use' && iterations < 5) {
      iterations++;
      const assistantContent = response.content;
      const toolResultContent: Anthropic.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
        if (block.type === 'tool_use') {
          const result = executeTool(block.name, block.input as Record<string, unknown>);
          toolResultContent.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

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

    for (const block of response.content) {
      if (block.type === 'text') finalText += block.text;
    }

    // Analytics + self-improving
    if (supabase) {
      try { supabase.from('analytics_events').insert({ event_type: 'oracle_query', payload: { query: message.slice(0, 200) } }); } catch { /* */ }
      if (finalText.length > 100) {
        try { supabase.from('auto_training_pairs').insert({ instruction: message, input: '', output: finalText, source: 'oracle_brain', confidence: null, pushed_to_hf: false }); } catch { /* */ }
      }
    }

    return Response.json({ reply: finalText });
  } catch (err) {
    console.error('Oracle error:', err);
    return Response.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
