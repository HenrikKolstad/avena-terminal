import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { collectHealth } from '@/lib/health';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/health — health probe, every 6h (00:30/06:30/12:30/18:30 UTC;
 * 12:30 is the first run after the capture is due).
 *
 * Writes one cron_logs row per run, so a stale feed, a missed capture or an
 * unreachable database shows up on /status as a failed `health` run within
 * six hours instead of being noticed days later (2026-10-14 → 10-21: eight
 * nights of failed captures went unseen while /engine said "Operational").
 *
 * Anything short of operational is reported as ok:false, which the cron-log
 * wrapper records as an error with the first failing check as its reason.
 */
export const GET = withCronLog('health', '/api/cron/health', isAuthorizedCron, async () => {
  const report = await collectHealth();
  const failing = report.checks.filter((c) => c.status !== 'ok' && (c.critical || c.status !== 'unknown'));
  const healthy = report.status === 'operational';
  return Response.json(
    {
      ok: healthy,
      status: report.status,
      first_error: healthy ? undefined : failing.map((c) => `${c.id}: ${c.detail}`).join(' | ') || report.label,
      checks: report.checks,
      checked_at: report.checked_at,
    },
    { status: report.status === 'down' ? 503 : 200 },
  );
});
