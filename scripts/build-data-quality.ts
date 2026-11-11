/**
 * Build data/data-quality.json from files already produced by the capture.
 *
 *   npx tsx scripts/build-data-quality.ts
 *   npx tsx scripts/build-data-quality.ts --out data/data-quality.json
 *
 * This script does not query price_snapshots. A full read of that table has
 * timed out before. Daily counts are the observation ledger, which is the
 * per-day row count from those snapshots. Same-unit pairs are the closed-week
 * listing files already committed in git, the same books as the vintages and
 * the asking-price index. The request path reads the JSON this script writes.
 *
 * Refresh: .github/workflows/data-quality-refresh.yml, daily 11:45 UTC, after
 * the morning feed, open-dataset and absorption commits. It needs a full git
 * history so it can read each vintage's public/data.json. It does not need a
 * database secret.
 */
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { provinceFromLocation } from '../src/lib/data-sources/ine-es';
import {
  DATA_QUALITY_CAVEATS,
  DATA_QUALITY_METHOD,
  DATA_QUALITY_NAME,
  SERIES_START,
  addComparison,
  buildCaptureSeries,
  buildChurn,
  compareListingBooks,
  dataQualityPath,
  emptyComparison,
  fieldCompleteness,
  knownGapRecords,
  placeCoverage,
  priceChanges,
  qualityListingFromBookRow,
  rememberPrices,
  shareTo4,
  spansDeclaredGap,
  splitFeedFileGaps,
  validateDataQuality,
  type BookComparison,
  type DataQualityFile,
  type PriceHistory,
  type PriceIndexCheck,
  type QualityListing,
  type SameUnitWeek,
} from '../src/lib/data-quality';
import { indexListingsFromBook, readPriceIndex, type IndexListing } from '../src/lib/price-index';

const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : undefined;
};

interface LedgerMoveRow {
  date: string;
  listings: number;
  increases: number;
  reductions: number;
}

function readLedger(): LedgerMoveRow[] {
  const lines = readFileSync(join(process.cwd(), 'public', 'open-data', 'movement-ledger.csv'), 'utf8').trim().split('\n');
  const header = lines[0];
  if (header !== 'date,listings_observed,price_increases,price_reductions,median_abs_move_pct,delistings,relistings') {
    throw new Error('movement ledger header changed — refusing to guess columns');
  }
  return lines.slice(1).filter(Boolean).map((line) => {
    const [date, listings, increases, reductions] = line.split(',');
    const row = {
      date,
      listings: Number(listings),
      increases: Number(increases),
      reductions: Number(reductions),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(row.listings) || !Number.isInteger(row.increases) || !Number.isInteger(row.reductions)) {
      throw new Error(`bad movement ledger row: ${line}`);
    }
    return row;
  });
}

function readJson(path: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error(`${path} is not a JSON object`);
  return parsed as Record<string, unknown>;
}

interface FrozenVintage {
  vintage_date: string;
  capture_commit: string;
  compared_to: string | null;
}

function readFrozenVintages(): { missing: string[]; vintages: FrozenVintage[] } {
  const manifest = readJson('data/vintages/manifest.json');
  if (manifest.series_start !== SERIES_START) throw new Error('vintage manifest series start differs');
  if (!Array.isArray(manifest.missing_capture_dates) || !Array.isArray(manifest.vintages)) {
    throw new Error('vintage manifest has no gap list or vintages');
  }
  const missing = manifest.missing_capture_dates.filter((date): date is string => typeof date === 'string');
  if (missing.length !== manifest.missing_capture_dates.length) throw new Error('vintage gap list is not all dates');
  const vintages: FrozenVintage[] = [];
  for (const row of manifest.vintages as Array<Record<string, unknown>>) {
    if (row.status !== 'frozen') continue;
    const vintage_date = row.vintage_date;
    const capture_commit = row.capture_commit;
    const compared_to = row.compared_to ?? null;
    if (typeof vintage_date !== 'string' || typeof capture_commit !== 'string' || (compared_to != null && typeof compared_to !== 'string')) {
      throw new Error(`frozen vintage ${String(row.iso_week)} is missing its date or commit`);
    }
    if (!/^[0-9a-f]{40}$/.test(capture_commit)) throw new Error(`vintage ${vintage_date} commit is not a git sha`);
    vintages.push({ vintage_date, capture_commit, compared_to });
  }
  vintages.sort((a, b) => a.vintage_date.localeCompare(b.vintage_date));
  let previous: string | null = null;
  for (const vintage of vintages) {
    if (vintage.compared_to !== previous) {
      throw new Error(`vintage ${vintage.vintage_date} compared_to ${vintage.compared_to} does not follow ${previous}`);
    }
    previous = vintage.vintage_date;
  }
  if (vintages.length < 2) throw new Error('fewer than two frozen vintages — refusing to publish an empty same-unit comparison');
  return { missing, vintages };
}

function listingBookAt(commit: string): IndexListing[] {
  const raw = execFileSync('git', ['show', `${commit}:public/data.json`], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return indexListingsFromBook(JSON.parse(raw) as unknown);
}

function sameUnitFromVintages(vintages: FrozenVintage[]): { counts: BookComparison; weeks: SameUnitWeek[] } {
  const history: PriceHistory = new Map();
  const counts = emptyComparison();
  const weeks: SameUnitWeek[] = [];
  let previous: IndexListing[] | null = null;
  let previousDate: string | null = null;
  for (const vintage of vintages) {
    const book = listingBookAt(vintage.capture_commit);
    if (previous && previousDate) {
      const delta = compareListingBooks({
        previous,
        current: book,
        comparedTo: previousDate,
        captureDate: vintage.vintage_date,
        history,
      });
      addComparison(counts, delta);
      const spans = spansDeclaredGap(previousDate, vintage.vintage_date);
      weeks.push({
        ...delta,
        capture_date: vintage.vintage_date,
        compared_to: previousDate,
        spans_declared_gap: spans,
        note: spans
          ? `Change between ${previousDate} and ${vintage.vintage_date}. The days between them include the declared capture gap. Those days have no value, and this change is not split across them.`
          : null,
      });
    }
    rememberPrices(history, book, vintage.vintage_date);
    previous = book;
    previousDate = vintage.vintage_date;
  }
  return { counts, weeks };
}

function priceIndexCheck(weeks: SameUnitWeek[]): { asOf: string; check: PriceIndexCheck } {
  const index = readPriceIndex();
  const byDate = new Map(weeks.map((week) => [week.capture_date, week]));
  const coast = index.rows.filter((row) => row.level === 'coast' && row.capture_date && row.cuts != null);
  const check: PriceIndexCheck = {
    cuts: 0,
    rises: 0,
    unchanged: 0,
    held_back_large_move: 0,
    excluded_spec_change: 0,
    reassigned: 0,
    excluded_unpriced: 0,
    excluded_price_range: 0,
  };
  if (coast.length !== weeks.length) {
    throw new Error(`price index has ${coast.length} coast comparisons and the vintage chain has ${weeks.length}`);
  }
  for (const row of coast) {
    const week = byDate.get(row.capture_date as string);
    if (!week) throw new Error(`price index capture ${row.capture_date} is not in the vintage chain`);
    const cuts = row.cuts ?? 0;
    const rises = row.rises ?? 0;
    const unchanged = row.unchanged ?? 0;
    const held = row.held_back_large_move ?? 0;
    const spec = row.excluded_spec_change ?? 0;
    const reassigned = row.reassigned ?? 0;
    const unpriced = row.excluded_unpriced ?? 0;
    const ranged = row.excluded_price_range ?? 0;
    if (week.passed !== cuts + rises || week.unchanged !== unchanged || week.held_large !== held) {
      throw new Error(`same-unit week ${row.capture_date} does not match the price index`);
    }
    if (week.held_spec + week.spec_only !== spec || week.reassigned !== reassigned) {
      throw new Error(`same-unit exclusions on ${row.capture_date} do not match the price index`);
    }
    if (week.excluded_unpriced !== unpriced || week.excluded_price_range !== ranged) {
      throw new Error(`same-unit skipped pairs on ${row.capture_date} do not match the price index`);
    }
    check.cuts += cuts;
    check.rises += rises;
    check.unchanged += unchanged;
    check.held_back_large_move += held;
    check.excluded_spec_change += spec;
    check.reassigned += reassigned;
    check.excluded_unpriced += unpriced;
    check.excluded_price_range += ranged;
  }
  if (!index.data_as_of) throw new Error('price index has no as-of date — refusing to mark the comparison reconciled');
  return { asOf: index.data_as_of, check };
}

function currentBook(): QualityListing[] {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'public', 'data.json'), 'utf8')) as unknown;
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('public/data.json is not a listing book');
  return raw.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('listing book row is not an object');
    return qualityListingFromBookRow(row as Record<string, unknown>, (location) => provinceFromLocation(location)?.name ?? null);
  });
}

function main() {
  const ledger = readLedger();
  const moveRows = readFileSync(join(process.cwd(), 'public', 'open-data', 'moves.csv'), 'utf8').trim().split('\n').length - 1;
  const moveSum = ledger.reduce((sum, row) => sum + row.increases + row.reductions, 0);
  if (moveRows !== moveSum) {
    throw new Error(`moves file has ${moveRows} rows and the ledger sums to ${moveSum} — refusing to mix them`);
  }
  const dataset = readJson('public/open-data/dataset.json');
  const ledgerMeta = dataset.observation_ledger as { latest_date?: unknown; moves_recorded?: unknown } | undefined;
  if (ledgerMeta?.latest_date !== ledger[ledger.length - 1]?.date || ledgerMeta?.moves_recorded !== moveRows) {
    throw new Error('dataset.json observation ledger does not match the movement files');
  }
  const version = typeof dataset.version === 'string' ? dataset.version : '';
  if (!version) throw new Error('open dataset has no version');

  const capture = buildCaptureSeries({
    observed: ledger.map((row) => ({ date: row.date, listings: row.listings })),
    from: SERIES_START,
    to: ledger[ledger.length - 1].date,
  });
  if (capture.from !== ledger[0].date) throw new Error(`ledger starts ${ledger[0].date}, not the series start ${SERIES_START}`);

  const feed = readJson('public/feed-meta.json');
  const feedGeneratedAt = typeof feed.generated_at === 'string' ? feed.generated_at : '';
  const feedDate = typeof feed.generated_date === 'string' ? feed.generated_date : '';
  const feedListings = typeof feed.listings === 'number' ? feed.listings : NaN;
  const contentSha = typeof feed.content_sha256 === 'string' ? feed.content_sha256 : '';
  if (!feedGeneratedAt || !feedDate || !Number.isInteger(feedListings) || !contentSha) {
    throw new Error('feed-meta.json is missing generated_at, generated_date, listings or content_sha256');
  }

  const listings = currentBook();
  const completeness = fieldCompleteness(listings);
  const coverage = placeCoverage(listings);
  const vintages = readFrozenVintages();
  const feedGaps = splitFeedFileGaps(vintages.missing, capture);
  const sameUnit = sameUnitFromVintages(vintages.vintages);
  const index = priceIndexCheck(sameUnit.weeks);
  const changes = priceChanges(sameUnit.counts);
  const passShare = shareTo4(sameUnit.counts.passed, changes);
  if (!passShare) throw new Error('same-unit pass share could not be computed');

  const absorption = readJson('data/absorption.json');
  const weekly = absorption.weekly;
  if (absorption.seriesStart !== SERIES_START || typeof absorption.asOf !== 'string' || !Array.isArray(weekly)) {
    throw new Error('absorption file has no weekly series');
  }
  const churn = buildChurn(weekly.map((week) => {
    const row = week as { week?: unknown; newListings?: unknown; exits?: unknown };
    if (typeof row.week !== 'string' || typeof row.newListings !== 'number' || typeof row.exits !== 'number') {
      throw new Error('absorption week is missing week, newListings or exits');
    }
    return { week: row.week, newListings: row.newListings, exits: row.exits };
  }));

  const latest = capture.days.filter((day) => day.captured).at(-1);
  if (!latest || latest.listings == null) throw new Error('capture series has no captured day');

  const file: DataQualityFile = {
    schema_version: 1,
    name: DATA_QUALITY_NAME,
    built_at: new Date().toISOString(),
    series_start: SERIES_START,
    method: DATA_QUALITY_METHOD,
    caveats: [...DATA_QUALITY_CAVEATS],
    known_gaps: knownGapRecords(),
    sources: {
      daily_capture: { file: 'public/open-data/movement-ledger.csv', dataset_version: version, as_of: capture.to },
      current_book: { file: 'public/data.json', feed_generated_at: feedGeneratedAt, listings: listings.length },
      feed_file_gaps: { file: 'data/vintages/manifest.json' },
      churn: { file: 'data/absorption.json', as_of: absorption.asOf },
      same_unit: {
        listing_file: 'public/data.json at each frozen vintage commit',
        rule: 'src/lib/unit-identity.ts via classifyPair in src/lib/price-index.ts',
      },
      daily_passed_moves: {
        file: 'public/open-data/moves.csv',
        rows: moveRows,
        note: 'These rows are daily price changes that passed the same-unit check. Changes held back are not in the file, so this count is not a pass share.',
      },
    },
    book: {
      listings: listings.length,
      feed_generated_at: feedGeneratedAt,
      feed_generated_date: feedDate,
      feed_listings: feedListings,
      content_sha256: contentSha,
      agrees_with_feed_meta: feedListings === listings.length && feedDate === capture.to,
      latest_snapshot_date: latest.date,
      latest_snapshot_listings: latest.listings,
      agrees_with_latest_snapshot: latest.listings === listings.length && latest.date === feedDate,
    },
    capture,
    feed_file_gaps: {
      definition: 'Days, on or after the series start, with no eligible commit of the listing file. Taken from the vintage manifest. A day can be on this list and still have a price snapshot.',
      dates: [...vintages.missing].sort(),
      ...feedGaps,
    },
    completeness,
    coverage,
    churn: {
      as_of: absorption.asOf,
      definition: 'A new listing is a reference first seen after the series start. A delisting is a reference seen in an earlier snapshot and absent from the latest one, dated the day after it was last seen. A delisting is not a confirmed sale. Weeks are Monday to Sunday. The count of days in a week is not repeated here: that absorption field counts calendar days outside the declared gap, not snapshots.',
      ...churn,
    },
    same_unit: {
      grain: 'Closed-week listing books. One comparison per frozen vintage after the first.',
      through: sameUnit.weeks[sameUnit.weeks.length - 1]?.capture_date ?? '',
      price_index_as_of: index.asOf,
      reconciled: true,
      price_index_check: index.check,
      counts: sameUnit.counts,
      price_changes: changes,
      pass_share: passShare,
      weeks: sameUnit.weeks,
    },
    freshness: {
      feed_generated_at: feedGeneratedAt,
      latest_capture_date: latest.date,
      capture_source: 'Latest day in public/open-data/movement-ledger.csv, the per-day count of price snapshot rows. Not a live database read.',
      note: 'Feed age is graded from public/feed-meta.json when the page or API is rendered. Live database status is /api/health.',
    },
  };

  validateDataQuality(file);
  const out = arg('--out') ?? dataQualityPath();
  writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);
  const passedPct = (Number(passShare) * 100).toFixed(1);
  console.log(
    `data quality ${capture.from} .. ${capture.to}: ${capture.days_captured} captured days, ${capture.days_missing} missing, ${listings.length} listings, same-unit pass share ${passedPct}% (${sameUnit.counts.passed} of ${changes})`,
  );
  console.log(`wrote ${out}`);
}

main();
