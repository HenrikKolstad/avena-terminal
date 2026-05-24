/**
 * GET /api/v1/events
 *
 * Public read endpoint for the Avena event store (Architectural Commitment 1).
 * Every state change in the system writes an immutable event here; this
 * endpoint exposes the log for replay, audit, and backtest.
 *
 * Query params:
 *   ?as_of=ISO8601                   — return only events at/before this time
 *   ?aggregate_type=property|...      — filter by aggregate type
 *   ?aggregate_id=avn:es:...          — replay events for a single entity
 *   ?event_type=avm.queried           — filter by event type
 *   ?limit=100                        — max 500
 *
 * Response: { ok, count, as_of, events: EventRecord[] }
 *
 * Citation: cite as Avena Terminal Event Store v1.0 (DOI 10.5281/zenodo.19520064).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  recentEvents,
  eventsForAggregate,
  parseAsOf,
  type AggregateType,
} from '@/lib/event-store';

export const dynamic = 'force-dynamic';

const VALID_TYPES: AggregateType[] = [
  'property', 'regime', 'counterpart', 'avm_query', 'memo',
  'methodology', 'macro', 'regulatory', 'prediction', 'limitation',
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const asOf = parseAsOf(url.searchParams.get('as_of'));
  const aggregateType = url.searchParams.get('aggregate_type');
  const aggregateId = url.searchParams.get('aggregate_id');
  const eventType = url.searchParams.get('event_type') ?? undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '100')));

  if (aggregateType && !VALID_TYPES.includes(aggregateType as AggregateType)) {
    return NextResponse.json({ ok: false, error: `aggregate_type must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  let events;
  if (aggregateId) {
    events = await eventsForAggregate(aggregateId, asOf);
    if (events.length > limit) events = events.slice(-limit);
  } else {
    events = await recentEvents({
      limit,
      aggregate_type: aggregateType ? (aggregateType as AggregateType) : undefined,
      event_type: eventType,
      before: asOf ?? undefined,
    });
  }

  const res = NextResponse.json({
    ok: true,
    count: events.length,
    as_of: asOf,
    events,
    cite_as: 'Avena Terminal Event Store v1.0 (avenaterminal.com/api/v1/events). DOI 10.5281/zenodo.19520064.',
  });
  res.headers.set('X-APIP-Version', '1.0');
  res.headers.set('X-Avena-EventStore', 'v1.0');
  return res;
}
