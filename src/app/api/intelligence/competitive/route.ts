import { getAllProperties, avg } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

type EventType = 'PRICE_DROP' | 'PRICE_INCREASE' | 'NEW_LISTING' | 'LONG_STANDING';

interface CompetitiveEvent {
  type: EventType;
  ref: string;
  project: string;
  developer: string;
  location: string;
  current_price: number;
  previous_price?: number;
  change_pct?: number;
  days_on_market?: number;
}

export async function GET() {
  try {
    const all = getAllProperties();
    const scanned_at = new Date().toISOString();
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

    // Try to load price history from Supabase
    let priceHistory: Record<string, { price: number; recorded_at: string }[]> = {};
    let hasPriceData = false;

    if (supabase) {
      const { data } = await supabase
        .from('price_history')
        .select('ref, price, recorded_at')
        .order('recorded_at', { ascending: false });

      if (data && data.length > 0) {
        hasPriceData = true;
        for (const row of data) {
          if (!priceHistory[row.ref]) priceHistory[row.ref] = [];
          priceHistory[row.ref].push({ price: row.price, recorded_at: row.recorded_at });
        }
      }
    }

    // If no price history data, return current market summary
    if (!hasPriceData) {
      const regionMap = new Map<string, number>();
      for (const p of all) {
        const region = p.l || 'Unknown';
        regionMap.set(region, (regionMap.get(region) || 0) + 1);
      }

      const regions = [...regionMap.entries()]
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count);

      const prices = all.map((p) => p.pf).filter((p) => p > 0);

      return Response.json({
        scanned_at,
        total_properties: all.length,
        price_history_available: false,
        message: 'No price history data yet. Showing current market summary.',
        market_summary: {
          regions,
          avg_price: Math.round(avg(prices)),
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
        },
      });
    }

    // Detect competitive events
    const events: CompetitiveEvent[] = [];

    for (const p of all) {
      const ref = p.ref || p.p;
      const history = priceHistory[ref];

      if (history && history.length >= 2) {
        const latest = history[0];
        const previous = history[1];

        if (latest.price < previous.price) {
          const change_pct = ((latest.price - previous.price) / previous.price) * 100;
          events.push({
            type: 'PRICE_DROP',
            ref,
            project: p.p,
            developer: p.d,
            location: p.l,
            current_price: latest.price,
            previous_price: previous.price,
            change_pct: Number(change_pct.toFixed(2)),
          });
        } else if (latest.price > previous.price) {
          const change_pct = ((latest.price - previous.price) / previous.price) * 100;
          events.push({
            type: 'PRICE_INCREASE',
            ref,
            project: p.p,
            developer: p.d,
            location: p.l,
            current_price: latest.price,
            previous_price: previous.price,
            change_pct: Number(change_pct.toFixed(2)),
          });
        }

        // Check for long-standing listings
        const oldest = history[history.length - 1];
        const daysOnMarket = Math.floor(
          (now - new Date(oldest.recorded_at).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysOnMarket > 90 && latest.price === previous.price) {
          events.push({
            type: 'LONG_STANDING',
            ref,
            project: p.p,
            developer: p.d,
            location: p.l,
            current_price: latest.price,
            days_on_market: daysOnMarket,
          });
        }
      }

      // Check for new listings (added within 7 days)
      if (history && history.length === 1) {
        const addedAt = new Date(history[0].recorded_at).getTime();
        if (now - addedAt < SEVEN_DAYS) {
          events.push({
            type: 'NEW_LISTING',
            ref,
            project: p.p,
            developer: p.d,
            location: p.l,
            current_price: p.pf,
          });
        }
      }
    }

    // Aggregate by type
    const eventsByType: Record<EventType, CompetitiveEvent[]> = {
      PRICE_DROP: events.filter((e) => e.type === 'PRICE_DROP'),
      PRICE_INCREASE: events.filter((e) => e.type === 'PRICE_INCREASE'),
      NEW_LISTING: events.filter((e) => e.type === 'NEW_LISTING'),
      LONG_STANDING: events.filter((e) => e.type === 'LONG_STANDING'),
    };

    const market_velocity = {
      price_drops: eventsByType.PRICE_DROP.length,
      price_increases: eventsByType.PRICE_INCREASE.length,
      new_listings: eventsByType.NEW_LISTING.length,
      long_standing: eventsByType.LONG_STANDING.length,
      activity_ratio: Number(
        (
          (eventsByType.PRICE_DROP.length + eventsByType.PRICE_INCREASE.length + eventsByType.NEW_LISTING.length) /
          Math.max(all.length, 1)
        ).toFixed(4)
      ),
    };

    return Response.json({
      scanned_at,
      total_properties: all.length,
      price_history_available: true,
      events: eventsByType,
      market_velocity,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Competitive intelligence scan failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
