/**
 * scripts/ingest-es-notary.ts — build data/es-notary.json from the CIEN
 * statistical annexes (Consejo General del Notariado).
 *
 *   npx tsx scripts/ingest-es-notary.ts            # fetch + write
 *   npx tsx scripts/ingest-es-notary.ts --dry-run  # fetch + print summary
 *
 * Keyless public files, no secrets. Run weekly by
 * .github/workflows/es-notary-refresh.yml, which commits the file when the
 * upstream values change. If a source stops parsing, this exits non-zero
 * and the previous file stays in place.
 *
 * The workbook URLs are the newest housing annex and the newest foreign-buyer
 * annex linked on the CIEN informes page. They are not hardcoded.
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { XMLParser } from 'fast-xml-parser';
import { corpusProvinces } from '../src/lib/data-sources/ine-es';
import {
  CIEN_INDEX_URL,
  buildSpainNotaryLayer,
  notaryLayerFingerprint,
  parseBuyerSheet,
  parseCienIndex,
  parseForeignCommunities,
  parseHousingWorkbook,
  parseNationalitySheet,
  selectCienAnnexes,
  type Cell,
  type Grid,
  type SpainNotaryLayer,
} from '../src/lib/data-sources/es-notary';

const OUT = join(__dirname, '..', 'data', 'es-notary.json');
const DATA = join(__dirname, '..', 'public', 'data.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/spain/notary)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function curl(url: string, accept: string, outFile?: string): string {
  const args = ['-sS', '--fail', '-L', '--max-time', '180', '--retry', '2', '-A', UA, '-H', `Accept: ${accept}`];
  if (outFile) args.push('-o', outFile);
  args.push(url);
  return execFileSync('curl', args, { maxBuffer: 128 * 1024 * 1024, encoding: 'utf8' });
}

async function getText(url: string, accept: string, attempts = 4): Promise<string> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: accept },
        signal: AbortSignal.timeout(180_000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
      console.warn(`  fetch attempt ${i}/${attempts} failed for ${url.split('?')[0]}: ${describe(e)}`);
      try {
        const body = curl(url, accept);
        console.warn('  curl fallback succeeded');
        return body;
      } catch (c) {
        console.warn(`  curl fallback failed: ${describe(c).split('\n')[0]}`);
      }
      if (i < attempts) await new Promise((r) => setTimeout(r, 5_000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${describe(last)}`);
}

function download(url: string, outFile: string) {
  curl(url, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', outFile);
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => name === 'si' || name === 'row' || name === 'c',
});

function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (!node || typeof node !== 'object') return '';
  const o = node as Record<string, unknown>;
  if ('t' in o) return textOf(o.t);
  if ('r' in o) return textOf(o.r);
  if ('#text' in o) return String(o['#text'] ?? '');
  return '';
}

function sharedStrings(xml: string): string[] {
  const doc = xmlParser.parse(xml) as { sst?: { si?: unknown } };
  const list = doc.sst?.si;
  if (list == null) return [];
  const rows = Array.isArray(list) ? list : [list];
  return rows.map((si) => textOf(si));
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetRows(xml: string, strings: string[]): Grid {
  const doc = xmlParser.parse(xml) as { worksheet?: { sheetData?: { row?: unknown } } };
  const rawRows = doc.worksheet?.sheetData?.row;
  if (rawRows == null) throw new Error('workbook sheet has no rows');
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows];
  return rows.map((raw, r) => {
    const cells = (raw as { c?: unknown }).c;
    if (cells == null) return [];
    const list = Array.isArray(cells) ? cells : [cells];
    const out: Cell[] = [];
    for (const cell of list) {
      const c = cell as { '@_r'?: string; '@_t'?: string; v?: string };
      const ref = c['@_r'] ?? '';
      const letters = ref.replace(/[0-9]/g, '');
      if (!letters) throw new Error(`sheet row ${r + 1} has a cell with no address`);
      const i = colIndex(letters);
      let value: Cell = null;
      if (c.v != null && c.v !== '') {
        if (c['@_t'] === 's') {
          const idx = Number(c.v);
          if (!Number.isInteger(idx) || idx < 0 || idx >= strings.length) throw new Error(`shared string ${c.v} is out of range`);
          value = strings[idx];
        } else if (c['@_t'] === 'inlineStr') {
          throw new Error(`sheet uses an inline string at ${ref}, which this reader does not parse`);
        } else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(c.v)) {
          value = Number(c.v);
        } else {
          value = c.v;
        }
      }
      out[i] = value;
    }
    return out;
  });
}

function unzip(file: string, entry: string): string {
  return execFileSync('unzip', ['-p', file, entry], { maxBuffer: 128 * 1024 * 1024, encoding: 'utf8' });
}

function sheetPaths(file: string): Map<string, string> {
  const rels = unzip(file, 'xl/_rels/workbook.xml.rels');
  const book = unzip(file, 'xl/workbook.xml');
  const targets = new Map<string, string>();
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    targets.set(m[1], m[2].replace(/^\//, ''));
  }
  const names = new Map<string, string>();
  for (const m of book.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = targets.get(m[2]);
    if (!target) throw new Error(`workbook sheet ${m[1]} has no file`);
    names.set(m[1], target.startsWith('xl/') ? target : `xl/${target}`);
  }
  if (names.size === 0) throw new Error('workbook has no sheets');
  return names;
}

function loadSheets(file: string): Map<string, Grid> {
  const paths = sheetPaths(file);
  const strings = sharedStrings(unzip(file, 'xl/sharedStrings.xml'));
  const out = new Map<string, Grid>();
  for (const [name, path] of paths) out.set(name, sheetRows(unzip(file, path), strings));
  return out;
}

function sheetNamed(sheets: Map<string, Grid>, pattern: RegExp, label: string): Grid {
  const hits = [...sheets.entries()].filter(([name]) => pattern.test(name));
  if (hits.length !== 1) throw new Error(`${label}: matched ${hits.length} sheets (${[...sheets.keys()].join(', ')})`);
  return hits[0][1];
}

function printSummary(layer: SpainNotaryLayer) {
  const spain = layer.regions.find((r) => r.code === 'TOTAL');
  const and = layer.regions.find((r) => r.code === 'AND');
  const cv = layer.regions.find((r) => r.code === 'CV');
  const mur = layer.regions.find((r) => r.code === 'MUR');
  const foreign = layer.foreign.buyers.find((b) => b.key === 'foreign');
  console.log(`period ${layer.period} provisional=${layer.provisional} retrieved ${layer.retrieved_at}`);
  console.log(`Spain ${spain?.all.eur_m2} €/m²  transactions ${spain?.all.transactions} (nearest ${spain?.all.transactions_nearest})  yoy ${spain?.all.eur_m2_yoy_pct}%`);
  console.log(`Andalucía ${and?.all.eur_m2}  Valencian Community ${cv?.all.eur_m2}  Murcia ${mur?.all.eur_m2}`);
  console.log(`annual ${layer.annual?.year ?? 'none'} Spain ${layer.annual?.regions.find((r) => r.code === 'TOTAL')?.all.eur_m2 ?? 'n/a'}`);
  console.log(`foreign ${layer.foreign.period} buyers ${foreign?.transactions} share ${foreign?.peso_pct}% at ${foreign?.eur_m2} €/m²`);
  console.log(`nationalities ${layer.foreign.nationalities.length - 1}  omissions ${layer.omissions.length}`);
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const book = JSON.parse(readFileSync(DATA, 'utf8')) as { l?: string }[];
  const located = corpusProvinces(book.map((r) => String(r.l ?? '')));
  console.log(`Corpus provinces: ${located.keys.join(', ') || '(none)'}`);
  if (located.unmapped.length) throw new Error(`${located.unmapped.length} listings are not in a known province, e.g. ${located.unmapped[0]}`);
  if (located.keys.length === 0) throw new Error('corpus has no province');

  console.log(`CIEN index ${CIEN_INDEX_URL}`);
  const html = await getText(CIEN_INDEX_URL, 'text/html');
  const selected = selectCienAnnexes(parseCienIndex(html));
  console.log(`housing ${selected.housing.period} ${selected.housing.date} ${selected.housing.title}`);
  console.log(`foreign ${selected.foreign.period} ${selected.foreign.date} ${selected.foreign.title}`);

  const housingFile = join(tmpdir(), `cien-housing-${process.pid}.xlsx`);
  const foreignFile = join(tmpdir(), `cien-foreign-${process.pid}.xlsx`);
  try {
    download(selected.housing.url, housingFile);
    download(selected.foreign.url, foreignFile);
    const housingSheets = loadSheets(housingFile);
    const foreignSheets = loadSheets(foreignFile);
    const index = sheetNamed(housingSheets, /NDICE/i, 'housing index');
    const indexText = index.map((row) => row.map((cell) => (cell == null ? '' : String(cell))).join(' ')).join('\n');
    const housing = parseHousingWorkbook({
      monthly: sheetNamed(housingSheets, /Vivienda_mensual/i, 'monthly housing'),
      annual: sheetNamed(housingSheets, /Vivienda_anual/i, 'annual housing'),
      indexText,
      expectedPeriod: selected.housing.period,
    });
    const buyers = parseBuyerSheet(sheetNamed(foreignSheets, /Nacionalidad/i, 'buyer residence'), selected.foreign.period);
    const communities = parseForeignCommunities(sheetNamed(foreignSheets, /CCAA/i, 'foreign communities'), selected.foreign.period);
    const nationalities = parseNationalitySheet(sheetNamed(foreignSheets, /^Extranjeros$/, 'foreign nationality'), '3', selected.foreign.period);
    const resident = parseNationalitySheet(sheetNamed(foreignSheets, /Extranjeros residentes/i, 'resident nationality'), '4', selected.foreign.period);
    const nonResident = parseNationalitySheet(sheetNamed(foreignSheets, /no residentes/i, 'non-resident nationality'), '5', selected.foreign.period);
    const layer = buildSpainNotaryLayer({
      now: new Date(),
      provinceKeys: located.keys,
      housingFile: selected.housing,
      foreignFile: selected.foreign,
      housing,
      buyers: buyers.buyers,
      communities: communities.communities,
      nationalities,
      nationalitiesResident: resident,
      nationalitiesNonResident: nonResident,
      foreignPeriod: selected.foreign.period,
    });
    printSummary(layer);
    if (dry) return;
    const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) as SpainNotaryLayer : null;
    if (previous && notaryLayerFingerprint(previous) === notaryLayerFingerprint(layer)) {
      console.log('\nNo change in source data; leaving data/es-notary.json untouched.');
      return;
    }
    writeFileSync(OUT, `${JSON.stringify(layer, null, 2)}\n`);
    console.log(`\nWrote ${OUT}`);
  } finally {
    try { unlinkSync(housingFile); } catch { /* the download may not have landed */ }
    try { unlinkSync(foreignFile); } catch { /* the download may not have landed */ }
  }
}

main().catch((e) => {
  console.error(`ingest-es-notary FAILED: ${describe(e)}`);
  process.exit(1);
});
