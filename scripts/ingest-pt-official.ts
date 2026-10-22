/**
 * scripts/ingest-pt-official.ts — build data/pt-official.json, the Avena
 * Portugal market layer, from INE Portugal and Banco de Portugal (BPstat).
 *
 *   npx tsx scripts/ingest-pt-official.ts            # fetch + write
 *   npx tsx scripts/ingest-pt-official.ts --dry-run  # fetch + print summary
 *
 * Keyless public APIs, no secrets. Run weekly by
 * .github/workflows/pt-official-refresh.yml, which commits the file when it
 * changes. If any source stops parsing, this exits non-zero and the previous
 * committed file stays in place (a stale benchmark beats a blank one, and the
 * red run says so).
 *
 * Licences: INE data CC BY 4.0 ("Fonte: INE"); BPstat free reuse with
 * "Fonte: Banco de Portugal" and modifications stated. /portugal carries both.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  INE_API, BPSTAT_API, INE_PRICE_INDICATOR, INE_LICENSING_INDICATOR,
  parseIneIndicator, parseBpstatSingleSeries, buildPortugalLayer,
} from '../src/lib/data-sources/ine-pt';

const OUT = join(__dirname, '..', 'data', 'pt-official.json');
const UA = 'AvenaTerminal-OfficialStats/1.0 (+https://avenaterminal.com/portugal)';

// BPstat series (domain 39 Housing prices, domain 186 Loans for house purchase)
const BDP = {
  hpiNew: { id: 5739036, path: '/domains/39/datasets/b8cc662879c9f7b0f3faf89c7871fc38/' },
  hpiExisting: { id: 5739037, path: '/domains/39/datasets/b8cc662879c9f7b0f3faf89c7871fc38/' },
  rateVariable: { id: 12710733, path: '/domains/186/datasets/6a83b46f5911d1b086a2891746a2fd9a/' },
  rateFixed: { id: 12710738, path: '/domains/186/datasets/6a83b46f5911d1b086a2891746a2fd9a/' },
} as const;

async function getJson(url: string, attempts = 4): Promise<unknown> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      last = e;
      console.warn(`  attempt ${i}/${attempts} failed for ${url.split('?')[0]}: ${(e as Error).message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 5000 * i));
    }
  }
  throw new Error(`fetch failed after ${attempts} attempts: ${url} — ${(last as Error)?.message}`);
}

const ine = (code: string) => `${INE_API}?op=2&varcd=${code}&Dim1=T&lang=EN`;

async function main() {
  const dry = process.argv.includes('--dry-run');
  console.log('INE 0012234 (median €/m², new vs existing) …');
  const prices = parseIneIndicator(await getJson(ine(INE_PRICE_INDICATOR)), INE_PRICE_INDICATOR, true);
  console.log(`  ${prices.rows.length} rows, latest ${prices.latestPeriod}, INE updated ${prices.lastUpdated}`);
  console.log('INE 0012098 (licensed new dwellings, 3 months) …');
  const licensing = parseIneIndicator(await getJson(ine(INE_LICENSING_INDICATOR)), INE_LICENSING_INDICATOR, false);
  console.log(`  ${licensing.rows.length} rows, latest ${licensing.latestPeriod}, INE updated ${licensing.lastUpdated}`);

  const bdp: Record<keyof typeof BDP, ReturnType<typeof parseBpstatSingleSeries>> = {} as never;
  for (const [k, s] of Object.entries(BDP) as [keyof typeof BDP, (typeof BDP)[keyof typeof BDP]][]) {
    const url = `${BPSTAT_API}${s.path}?lang=EN&series_ids=${s.id}`;
    bdp[k] = parseBpstatSingleSeries(await getJson(url), s.id);
    console.log(`BPstat ${s.id}: ${bdp[k].points.length} points — ${bdp[k].label}`);
  }

  const layer = buildPortugalLayer(prices, licensing, bdp, {
    hpiNew: BDP.hpiNew.id, hpiExisting: BDP.hpiExisting.id, rateVariable: BDP.rateVariable.id, rateFixed: BDP.rateFixed.id,
  });

  // Sanity floor: refuse to publish a layer that lost a region's benchmarks.
  for (const r of layer.regions) {
    const priced = r.municipalities.filter((m) => m.latest.new != null).length;
    if (priced < 3) throw new Error(`${r.name}: only ${priced} municipalities with a new-build €/m² — refusing to publish`);
  }

  const n = layer.national;
  console.log(`\nPortugal ${layer.sources.ine_prices.latest_period}: new ${n.latest.new} €/m², existing ${n.latest.existing} €/m², premium ${n.new_premium_pct}%`);
  console.log(`Licensed new dwellings, trailing 12m to ${layer.sources.ine_licensing.latest_period}: ${n.licensed_12m} (year earlier ${n.licensed_12m_prev})`);
  for (const r of layer.regions) {
    console.log(`  ${r.name.padEnd(13)} new ${r.nuts3.map((x) => x.latest.new).join('/')}  licensed_12m ${r.licensed_12m}`);
  }

  if (dry) return;
  // Keep generated_at stable when nothing else changed so the weekly commit is a no-op.
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, 'utf8'));
      const strip = (o: Record<string, unknown>) => JSON.stringify({ ...o, generated_at: '' });
      if (strip(prev) === strip(layer as unknown as Record<string, unknown>)) {
        console.log('\nNo change in source data; leaving data/pt-official.json untouched.');
        return;
      }
    } catch { /* overwrite unreadable file */ }
  }
  writeFileSync(OUT, JSON.stringify(layer) + '\n');
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(`ingest-pt-official FAILED: ${(e as Error).message}`);
  process.exit(1);
});
