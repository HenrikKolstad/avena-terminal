import { NextRequest, NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Listing-depth and time-on-market observations.
 *
 * WHAT THIS ROUTE USED TO PUBLISH, AND WHY IT NO LONGER DOES
 * Until 2026-08-29 this route published a `liquidity_score` (0-100), a
 * `liquidity_tier`, an `exit_confidence` label and — worst of the four — a
 * `days_to_sell_estimate`. Every one of them was a rescale of five hand-set
 * constant tables that appear nowhere in any data source:
 *
 *   type    Apartment 85 / Townhouse 70 / Bungalow 65 / Penthouse 60 / Villa 50
 *   beach   <2km 80 / <5km 65 / else 50   (and 50 when the distance is unknown)
 *   price   <200k 85 / <=400k 75 / else 55
 *   depth   >=50 90 / >=20 70 / >=10 55 / >=5 40 / else 25
 *   speed   <30d 85 / <60d 70 / <120d 50 / else 30
 *   weights 0.25 / 0.20 / 0.20 / 0.20 / 0.15
 *
 * and `days_to_sell_estimate` was literally `(100 - score) + 30`.
 *
 * That number reads as an empirical time-to-sale drawn from observed sales.
 * Avena has never observed a sale. It records listings, price moves and
 * disappearances from the feed; a disappearance is not a confirmed sale and
 * is published as a delisting, deliberately, in the open-data ledger. So a
 * "days to sell" figure is not a weak estimate here — it is an estimate of a
 * quantity this system holds no observations of at all.
 *
 * Removed rather than re-guessed, following the precedent set by
 * be4a736 (/api/v1/arbitrage), 03f57ef (/api/v1/compliance) and
 * b9bf525 (/api/v1/carbon): a published field with no backing is deleted and
 * the reason is stated, so a caller learns the gap instead of inheriting a
 * fabrication.
 *
 * WHAT SURVIVES is what the book actually observes: how many comparable units
 * are listed, and how long they have been listed.
 */

const NOT_PUBLISHED = {
  liquidity_score:
    'Removed 2026-08-29. Was a weighted sum of five hand-set constant tables ' +
    '(property type, beach distance, price band, comparable count, comparable ' +
    'age) with no empirical basis. Use market_depth and time_on_market below.',
  days_to_sell_estimate:
    'Removed 2026-08-29. Was (100 - liquidity_score) + 30. Avena observes ' +
    'listings, price changes and delistings — never a completed sale — so it ' +
    'holds no observations of time-to-sale.',
  liquidity_tier:
    'Removed 2026-08-29. Was a threshold on the removed liquidity_score.',
  exit_confidence:
    'Removed 2026-08-29. Was a label on the removed liquidity_score.',
} as const;

/** Days since the listing first appeared in the feed. Null when unrecorded. */
function daysOnMarket(p: Property): number | null {
  if (!p._added) return null;
  const added = new Date(p._added);
  if (Number.isNaN(added.getTime())) return null;
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)));
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

/**
 * Time-on-market over a set of listings.
 *
 * `covered` is reported alongside the statistics on purpose: `_added` is not
 * present on every listing, so a median drawn from 3 of 40 comparables is a
 * different claim from one drawn from 40 of 40, and the caller cannot tell
 * them apart from the median alone.
 */
function timeOnMarket(listings: Property[]) {
  const doms = listings.map(daysOnMarket).filter((d): d is number => d !== null);
  return {
    listings_considered: listings.length,
    listings_with_a_first_seen_date: doms.length,
    median_days_listed: median(doms),
    mean_days_listed: doms.length > 0 ? Math.round(avg(doms)) : null,
  };
}

function observe(property: Property, comparables: Property[]) {
  return {
    ref: property.ref ?? null,
    name: `${property.p} - ${property.l}`,
    town: property.l,
    property_type: property.t,
    market_depth: {
      comparable_count: comparables.length,
      basis: 'live listings in the same town and of the same property type',
    },
    time_on_market: {
      this_listing_days: daysOnMarket(property),
      comparables: timeOnMarket(comparables),
    },
    not_published: NOT_PUBLISHED,
  };
}

export async function GET(request: NextRequest) {
  try {
    const ref = request.nextUrl.searchParams.get('ref');
    const all = getAllProperties();

    if (ref) {
      const property = all.find(p => p.ref === ref);
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
      const comparables = all.filter(
        p => p.ref !== ref && p.l === property.l && p.t === property.t
      );
      return NextResponse.json(observe(property, comparables));
    }

    // Aggregate depth by town. Each town reports its own coverage rather than
    // a ranking: the previous version sorted towns by average liquidity score
    // and gave a town with no scorable listings an `avg_liquidity_score` of 0,
    // which sorted it last as though it had been measured and found illiquid.
    const towns = getUniqueTowns();
    const regions = towns.map(town => {
      const townProps = all.filter(p => p.l === town.town);
      return {
        region: town.town,
        slug: town.slug,
        property_count: town.count,
        time_on_market: timeOnMarket(townProps),
      };
    });

    return NextResponse.json({
      total_properties: all.length,
      as_of: new Date().toISOString(),
      regions: regions.sort((a, b) => b.property_count - a.property_count),
      not_published: NOT_PUBLISHED,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
