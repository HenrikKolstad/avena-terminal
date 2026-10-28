/**
 * scripts/ingest-es-town-gap.ts — build data/es-town-gap.json from the
 * ministry statistical bulletin, municipal free-market appraisal
 * (35103500.XLS, municipalities of more than 25,000 inhabitants).
 *
 *   npx tsx scripts/ingest-es-town-gap.ts            # fetch + write
 *   npx tsx scripts/ingest-es-town-gap.ts --dry-run  # fetch + print summary
 *
 * Keyless public file, no secrets. Run weekly by
 * .github/workflows/es-town-gap-refresh.yml, which commits the file when
 * the upstream values change. If the sheet stops meaning what we think it
 * means, this exits non-zero and the previous file stays in place.
 *
 * The Notariado portal is not fetched: its terms prohibit commercial
 * reproduction. The Registradores portal is probed and recorded. VDP003_01
 * is re-read for its header only; a changed header fails the job rather
 * than leaving a stale "no municipal €/m²" note.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import * as XLSX from 'xlsx';
import { REGISTRADORES_DATASET_URL, corpusProvinces } from '../src/lib/data-sources/ine-es';
import { VDP003_URL } from '../src/lib/data-sources/es-supply';
import {
  BULLETIN_XLS_URL,
  buildSpainTownLayer,
  fileModifiedDay,
  selectLatestSheet,
  townLayerFingerprint,
  type SheetCell,
  type SpainTownLayer,
} from '../src/lib/data-sources/es-town-gap';

const OUT = join(__dirname, '..', 'data', 'es-town-gap.json');
const DATA = join(__dirname, '..', 'public', 'data.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/spain/towns)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function curlBuffer(url: string): { body: Buffer; lastModified: string | null } {
  const dir = join('/tmp', `es-town-${Date.now()}`);
  execFileSync('mkdir', ['-p', dir]);
  const file = join(dir, 'body');
  const headers = execFileSync('curl', [
    '-sS', '--fail', '-L', '--max-time', '180', '--retry', '2',
    '-A', UA, '-D', '-', '-o', file, url,
  ], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const match = headers.match(/^last-modified:\s*(.+)$/im);
  return { body: readFileSync(file), lastModified: match ? match[1].trim() : null };
}

async function download(url: string, attempts = 4): Promise<{ body: Buffer; lastModified: string | null }> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: AbortSignal.timeout(180_000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length < 1000) throw new Error(`response too small (${body.length} bytes)`);
      return { body, lastModified: res.headers.get('last-modified') };
    } catch (e) {
      last = e;
      console.warn(`  fetch attempt ${i}/${attempts} failed for ${url}: ${describe(e)}`);
      try {
        const got = curlBuffer(url);
        if (got.body.length < 1000) throw new Error(`curl body too small (${got.body.length} bytes)`);
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

async function probeStatus(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,text/csv,*/*' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    });
    return res.status;
  } catch (e) {
    console.warn(`  probe failed for ${url}: ${describe(e).split('\n')[0]}`);
    try {
      const code = execFileSync('curl', [
        '-sS', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', '30', '-A', UA, url,
      ], { encoding: 'utf8' }).trim();
      const status = Number(code);
      return Number.isInteger(status) && status > 0 ? status : null;
    } catch (c) {
      console.warn(`  curl probe failed: ${describe(c).split('\n')[0]}`);
      return null;
    }
  }
}

async function vdp003Header(): Promise<string | null> {
  try {
    const res = await fetch(VDP003_URL, {
      headers: { 'User-Agent': UA, Accept: 'text/csv' },
      signal: AbortSignal.timeout(60_000),
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn(`VDP003 header probe: HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    const line = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
    return line.trim() ? line : null;
  } catch (e) {
    console.warn(`VDP003 header probe failed: ${describe(e).split('\n')[0]}`);
    return null;
  }
}

function sheetRows(body: Buffer): { name: string; rows: SheetCell[][] } {
  const book = XLSX.read(body, { type: 'buffer', cellDates: false });
  const name = selectLatestSheet(book.SheetNames);
  const sheet = book.Sheets[name];
  if (!sheet) throw new Error(`workbook is missing sheet ${name}`);
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true }) as unknown[][];
  const rows: SheetCell[][] = raw.map((row, r) => {
    if (!Array.isArray(row)) throw new Error(`sheet row ${r + 1} is not an array`);
    return row.map((cell, c) => {
      if (cell == null) return null;
      if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') return cell;
      throw new Error(`sheet row ${r + 1} col ${c + 1}: cell type ${typeof cell} is not a string or number`);
    });
  });
  return { name, rows };
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const book = JSON.parse(readFileSync(DATA, 'utf8')) as { l?: string }[];
  const located = corpusProvinces(book.map((r) => String(r.l ?? '')));
  console.log(`Corpus provinces: ${located.keys.join(', ') || '(none)'}`);
  if (located.unmapped.length) {
    throw new Error(`${located.unmapped.length} listings are not in a known province, e.g. ${located.unmapped[0]}`);
  }

  console.log(`Bulletin ${BULLETIN_XLS_URL}`);
  const file = await download(BULLETIN_XLS_URL);
  console.log(`  ${file.body.length} bytes, Last-Modified ${file.lastModified ?? '(none)'}`);
  const sheet = sheetRows(file.body);
  console.log(`  latest sheet ${sheet.name}, ${sheet.rows.length} rows`);

  const registradoresStatus = await probeStatus(REGISTRADORES_DATASET_URL);
  console.log(`Registradores probe: ${registradoresStatus ?? 'unreachable'}`);
  const header = await vdp003Header();
  console.log(`VDP003 header: ${header ? header.slice(0, 80) : '(unread)'}`);

  const layer = buildSpainTownLayer({
    now: new Date(),
    sheetName: sheet.name,
    rows: sheet.rows,
    fileModified: fileModifiedDay(file.lastModified),
    provinceKeys: located.keys,
    registradoresStatus,
    vdp003Header: header,
  });

  const published = layer.sources.municipal_appraisal;
  const withUpToFive = layer.municipalities.filter((m) => m.up_to_five_years_eur_m2 != null).length;
  const withheld = layer.municipalities.filter((m) => m.up_to_five_years_withheld).length;
  console.log(`\n${published.period}: ${published.municipalities_in_sheet} municipalities on the sheet, ${published.municipalities_published} in the corpus provinces`);
  console.log(`  up-to-five-years published ${withUpToFive}, withheld ${withheld}`);
  for (const name of ['Torrevieja', 'Estepona', 'Marbella', 'Orihuela', 'Mijas', 'Fuengirola']) {
    const row = layer.municipalities.find((m) => m.municipality === name);
    if (!row) console.log(`  ${name}: not in the published provinces`);
    else console.log(`  ${name} (${row.province}): ≤5y ${row.up_to_five_years_eur_m2 ?? 'n.r.'} (${row.appraisals_up_to_five_years} appraisals), all ages ${row.total_eur_m2 ?? 'n.r.'}`);
  }
  for (const o of layer.omissions) console.log(`  omitted: ${o.source} — ${o.reason.slice(0, 160)}`);

  if (dry) return;
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8')) as SpainTownLayer;
      if (townLayerFingerprint(prev) === townLayerFingerprint(layer)) {
        console.log('\nNo change in source data; leaving data/es-town-gap.json untouched.');
        return;
      }
    } catch { /* overwrite an unreadable file */ }
  }
  writeFileSync(OUT, JSON.stringify(layer, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-es-town-gap FAILED: ${describe(e)}`);
  process.exit(1);
});
