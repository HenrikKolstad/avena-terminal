/**
 * One-shot local pipeline runner.
 *
 * Loads the production env (service-role key) and executes the two
 * Supabase-only pipeline jobs directly against the prod database:
 *   1. compileLimitations()  → populates /limitations
 *   2. rollDailyRoot()       → populates /verify daily roots
 *
 * Neither needs ANTHROPIC_API_KEY, so they can run from any machine
 * that has pulled the Vercel env. Usage:
 *   npx tsx scripts/run-pipeline-local.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Minimal .env parser — avoids a dotenv dependency.
function loadEnv(file: string): void {
  let raw: string;
  try { raw = readFileSync(resolve(process.cwd(), file), 'utf8'); }
  catch { return; }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv('.env.production');

async function main() {
  const { compileLimitations } = await import('../src/lib/limitations');
  const { rollDailyRoot, recordFingerprint } = await import('../src/lib/integrity');

  console.log('— compile-limitations —');
  const lim = await compileLimitations();
  console.log(JSON.stringify(lim, null, 2));

  console.log('— seed one integrity fingerprint (methodology v1.0.0 set) —');
  const fp = await recordFingerprint({
    fingerprint_type: 'methodology',
    source_table: 'methodology_versions',
    source_id: 'v1.0.0-set',
    artefact: {
      avena_score: { value: 0.40, yield: 0.25, location: 0.20, quality: 0.10, risk: 0.05 },
      apci: { price_velocity: 0.30, yield_compression: 0.25, supply_response: 0.20, rate_sensitivity: 0.15, policy_risk: 0.10 },
      counterpart: { payment_delay: 0.30, legal_disputes: 0.20, court_judgements: 0.20, delivery_delay: 0.15, financial_stress: 0.15 },
      avm: { town_median: 0.55, size_adjust: 0.15, view_premium: 0.10, energy_band: 0.08, beach_distance: 0.07, amenity_pool_golf: 0.05 },
    },
    artefact_summary: 'Launch weight set — all six methodologies at v1.0.0',
  });
  console.log(fp);

  console.log('— integrity-roll —');
  const roll = await rollDailyRoot();
  console.log(JSON.stringify(roll, null, 2));
}

main().then(() => { console.log('done'); process.exit(0); })
      .catch(e => { console.error(e); process.exit(1); });
