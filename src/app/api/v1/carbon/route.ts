import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { epcDistribution, toEpcLetter } from '@/lib/epc';

export const dynamic = 'force-dynamic';

/**
 * Energy-performance reference surface.
 *
 * This route used to publish an `esg_score`, a per-property CO2 figure and an
 * EU compliance verdict. Every one of them was fabricated:
 *
 *  - `ENERGY_CO2` mapped EPC letters onto literal kgCO2/m²·yr values
 *    (A=15 … G=190). There is no such universal mapping: the Spanish
 *    certificate bands are defined per climate zone and building use, so a
 *    letter alone does not determine emissions intensity. Every figure
 *    derived from that table — `co2_per_m2_kg`, `estimated_annual_co2_tonnes`,
 *    `avg_co2_tonnes` — was a published number backed by nothing.
 *  - `esg_score` summed four invented constants: an `ENERGY_SCORE` letter
 *    scale, a flat `newBuildBonus = 15`, a `poolPenalty` of -10/-5, and a
 *    `statusBonus = 5` justified in a comment as "key-ready = verified energy
 *    cert" — key-ready status carries no such implication.
 *  - `new_build_compliant` was the literal `true` for every property in the
 *    book, compliant with nothing in particular.
 *  - `eu_2027_ready` / `eu_2027_compliant` / `eu_2027_pct` tested
 *    `rating <= 'C'` against the note "EU mandatory energy disclosure from
 *    2027". No EU instrument imposes a per-dwelling class C threshold in 2027.
 *    The same phantom deadline was removed from /api/v1/compliance on
 *    2026-08-25; it survived here because the two routes shared no code.
 *  - `ENERGY_SCORE[p.energy || 'D'] || 45` and `ENERGY_CO2[p.energy || 'D']
 *    || 80` silently coerced the feed's 16 'X' placeholder listings to a
 *    D-grade rating, so /api/v1/carbon published `energy_rating: "X"`,
 *    `co2_per_m2_kg: 80` and `9.4 tonnes/yr` for ref N3099V on the same day
 *    /api/v1/compliance published `epc_rating: null` for it.
 *
 * What remains is what Avena actually holds: the EPC letter on the listing
 * and the built floor area. Where a figure is not determinable it is absent
 * with a stated reason, never a default, and no composite score is published
 * because there is no defensible input to build one from. EPC normalisation
 * now lives in @/lib/epc so this surface and /api/v1/compliance cannot drift
 * apart again.
 */

const NOT_PUBLISHED = {
  emissions:
    'Not published. The previous figures mapped the EPC letter onto a fixed kgCO2/m² value (A=15 … G=190) and multiplied by floor area. That mapping is not a property of the certificate scale — Spanish EPC bands are set per climate zone and building use — so the result was a specific-looking number with no measured basis. Avena holds no metered, modelled or audited emissions data for these units.',
  esg_score:
    'Not published. The previous score summed an invented letter scale, a flat 15-point new-build bonus, a pool penalty and a 5-point bonus for key-ready status. None of the four inputs was derived from anything measured about the property.',
  eu_2027:
    'Not published. The previous fields tested EPC class C against a "mandatory EU energy disclosure from 2027". No EU instrument imposes a per-dwelling class C threshold in 2027. Under the EPBD recast (Directive (EU) 2024/1275) the residential target is a national trajectory cutting average primary energy use 16% by 2030, with worst-performing stock reaching class F by 2030 and class E by 2033; binding per-dwelling detail is set by each member state in transposition.',
} as const;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  const all = getAllProperties();

  if (ref) {
    const prop = all.find((p) => p.ref === ref);
    if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const letter = toEpcLetter(prop.energy);

    return NextResponse.json(
      {
        ref: prop.ref,
        name: prop.p || `${prop.t} in ${prop.l}`,
        energy_performance: {
          epc_rating: letter,
          epc_rating_raw: prop.energy ?? null,
          built_m2: prop.bm ?? null,
          basis:
            letter === null
              ? 'This listing carries no recognised EPC letter (A-G), so no energy-performance conclusion is drawn. It is not assumed to be any particular rating.'
              : 'The EPC letter as carried on the listing. Avena publishes the certificate letter it holds and does not derive emissions or a score from it.',
        },
        not_published: {
          annual_co2: NOT_PUBLISHED.emissions,
          esg_score: NOT_PUBLISHED.esg_score,
          eu_2027_readiness: NOT_PUBLISHED.eu_2027,
        },
        source: 'Avena Terminal (avenaterminal.com)',
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }

  const { rated, unrecognised, distribution } = epcDistribution(all);

  return NextResponse.json(
    {
      total_properties: all.length,
      energy_performance: {
        rated_properties: rated,
        unrecognised_properties: unrecognised,
        distribution,
        basis:
          'Counts of the EPC letter carried on each listing. Listings whose energy field holds an unrecognised value (the feed uses "X") are counted as unrecognised rather than assigned a letter.',
      },
      not_published: {
        avg_co2_tonnes: NOT_PUBLISHED.emissions,
        avg_esg_score: NOT_PUBLISHED.esg_score,
        eu_2027_compliance: NOT_PUBLISHED.eu_2027,
      },
      source: 'Avena Terminal (avenaterminal.com)',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
}
