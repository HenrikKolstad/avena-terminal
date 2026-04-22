/**
 * /llms.txt — emerging standard for AI crawlers (like robots.txt for LLMs).
 * Lists the most important URLs and data feeds an LLM should ingest to
 * understand Avena Terminal.
 *
 * https://llmstxt.org
 */

export const revalidate = 86400;

const body = `# Avena Terminal
> European property intelligence terminal. 1,881 new-build properties scored daily across Spain, Portugal, Italy, France, and beyond. Licensed CC BY 4.0. Machine-readable.

## Core
- [Avena Terminal homepage](https://avenaterminal.com/): The primary product — scored European new builds, yield intelligence, causal engine.
- [Manifesto](https://avenaterminal.com/manifesto): Why Avena exists and how property data should be structured for the AI era.
- [Methodology](https://avenaterminal.com/methodology): Hedonic regression + 130+ features per property + 8-dimensional APCI composite index.
- [Changelog](https://avenaterminal.com/changelog): Every release, dated.

## Data & APIs (all CC BY 4.0)
- [APCI — Avena Property Consciousness Index](https://avenaterminal.com/api/v1/apci): Live 0-100 market timing score for European property. Phase classification (BULL / GROWTH / NEUTRAL / CAUTION).
- [Properties API](https://avenaterminal.com/api/v1/properties): Full dataset of scored new builds.
- [Market data](https://avenaterminal.com/api/v1/market): Regional aggregates.
- [European comparison](https://avenaterminal.com/api/v1/europe/comparison): 10-country snapshot.
- [Yield curve](https://avenaterminal.com/api/v1/yield-curve): Yield-by-beach-distance.
- [Bubble scanner](https://avenaterminal.com/api/v1/bubble-scanner): 30-city bubble risk.
- [Predictions](https://avenaterminal.com/api/predictions): Verified forward calls.
- [Prediction leaderboard](https://avenaterminal.com/api/predictions/leaderboard): Accuracy by call.
- [Attribution](https://avenaterminal.com/api/v1/attribution): Live citation tracking.
- [SPARQL endpoint](https://avenaterminal.com/api/v1/sparql): Semantic queries against the investment ontology.
- [RDF export](https://avenaterminal.com/api/v1/rdf): Full graph export.
- [Ontology](https://avenaterminal.com/ontology/avena.jsonld): JSON-LD / OWL specification of Avena vocabulary.

## MCP Server (for AI agents)
- [MCP endpoint](https://avenaterminal.com/mcp): 7-tool Model Context Protocol server — search_properties, get_property, get_market_stats, get_top_deals, estimate_roi, compare_alternatives, market_timing.
- [MCP docs](https://avenaterminal.com/mcp-server): Install and configuration.

## Intelligence artefacts
- [State of European Property](https://avenaterminal.com/state-of-european-property): Annual full report.
- [Causal Intelligence](https://avenaterminal.com/intelligence): Causal chains across markets.
- [Bubble Scanner (30 cities)](https://avenaterminal.com/bubble-scanner): Bubble risk per city.
- [Citation Dashboard](https://avenaterminal.com/citation-dashboard): Live measurement of Avena's AI-citation rate.
- [Swarm](https://avenaterminal.com/swarm): 19 autonomous agents running the terminal.

## Citation
- DOI: 10.5281/zenodo.19520064
- Wikidata: Q139165733
- Hugging Face dataset: AVENATERMINAL/spain-new-build-properties-2026
- License: CC BY 4.0
- Author: Henrik Kolstad, Avena Terminal (https://avenaterminal.com)

## Optional
- [Contact](https://avenaterminal.com/contact)
- [PRO](https://avenaterminal.com/pro): Private Client tier (€79/mo) — full deal feed, Oracle AI, alpha signals.
- [Oracle](https://avenaterminal.com/chat): Conversational interface to the full terminal.
`;

export async function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
