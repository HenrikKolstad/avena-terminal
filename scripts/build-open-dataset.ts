/**
 * CI wrapper for the open dataset — writes public/open-data/*.
 *
 * Runs in the nightly feed-refresh GitHub Action (which has the Supabase
 * secrets) right after the feed lands, so the site serves corpus artifacts
 * that can never drift from the database. Committed alongside the feed.
 *
 * Refuses to run without credentials: an artifact generated from nothing
 * would publish an empty market history, which is a fabrication, not a
 * degradation. (Local runs: .env.local has no keys by design — bootstrap
 * artifacts come from the github-snapshot cron instead, same generator.)
 *
 * Run: npx tsx scripts/build-open-dataset.ts
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getAllProperties } from '../src/lib/properties';
import { buildOpenDataset } from '../src/lib/open-dataset';
import { fetchSnapshots, fetchSold, LEDGER_EPOCH } from '../src/lib/open-dataset-io';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('open-dataset: Supabase credentials missing — refusing to publish an empty market history.');
  process.exit(1);
}

async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const [snapshots, sold] = await Promise.all([
    fetchSnapshots(db, LEDGER_EPOCH),
    fetchSold(db, LEDGER_EPOCH),
  ]);
  const props = getAllProperties();
  const { manifest, files } = buildOpenDataset(props, snapshots, sold, new Date().toISOString());

  const dir = path.join(process.cwd(), 'public', 'open-data');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }

  console.log(`open-dataset ${manifest.version}: ${manifest.cross_section.towns_published} towns, ` +
    `${manifest.observation_ledger.observation_days} observation days, ` +
    `${manifest.observation_ledger.moves_recorded} moves, ` +
    `${manifest.observation_ledger.delistings_recorded} tombstones → public/open-data/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
