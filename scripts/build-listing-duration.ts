/**
 * Build data/listing-duration.json from price_snapshots and sold_properties.
 *
 *   npx tsx scripts/build-listing-duration.ts
 *   npx tsx scripts/build-listing-duration.ts --spans spans.json --sold sold.json
 *
 * The live path reads the ledger through fetchSnapshots / fetchSold (epoch
 * bound in the query, one snapshot day at a time). The --spans path reads
 * the same folded rows: ref, town, region, first_seen, last_seen, plus
 * delistings with last_seen_date. It does not publish those references.
 *
 * Fewer than 500 snapshot references is refused. A read that throws leaves
 * the previous file in place, because this script writes only after the
 * aggregate succeeds.
 *
 * Refresh: .github/workflows/listing-duration-refresh.yml, daily 06:55 UTC,
 * after absorption-refresh.yml at 06:40 UTC. It needs
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, writeFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAllProperties } from '../src/lib/properties';
import { fetchSnapshots, fetchSold, LEDGER_EPOCH } from '../src/lib/open-dataset-io';
import {
  aggregateListingDuration,
  canonicalListingDurationJson,
  foldSnapshotSpans,
  listingDurationPath,
  readListingDuration,
  type AddedSpan,
  type DelistingSpan,
  type SnapshotSpan,
} from '../src/lib/listing-duration';

const MIN_REFS = 500;

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};

function addedOnly(spans: SnapshotSpan[], asOf: string): AddedSpan[] {
  const seen = new Set(spans.map((span) => span.ref));
  const out: AddedSpan[] = [];
  for (const property of getAllProperties()) {
    if (!property.ref || seen.has(property.ref) || !property._added || property._added > asOf) continue;
    out.push({
      ref: property.ref,
      town: (property.l || '').split(',')[0].trim() || null,
      region: property.r || null,
      added: property._added,
    });
  }
  return out;
}

async function fromDatabase(db: SupabaseClient): Promise<{ spans: SnapshotSpan[]; delistings: DelistingSpan[] }> {
  const [snapshots, sold] = await Promise.all([
    fetchSnapshots(db, LEDGER_EPOCH),
    fetchSold(db, LEDGER_EPOCH),
  ]);
  return {
    spans: foldSnapshotSpans(snapshots),
    delistings: sold
      .filter((row) => row.ref && (row.last_seen_date ?? '') >= LEDGER_EPOCH)
      .map((row) => ({
        ref: row.ref,
        town: row.town,
        region: row.region,
        lastSeenDate: row.last_seen_date as string,
      })),
  };
}

function fromFiles(spansPath: string, soldPath: string): { spans: SnapshotSpan[]; delistings: DelistingSpan[] } {
  const spans = (JSON.parse(readFileSync(spansPath, 'utf8')) as Array<{
    ref: string; town: string | null; region: string | null; first_seen: string; last_seen: string;
  }>).map((row) => ({
    ref: row.ref,
    town: row.town,
    region: row.region,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
  }));
  const delistings = (JSON.parse(readFileSync(soldPath, 'utf8')) as Array<{
    ref: string; town: string | null; region: string | null; last_seen_date: string;
  }>).map((row) => ({
    ref: row.ref,
    town: row.town,
    region: row.region,
    lastSeenDate: row.last_seen_date,
  }));
  return { spans, delistings };
}

async function main() {
  const spansPath = arg('--spans');
  const soldPath = arg('--sold');
  const out = arg('--out') ?? listingDurationPath();
  let spans: SnapshotSpan[];
  let delistings: DelistingSpan[];
  if (spansPath || soldPath) {
    if (!spansPath || !soldPath) throw new Error('listing-duration: --spans and --sold are used together');
    ({ spans, delistings } = fromFiles(spansPath, soldPath));
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('listing-duration: Supabase credentials missing — refusing to publish an empty duration file');
    const db = createClient(url, key, { auth: { persistSession: false } });
    ({ spans, delistings } = await fromDatabase(db));
  }
  if (spans.length < MIN_REFS) throw new Error(`only ${spans.length} snapshot refs: refusing to publish listing duration on a broken book`);
  const asOf = spans.reduce((max, span) => (span.lastSeen > max ? span.lastSeen : max), '');
  const file = aggregateListingDuration({
    asOf,
    spans,
    delistings,
    addedOnly: addedOnly(spans, asOf),
  });
  writeFileSync(out, canonicalListingDurationJson(file));
  const reread = readListingDuration(out);
  if (reread.asOf !== file.asOf || reread.towns.length !== file.towns.length) {
    throw new Error('wrote listing-duration.json but could not read it back');
  }
  console.log(
    `asOf ${file.asOf}: ${file.coverage.live} live, ${file.coverage.liveLeftCensored} left-censored, ` +
    `${file.coverage.exits} exits, ${file.coverage.exitsInGap} in the October gap, ` +
    `${file.towns.length} towns -> ${out}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
