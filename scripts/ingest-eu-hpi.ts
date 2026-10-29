/**
 * scripts/ingest-eu-hpi.ts — build data/eu-hpi.json from Eurostat prc_hpi_q
 * and the committed listing book.
 *
 *   npx tsx scripts/ingest-eu-hpi.ts            # fetch + write
 *   npx tsx scripts/ingest-eu-hpi.ts --dry-run  # fetch + print summary
 *
 * Keyless public API, no secrets. Run weekly by
 * .github/workflows/eu-hpi-refresh.yml, which commits the file when it
 * changes. If Eurostat stops parsing, or the Spain asking median cannot be
 * computed, this exits non-zero and the previous file stays in place.
 *
 * The asking tape is rebuilt from git history of public/data.json when that
 * history reaches back at least as far as the stored tape. A shallow
 * checkout cannot see that history; the stored days are kept and the book
 * in the working tree is upserted. Days are not invented.
 *
 * Licence: Eurostat data may be reused provided the source is acknowledged.
 * /europe/official carries the dataset code, the DOI and the copyright URL.
 */

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  askingDayFromListings,
  buildEuHpiLayer,
  countryCode,
  eurostatHpiUrl,
  latestQuarter,
  mergeAskingDays,
  parseEurostatHpi,
  type AskingDay,
  type EuHpiLayer,
  type RawListing,
} from '../src/lib/data-sources/eu-hpi';

const OUT = join(__dirname, '..', 'data', 'eu-hpi.json');
const BOOK = join(__dirname, '..', 'public', 'data.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/europe/official)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function curlJson(url: string): unknown {
  const out = execFileSync('curl', [
    '-sS', '--fail', '--max-time', '180', '--retry', '2',
    '-A', UA, '-H', 'Accept: application/json', url,
  ], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(out);
}

async function getJson(url: string, attempts = 4): Promise<unknown> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      console.warn(`  fetch attempt ${i}/${attempts} failed: ${describe(e)}`);
      try {
        const j = curlJson(url);
        console.warn('  curl fallback succeeded');
        return j;
      } catch (c) {
        console.warn(`  curl fallback failed: ${describe(c).split('\n')[0]}`);
      }
      if (i < attempts) await new Promise((r) => setTimeout(r, 10_000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${describe(last)}`);
}

function asListings(raw: unknown, where: string): RawListing[] {
  if (!Array.isArray(raw)) throw new Error(`${where} is not a listing array`);
  return raw.map((row) => {
    const rec = row as { l?: unknown; country?: unknown; pm2?: unknown };
    return {
      location: typeof rec.l === 'string' ? rec.l : '',
      country: typeof rec.country === 'string' ? rec.country : null,
      askingEurM2: typeof rec.pm2 === 'number' ? rec.pm2 : null,
    };
  });
}

function git(args: string[], maxBuffer = 16 * 1024 * 1024): string {
  return execFileSync('git', args, { cwd: join(__dirname, '..'), encoding: 'utf8', maxBuffer });
}

/** One asking day per UTC commit date of public/data.json. Null when history is too short to trust (a shallow clone). */
function askingDaysFromGit(): AskingDay[] | null {
  let log: string;
  try {
    log = git(['log', '--format=%H %cI', '--', 'public/data.json']);
  } catch (e) {
    console.warn(`  git log of public/data.json failed: ${describe(e).split('\n')[0]}`);
    return null;
  }
  const lines = log.trim().split('\n').filter(Boolean);
  if (lines.length < 2) {
    console.warn(`  git history of public/data.json has ${lines.length} commit(s); keeping the stored tape.`);
    return null;
  }
  const byDate = new Map<string, { hash: string; iso: string }>();
  for (const line of lines) {
    const space = line.indexOf(' ');
    const hash = line.slice(0, space);
    const iso = line.slice(space + 1);
    const date = iso.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`git commit date is not a day: ${iso}`);
    const prev = byDate.get(date);
    if (!prev || iso > prev.iso) byDate.set(date, { hash, iso });
  }
  const days: AskingDay[] = [];
  const entries = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  entries.forEach(([date, { hash }], i) => {
    if (i % 25 === 0) console.log(`  asking tape ${i + 1}/${entries.length} (${date})`);
    const raw = git(['show', `${hash}:public/data.json`], 64 * 1024 * 1024);
    days.push(askingDayFromListings(date, asListings(JSON.parse(raw), `${hash}:public/data.json`)));
  });
  console.log(`  rebuilt ${days.length} asking days from git (${days[0]?.date} to ${days[days.length - 1]?.date})`);
  return days;
}

function bookDateFromGit(): string {
  const iso = git(['log', '-1', '--format=%cI', '--', 'public/data.json']).trim();
  const date = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`latest public/data.json commit date is not a day: ${iso}`);
  return date;
}

function readPrevious(): AskingDay[] {
  if (!existsSync(OUT)) return [];
  const prev = JSON.parse(readFileSync(OUT, 'utf8')) as { avena?: { days?: AskingDay[] } };
  return Array.isArray(prev.avena?.days) ? prev.avena.days : [];
}

function extraGeos(listings: RawListing[]): string[] {
  const codes = new Set<string>();
  for (const row of listings) {
    const code = countryCode(row.location, row.country);
    if (code && code !== 'ES' && code !== 'PT') codes.add(code);
  }
  return [...codes].sort();
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const listings = asListings(JSON.parse(readFileSync(BOOK, 'utf8')), 'public/data.json');
  const extras = extraGeos(listings);
  const url = eurostatHpiUrl(extras);
  console.log(`Eurostat prc_hpi_q (${extras.length ? `extra geos ${extras.join(', ')}` : 'ES, PT, EU27_2020, EA20'}) …`);
  const { parsed, missingGeos } = parseEurostatHpi(await getJson(url), extras);
  const sample = parsed.geos.find((g) => g.code === 'ES');
  const latest = sample ? latestQuarter({ ...sample, role: 'avena_book' }) : null;
  console.log(`  ${parsed.label}; updated ${parsed.updated}; ${sample?.quarters.length ?? 0} quarters; latest ${latest?.period}`);
  for (const geo of parsed.geos) {
    const q = geo.quarters[geo.quarters.length - 1];
    console.log(`  ${geo.code.padEnd(10)} ${q.period}  new ${q.new_index} (${q.new_yoy_pct}% y/y)  total ${q.total_index} (${q.total_yoy_pct}% y/y)`);
  }
  if (missingGeos.length) console.log(`  omitted geos: ${missingGeos.join(', ')}`);

  const currentDate = bookDateFromGit();
  const current = askingDayFromListings(currentDate, listings);
  const es = current.countries.find((c) => c.code === 'ES');
  console.log(`Asking book ${currentDate}: Spain median ${es?.median_asking_eur_m2 ?? '–'} EUR/m² from ${es?.priced_listings ?? 0} priced listings, unmapped ${current.unmapped_listings}`);

  const rebuilt = askingDaysFromGit();
  const days = mergeAskingDays(readPrevious(), rebuilt, current);
  console.log(`Asking tape ${days.length} days, ${days[0].date} to ${days[days.length - 1].date}`);

  const now = new Date();
  const layer = buildEuHpiLayer({
    parsed,
    missingGeos,
    days,
    apiUrl: url,
    retrievedAt: now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
  });

  if (dry) return;
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8')) as EuHpiLayer;
      const strip = (o: EuHpiLayer) => JSON.stringify({ ...o, generated_at: '', source: { ...o.source, retrieved_at: '' } });
      if (strip(prev) === strip(layer)) {
        console.log('\nNo change in source data; leaving data/eu-hpi.json untouched.');
        return;
      }
    } catch { /* overwrite an unreadable file */ }
  }
  writeFileSync(OUT, `${JSON.stringify(layer, null, 2)}\n`);
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-eu-hpi FAILED: ${describe(e)}`);
  process.exit(1);
});
