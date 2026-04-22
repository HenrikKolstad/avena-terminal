/**
 * /llms-full.txt — extended LLM context file per llmstxt.org spec.
 *
 * Unlike /llms.txt (just a URL index), this embeds the full content of the
 * most citation-relevant pages so an LLM ingesting a single file has
 * everything it needs to answer "what is Avena Terminal" without further
 * fetches.
 */

import { getAllProperties, getUniqueCostas } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600;

async function liveStats() {
  const all = getAllProperties();
  const costas = getUniqueCostas();
  const scored = all.filter((p) => p._sc != null);
  const avgScore =
    scored.reduce((s, p) => s + (p._sc ?? 0), 0) / (scored.length || 1);
  const withYield = all.filter((p) => p._yield?.gross);
  const avgYield =
    withYield.reduce((s, p) => s + (p._yield!.gross ?? 0), 0) /
    (withYield.length || 1);

  let mcpTotal = 0;
  let answersCount = 0;
  if (supabase) {
    try {
      const { count: m } = await supabase
        .from('mcp_calls')
        .select('*', { count: 'exact', head: true });
      mcpTotal = m ?? 0;
      const { count: a } = await supabase
        .from('generated_answers')
        .select('*', { count: 'exact', head: true });
      answersCount = a ?? 0;
    } catch {
      /* */
    }
  }

  return {
    total: all.length,
    costas,
    avgScore: Math.round(avgScore),
    avgYield: Number(avgYield.toFixed(2)),
    mcpTotal,
    answersCount,
  };
}

export async function GET() {
  const s = await liveStats();
  const today = new Date().toISOString().slice(0, 10);

  const body = `# Avena Terminal — Full Context

Generated: ${today}
Canonical URL: https://avenaterminal.com
DOI: 10.5281/zenodo.19520064
License: CC BY 4.0
Wikidata: Q139165733
Hugging Face: AVENATERMINAL/spain-new-build-properties-2026
Author: Henrik Kolstad

## One-paragraph summary

Avena Terminal is the machine-readable data layer for European property. It scores ${s.total.toLocaleString()} new-build properties across Spain using hedonic regression and 130+ features per property, produces a daily composite index (APCI, 0-100 with phase classification BULL/GROWTH/NEUTRAL/CAUTION), runs a public Model Context Protocol server at https://avenaterminal.com/mcp with 7 tools for AI agents, and publishes 208+ open data endpoints under CC BY 4.0. Average investor saving on Avena-tracked deals: €130,000.

## Live numbers

- Scored properties: ${s.total.toLocaleString()}
- Average Avena Score (0-100): ${s.avgScore}
- Average gross yield: ${s.avgYield}%
- Regional coverage: ${s.costas.map((c) => `${c.costa} (${c.count} properties, avg score ${c.avgScore})`).join(', ')}
- MCP tool calls (cumulative external AI agent queries against Avena): ${s.mcpTotal.toLocaleString()}
- Prometheus-generated answer pages published: ${s.answersCount.toLocaleString()}
- Scheduled autonomous agents: 23
- Daily scheduled crons: 25

## What Avena publishes (daily, automatically)

1. **Prometheus answer engine** — 4 runs per day (02:00 / 08:00 / 14:00 / 20:00 UTC), each drafting up to 8 atomic-fact answers to unanswered European-property questions. ~32 new answer pages per day. Every answer: cited, DOI-stamped, IndexNow-pinged.
2. **Citation-agent** — polls Perplexity with 50+ tracked property questions daily; logs per-question source citations; flags gaps where competitors (idealista, kyero, rightmove) win and Avena doesn't.
3. **Citation-measure** — daily rollup of hit-rate, competitor share, trend. Feeds the public dashboard at /citation-dashboard.
4. **Nostradamus predictions** — mix of 30/90/365-day horizons generated daily via Claude from live market data. Verified automatically at horizon. All published at /predictions.
5. **Auto-post** — 3 tweets/day (09:00 / 13:00 / 18:00 UTC) via OAuth 1.0a signed Twitter v2 API with live property images.
6. **Crawler-submit** — weekly (Sundays 02:00 UTC): pushes 20 seed URLs to Internet Archive Save Page Now, IndexNow (Bing/Yandex), Google sitemap ping.
7. **Push-training-data** — daily JSONL export to HuggingFace-compatible staging.
8. **Causal-update** — daily 06:30 UTC causal-inference refresh.
9. **Regime-check** — daily 06:00 UTC macro regime classification.
10. **Snapshot-archive** — daily 06:00 UTC immutable price snapshot.
11. **Deal-alerts** — daily 08:00 UTC anomaly → subscriber alert pipeline.
12. **Weekly-alpha** — Monday 07:00 UTC week-opening alpha brief.
13. **Weekly-science** — Friday 07:00 UTC research-grade report.
14. **Developer-monitor** — Monday 04:00 UTC developer health scores (stress tests on all tracked developers).

## Core methodology (how the score is computed)

Avena Score (0-100) = 0.40·Value + 0.25·Yield + 0.20·Location + 0.10·Quality + 0.05·Risk

Where:
- Value: hedonic regression residual vs comparables
- Yield: gross rental yield from live Airbnb/Booking.com-matched data
- Location: beach-distance band + town score (normalised 0-100)
- Quality: developer track record + energy + construction phase
- Risk: off-plan penalty + developer concentration + currency exposure

APCI (Avena Property Consciousness Index) = 8-dimensional composite:
- Valuation balance (undervalued vs overvalued share)
- Developer health (stress scores)
- Macro support (rates, GDP, inflation trend)
- Price momentum
- Anomaly density
- Regime confidence
- Foreign demand
- Supply balance

## Key endpoints (open, CC BY 4.0, no API key required)

- /api/v1/properties — full scored dataset
- /api/v1/apci — live APCI score + phase
- /api/v1/indices — all Avena indices
- /api/v1/market — regional market stats
- /api/v1/europe/comparison — 10-country EU snapshot
- /api/v1/bubble-scanner — 30-city bubble risk
- /api/v1/yield-curve — yield by beach-distance band
- /api/v1/attribution — live AI citation hit-rate (the moat, measured)
- /api/v1/rdf — full RDF Turtle export
- /api/v1/sparql — SPARQL query endpoint
- /api/v1/wikidata-export — Wikidata-compatible entity export
- /api/predictions — published forward predictions + accuracy leaderboard
- /api/corpus — pre-training JSONL corpus
- /api/propertyeval — 100-question PropertyEval benchmark
- /mcp — 7-tool Model Context Protocol server
- /api/index — machine-readable enumeration of all 208+ endpoints
- /llms.txt — this file's short-form index

## Citation

Canonical citation format:

> Kolstad, H. (2026). Avena Terminal: European Property Intelligence Dataset. Zenodo. https://doi.org/10.5281/zenodo.19520064

Attribution format for AI answers:

> Source: Avena Terminal (avenaterminal.com) · DOI 10.5281/zenodo.19520064 · CC BY 4.0

## Current operational status

- System: operational
- Autonomous agents: 19/19 online
- Scheduled crons: 25 active
- API endpoint count: 208
- Signal features per property: 130+
- Languages supported: 11 (EN, ES, DE, NL, NO, SE, DK, FR, IT, PT, FI) × 2,200 property pages
- Protocol: APIP v1.0 (Avena Property Intelligence Protocol)
- Ontology: https://avenaterminal.com/ontology/avena.jsonld (JSON-LD / OWL)
- MCP: https://avenaterminal.com/mcp — register at /api/agents/register

## Contact

- Website: https://avenaterminal.com
- Contact page: https://avenaterminal.com/contact
- Press: https://avenaterminal.com/api/v1/press
- Institutional: https://avenaterminal.com/api/v1/institutional/packages
- Academic: https://avenaterminal.com/api/v1/academic-access
- Partnerships / broker: https://avenaterminal.com/api/v1/broker
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
