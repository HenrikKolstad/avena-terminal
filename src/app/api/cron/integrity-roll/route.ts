/**
 * GET /api/cron/integrity-roll
 *
 * Daily at 03:30 UTC. Records SHA-256 fingerprints of the artefacts Avena
 * ships, then computes the day's Merkle root over everything not yet rolled.
 *
 * WHAT THIS RUN USED TO BE: it called rollDailyRoot() against a table nothing
 * ever wrote to. integrity_fingerprints held exactly one row — seeded by
 * scripts/run-pipeline-local.ts on 2026-06-10 — so every night since June the
 * job found nothing, rolled nothing, and logged `success`. Meanwhile /verify,
 * /stack, /proof, /papers/delphi, /apon-network, /eu-presidency, /methodology
 * and llms.txt all published, in the present tense, that every artefact is
 * fingerprinted daily. The claim was live; the mechanism was not.
 *
 * Zenodo deposit is STILL not automated — no code anywhere deposits a daily
 * root, and every root's zenodo_url is null, which /verify renders honestly as
 * "pending deposit". The surfaces that promise RFC 3161 timestamping are
 * therefore still overstating, and that is escalated rather than patched here.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { withCronLog } from '@/lib/cron-log';
import { recordDailyArtefacts, rollDailyRoot } from '@/lib/integrity';

export const maxDuration = 60;

export const GET = withCronLog('integrity-roll', '/api/cron/integrity-roll', isAuthorizedCron, async () => {
  const errors: string[] = [];

  const artefacts = await recordDailyArtefacts();
  errors.push(...artefacts.errors);

  // Roll whatever is unrolled even if one artefact failed above — the roll is
  // what makes the successfully-recorded ones verifiable, and withholding it
  // would lose them too. A roll failure is its own reported error.
  let roll: Awaited<ReturnType<typeof rollDailyRoot>> = null;
  try {
    roll = await rollDailyRoot();
  } catch (e) {
    errors.push(`roll: ${e instanceof Error ? e.message : String(e)}`);
  }

  return Response.json({
    agent: 'Integrity Roll',
    ran_at: new Date().toISOString(),
    // deriveCronStatus flips the run to `error` on a non-empty errors[], so a
    // night that attests nothing can no longer log green.
    errors,
    artefacts: {
      recorded: artefacts.recorded.length,
      unchanged: artefacts.unchanged,
      types: artefacts.recorded.map(r => r.type),
      latest_batch_date: artefacts.latest_batch_date,
      batch_age_days: artefacts.batch_age_days,
    },
    result: roll,
  });
});

export const POST = GET;
