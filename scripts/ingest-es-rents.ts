/**
 * scripts/ingest-es-rents.ts — build data/es-rents.json from the ministry
 * SERPAVI workbook and INE IPVA table 59058.
 *
 *   npx tsx scripts/ingest-es-rents.ts            # fetch + write
 *   npx tsx scripts/ingest-es-rents.ts --dry-run  # fetch + print summary
 *
 * Keyless public files, no secrets. Run weekly by
 * .github/workflows/es-rents-refresh.yml, which commits the file when the
 * upstream values change. If a source stops parsing, this exits non-zero
 * and the previous file stays in place.
 *
 * The workbook URL is the one xlsx the ministry SERPAVI page links. It is
 * not hardcoded, because the filename carries the release date.
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { XMLParser } from 'fast-xml-parser';
import { corpusProvinces } from '../src/lib/data-sources/ine-es';
import {
  INE_API_BASE, INE_IPVA_TABLE_ID, IPVA_GEO_BY_PROVINCE, IPVA_NATIONAL_GEO,
  SERPAVI_PAGE_URL, buildSpainRentLayer, newestDatedUrl, parseIpvaDatosSerie,
  parseSerpaviTables, rentLayerFingerprint, resolveSerpaviLinks, selectIpvaSeries,
  type Cell, type SpainRentLayer,
} from '../src/lib/data-sources/es-rents';

const OUT = join(__dirname, '..', 'data', 'es-rents.json');
const DATA = join(__dirname, '..', 'public', 'data.json');
const UA = 'Mozilla/5.0 (compatible; AvenaTerminal-OfficialStats/1.0; +https://avenaterminal.com/spain/rents)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function curl(url: string, accept: string, outFile?: string): string {
  const args = ['-sS', '--fail', '-L', '--max-time', '180', '--retry', '2', '-A', UA, '-H', `Accept: ${accept}`];
  if (outFile) args.push('-o', outFile);
  args.push(url);
  return execFileSync('curl', args, { maxBuffer: 128 * 1024 * 1024, encoding: outFile ? 'utf8' : 'utf8' });
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
      if (i < attempts) await new Promise((r) => setTimeout(r, 10_000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${describe(last)}`);
}

async function getJson(url: string): Promise<unknown> {
  const text = await getText(url, 'application/json');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`response was not JSON: ${url} (${text.slice(0, 80)})`);
  }
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
  const doc = xmlParser.parse(xml) as { sst?: { si?: unknown[] } };
  const list = doc.sst?.si;
  if (!Array.isArray(list) || list.length === 0) throw new Error('SERPAVI workbook has no shared strings');
  return list.map((si) => textOf(si));
}

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetRows(xml: string, strings: string[]): Cell[][] {
  const doc = xmlParser.parse(xml) as { worksheet?: { sheetData?: { row?: unknown[] } } };
  const rows = doc.worksheet?.sheetData?.row;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('SERPAVI sheet has no rows');
  return rows.map((raw, r) => {
    const cells = (raw as { c?: unknown[] }).c;
    if (!Array.isArray(cells)) return [];
    const out: Cell[] = [];
    for (const cell of cells) {
      const c = cell as { '@_r'?: string; '@_t'?: string; v?: string };
      const ref = c['@_r'] ?? '';
      const letters = ref.replace(/[0-9]/g, '');
      if (!letters) throw new Error(`SERPAVI sheet row ${r + 1} has a cell with no address`);
      const i = colIndex(letters);
      let value: Cell = null;
      if (c.v != null && c.v !== '') {
        if (c['@_t'] === 's') {
          const idx = Number(c.v);
          if (!Number.isInteger(idx) || idx < 0 || idx >= strings.length) {
            throw new Error(`SERPAVI shared string ${c.v} is out of range`);
          }
          value = strings[idx];
        } else if (c['@_t'] === 'inlineStr') {
          throw new Error(`SERPAVI sheet uses an inline string at ${ref}, which this reader does not parse`);
        } else {
          const n = Number(c.v);
          value = Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(c.v) ? n : c.v;
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
    if (!target) throw new Error(`SERPAVI workbook sheet ${m[1]} has no file`);
    const path = target.startsWith('xl/') ? target : `xl/${target}`;
    names.set(m[1], path);
  }
  return names;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const book = JSON.parse(readFileSync(DATA, 'utf8')) as { l?: string }[];
  const located = corpusProvinces(book.map((r) => String(r.l ?? '')));
  console.log(`Corpus provinces: ${located.keys.join(', ') || '(none)'}`);
  if (located.unmapped.length) {
    throw new Error(`${located.unmapped.length} listings are not in a known province, e.g. ${located.unmapped[0]}`);
  }
  if (located.keys.length === 0) throw new Error('corpus has no province');

  console.log(`SERPAVI page ${SERPAVI_PAGE_URL}`);
  const html = await getText(SERPAVI_PAGE_URL, 'text/html');
  const links = resolveSerpaviLinks(html);
  const methodology = newestDatedUrl(links.methodologyUrls);
  console.log(`  workbook ${links.xlsxUrl}`);
  console.log(`  methodology ${methodology}`);

  const xlsx = join(tmpdir(), `serpavi-${process.pid}.xlsx`);
  console.log('Downloading workbook');
  try {
    curl(links.xlsxUrl, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xlsx);
  const paths = sheetPaths(xlsx);
  for (const name of ['Metadatos', 'Provincias', 'Municipios']) {
    if (!paths.has(name)) throw new Error(`SERPAVI workbook has no ${name} sheet (found ${[...paths.keys()].join(', ')})`);
  }
  console.log('Reading shared strings and the three sheets used here');
  const strings = sharedStrings(unzip(xlsx, 'xl/sharedStrings.xml'));
  console.log(`  ${strings.length} shared strings`);
  const metadatos = sheetRows(unzip(xlsx, paths.get('Metadatos')!), strings);
  const provincias = sheetRows(unzip(xlsx, paths.get('Provincias')!), strings);
  const municipios = sheetRows(unzip(xlsx, paths.get('Municipios')!), strings);
  console.log(`  Metadatos ${metadatos.length} rows, Provincias ${provincias.length}, Municipios ${municipios.length}`);
  const serpavi = parseSerpaviTables({ metadatos, provincias, municipios }, links.xlsxUrl);
  console.log(`  latest year ${serpavi.year}, ${serpavi.provinces.length} provinces, ${serpavi.municipalities.length} municipalities`);

  const geos = [IPVA_NATIONAL_GEO, ...located.keys.map((k) => IPVA_GEO_BY_PROVINCE[k])];
  const seriesListUrl = `${INE_API_BASE}/SERIES_TABLA/${INE_IPVA_TABLE_ID}`;
  console.log(`INE IPVA ${seriesListUrl}`);
  const refs = selectIpvaSeries(await getJson(seriesListUrl), geos);
  console.log(`  ${refs.length} series to fetch`);
  const parsed = [];
  for (const ref of refs) {
    const url = `${INE_API_BASE}/DATOS_SERIE/${encodeURIComponent(ref.cod)}?nult=6&det=2`;
    const series = parseIpvaDatosSerie(await getJson(url), ref.cod);
    if (series.nombre.trim() !== ref.nombre.trim()) {
      throw new Error(`INE ${ref.cod}: listing name "${ref.nombre}" but payload name "${series.nombre}"`);
    }
    const latest = series.points.map((p) => p.period).sort().at(-1);
    console.log(`  ${ref.cod} ${ref.geo} ${ref.dwelling} ${ref.measure}: ${series.points.length} points, latest ${latest}`);
    parsed.push(series);
  }

  const layer = buildSpainRentLayer({
    now: new Date(),
    provinceKeys: located.keys,
    serpavi,
    fileUrl: links.xlsxUrl,
    methodologyUrls: links.methodologyUrls,
    ipva: parsed,
  });

  console.log(`\nSpain IPVA ${layer.ipva_period}: index ${layer.national.ipva_total_index.value} (${layer.national.ipva_total_index.series_id}), annual change ${layer.national.ipva_total_yoy_pct.value}%`);
  for (const p of layer.provinces) {
    const rent = p.colectiva && !p.colectiva.withheld ? p.colectiva.eur_m2_month?.median : null;
    const n = p.colectiva?.contracts ?? 0;
    console.log(`  ${p.name.padEnd(10)} flat rent ${rent ?? 'withheld'} €/m²/month (${n} dwellings, ${layer.serpavi_year})  IPVA ${p.ipva_total_yoy_pct.value}% (${p.ipva_total_yoy_pct.series_id})`);
  }
  const published = layer.municipalities.filter((m) => m.colectiva && !m.colectiva.withheld).length;
  console.log(`Municipalities in these provinces: ${layer.municipalities.length}, with a published flat rent: ${published}`);
  if (layer.ambiguous_keys.length) {
    console.log(`  ${layer.ambiguous_keys.length} shared match keys dropped: ${layer.ambiguous_keys.map((k) => `${k.province_key}:${k.key} (${k.names.join(' / ')})`).join('; ')}`);
  }
  for (const o of layer.omissions) console.log(`  omitted: ${o.source} — ${o.reason}`);

  if (dry) return;
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8')) as SpainRentLayer;
      if (rentLayerFingerprint(prev) === rentLayerFingerprint(layer)) {
        console.log('\nNo change in source data; leaving data/es-rents.json untouched.');
        return;
      }
    } catch { /* overwrite an unreadable file */ }
  }
  writeFileSync(OUT, JSON.stringify(layer, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
  } finally {
    try { unlinkSync(xlsx); } catch { /* the download may not have landed */ }
  }
}

main().catch((e) => {
  console.error(`ingest-es-rents FAILED: ${describe(e)}`);
  process.exit(1);
});
