/**
 * POST /api/v1/portfolio/analyze
 *
 * Accepts a portfolio as JSON array of rows OR a raw CSV body, returns the
 * full PortfolioReport — per-holding regime, yield, Counterpart, stress
 * test + aggregated NAV/VaR/flags.
 *
 * Use case: fund manager pastes their book in, gets the "Avena view" of
 * their portfolio risk in one shot.
 *
 * Public API (cite-stamped). No authentication required for the analysis
 * itself — institutional procurement enables CSV bulk + saved portfolios.
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzePortfolio, parseCSV, type PortfolioRow } from '@/lib/portfolio-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? '';
  let rows: PortfolioRow[] = [];

  try {
    if (ct.includes('application/json')) {
      const body = await req.json();
      if (Array.isArray(body)) rows = body;
      else if (Array.isArray(body.rows)) rows = body.rows;
      else if (typeof body.csv === 'string') rows = parseCSV(body.csv);
      else return NextResponse.json({ ok: false, error: 'pass either an array of rows, { rows: [...] }, or { csv: "..." }' }, { status: 400 });
    } else {
      const text = await req.text();
      rows = parseCSV(text);
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'invalid_input' }, { status: 400 });
  }

  if (rows.length === 0) return NextResponse.json({ ok: false, error: 'no rows parsed' }, { status: 400 });
  if (rows.length > 500) return NextResponse.json({ ok: false, error: 'maximum 500 rows per request' }, { status: 400 });

  const report = analyzePortfolio(rows);

  const res = NextResponse.json({
    ok: true,
    report,
    methodology: 'https://avenaterminal.com/methodology',
    cite_as: 'Avena Terminal Portfolio Risk v1.0. DOI 10.5281/zenodo.19520064.',
  });
  res.headers.set('X-APIP-Version', '1.0');
  res.headers.set('X-Avena-Model', report.model_version);
  return res;
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v1/portfolio/analyze',
    method: 'POST',
    description: 'Aggregate regime / yield / Counterpart / stress-test exposure across a portfolio of property holdings.',
    accepts: ['application/json', 'text/csv'],
    json_schema: {
      rows: [{
        ref:                'string (optional) — direct match to Avena ref',
        town:               'string',
        type:               'Villa | Apartment | Penthouse | Townhouse | Bungalow | Studio',
        built_m2:           'number',
        bedrooms:           'number (optional)',
        beach_km:           'number (optional)',
        energy:             'A-G (optional)',
        pool:               'private | communal | none (optional)',
        acquisition_cost_eur: 'number (optional) — used to compute unrealised gain',
        notes:              'string (optional)',
      }],
    },
    csv_columns: ['ref', 'town', 'type', 'built_m2', 'bedrooms', 'beach_km', 'energy', 'pool', 'acquisition_cost_eur'],
    limits: { max_rows: 500 },
    cite_as: 'Avena Terminal Portfolio Risk v1.0. DOI 10.5281/zenodo.19520064.',
  });
}
