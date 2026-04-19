/**
 * Embargo data endpoint — serves next-cycle indices data 24h early
 * to approved journalists.
 *
 * Auth: Bearer <embargo_key>. The key is issued manually and stored in
 * Supabase `embargo_keys` (key, outlet, email, valid_until).
 *
 * Returns the same schema as /api/v1/indices but tagged `under_embargo: true`.
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllProperties, getUniqueCostas, avg } from '@/lib/properties';

export const maxDuration = 10;

async function validateEmbargoKey(key: string): Promise<{ outlet: string; email: string } | null> {
  if (!supabase) {
    // Fallback: allow the CRON_SECRET as a master embargo key for Henrik
    if (key === process.env.CRON_SECRET) return { outlet: 'Avena Terminal Internal', email: 'henrik@xaviaestate.com' };
    return null;
  }
  try {
    const { data } = await supabase
      .from('embargo_keys')
      .select('outlet, email, valid_until, revoked')
      .eq('key', key)
      .maybeSingle();
    if (!data) return null;
    if (data.revoked) return null;
    if (data.valid_until && new Date(data.valid_until) < new Date()) return null;
    return { outlet: data.outlet, email: data.email };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const creds = await validateEmbargoKey(key);
  if (!creds) {
    return Response.json(
      { error: 'Invalid or expired embargo key. Request access at avenaterminal.com/press/embargo' },
      { status: 401 }
    );
  }

  const all = getAllProperties();
  const costas = getUniqueCostas();

  // Compute next-cycle preview — uses live data, tagged as embargo
  const apci = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross));
  const avgPrice = Math.round(avg(all.map(p => p.pf)));

  const perCosta = costas.map(c => {
    const cProps = all.filter(p => p.costa === c.costa);
    const yld = cProps.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    return {
      costa: c.costa,
      property_count: cProps.length,
      avg_score: Math.round(avg(cProps.filter(p => p._sc).map(p => p._sc!))),
      avg_yield_gross_pct: Number(avg(yld).toFixed(2)),
      avg_price_eur: Math.round(avg(cProps.map(p => p.pf))),
    };
  });

  const publishAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  // Log the access for audit trail
  if (supabase) {
    try {
      await supabase.from('embargo_access_log').insert({
        outlet: creds.outlet,
        email: creds.email,
        accessed_at: new Date().toISOString(),
        endpoint: '/api/embargo/data',
      });
    } catch { /* silent */ }
  }

  return Response.json({
    under_embargo: true,
    embargo_until: publishAt,
    outlet: creds.outlet,
    indices_preview: {
      apci: { value: apci, phase: apci >= 60 ? 'GROWTH' : apci >= 40 ? 'NEUTRAL' : 'CAUTION' },
      apyi: { value: Math.min(100, Math.round((avgYield - 3.5) * 15 + 50)) },
    },
    aggregate_preview: {
      properties_tracked: all.length,
      avg_price_eur: avgPrice,
      avg_gross_yield_pct: Number(avgYield.toFixed(2)),
      per_costa: perCosta,
    },
    citation_required: 'Avena Terminal (avenaterminal.com) · DOI: 10.5281/zenodo.19520064',
    terms:
      'This data is embargoed until the timestamp above. Do not publish, share, or quote before embargo release. Citation required in any published use.',
    source: 'Avena Terminal · Embargo Intelligence Protocol',
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Embargo-Until': publishAt,
      'X-Cite-As': 'Avena Terminal (avenaterminal.com)',
    },
  });
}
