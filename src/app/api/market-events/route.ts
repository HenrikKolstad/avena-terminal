import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Public, AI-readable feed of observed market events.
 *
 * Nothing in this codebase consumes it, so its only readers are external —
 * which makes undated output a credibility problem rather than a cosmetic
 * one. `market_events` has received nothing since 2026-04-11 because the
 * cron that fills it (/api/detect-events) authorises on a header the Vercel
 * scheduler does not send. Until that is fixed this endpoint serves a frozen
 * April snapshot, and a reader summarising it would reasonably present those
 * rows as current listings activity.
 *
 * So the feed now dates itself: `as_of` is the newest event it actually
 * holds, `stale_days` is how far behind that is, and `feed_status` says so
 * in one word. The rows are unchanged — the fix is disclosure, not deletion.
 */

/** A feed is stale once it has missed more than a couple of daily passes. */
const STALE_AFTER_DAYS = 3;

export async function GET() {
  // A missing database used to return `{ events: [], todayCount: 0 }` with
  // HTTP 200 — indistinguishable from a genuine quiet day, and the exact
  // shape that once published a fabricated 0.00% citation rate for six days.
  if (!supabase) {
    return NextResponse.json(
      { error: 'events unavailable: no database connection', events: null, stats: null },
      { status: 503 },
    );
  }

  // Fetch last 100 real events only — no synthetic data
  const { data: events, error } = await supabase
    .from('market_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: `events query failed: ${error.message}`, events: null, stats: null },
      { status: 502 },
    );
  }

  const rows = events ?? [];

  // Today's count
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { count: todayCount } = await supabase
    .from('market_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart);

  // `total` is a published field, so it keeps its name rather than being
  // renamed out from under any external reader — but it now means what it
  // says. It previously reported `events.length`, which is capped at 100 and
  // so would have understated the table the moment it passed that many rows.
  const { count: totalCount } = await supabase
    .from('market_events')
    .select('id', { count: 'exact', head: true });

  const asOf = rows.length ? (rows[0].created_at as string) : null;
  const staleDays = asOf
    ? Math.floor((now.getTime() - new Date(asOf).getTime()) / 86_400_000)
    : null;

  return NextResponse.json({
    events: rows,
    as_of: asOf,
    stale_days: staleDays,
    feed_status:
      staleDays === null ? 'empty' : staleDays > STALE_AFTER_DAYS ? 'stale' : 'live',
    stats: {
      todayCount: todayCount ?? 0,
      total: totalCount ?? 0,
      returned: rows.length,
    },
  });
}
