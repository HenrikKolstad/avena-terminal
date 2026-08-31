import { NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { epcDistribution } from '@/lib/epc';

export const revalidate = 86400;

/**
 * Energy-rating exposure across the live book.
 *
 * Until 2026-08-31 this route published five hardcoded "active regulations"
 * attributed to named institutions, none of which Avena receives data from:
 *
 *   - European Central Bank, "Rate cut -25bp to 2.40%", dated 2026-03-14,
 *     with an invented "yield_impact: +0.3-0.5% over 6 months". An invented
 *     rate decision attributed to a central bank is a checkable falsehood.
 *   - European Banking Authority, "Revised property risk weights", 2026-02-28.
 *   - Government of Spain, Golden Visa "Phase-out announced, implementation
 *     pending", dated 2026-01-15 — wrong on both counts: the real estate
 *     route was abolished 2025-04-03 by Organic Law 1/2025.
 *   - European Union, EPBD recast summarised as "minimum C rating by 2030".
 *   - Valencia Regional Government, licence restrictions dated 2026-03-22.
 *
 * Removed rather than corrected, per the be4a736 precedent.
 *
 * What remains is the one thing here Avena actually measures: the EPC letter
 * distribution of the live book. That is now computed through `src/lib/epc.ts`
 * rather than inline, which also fixes a real counting bug — see below.
 */

const NOT_PUBLISHED = {
  active_regulations:
    'Removed 2026-08-31. Were five hardcoded entries attributed to the ECB, ' +
    'the EBA, the Government of Spain, the EU and the Valencia regional ' +
    'government, with invented decisions, figures and dates. Avena ingests ' +
    'no feed from any of them on this route. See /regulatory-radar for the ' +
    'regulatory signals Avena does observe.',
  yield_impact:
    'Removed 2026-08-31. Was the literal "+0.3-0.5% over 6 months" attached ' +
    'to an invented ECB decision. Avena has measured no rate-to-yield ' +
    'transmission coefficient.',
  high_urgency_count:
    'Removed 2026-08-31. Was a count of hand-set risk_level fields on the ' +
    'invented entries above.',
  property_impact_summary:
    'Removed 2026-08-31. Was prose asserting Golden Visa and EPBD effects ' +
    'Avena has not observed.',
} as const;

export async function GET() {
  const all = getAllProperties();
  const { rated, unrecognised, distribution } = epcDistribution(all);

  // D-G are the letters below the EPBD's most-discussed thresholds. Counted
  // over the RATED subset only. The route previously counted every listing
  // whose energy field was absent or unrecognised as low-rated
  // (`if (!p.energy) return true`), which reported "Avena does not hold this
  // certificate" as "this property has a poor certificate" — the same
  // silent-substitution shape src/lib/epc.ts exists to prevent.
  const lowRated = distribution.D + distribution.E + distribution.F + distribution.G;

  return NextResponse.json({
    generated: new Date().toISOString(),
    book_size: all.length,
    epc_coverage: {
      rated,
      unrecognised,
      note:
        'Unrecognised covers absent values and the feed\'s "X" placeholder. ' +
        'It means Avena does not hold a recognised EPC letter for the ' +
        'listing — not that the listing is poorly rated.',
    },
    epc_distribution: distribution,
    low_rated_d_to_g: lowRated,
    low_rated_share_of_rated:
      rated > 0 ? Math.round((lowRated / rated) * 1000) / 1000 : null,
    not_published: NOT_PUBLISHED,
    source: 'Avena Terminal — derived from the live listing book.',
  });
}
