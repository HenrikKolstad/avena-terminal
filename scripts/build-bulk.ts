/**
 * Publish gzipped CSV bundles for frozen weekly vintages.
 *
 *   npx tsx scripts/build-bulk.ts
 *
 * Reads data/vintages. Does not freeze a week and does not edit vintage files.
 * An existing bundle whose row text still matches is left byte for byte.
 * The weekly job is .github/workflows/bulk-refresh.yml.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { bulkRoot, decideBulk, readBulkTree, writeBulk } from '../src/lib/bulk';
import { readVintageManifest } from '../src/lib/vintages';

const ROOT = join(__dirname, '..');

function main(): void {
  const manifest = readVintageManifest(join(ROOT, 'data', 'vintages'));
  const bodies = new Map<string, string>();
  for (const week of manifest.vintages) {
    if (week.status !== 'frozen' || !week.vintage_date) continue;
    bodies.set(week.vintage_date, readFileSync(join(ROOT, 'data', 'vintages', `${week.vintage_date}.json`), 'utf8'));
  }
  const decision = decideBulk({
    manifest,
    bodies,
    existing: readBulkTree(bulkRoot(ROOT)),
    generatedAt: new Date().toISOString(),
  });
  if (decision.errors.length) {
    for (const error of decision.errors) console.error(error);
    process.exit(1);
  }
  writeBulk(ROOT, decision);
  if (!decision.writes.length) console.log('No bulk changes.');
  else for (const write of decision.writes) console.log(`wrote ${write.path} (${write.body.length} bytes)`);

  const frozen = decision.index.bundles.filter((row) => row.status === 'frozen');
  const gaps = decision.index.bundles.filter((row) => row.status === 'gap');
  console.log(`bulk: ${frozen.length} bundle(s), ${gaps.length} gap week(s), ${decision.index.missing_capture_dates.length} missing capture date(s)`);
  console.log(`missing capture dates: ${decision.index.missing_capture_dates.join(', ') || '(none)'}`);
  for (const row of frozen) {
    const file = row.files?.[0];
    console.log(`  ${row.vintage_date}  ${row.iso_week}  rows ${row.row_count}  ${file?.sha256}`);
  }
}

main();
