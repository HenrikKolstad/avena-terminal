/**
 * scripts/ingest-pt-ine-benchmark.ts — build data/pt-ine-benchmark.json
 * for /portugal/official from Statistics Portugal's public JSON API.
 *
 *   npx tsx scripts/ingest-pt-ine-benchmark.ts            # fetch + write
 *   npx tsx scripts/ingest-pt-ine-benchmark.ts --dry-run  # fetch + print summary
 *
 * No key, no secret. The weekly job is
 * .github/workflows/pt-ine-benchmark-refresh.yml. If INE is unreachable or a
 * series stops parsing, this exits non-zero and the previous file stays.
 *
 * data/pt-official.json is the separate /portugal market layer. This file
 * does not replace it.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import {
  INE_META_API, APPRAISAL_INDICATOR, APPRAISAL_YOY_INDICATOR, SALES_INDICATOR,
  HPI_INDEX_INDICATOR, HPI_YOY_INDICATOR, APPRAISAL_CATEGORIES, HOUSING_CATEGORIES,
  benchmarkGeos, ineDataUrl, ineMetaGeoCodes, ineMetaUnit, parseIneBenchmark,
  buildPtBenchmarkLayer, layerFingerprint, type IneBenchmarkParsed,
} from '../src/lib/data-sources/ine-pt-benchmark';

const OUT = join(__dirname, '..', 'data', 'pt-ine-benchmark.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/portugal/official)';

function describe(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  const cause = err?.cause ? ` (cause: ${err.cause.code ?? ''} ${err.cause.message ?? ''})` : '';
  return `${err?.message ?? String(e)}${cause}`;
}

function curlJson(url: string): unknown {
  const out = execFileSync('curl', [
    '-sS', '--fail', '--max-time', '180', '--retry', '2', '-A', UA, '-H', 'Accept: application/json', url,
  ], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(out);
}

async function getJson(url: string, attempts = 4): Promise<unknown> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(180_000),
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
      if (i < attempts) await new Promise((r) => setTimeout(r, 5_000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${describe(last)}`);
}

async function loadSeries(
  indicator: string,
  categories: Record<string, string>,
  dims: { dim2?: string; dim3?: string },
): Promise<{ parsed: IneBenchmarkParsed; apiUrl: string; unit: string; fetchedAt: string }> {
  const metaUrl = `${INE_META_API}?varcd=${indicator}&lang=EN`;
  const meta = await getJson(metaUrl);
  const unit = ineMetaUnit(meta, indicator);
  const apiUrl = ineDataUrl(indicator, dims);
  console.log(`INE ${indicator} ${apiUrl}`);
  const fetchedAt = new Date().toISOString();
  const parsed = parseIneBenchmark(await getJson(apiUrl), indicator, categories);
  console.log(`  ${parsed.rows.length} rows, latest ${parsed.latestPeriod}, INE updated ${parsed.lastUpdated}`);
  return { parsed, apiUrl, unit, fetchedAt };
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const appraisalMeta = await getJson(`${INE_META_API}?varcd=${APPRAISAL_INDICATOR}&lang=EN`);
  const appraisalGeos = ineMetaGeoCodes(appraisalMeta, APPRAISAL_INDICATOR);
  const geos = benchmarkGeos();
  for (const geo of geos) {
    if (!appraisalGeos.has(geo)) throw new Error(`INE ${APPRAISAL_INDICATOR} metadata has no geography ${geo}`);
  }
  const yoyMeta = await getJson(`${INE_META_API}?varcd=${APPRAISAL_YOY_INDICATOR}&lang=EN`);
  const yoyGeoSet = ineMetaGeoCodes(yoyMeta, APPRAISAL_YOY_INDICATOR);
  const yoyGeos = [...yoyGeoSet].filter((geo) => geos.includes(geo));
  if (yoyGeos.length === 0) throw new Error(`INE ${APPRAISAL_YOY_INDICATOR} shares no geography with this layer`);

  const appraisal = await loadSeries(APPRAISAL_INDICATOR, APPRAISAL_CATEGORIES, { dim2: geos.join(','), dim3: 'T,1,2' });
  const appraisalYoy = await loadSeries(APPRAISAL_YOY_INDICATOR, { Total: 'total' }, { dim2: yoyGeos.join(','), dim3: 'T' });
  const sales = await loadSeries(SALES_INDICATOR, HOUSING_CATEGORIES, { dim2: geos.join(',') });
  const hpiIndex = await loadSeries(HPI_INDEX_INDICATOR, HOUSING_CATEGORIES, { dim2: 'PT' });
  const hpiYoy = await loadSeries(HPI_YOY_INDICATOR, HOUSING_CATEGORIES, { dim2: 'PT' });

  const layer = buildPtBenchmarkLayer({
    generatedAt: new Date().toISOString(),
    appraisal: appraisal.parsed,
    appraisalApiUrl: appraisal.apiUrl,
    appraisalUnit: appraisal.unit,
    appraisalFetchedAt: appraisal.fetchedAt,
    appraisalYoy: appraisalYoy.parsed,
    appraisalYoyApiUrl: appraisalYoy.apiUrl,
    appraisalYoyUnit: appraisalYoy.unit,
    appraisalYoyFetchedAt: appraisalYoy.fetchedAt,
    appraisalYoyGeos: [...yoyGeoSet],
    sales: sales.parsed,
    salesApiUrl: sales.apiUrl,
    salesUnit: sales.unit,
    salesFetchedAt: sales.fetchedAt,
    hpiIndex: hpiIndex.parsed,
    hpiIndexApiUrl: hpiIndex.apiUrl,
    hpiIndexUnit: hpiIndex.unit,
    hpiIndexFetchedAt: hpiIndex.fetchedAt,
    hpiYoy: hpiYoy.parsed,
    hpiYoyApiUrl: hpiYoy.apiUrl,
    hpiYoyUnit: hpiYoy.unit,
    hpiYoyFetchedAt: hpiYoy.fetchedAt,
  });

  const portugal = layer.regions.find((r) => r.slug === 'portugal');
  const porto = layer.regions.find((r) => r.slug === 'porto');
  if (!portugal || !porto) throw new Error('layer is missing Portugal or Porto');
  console.log(`\nPortugal appraisal ${portugal.appraisal_eur_m2.total.period}: ${portugal.appraisal_eur_m2.total.value} €/m² (${portugal.appraisal_yoy_pct?.value ?? '–'}% y/y)`);
  console.log(`Sales ${portugal.sales_eur_m2.new.period}: new ${portugal.sales_eur_m2.new.value}, existing ${portugal.sales_eur_m2.existing.value}`);
  console.log(`HPI ${layer.hpi.latest.period} base ${layer.hpi.base_year}: new ${layer.hpi.latest.yoy_pct.new.value}%, existing ${layer.hpi.latest.yoy_pct.existing.value}%`);
  for (const region of layer.regions) {
    console.log(`  ${region.name.padEnd(32)} ${region.geo.padEnd(4)} appraisal ${region.appraisal_eur_m2.total.value}  sales new ${region.sales_eur_m2.new.value}  yoy ${region.appraisal_yoy_pct?.value ?? '–'}`);
  }
  if (dry) return;

  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      if (layerFingerprint(prev) === layerFingerprint(layer)) {
        console.log('\nNo change in source data; leaving data/pt-ine-benchmark.json untouched.');
        return;
      }
    } catch { /* overwrite a file that does not parse */ }
  }
  writeFileSync(OUT, JSON.stringify(layer) + '\n');
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-pt-ine-benchmark FAILED: ${describe(e)}`);
  process.exit(1);
});
