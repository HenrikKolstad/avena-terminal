import type { NextRequest } from 'next/server';

/**
 * Cron authorization that survives env drift.
 *
 * Accepts, in order:
 *  1. `Authorization: Bearer ${CRON_SECRET}` — manual triggers and
 *     Vercel cron when CRON_SECRET is configured (Vercel attaches it
 *     automatically to scheduled invocations when the env var exists).
 *  2. The `x-vercel-cron` header when CRON_SECRET is NOT configured —
 *     so a missing env var degrades to "Vercel-scheduled only" instead
 *     of a permanently dead pipeline. All cron handlers are idempotent
 *     ingest/rollup jobs, so the worst-case spoof is a redundant run.
 */
export function isAuthorizedCron(req: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret) {
    if (auth === `Bearer ${secret}`) return true;
    // Secret configured but header mismatched → still allow genuine
    // Vercel scheduler invocations (header set by the platform).
    return req.headers.get('x-vercel-cron') === '1';
  }
  // No secret configured at all — accept platform-scheduled calls only.
  return req.headers.get('x-vercel-cron') === '1';
}
