/**
 * scripts/ingest-es-supply.ts — build data/es-supply.json from the housing
 * ministry's estimated free-market starts and completions (VDP005_01) and
 * INE registered sales of new dwellings (table 6150).
 *
 *   npx tsx scripts/ingest-es-supply.ts            # fetch + write
 *   npx tsx scripts/ingest-es-supply.ts --dry-run  # fetch + print summary
 *
 * Keyless public files, no secrets. Run weekly by
 * .github/workflows/es-supply-refresh.yml, which commits the file when the
 * upstream values change. If a required source stops parsing, this exits
 * non-zero and the previous file stays in place.
 *
 * The ministry notarial file (VDP003_01) is read and recorded. A conflicting
 * pair of transaction counts does not fail the job and is not published.
 * The raw visado bulletin is not fetched: it is HTML, and the omission says so.
 */

import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import {
  INE_SALES_CSV_URL, VDP003_URL, VDP005_URL,
  assessVdp003, buildSpainSupplyLayer, corpusProvinces, fileModifiedDay, parseIneNewSales,
  parseVdp005, supplyFingerprint, type SpainSupplyLayer, type SupplyOmission,
} from '../src/lib/data-sources/es-supply';

const OUT = join(__dirname, '..', 'data', 'es-supply.json');
const DATA = join(__dirname, '..', 'public', 'data.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/spain/supply)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function lastModifiedFromHeaderText(raw: string): string | null {
  const matches = [...raw.matchAll(/^last-modified:\s*(.+)$/gim)];
  const last = matches.length ? matches[matches.length - 1][1] : null;
  return fileModifiedDay(last);
}

function curl(url: string): { body: string; lastModified: string | null } {
  const dir = mkdtempSync(join(tmpdir(), 'es-supply-'));
  const hdr = join(dir, 'headers');
  try {
    const body = execFileSync('curl', [
      '-sS', '--fail', '-L', '--max-time', '180', '--retry', '2',
      '-D', hdr, '-A', UA, '-H', 'Accept: text/csv, text/plain, */*', url,
    ], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
    const headers = readFileSync(hdr, 'utf8');
    return { body, lastModified: lastModifiedFromHeaderText(headers) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function getText(url: string, attempts = 4): Promise<{ body: string; lastModified: string | null }> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/csv, text/plain, */*' },
        signal: AbortSignal.timeout(180_000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      return { body, lastModified: fileModifiedDay(res.headers.get('last-modified')) };
    } catch (e) {
      last = e;
      console.warn(`  fetch attempt ${i}/${attempts} failed for ${url.split('?')[0]}: ${describe(e)}`);
      try {
        const got = curl(url);
        console.warn('  curl fallback succeeded');
        return got;
      } catch (c) {
        console.warn(`  curl fallback failed: ${describe(c).split('\n')[0]}`);
      }
      if (i < attempts) await new Promise((r) => setTimeout(r, 10_000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${describe(last)}`);
}

/** Optional file. A refusal must not block VDP005 or INE. */
async function readVdp003(): Promise<SupplyOmission> {
  try {
    const res = await fetch(VDP003_URL, {
      headers: { 'User-Agent': UA, Accept: 'text/csv, text/plain, */*' },
      signal: AbortSignal.timeout(180_000),
      redirect: 'follow',
    });
    console.log(`VDP003 probe: HTTP ${res.status}`);
    if (!res.ok) return assessVdp003(null, res.status);
    return assessVdp003(await res.text(), res.status);
  } catch (e) {
    console.warn(`VDP003 fetch failed: ${describe(e).split('\n')[0]}`);
    try {
      const got = curl(VDP003_URL);
      console.log('VDP003 curl probe: body received');
      return assessVdp003(got.body, 200);
    } catch (c) {
      console.warn(`VDP003 unreachable: ${describe(c).split('\n')[0]}`);
      return assessVdp003(null, null);
    }
  }
}

function line(label: string, slot: { available: boolean; value?: number; period: string | null; reason?: string }): string {
  if (slot.available) return `${label} ${slot.period}: ${slot.value?.toLocaleString('en-GB')}`;
  return `${label} ${slot.period ?? ''}: not published — ${slot.reason ?? ''}`;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const book = JSON.parse(readFileSync(DATA, 'utf8')) as { l?: string }[];
  const located = corpusProvinces(book.map((r) => String(r.l ?? '')));
  console.log(`Corpus provinces: ${located.keys.join(', ') || '(none)'}`);
  if (located.unmapped.length) {
    throw new Error(`${located.unmapped.length} listings are not in a known province, e.g. ${located.unmapped[0]}`);
  }

  console.log(`VDP005 ${VDP005_URL}`);
  const vdp = await getText(VDP005_URL);
  const vdp005 = parseVdp005(vdp.body);
  console.log(`  ${vdp005.length} rows, file modified ${vdp.lastModified ?? 'not sent'}`);

  console.log(`INE ${INE_SALES_CSV_URL}`);
  const ineFile = await getText(INE_SALES_CSV_URL);
  const ine = parseIneNewSales(ineFile.body);
  console.log(`  ${ine.length} vivienda-nueva rows, file modified ${ineFile.lastModified ?? 'not sent'}`);

  const vdp003 = await readVdp003();
  const layer = buildSpainSupplyLayer({
    now: new Date(),
    provinceKeys: located.keys,
    unmappedLocations: [],
    vdp005,
    ine,
    vdp005Modified: vdp.lastModified,
    ineModified: ineFile.lastModified,
    vdp003,
  });

  const n = layer.national;
  console.log(`\n${line('Spain starts', n.starts_latest)}`);
  console.log(line('Spain starts, 12 months', n.starts_trailing_12m));
  console.log(line('Spain completions', n.completions_latest));
  console.log(line('Spain completions, 12 months', n.completions_trailing_12m));
  console.log(line('Spain INE vivienda nueva', n.ine_new_sales_latest));
  console.log(line('Spain INE vivienda nueva, 12 months', n.ine_new_sales_trailing_12m));
  for (const p of layer.provinces) {
    console.log(
      `  ${p.name.padEnd(10)} starts ${p.starts_latest.value} (${p.starts_latest.period})` +
      `  12m ${p.starts_trailing_12m.value}` +
      `  done ${p.completions_latest.value} (${p.completions_latest.period})` +
      `  INE ${p.ine_new_sales_latest.value} (${p.ine_new_sales_latest.period})`,
    );
  }
  for (const o of layer.omissions) console.log(`  omitted: ${o.source} — ${o.reason}`);

  if (dry) return;
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8')) as SpainSupplyLayer;
      if (supplyFingerprint(prev) === supplyFingerprint(layer)) {
        console.log('\nNo change in source data; leaving data/es-supply.json untouched.');
        return;
      }
    } catch { /* overwrite an unreadable file */ }
  }
  writeFileSync(OUT, JSON.stringify(layer, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-es-supply FAILED: ${(e as Error).message}`);
  process.exit(1);
});
