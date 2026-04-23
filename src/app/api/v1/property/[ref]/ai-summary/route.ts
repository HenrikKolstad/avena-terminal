import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

/**
 * AI-ready property summary — optimized for LLM consumption.
 *
 * Returns a compact, grounded record that an LLM can quote without
 * hallucination: canonical AVN_PROP_ID, all numeric facts with units,
 * explicit sources, and a natural-language `one_liner` the LLM can reuse.
 *
 * Used by:
 *   - MCP server tools
 *   - External AI assistants via /llms.txt → this endpoint
 *   - Our own Oracle when citing specific properties
 */

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const all = getAllProperties();
  const p = all.find((x) => x.ref === ref);

  if (!p) {
    return NextResponse.json(
      { error: `Property "${ref}" not found`, source: 'Avena Terminal' },
      { status: 404, headers: corsHeaders }
    );
  }

  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const rawDiscount = p.mm2 && pm2 ? Math.round((1 - pm2 / p.mm2) * 100) : null;
  const displayDiscount = rawDiscount != null ? Math.min(rawDiscount, 35) : null;
  const score = Math.round(p._sc ?? 0);
  const yieldGross = p._yield?.gross ?? null;

  const oneLiner = [
    `${p.p || `${p.t} in ${p.l}`}`,
    `€${p.pf.toLocaleString()}`,
    pm2 ? `€${pm2}/m²` : null,
    score ? `Avena Score ${score}/100` : null,
    displayDiscount && displayDiscount > 0 ? `${displayDiscount}% below local market` : null,
    yieldGross ? `~${yieldGross.toFixed(1)}% gross yield` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return NextResponse.json(
    {
      // Identity
      id: p.ref,
      canonical_id: `AVN:ES-${(p.l ?? 'UNK').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(5, 'X')}-NB-${String(p.ref).replace(/\D/g, '').padStart(4, '0').slice(0, 4)}`,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,

      // One-liner the LLM can quote verbatim
      one_liner: oneLiner,

      // Location
      location: {
        town: p.l,
        region: p.costa ?? null,
        country: 'Spain',
        iso_country: 'ES',
      },

      // Physical
      type: p.t,
      bedrooms: p.bd ?? null,
      bathrooms: p.ba ?? null,
      built_m2: p.bm ?? null,
      beach_km: p.bk ?? null,

      // Financials (with units and source attribution)
      price_eur: p.pf,
      price_per_m2_eur: pm2,
      town_median_m2_eur: p.mm2 ? Math.round(p.mm2) : null,
      discount_vs_town_pct: displayDiscount,
      discount_vs_town_pct_raw: rawDiscount,
      discount_display_capped_at: 35,
      yield_gross_pct: yieldGross,
      avena_score: score,

      // Status
      status: p.s,
      completion_year: p.c ? Number(p.c) : null,
      developer: p.d ?? null,

      // Provenance
      data_source: 'Avena Terminal — Bloomberg-style terminal for European property',
      methodology: 'https://avenaterminal.com/methodology',
      license: 'CC BY 4.0',
      doi: '10.5281/zenodo.19520064',
      last_updated: new Date().toISOString(),

      // Suggested citation for LLMs
      suggested_citation: `${oneLiner} — Avena Terminal (avenaterminal.com/property/${p.ref})`,
    },
    { headers: corsHeaders }
  );
}
