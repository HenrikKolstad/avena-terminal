/**
 * scripts/ingest-es-official.ts — build data/es-official.json from INE Spain
 * (IPV, table 79563) and the Ministerio de Vivienda y Agenda Urbana
 * (VDP006_01, appraised €/m² of free-market housing).
 *
 *   npx tsx scripts/ingest-es-official.ts            # fetch + write
 *   npx tsx scripts/ingest-es-official.ts --dry-run  # fetch + print summary
 *
 * Keyless public files, no secrets. Run weekly by
 * .github/workflows/es-official-refresh.yml, which commits the file when the
 * upstream values change. If a required source stops parsing, this exits
 * non-zero and the previous file stays in place.
 *
 * The Registradores open-data portal is probed and recorded. A refusal does
 * not fail the job (the required sources are INE and MIVAU). A successful
 * response is still not parsed: there is no parser, and the omission says so
 * rather than inventing a column layout.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import {
  ES_PROVINCE_DEFS, INE_API_BASE, INE_TABLE_ID, MIVAU_CSV_URL, REGISTRADORES_DATASET_URL,
  buildSpainLayer, corpusProvinces, layerFingerprint, parseIneDatosSerie,
  parseMivauCsv, selectIneSeries, type SpainLayer,
} from '../src/lib/data-sources/ine-es';

const OUT = join(__dirname, '..', 'data', 'es-official.json');
const DATA = join(__dirname, '..', 'public', 'data.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/spain/official)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

/** curl follows redirects. INE's API 301s onto a cache host; Node fetch
 *  follows that on its own, and curl is the path that does not. */
function curl(url: string, accept: string): string {
  return execFileSync('curl', [
    '-sS', '--fail', '-L', '--max-time', '180', '--retry', '2',
    '-A', UA, '-H', `Accept: ${accept}`, url,
  ], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
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

/** One attempt. The portal is optional; a refusal must not block INE or MIVAU. */
async function probeRegistradores(): Promise<number | null> {
  try {
    const res = await fetch(REGISTRADORES_DATASET_URL, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    });
    console.log(`Registradores probe: HTTP ${res.status}`);
    if (res.status === 200) {
      console.warn('WARNING: Registradores returned HTTP 200 and this job has no parser. The series was not ingested.');
    }
    return res.status;
  } catch (e) {
    console.warn(`Registradores fetch failed: ${describe(e).split('\n')[0]}`);
    try {
      const code = execFileSync('curl', [
        '-sS', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', '30', '-A', UA, REGISTRADORES_DATASET_URL,
      ], { encoding: 'utf8' }).trim();
      const status = Number(code);
      console.log(`Registradores curl probe: HTTP ${code}`);
      if (status === 200) {
        console.warn('WARNING: Registradores returned HTTP 200 via curl and this job has no parser. The series was not ingested.');
      }
      return Number.isInteger(status) && status > 0 ? status : null;
    } catch (c) {
      console.warn(`Registradores unreachable: ${describe(c).split('\n')[0]}`);
      return null;
    }
  }
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const book = JSON.parse(readFileSync(DATA, 'utf8')) as { l?: string }[];
  const located = corpusProvinces(book.map((r) => String(r.l ?? '')));
  console.log(`Corpus provinces: ${located.keys.join(', ') || '(none)'}`);
  if (located.unmapped.length) {
    throw new Error(`${located.unmapped.length} listings are not in a known province, e.g. ${located.unmapped[0]}`);
  }

  const seriesListUrl = `${INE_API_BASE}/SERIES_TABLA/${INE_TABLE_ID}`;
  console.log(`INE series list ${seriesListUrl}`);
  const wantedGeos = ['Nacional', ...new Set(
    ES_PROVINCE_DEFS.filter((p) => located.keys.includes(p.key)).map((p) => p.ccaaIne),
  )];
  const refs = selectIneSeries(await getJson(seriesListUrl), wantedGeos);
  console.log(`  ${refs.length} series to fetch`);

  const parsed = [];
  for (const ref of refs) {
    const url = `${INE_API_BASE}/DATOS_SERIE/${encodeURIComponent(ref.cod)}?nult=12&det=2`;
    const series = parseIneDatosSerie(await getJson(url), ref.cod);
    if (series.nombre.trim() !== ref.nombre.trim()) {
      throw new Error(`INE ${ref.cod}: listing name "${ref.nombre}" but payload name "${series.nombre}"`);
    }
    const latest = series.points.map((p) => p.period).sort().at(-1);
    console.log(`  ${ref.cod} ${ref.geo} ${ref.dwelling} ${ref.measure}: ${series.points.length} points, latest ${latest}`);
    parsed.push(series);
  }

  console.log(`MIVAU ${MIVAU_CSV_URL}`);
  const mivau = parseMivauCsv(await getText(MIVAU_CSV_URL, 'text/csv'));
  console.log(`  ${mivau.length} rows`);

  const registradoresStatus = await probeRegistradores();
  const layer = buildSpainLayer({
    now: new Date(),
    provinceKeys: located.keys,
    unmappedLocations: [],
    ine: parsed,
    mivau,
    registradoresStatus,
  });

  const n = layer.national;
  console.log(`\nSpain appraisal ${n.appraisal.period}: ${n.appraisal.value} €/m² (${n.appraisal.series_id})`);
  console.log(`Spain INE new dwellings ${n.ine_new_yoy_pct.period}: ${n.ine_new_yoy_pct.value}% (${n.ine_new_yoy_pct.series_id})`);
  for (const p of layer.provinces) {
    console.log(`  ${p.name.padEnd(10)} appraisal ${p.appraisal.value} (${p.appraisal.period})  INE new ${p.ine_new_yoy_pct.value}% (${p.ine_new_yoy_pct.series_id}, ${p.ccaa})`);
  }
  for (const o of layer.omissions) console.log(`  omitted: ${o.source} — ${o.reason}`);

  if (dry) return;
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8')) as SpainLayer;
      if (layerFingerprint(prev) === layerFingerprint(layer)) {
        console.log('\nNo change in source data; leaving data/es-official.json untouched.');
        return;
      }
    } catch { /* overwrite an unreadable file */ }
  }
  writeFileSync(OUT, JSON.stringify(layer, null, 2) + '\n');
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-es-official FAILED: ${(e as Error).message}`);
  process.exit(1);
});
