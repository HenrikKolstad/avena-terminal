/**
 * AVM backtest — measures the runtime valuation engine against the live book.
 *
 * Every claim about AVM accuracy on the site must come from this script.
 * It runs valueByInputs() over every property in data.json using that
 * property's own attributes, and compares the prediction to its asking price.
 *
 * Honesty notes, published alongside the numbers:
 *  - This is IN-SAMPLE. The town × type medians the engine uses are computed
 *    from the same book, so the listing under test contributes to its own
 *    baseline. Out-of-sample error will be higher.
 *  - The target is ASKING price, not transacted price. Spanish coastal
 *    new-build asking prices are the only prices we can observe.
 *
 * Output: public/model-stats.json   (consumed by /methodology and /avm)
 * Run:    npx tsx scripts/avm-backtest.ts
 */
import fs from 'fs';
import path from 'path';
import { valueByInputs, type AVMInputs } from '../src/lib/avm-engine';
import { getAllProperties } from '../src/lib/properties';

type Row = { ref: string; actual: number; predicted: number; errPct: number };

function pct(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

const props = getAllProperties();
const rows: Row[] = [];
let skipped = 0;

for (const p of props) {
  const price = Number(p.pf);
  const area = Number(p.bm);
  const town = (p.l || '').split(',')[0].trim();
  if (!price || !area || !town || price <= 0 || area <= 0) { skipped++; continue; }

  const inputs: AVMInputs = {
    town,
    type: (p.t as AVMInputs['type']) || 'Apartment',
    built_m2: area,
    bedrooms: p.bd ?? undefined,
    beach_km: p.bk ?? null,
    sea_view: Boolean(p.views?.includes('sea')),
    golf: Boolean(p.cats?.includes('golf')),
    frontline: Boolean(p.cats?.includes('frontline')),
    energy: (p.energy as AVMInputs['energy']) ?? null,
    pool: (p.pool as AVMInputs['pool']) ?? null,
  };

  let res;
  try { res = valueByInputs(inputs); } catch { skipped++; continue; }
  if (!res?.predicted_value_eur) { skipped++; continue; }

  rows.push({
    ref: String(p.ref ?? ''),
    actual: price,
    predicted: res.predicted_value_eur,
    errPct: ((res.predicted_value_eur - price) / price) * 100,
  });
}

const abs = rows.map(r => Math.abs(r.errPct));
const mape = abs.reduce((a, b) => a + b, 0) / abs.length;
const rmsePct = Math.sqrt(rows.reduce((a, r) => a + r.errPct * r.errPct, 0) / rows.length);
const medianAbs = pct(abs, 50);
const within10 = (abs.filter(e => e <= 10).length / abs.length) * 100;
const within20 = (abs.filter(e => e <= 20).length / abs.length) * 100;
const bias = rows.reduce((a, r) => a + r.errPct, 0) / rows.length;

const stats = {
  model_version: 'avm-runtime-v1',
  sample: 'live Avena book (asking prices)',
  in_sample: true,
  n_scored: rows.length,
  n_skipped: skipped,
  mape_pct: +mape.toFixed(2),
  rmse_pct: +rmsePct.toFixed(2),
  median_abs_error_pct: +medianAbs.toFixed(2),
  within_10_pct: +within10.toFixed(1),
  within_20_pct: +within20.toFixed(1),
  mean_bias_pct: +bias.toFixed(2),
  caveats: [
    'In-sample: town × type medians are drawn from the same book, so each listing contributes to its own baseline. Out-of-sample error is higher.',
    'Target is asking price, not registered transaction price. Spanish coastal new-build transaction prices are not publicly available at listing level.',
  ],
  computed_at: new Date().toISOString(),
};

const out = path.join(process.cwd(), 'public', 'model-stats.json');
fs.writeFileSync(out, JSON.stringify(stats, null, 2));

console.log(`AVM backtest — n=${stats.n_scored} (skipped ${skipped})`);
console.log(`  MAPE          ${stats.mape_pct}%`);
console.log(`  RMSE          ${stats.rmse_pct}%`);
console.log(`  Median |err|  ${stats.median_abs_error_pct}%`);
console.log(`  Within ±10%   ${stats.within_10_pct}%`);
console.log(`  Within ±20%   ${stats.within_20_pct}%`);
console.log(`  Mean bias     ${stats.mean_bias_pct}%`);
console.log(`Wrote ${out}`);
