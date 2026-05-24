/**
 * Event Store — Architectural Commitment 1.
 *
 * Every state change in Avena writes an immutable event to the `events`
 * table BEFORE the projection (existing Supabase tables) is updated. Reads
 * can replay events up to any `as_of` timestamp to reconstruct historical
 * state — time travel as a native primitive.
 *
 * Why this matters: nobody can retroactively add event sourcing. A CoStar
 * M&A team that asks "show me the system state on 2026-03-14" gets a
 * literal answer, not a hand-wave. Backtesting becomes a first-class
 * operation, not a one-off script.
 *
 * Wiring rule: any mutation that changes a number a user might cite later
 * (score, grade, regime, AVM output, methodology weight) MUST record an
 * event. Mutations that don't change observable state (analytics writes,
 * crawler heartbeats) MAY skip recording.
 */

import { supabase } from '@/lib/supabase';

/* -------------------------------------------------------------------------- */
/* Event taxonomy                                                              */
/* -------------------------------------------------------------------------- */

export type AggregateType =
  | 'property'
  | 'regime'
  | 'counterpart'
  | 'avm_query'
  | 'memo'
  | 'methodology'
  | 'macro'
  | 'regulatory'
  | 'prediction'
  | 'limitation';

export interface EventRecord<P = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: AggregateType;
  payload: P;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  recorded_at: string;
  sequence_number: number;
}

export interface RecordEventInput<P = Record<string, unknown>> {
  event_type: string;
  aggregate_id: string;
  aggregate_type: AggregateType;
  payload: P;
  metadata?: Record<string, unknown>;
  occurred_at?: string; // defaults to now()
}

/* -------------------------------------------------------------------------- */
/* Write side                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Append a single event to the log. Fire-and-forget — never blocks the
 * caller's primary mutation. If the event store is unavailable, we swallow
 * the error rather than fail the user-facing write (the projection is still
 * the operational source of truth; the event log is the audit & replay
 * source of truth).
 */
export async function recordEvent<P extends Record<string, unknown>>(
  input: RecordEventInput<P>,
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        event_type: input.event_type,
        aggregate_id: input.aggregate_id,
        aggregate_type: input.aggregate_type,
        payload: input.payload,
        metadata: input.metadata ?? null,
        occurred_at: input.occurred_at ?? new Date().toISOString(),
      })
      .select('event_id')
      .single();
    if (error) return null;
    return (data as { event_id: string }).event_id;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Read side — replay & projections                                            */
/* -------------------------------------------------------------------------- */

export interface AsOfQuery {
  as_of?: string | null;
}

/**
 * Parse and validate an `as_of` query string. Returns null if missing or
 * invalid; otherwise an ISO string clipped to now() (we don't replay the
 * future).
 */
export function parseAsOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  return d.getTime() > now ? new Date(now).toISOString() : d.toISOString();
}

/**
 * Load all events for a given aggregate up to (and including) `asOf`.
 * Ordered by sequence_number so replay is deterministic.
 */
export async function eventsForAggregate(
  aggregateId: string,
  asOf?: string | null,
): Promise<EventRecord[]> {
  if (!supabase) return [];
  let q = supabase.from('events').select('*').eq('aggregate_id', aggregateId);
  if (asOf) q = q.lte('occurred_at', asOf);
  const { data } = await q.order('sequence_number', { ascending: true });
  return (data as EventRecord[]) || [];
}

/**
 * Recent events across the system, optionally filtered by type or
 * aggregate_type. Used by /timetravel and /verify pages.
 */
export async function recentEvents(opts: {
  limit?: number;
  aggregate_type?: AggregateType;
  event_type?: string;
  before?: string;
} = {}): Promise<EventRecord[]> {
  if (!supabase) return [];
  let q = supabase.from('events').select('*');
  if (opts.aggregate_type) q = q.eq('aggregate_type', opts.aggregate_type);
  if (opts.event_type) q = q.eq('event_type', opts.event_type);
  if (opts.before) q = q.lte('occurred_at', opts.before);
  const { data } = await q.order('occurred_at', { ascending: false }).limit(opts.limit ?? 50);
  return (data as EventRecord[]) || [];
}

/**
 * Generic last-known-state replay: fold events for an aggregate into a
 * single payload by merging payloads in sequence order. Use when an
 * aggregate's state is fully captured by its latest event (typical for
 * score updates, grade changes, regime classifications).
 */
export async function projectAggregate<S extends Record<string, unknown>>(
  aggregateId: string,
  asOf?: string | null,
  initial: Partial<S> = {},
): Promise<{ state: Partial<S>; events: EventRecord[]; as_of: string | null }> {
  const events = await eventsForAggregate(aggregateId, asOf);
  const state: Partial<S> = { ...initial };
  for (const ev of events) {
    Object.assign(state, ev.payload as Partial<S>);
  }
  return { state, events, as_of: asOf ?? null };
}

/**
 * System-wide totals at a given moment. Used by /timetravel summary header.
 */
export async function eventTotalsAsOf(asOf?: string | null): Promise<{
  total_events: number;
  by_type: Array<{ aggregate_type: string; count: number }>;
  earliest: string | null;
  latest: string | null;
}> {
  if (!supabase) return { total_events: 0, by_type: [], earliest: null, latest: null };
  let q = supabase.from('events').select('aggregate_type, occurred_at');
  if (asOf) q = q.lte('occurred_at', asOf);
  const { data } = await q.order('occurred_at', { ascending: true }).limit(10000);
  const rows = (data as Array<{ aggregate_type: string; occurred_at: string }>) || [];
  const buckets = new Map<string, number>();
  for (const r of rows) buckets.set(r.aggregate_type, (buckets.get(r.aggregate_type) ?? 0) + 1);
  const by_type = Array.from(buckets.entries())
    .map(([aggregate_type, count]) => ({ aggregate_type, count }))
    .sort((a, b) => b.count - a.count);
  return {
    total_events: rows.length,
    by_type,
    earliest: rows[0]?.occurred_at ?? null,
    latest: rows[rows.length - 1]?.occurred_at ?? null,
  };
}
