/**
 * scripts/remediate-counterpart-decay.ts
 *
 * BRANCH odyssey/counterpart-decay-remediation — awaiting Henrik's approval.
 *
 * Cleans up what the Counterpart decay ratchet wrote before d6a3652 stopped it.
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 * THE HEADLINE FINDING, AND IT LIMITS WHAT THIS SCRIPT IS ALLOWED TO DO:
 * there is NO true score to restore. The scores were hand-seeded when the table
 * was created on 2026-05-21 and began decaying immediately — the first stress
 * alert is stamped 2026-05-21 — but the `grade_revised` event log does not start
 * until 2026-06-11, by which time four of the seven developers were already at
 * the zero floor and Metrovacesa was down to 13. The seed values are nowhere in
 * the database. So "restore Neinor Homes to 59" would be inventing a number:
 * 59 was itself already a decayed value, not the seed.
 *
 * This script therefore does NOT write a score. It does two things that are
 * defensible without a source:
 *   1. RETRACTS the alerts the ratchet minted. They were never observations —
 *      the drift that triggered them was a constant applied to signals nothing
 *      updates. Rows are KEPT (status -> 'retracted' + retracted_reason);
 *      nothing is deleted.
 *   2. LABELS each affected score with its provenance, so no surface can
 *      present a decay artifact as a measurement.
 *
 * What it cannot decide, and Henrik must: whether /counterpart should publish
 * credit grades for named real companies at all while the risk data behind them
 * has no ingest path.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase credentials missing. Refusing to run: a remediation that');
  console.error('silently touched nothing and exited 0 would be the very bug it cleans up.');
  process.exit(1);
}
const db = createClient(url, key);

const APPLY = process.argv.includes('--apply');

/** Alert types the ratchet is capable of minting. */
const RATCHET_ALERT_TYPES = ['financial_distress', 'score_drop'];

const RETRACTION =
  'Retracted 2026-10-10: minted by the counterpart-scan decay ratchet, which ' +
  're-applied a constant drift to stress signals nothing updates. Not an ' +
  'observation. Ratchet stopped in d6a3652.';

async function main() {
  console.log(`\nCounterpart decay remediation — ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  // ── 1. the alerts ────────────────────────────────────────────────────────
  const { data: alerts, error: aErr } = await db
    .from('counterpart_stress_alerts')
    .select('id, developer_id, alert_type, severity, detected_at')
    .eq('status', 'active')
    .in('alert_type', RATCHET_ALERT_TYPES);
  if (aErr) { console.error(`alert read failed: ${aErr.message}`); process.exit(1); }

  const byDev = new Map<string, number>();
  for (const a of alerts ?? []) byDev.set(a.developer_id, (byDev.get(a.developer_id) ?? 0) + 1);

  console.log(`Active ratchet-type alerts to retract: ${alerts?.length ?? 0}`);
  for (const [dev, n] of [...byDev.entries()].sort((x, y) => y[1] - x[1])) {
    console.log(`  ${dev.padEnd(20)} ${n}`);
  }

  // ── 2. the scores ────────────────────────────────────────────────────────
  const { data: devs, error: dErr } = await db
    .from('counterpart_developers')
    .select('developer_id, name, counterpart_score, score_grade, score_provenance');
  if (dErr) { console.error(`developer read failed: ${dErr.message}`); process.exit(1); }

  // A developer the ratchet moved is one that has a grade_revised event.
  const { data: revised, error: eErr } = await db
    .from('events')
    .select('aggregate_id')
    .eq('event_type', 'counterpart.grade_revised');
  if (eErr) { console.error(`event read failed: ${eErr.message}`); process.exit(1); }
  const ratcheted = new Set((revised ?? []).map((r) => r.aggregate_id as string));

  const plan = (devs ?? []).map((d) => ({
    developer_id: d.developer_id as string,
    name: d.name as string,
    score: d.counterpart_score as number,
    provenance: ratcheted.has(d.developer_id as string) ? 'decay_artifact' : 'unsourced_seed',
  }));

  console.log(`\nScore provenance to label: ${plan.length}`);
  for (const p of plan) {
    console.log(`  ${p.name.padEnd(28)} score ${String(p.score).padStart(3)}  -> ${p.provenance}`);
  }
  console.log('\nNO SCORE IS WRITTEN. The pre-ratchet values are not recoverable');
  console.log('(alerts start 2026-05-21, the event log starts 2026-06-11), so any');
  console.log('"restored" score would be invented. Labelling is the honest action.\n');

  if (!APPLY) {
    console.log('DRY RUN — nothing written. Re-run with --apply to commit these changes.');
    return;
  }

  // ── writes ───────────────────────────────────────────────────────────────
  let retracted = 0;
  const failures: string[] = [];
  for (const a of alerts ?? []) {
    const { error } = await db
      .from('counterpart_stress_alerts')
      .update({ status: 'retracted', retracted_reason: RETRACTION })
      .eq('id', a.id);
    // Check the returned error. The client resolves on a failed write, so a
    // bare await would let a rejected update count as a retraction.
    if (error) failures.push(`alert ${a.id}: ${error.message}`);
    else retracted++;
  }

  let labelled = 0;
  for (const p of plan) {
    const { error } = await db
      .from('counterpart_developers')
      .update({ score_provenance: p.provenance })
      .eq('developer_id', p.developer_id);
    if (error) failures.push(`developer ${p.developer_id}: ${error.message}`);
    else labelled++;
  }

  console.log(`Retracted ${retracted}/${alerts?.length ?? 0} alerts.`);
  console.log(`Labelled  ${labelled}/${plan.length} developer scores.`);
  if (failures.length) {
    console.error(`\n${failures.length} write(s) FAILED:`);
    for (const f of failures.slice(0, 10)) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\nAll writes landed.');
}

main().catch((e) => { console.error(e); process.exit(1); });
