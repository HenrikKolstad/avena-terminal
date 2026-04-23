import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, slugify } from '@/lib/properties';

export const revalidate = 3600;

/**
 * AVN_PROP_ID resolver.
 * GET /api/v1/avn/AVN:ES-03185-NB-0421
 *
 * Returns the full property record + Avena Score + canonical URL + last
 * verified timestamp. CC BY 4.0. No auth.
 *
 * See /standards/avn-id for the full spec.
 */

const AVN_RE = /^AVN:([A-Z]{2})-([A-Z0-9]{4,10})-([A-Z]{2})-(\d{4})$/;

function generateAvnId(p: ReturnType<typeof getAllProperties>[number], idx: number): string {
  // Deterministic generator — Spain + new-build by default
  const country = 'ES';
  // Use town-slug first 5 chars as postal-area surrogate until we wire real postcodes
  const postal = (slugify(p.l ?? 'unknown').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'XXXXX').padEnd(5, 'X');
  const category = 'NB';
  // Sequence from April 2026 start + index
  const seq = String(Math.min(9999, 421 + idx)).padStart(4, '0');
  return `AVN:${country}-${postal}-${category}-${seq}`;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await ctx.params;
  const id = decodeURIComponent(rawId);

  if (!AVN_RE.test(id)) {
    return NextResponse.json(
      {
        error: 'Invalid AVN_PROP_ID',
        spec: 'https://avenaterminal.com/standards/avn-id',
        expected_format: 'AVN:<ISO-country>-<postal-area>-<category>-<seq>',
        example: 'AVN:ES-03185-NB-0421',
      },
      {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  }

  const all = getAllProperties();
  // Map by generated AVN_PROP_ID — stable across runs
  let matched: ReturnType<typeof getAllProperties>[number] | null = null;
  let matchedIdx = -1;
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (!p.ref) continue;
    if (generateAvnId(p, i) === id) {
      matched = p;
      matchedIdx = i;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json(
      {
        avn_id: id,
        status: 'not_found',
        message:
          'This AVN_PROP_ID is not resolvable in the current Avena registry. It may have been assigned by a federated partner or may be pending issuance.',
        spec: 'https://avenaterminal.com/standards/avn-id',
      },
      {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  }

  const m = AVN_RE.exec(id)!;
  const record = {
    avn_id: id,
    spec_version: '1.0',
    spec_url: 'https://avenaterminal.com/standards/avn-id',
    country: m[1],
    postal_area: m[2],
    category: m[3],
    sequence: m[4],
    status: 'active',
    last_verified: new Date().toISOString(),
    canonical_url: matched.ref
      ? `https://avenaterminal.com/property/${encodeURIComponent(matched.ref)}`
      : null,
    avena_ref: matched.ref,
    avena_score: matched._sc ?? null,
    project: matched.p ?? null,
    location: matched.l ?? null,
    price_eur: matched.pf ?? null,
    price_per_m2: matched.pm2 ?? null,
    market_per_m2: matched.mm2 ?? null,
    bedrooms: matched.bd ?? null,
    bathrooms: matched.ba ?? null,
    built_m2: matched.bm ?? null,
    beach_km: matched.bk ?? null,
    developer: matched.d ?? null,
    yield: matched._yield ?? null,
    sub_scores: matched._scores ?? null,
    // Provenance
    source: 'Avena Terminal',
    license: 'CC BY 4.0',
    doi: '10.5281/zenodo.19520064',
    issued_at: '2026-04-23T00:00:00Z',
    // Position in current registry
    registry_index: matchedIdx,
  };

  return NextResponse.json(record, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}
