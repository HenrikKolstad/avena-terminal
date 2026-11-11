/**
 * Bulk snapshots: checksums, manifests, gap weeks, and no rewrite.
 * Run: npx tsx scripts/test-bulk.ts
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { gzipSync, type ZlibOptions } from 'zlib';
import { join } from 'path';
import {
  BULK_COLUMNS,
  BULK_FILE_NAME,
  BULK_CHANGELOG_PATH,
  BULK_INDEX_PATH,
  applyWrites,
  decideBulk,
  gunzipCsv,
  gzipCsv,
  lookupBulkDate,
  publicBulkIndex,
  readBulkTree,
  readPublishedBulk,
  sha256Buffer,
  vintageToBulkCsv,
  type BulkWrite,
} from '../src/lib/bulk';
import {
  VINTAGE_DEFINITIONS,
  VINTAGE_GUARANTEE,
  canonicalVintageJson,
  readVintageManifest,
  sha256Hex,
  type ManifestVintage,
  type VintageBookTotals,
  type VintageFile,
  type VintageManifest,
  type VintageRow,
} from '../src/lib/vintages';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

const T1 = '2026-11-10T12:00:00.000Z';
const T2 = '2026-11-10T13:00:00.000Z';
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function book(): VintageBookTotals {
  return {
    live_listings: 6,
    priced_listings: 6,
    unmapped_listings: 0,
    towns_published: 1,
    towns_omitted: 0,
    comparable_listings: null,
    price_cuts: null,
    price_rises: null,
    price_cut_share: null,
    price_rise_share: null,
    new_listings: null,
    removed_listings: null,
    reassigned_in: null,
    reassigned_out: null,
    reassigned_listings: null,
  };
}

function row(name: string, median: number | null, cuts: number | null): VintageRow {
  return {
    level: 'town',
    key: name,
    name,
    province: 'Málaga',
    costa: 'Costa del Sol',
    live_listings: 6,
    priced_listings: median == null ? 0 : 6,
    median_asking_eur_m2: median,
    comparable_listings: cuts == null ? null : 4,
    price_cuts: cuts,
    price_rises: cuts == null ? null : 0,
    price_cut_share: cuts == null ? null : '0.2500',
    price_rise_share: cuts == null ? null : '0.0000',
    new_listings: cuts == null ? null : 1,
    removed_listings: cuts == null ? null : 0,
    reassigned_in: cuts == null ? null : 0,
    reassigned_out: cuts == null ? null : 0,
  };
}

function fileFor(date: string, iso: string, start: string, end: string, rows: VintageRow[], gaps: string[] = []): VintageFile {
  return {
    schema_version: 1,
    vintage_date: date,
    iso_week: iso,
    week_start: start,
    week_end: end,
    capture_commit: 'a'.repeat(40),
    source: 'public/data.json',
    series_start: '2026-08-05',
    compared_to: null,
    missing_days_since_compared_to: null,
    capture_dates_in_week: [date],
    gap_dates_in_week: gaps,
    overlaps_declared_capture_gap: gaps.some((day) => day >= '2026-10-14' && day <= '2026-10-20'),
    town_min_listings: 5,
    book: book(),
    rows,
  };
}

function frozenWeek(file: VintageFile, body: string): ManifestVintage {
  return {
    iso_week: file.iso_week,
    week_start: file.week_start,
    week_end: file.week_end,
    status: 'frozen',
    vintage_date: file.vintage_date,
    row_count: file.rows.length,
    sha256: sha256Hex(body),
    file: `data/vintages/${file.vintage_date}.json`,
    capture_commit: file.capture_commit,
    compared_to: file.compared_to,
    capture_dates_in_week: [...file.capture_dates_in_week],
    gap_dates_in_week: [...file.gap_dates_in_week],
    overlaps_declared_capture_gap: file.overlaps_declared_capture_gap,
    missing_days_since_compared_to: file.missing_days_since_compared_to,
    reason: null,
  };
}

function manifestOf(weeks: ManifestVintage[], missing: string[] = []): VintageManifest {
  return {
    schema_version: 1,
    series_start: '2026-08-05',
    town_min_listings: 5,
    point_in_time: VINTAGE_GUARANTEE,
    definitions: VINTAGE_DEFINITIONS,
    known_gaps: [{ from: '2026-10-14', to: '2026-10-20' }],
    missing_capture_dates: missing,
    vintages: weeks,
  };
}

function run(manifest: VintageManifest, bodies: Map<string, string>, existing: Map<string, Buffer>, generatedAt: string) {
  return decideBulk({ manifest, bodies, existing, generatedAt });
}

const firstFile = fileFor('2026-08-09', '2026-W32', '2026-08-03', '2026-08-09', [row('Estepona', 4000, null), row('Town, "A"', 4100, null)]);
const firstBody = canonicalVintageJson(firstFile);
const firstWeek = frozenWeek(firstFile, firstBody);
const gapWeek: ManifestVintage = {
  iso_week: '2026-W42',
  week_start: '2026-10-12',
  week_end: '2026-10-18',
  status: 'gap',
  vintage_date: null,
  row_count: null,
  sha256: null,
  file: null,
  capture_commit: null,
  compared_to: null,
  capture_dates_in_week: [],
  gap_dates_in_week: ['2026-10-14', '2026-10-18'],
  overlaps_declared_capture_gap: true,
  missing_days_since_compared_to: null,
  reason: 'No eligible public/data.json commit in this closed week.',
};

console.log('checksums');
const known = 'abc';
check('sha256 of abc matches the known vector', sha256Buffer(Buffer.from(known)) === ABC && sha256Hex(known) === ABC);
const sample = vintageToBulkCsv(firstFile);
const gzA = gzipCsv(sample);
const gzB = gzipCsv(sample);
check('gzip of the same CSV is byte-stable', gzA.equals(gzB));
check('gunzip returns the CSV', gunzipCsv(gzA) === sample);
check('the checksum is the SHA-256 of the gzip bytes', sha256Buffer(gzA) === createHash('sha256').update(gzA).digest('hex'));
check('a null price cut stays an empty cell', sample.includes('Estepona,Málaga,Costa del Sol,6,6,4000,,,,,,') && !sample.includes(',0,0,0'));
check('a comma and a quote in a name are escaped', sample.includes('"Town, ""A"""'));
check('schema 1 header is the column list', sample.startsWith(`${BULK_COLUMNS.join(',')}\n`));
check('every data row carries the capture date', sample.trim().split('\n').slice(1).every((line) => line.startsWith('2026-08-09,')));

console.log('publish, keep, refuse');
const bodies = new Map([['2026-08-09', firstBody]]);
const first = run(manifestOf([firstWeek, gapWeek], ['2026-10-14']), bodies, new Map(), T1);
check('a first publish has no errors', first.errors.length === 0, first.errors.join('; '));
const gzPath = `data/bulk/weeks/2026-08-09/${BULK_FILE_NAME}`;
const manPath = 'data/bulk/weeks/2026-08-09/manifest.json';
const gzWrite = first.writes.find((write) => write.path === gzPath);
const manWrite = first.writes.find((write) => write.path === manPath);
check('the frozen week gets a gzip and a manifest', !!gzWrite && !!manWrite);
check('the gap week gets no file', first.writes.every((write) => !write.path.includes('2026-10-14') && !write.path.includes('2026-W42')));
const manifestJson = JSON.parse((manWrite as BulkWrite).body.toString('utf8')) as {
  schema_version: number;
  generated_at: string;
  source_capture_dates: string[];
  row_count: number;
  files: Array<{ sha256: string; row_count: number; uncompressed_sha256: string }>;
};
check('the manifest records schema, generation time, capture dates and row count',
  manifestJson.schema_version === 1 && manifestJson.generated_at === T1 && manifestJson.source_capture_dates.join() === '2026-08-09' && manifestJson.row_count === 2);
check('the manifest checksum matches the gzip bytes', manifestJson.files[0].sha256 === sha256Buffer((gzWrite as BulkWrite).body) && manifestJson.files[0].row_count === 2);
check('the uncompressed checksum matches the CSV', manifestJson.files[0].uncompressed_sha256 === sha256Hex(sample));
const gapBundle = first.index.bundles.find((row) => row.iso_week === '2026-W42');
check('the gap week is listed with no checksum', gapBundle?.status === 'gap' && gapBundle.files == null && gapBundle.manifest_sha256 == null && gapBundle.gap_dates_in_week.includes('2026-10-14'));
const publicIndex = publicBulkIndex(first.index);
const publishedFrozen = publicIndex.bundles.find((row) => row.vintage_date === '2026-08-09');
check('the public index has download URLs only for the frozen week',
  publishedFrozen?.download_csv_gz === `/api/v1/bulk/2026-08-09?file=${BULK_FILE_NAME}`
  && publishedFrozen.download_manifest === '/api/v1/bulk/2026-08-09'
  && publicIndex.bundles.find((row) => row.status === 'gap')?.download_csv_gz == null);
check('a gap day is not a download', lookupBulkDate(first.index, '2026-10-14').kind === 'gap');
check('an unknown day is not a file', lookupBulkDate(first.index, '2026-01-01').kind === 'missing');

const stored = applyWrites(new Map(), first.writes);
const again = run(manifestOf([firstWeek, gapWeek], ['2026-10-14']), bodies, stored, T2);
check('a second run writes nothing', again.errors.length === 0 && again.writes.length === 0, again.errors.join('; ') || again.writes.map((write) => write.path).join(','));
check('the generation time stays the first one', again.index.bundles.find((row) => row.vintage_date === '2026-08-09')?.generated_at === T1);

const level1Options: ZlibOptions = { level: 1 };
Object.assign(level1Options, { mtime: 0 });
const level1 = gzipSync(Buffer.from(sample), level1Options);
check('a different compression of the same rows is a different byte string', !level1.equals((gzWrite as BulkWrite).body));
const keptManifest = JSON.parse((manWrite as BulkWrite).body.toString('utf8')) as { files: Array<{ sha256: string; bytes: number }> };
keptManifest.files[0].sha256 = sha256Buffer(level1);
keptManifest.files[0].bytes = level1.length;
const keptManifestBytes = Buffer.from(`${JSON.stringify(keptManifest, null, 2)}\n`);
const recompressed = applyWrites(stored, []);
recompressed.set(gzPath, level1);
recompressed.set(manPath, keptManifestBytes);
const recompressedIndex = JSON.parse((recompressed.get(BULK_INDEX_PATH) as Buffer).toString('utf8')) as {
  bundles: Array<{ vintage_date: string | null; manifest_sha256: string | null; files: Array<{ sha256: string; bytes: number }> | null }>;
};
const recompressedBundle = recompressedIndex.bundles.find((row) => row.vintage_date === '2026-08-09');
if (recompressedBundle?.files) {
  recompressedBundle.files[0].sha256 = sha256Buffer(level1);
  recompressedBundle.files[0].bytes = level1.length;
  recompressedBundle.manifest_sha256 = sha256Buffer(keptManifestBytes);
}
recompressed.set(BULK_INDEX_PATH, Buffer.from(`${JSON.stringify(recompressedIndex, null, 2)}\n`));
const kept = run(manifestOf([firstWeek, gapWeek], ['2026-10-14']), bodies, recompressed, T2);
check('matching row text keeps the existing gzip bytes', kept.errors.length === 0 && kept.writes.length === 0, kept.errors.join('; ') || kept.writes.map((write) => write.path).join(','));
check('the published checksum stays the checksum of the stored gzip', kept.index.bundles.find((row) => row.vintage_date === '2026-08-09')?.files?.[0].sha256 === sha256Buffer(level1));

const lied = applyWrites(stored, []);
const liedManifest = JSON.parse((manWrite as BulkWrite).body.toString('utf8')) as { files: Array<{ sha256: string }> };
liedManifest.files[0].sha256 = ABC;
lied.set(manPath, Buffer.from(`${JSON.stringify(liedManifest, null, 2)}\n`));
const lie = run(manifestOf([firstWeek, gapWeek], ['2026-10-14']), bodies, lied, T2);
check('a manifest checksum that does not match the file writes nothing', lie.errors.some((error) => /checksum/.test(error)) && lie.writes.length === 0);

const changedFile = fileFor('2026-08-09', '2026-W32', '2026-08-03', '2026-08-09', [row('Estepona', 9999, null)]);
const changedBody = canonicalVintageJson(changedFile);
const changed = run(manifestOf([frozenWeek(changedFile, changedBody), gapWeek], ['2026-10-14']), new Map([['2026-08-09', changedBody]]), stored, T2);
check('a changed vintage row is refused and writes nothing', changed.errors.some((error) => /would change/.test(error)) && changed.writes.length === 0);

const badHash = frozenWeek(firstFile, firstBody);
badHash.sha256 = ABC;
const bad = run(manifestOf([badHash]), new Map([['2026-08-09', firstBody]]), new Map(), T1);
check('a vintage that does not match its hash is refused', bad.errors.some((error) => /manifest hash/.test(error)) && bad.writes.length === 0);

const stray = applyWrites(stored, []);
stray.set('data/bulk/notes.txt', Buffer.from(Uint8Array.of(120)));
const strayDecision = run(manifestOf([firstWeek, gapWeek], ['2026-10-14']), bodies, stray, T2);
check('an unexpected bulk file is refused', strayDecision.errors.some((error) => /unexpected/.test(error)) && strayDecision.writes.length === 0);

console.log('append');
const secondFile = fileFor('2026-08-16', '2026-W33', '2026-08-10', '2026-08-16', [row('Estepona', 4200, 1)]);
const secondBody = canonicalVintageJson(secondFile);
const appended = run(
  manifestOf([firstWeek, frozenWeek(secondFile, secondBody)], ['2026-08-17']),
  new Map([['2026-08-09', firstBody], ['2026-08-16', secondBody]]),
  stored,
  T2,
);
check('a new week appends without an error', appended.errors.length === 0, appended.errors.join('; '));
check('the append writes the new week and the index, not the old gzip',
  appended.writes.some((write) => write.path === `data/bulk/weeks/2026-08-16/${BULK_FILE_NAME}`)
  && appended.writes.some((write) => write.path === BULK_INDEX_PATH)
  && appended.writes.every((write) => write.path !== gzPath));
const oldSha = sha256Buffer((gzWrite as BulkWrite).body);
check('the previous bundle keeps its checksum and generation time',
  appended.index.bundles.find((row) => row.vintage_date === '2026-08-09')?.files?.[0].sha256 === oldSha
  && appended.index.bundles.find((row) => row.vintage_date === '2026-08-09')?.generated_at === T1
  && appended.index.bundles.find((row) => row.vintage_date === '2026-08-16')?.generated_at === T2);
const dated = run(manifestOf([firstWeek], ['2026-08-17']), bodies, stored, T2);
check('a new missing capture date rewrites the index only',
  dated.errors.length === 0 && dated.writes.length === 1 && dated.writes[0].path === BULK_INDEX_PATH,
  dated.errors.join('; ') || dated.writes.map((write) => write.path).join(','));

console.log('published weeks');
const root = process.cwd();
const published = readPublishedBulk(root);
const vintages = readVintageManifest(join(root, 'data', 'vintages'));
const frozenVintages = vintages.vintages.filter((row) => row.status === 'frozen');
check('every frozen vintage has one bundle',
  frozenVintages.length === published.weeks.length
  && frozenVintages.every((row) => published.weeks.some((week) => week.bundle.vintage_date === row.vintage_date && week.bundle.row_count === row.row_count)));
check('the published bundles include 9 August and 31 October 2026',
  published.weeks.some((week) => week.bundle.vintage_date === '2026-08-09')
  && published.weeks.some((week) => week.bundle.vintage_date === '2026-10-31'));
check('11 November week is not invented', !published.index.bundles.some((row) => row.vintage_date === '2026-11-08' || row.week_start === '2026-11-02'));
check('no bundle is dated inside the declared October gap', published.weeks.every((week) => {
  const date = week.bundle.vintage_date ?? '';
  return date < '2026-10-14' || date > '2026-10-20';
}));
const october = published.index.bundles.find((row) => row.vintage_date === '2026-10-13');
check('13 October lists 14 October as a gap day and still has its own rows',
  !!october && october.gap_dates_in_week.includes('2026-10-14') && october.row_count != null && october.files?.[0].sha256 != null);
check('missing capture dates include the declared gap', published.index.missing_capture_dates.includes('2026-10-14') && published.index.missing_capture_dates.includes('2026-10-20'));
const firstPublished = published.weeks.find((week) => week.bundle.vintage_date === '2026-08-09');
check('the first published week leaves price cuts empty', !!firstPublished && firstPublished.csv.includes('Estepona,Málaga') && /Estepona,Málaga,[^,]+,\d+,\d+,\d+,,,,,,/.test(firstPublished.csv));
check('the published CSV keeps Cádiz', published.weeks.some((week) => week.csv.includes('Cádiz')));
const vintageBodies = new Map<string, string>();
for (const row of frozenVintages) {
  if (!row.vintage_date) continue;
  vintageBodies.set(row.vintage_date, readFileSync(join(root, 'data', 'vintages', `${row.vintage_date}.json`), 'utf8'));
}
const republish = decideBulk({
  manifest: vintages,
  bodies: vintageBodies,
  existing: readBulkTree(join(root, 'data', 'bulk')),
  generatedAt: T2,
});
check('the committed bundles are a no-op on a later run', republish.errors.length === 0 && republish.writes.length === 0, republish.errors.join('; ') || republish.writes.map((write) => write.path).join(','));
check('schema changelog is version 1 csv.gz', published.changelog.schema_version === 1 && published.changelog.changes[0].format === 'csv.gz' && published.changelog.changes[0].columns.length === BULK_COLUMNS.length);

console.log('surfaces');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
const workflow = read('.github/workflows/bulk-refresh.yml');
check('Monday bulk job is after the vintage freeze', workflow.includes("cron: '20 7 * * 1'") && workflow.includes('scripts/build-bulk.ts') && workflow.includes('data/bulk'));
check('the bulk job does not freeze vintages or send pulse mail', !workflow.includes('freeze-vintages') && !workflow.includes('pulse') && !workflow.includes('build-absorption'));
const page = read('src/app/data/bulk/page.tsx');
const routes = read('src/app/api/v1/bulk/route.ts') + read('src/app/api/v1/bulk/[date]/route.ts') + read('src/app/api/v1/bulk/schema/route.ts');
check('the page links the index, the schema and a download', page.includes('href="/api/v1/bulk"') && page.includes('/api/v1/bulk/schema') && page.includes(BULK_FILE_NAME));
check('the file route serves gzip and checks the checksum', routes.includes('application/gzip') && routes.includes('sha256Buffer') && !routes.includes('Content-Encoding'));
check('the sitemap, footer and vintage page link the bulk files',
  read('src/app/sitemap.ts').includes("'/data/bulk'")
  && read('src/components/v2/Footer.tsx').includes("href: '/data/bulk'")
  && read('src/app/data/vintages/page.tsx').includes('href="/data/bulk"'));
check('the deploy traces the bulk files', read('next.config.ts').includes('./data/bulk/**/*'));
const surface = page + routes + read('src/lib/bulk.ts') + workflow;
check('no subscription price on the bulk surfaces', !/€\s?\d|\/\s?month|per month/i.test(surface));
check('no RICS claim on the bulk surfaces', !/RICS/i.test(surface));
check('no upstream vendor name on the bulk surfaces', !/\bred\s?sp\b/i.test(surface));
check('lender-gated series are named as excluded', read('src/lib/bulk.ts').includes('sell-through monitor'));
check('changelog path is the committed file', BULK_CHANGELOG_PATH === 'data/bulk/schema-changelog.json' && BULK_INDEX_PATH === 'data/bulk/index.json');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
