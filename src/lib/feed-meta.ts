import { readFileSync } from 'fs';
import path from 'path';

/**
 * The generation date of the deployed feed (public/data.json).
 *
 * Written by parse-feed.js alongside data.json and committed with it, so a
 * route can tell WHICH DAY's book it is holding. Without this, a serverless
 * consumer has no way to distinguish today's refreshed feed from a deploy
 * still carrying yesterday's — and `_added` cannot stand in for it, because
 * on a day with no new listings the newest `_added` is legitimately old.
 *
 * Returns null when the stamp is absent (a deploy predating this file), which
 * callers must treat as "unknown", never as "stale". Degrading to the old
 * behaviour is the correct failure direction: a missing stamp must not be
 * able to stop the capture pipeline.
 */
let _cached: string | null | undefined;

export function getFeedGeneratedDate(): string | null {
  if (_cached !== undefined) return _cached;
  try {
    const raw = readFileSync(path.join(process.cwd(), 'public', 'feed-meta.json'), 'utf8');
    const parsed = JSON.parse(raw) as { generated_date?: unknown };
    const d = parsed.generated_date;
    _cached = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  } catch {
    _cached = null;
  }
  return _cached;
}

/**
 * The generation INSTANT of the deployed feed, as an ISO timestamp.
 *
 * The date above answers "which day's book am I holding". It cannot answer
 * "which of today's books am I holding", and on 2026-09-11 three different
 * books all carried `generated_date: 2026-09-11`. A route needs the instant to
 * tell its own book apart from one that another writer has already banked.
 *
 * Same contract as the date: an absent or malformed stamp returns null, which
 * callers must treat as "unknown" and never as evidence of staleness.
 */
let _cachedAt: string | null | undefined;

export function getFeedGeneratedAt(): string | null {
  if (_cachedAt !== undefined) return _cachedAt;
  try {
    const raw = readFileSync(path.join(process.cwd(), 'public', 'feed-meta.json'), 'utf8');
    const parsed = JSON.parse(raw) as { generated_at?: unknown };
    const t = parsed.generated_at;
    _cachedAt = typeof t === 'string' && Number.isFinite(Date.parse(t)) ? t : null;
  } catch {
    _cachedAt = null;
  }
  return _cachedAt;
}
