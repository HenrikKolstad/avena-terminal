/**
 * Join Avena's published coastal new-build ledger to free BME daily closes
 * and run the pre-specified tests in src/lib/builder-stock-signal.ts.
 *
 * Reads files already in the repo. Downloads closes from the BME Exchange
 * public market API (no key, no paid feed). Does not send email, write to
 * the database, or apply a migration.
 *
 *   npx tsx scripts/builder-stock-signal.ts
 *   npx tsx scripts/builder-stock-signal.ts --prices research/builder-stock-prices.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import https from 'https';
import path from 'path';
import {
  annotateLedger,
  renderReport,
  runSignal,
  scanIssuerMentions,
  weekMonday,
  weeklyFeatures,
  type ClosePoint,
  type ExploratorySeries,
  type LedgerDay,
  type StockInput,
} from '../src/lib/builder-stock-signal';

const ROOT = process.cwd();
const PRICE_PATH = path.join(ROOT, 'research', 'builder-stock-prices.json');
const OUT_JSON = path.join(ROOT, 'research', 'builder-stock-signal.json');
const OUT_MD = path.join(ROOT, 'research', 'builder-stock-signal.md');
const FROM = '20250801';
const TO = '20261023';
const API = 'https://apiweb.bolsasymercados.es/Market';

interface UniverseRow {
  id: string;
  name: string;
  isin: string;
  expectTicker: string;
  role: 'primary' | 'secondary';
  note: string;
}

/**
 * ISINs and the role of each name were checked against
 * v1/EQ/ListedCompanies on 22 October 2026. Habitat Inmobiliaria and
 * Vía Célere were not in that file. AEDAS was.
 */
const UNIVERSE: UniverseRow[] = [
  {
    id: 'HOME',
    name: 'Neinor Homes',
    isin: 'ES0105251005',
    expectTicker: 'HOME',
    role: 'primary',
    note: 'Listed residential developer. Neinor\'s 5 March 2026 release says it reached 96.83% of AEDAS Homes after the mandatory tender.',
  },
  {
    id: 'MVC',
    name: 'Metrovacesa',
    isin: 'ES0105122024',
    expectTicker: 'MVC',
    role: 'primary',
    note: 'Listed residential developer.',
  },
  {
    id: 'AEDAS',
    name: 'AEDAS Homes',
    isin: 'ES0105287009',
    expectTicker: 'AEDAS',
    role: 'secondary',
    note: 'Still listed. The CNMV said the March 2026 mandatory tender was accepted by 84.76% of the shares it addressed, short of the squeeze-out test, so the shares were not delisted. Neinor owns 96.83%. Volume is thin next to Neinor, so this is not an independent name.',
  },
  {
    id: 'ISUR',
    name: 'Inmobiliaria del Sur',
    isin: 'ES0154653911',
    expectTicker: 'ISUR',
    role: 'secondary',
    note: 'Listed Seville group with development and rental assets. Not treated as a pure coastal homebuilder.',
  },
  {
    id: 'RLIA',
    name: 'Realia',
    isin: 'ES0173908015',
    expectTicker: 'RLIA',
    role: 'secondary',
    note: 'Listed real-estate group in the same BME file. Not treated as a pure homebuilder.',
  },
  {
    id: 'REN',
    name: 'Renta Corporación',
    isin: 'ES0173365018',
    expectTicker: 'REN',
    role: 'secondary',
    note: 'Listed real-estate company in the same BME file. Not treated as a national homebuilder.',
  },
];

interface PriceFile {
  source: string;
  fetchedAt: string;
  adjustmentNote: string;
  listedCompaniesScanned: number;
  absentNames: string[];
  market: { name: string; isin: string; closes: ClosePoint[] };
  stocks: StockInput[];
}

interface SharePayload {
  details?: { ticker?: string; isin?: string; name?: string };
  hasMoreResults?: boolean;
  totalResults?: number;
  data?: Array<{ date: string; close: number; volume?: number; facMult?: number; facDivi?: number }>;
}

interface IndexPayload {
  hasMoreResults?: boolean;
  totalResults?: number;
  data?: Array<{ date: string; close: number }>;
}

interface ListedPayload {
  totalResults?: number;
  hasMoreResults?: boolean;
  data?: Array<{ name?: string; shareName?: string; isin?: string; capitalisation?: number }>;
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  if (!v) throw new Error(`${flag} needs a path`);
  return v;
}

function ymd(compact: string): string {
  if (!/^\d{8}$/.test(compact)) throw new Error(`bad BME date ${compact}`);
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function getJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'user-agent': 'AvenaTerminal-research/1.0',
        accept: 'application/json',
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`${url} -> HTTP ${res.statusCode}: ${text.slice(0, 160)}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(new Error(`${url} did not return JSON (${text.slice(0, 80)})`));
        }
      });
    });
    req.setTimeout(60_000, () => req.destroy(new Error(`timeout ${url}`)));
    req.on('error', reject);
  });
}

async function fetchPrices(): Promise<PriceFile> {
  const listed = await getJson(`${API}/v1/EQ/ListedCompanies?pageSize=0`) as ListedPayload;
  if (!listed.data?.length || listed.hasMoreResults) {
    throw new Error('listed-companies response was empty or truncated; refusing to guess who is listed');
  }
  const byIsin = new Map(listed.data.filter((r) => r.isin).map((r) => [r.isin!.toUpperCase(), r]));
  const absentNames: string[] = [];
  for (const needle of ['HABITAT', 'CELERE', 'CÉLERE']) {
    const hit = listed.data.some((r) => `${r.name ?? ''} ${r.shareName ?? ''}`.toUpperCase().includes(needle));
    if (!hit) absentNames.push(needle);
  }
  if (absentNames.length !== 3) {
    throw new Error(`expected Habitat and Vía Célere to be absent; check the listed-companies file before publishing (${absentNames.join(', ')})`);
  }

  const stocks: StockInput[] = [];
  let adjustmentHits = 0;
  for (const row of UNIVERSE) {
    const payload = await getJson(
      `${API}/v1/EQ/HistoricalSharesPrices?type=V&pageSize=0&ISIN=${row.isin}&from=${FROM}&to=${TO}`,
    ) as SharePayload;
    if (!payload.data?.length || payload.hasMoreResults) {
      throw new Error(`${row.expectTicker}: price history missing or truncated`);
    }
    const ticker = payload.details?.ticker;
    if (ticker !== row.expectTicker) {
      throw new Error(`${row.isin} returned ticker ${ticker}, expected ${row.expectTicker}`);
    }
    for (const bar of payload.data) {
      if ((bar.facDivi ?? 0) !== 0 || (bar.facMult ?? 0) !== 0) adjustmentHits++;
    }
    const listedRow = byIsin.get(row.isin.toUpperCase());
    const cap = listedRow && typeof listedRow.capitalisation === 'number' ? listedRow.capitalisation : null;
    stocks.push({
      id: row.id,
      name: row.name,
      isin: row.isin,
      ticker,
      role: row.role,
      note: row.note,
      capitalisationEur: cap,
      closes: payload.data.map((bar) => ({
        date: ymd(bar.date),
        close: bar.close,
        volume: typeof bar.volume === 'number' ? bar.volume : null,
      })),
    });
  }

  const index = await getJson(
    `${API}/v1/EQ/HistoricalIndicesPrices?pageSize=0&ISIN=ES0SI0000005&from=${FROM}&to=${TO}`,
  ) as IndexPayload;
  if (!index.data?.length || index.hasMoreResults) {
    throw new Error('IBEX history missing or truncated');
  }
  const closes = index.data.map((bar) => ({ date: ymd(bar.date), close: bar.close }));
  const levelOk = closes.some((c) => c.close > 5_000);
  if (!levelOk) throw new Error('ES0SI0000005 did not look like the IBEX 35 level; refusing to use it as the market');

  if (adjustmentHits > 0) {
    throw new Error(`${adjustmentHits} sessions had a non-zero facDivi or facMult. This script does not adjust for corporate actions and will not publish unadjusted returns over a split or a dividend it just detected.`);
  }

  return {
    source: `${API}/v1/EQ/HistoricalSharesPrices and HistoricalIndicesPrices (public, no key)`,
    fetchedAt: new Date().toISOString(),
    adjustmentNote: 'facDivi and facMult were 0 on every downloaded share session, so closes were used with no corporate-action adjustment.',
    listedCompaniesScanned: listed.data.length,
    absentNames,
    market: { name: 'IBEX 35', isin: 'ES0SI0000005', closes },
    stocks,
  };
}

interface TownRow { town: string; costa: string; n_listings?: number }

/** Current-book coverage rule, not a significance filter. Coasts below this are omitted. */
const MIN_COSTA_LISTINGS = 100;
interface MoveRow { date: string; town: string; change_pct: number }
interface TombRow { region: string | null; last_seen_date: string }
interface FeedRow { ref?: string; d?: string; p?: string; f?: string }

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function buildExploratory(ledger: LedgerDay[], arrivals: Map<string, number>): { series: ExploratorySeries[]; mapped: number; unmapped: number } {
  const weeks = weeklyFeatures(annotateLedger(ledger), arrivals);
  const clean = new Set(weeks.filter((w) => !w.contaminated).map((w) => w.week));
  const tombs = loadJson<TombRow[]>('public/open-data/tombstones.json');
  const moves = loadJson<MoveRow[]>('public/open-data/moves.json');
  const towns = loadJson<TownRow[]>('public/open-data/towns.json');
  const costaOf = new Map<string, string>();
  for (const t of towns) costaOf.set(t.town.trim().toLowerCase(), t.costa);

  const regions = ['costa-del-sol', 'cb-north', 'cb-south', 'costa-calida'];
  const regionCounts = new Map<string, Map<string, number>>();
  for (const region of regions) regionCounts.set(region, new Map());
  for (const tomb of tombs) {
    if (!tomb.region || !tomb.last_seen_date || !regionCounts.has(tomb.region)) continue;
    const week = weekMonday(tomb.last_seen_date);
    if (!clean.has(week)) continue;
    const m = regionCounts.get(tomb.region)!;
    m.set(week, (m.get(week) ?? 0) + 1);
  }

  const listingsByCosta = new Map<string, number>();
  for (const t of towns) listingsByCosta.set(t.costa, (listingsByCosta.get(t.costa) ?? 0) + (Number(t.n_listings) || 0));
  const costaNames = [...listingsByCosta.entries()]
    .filter(([, n]) => n >= MIN_COSTA_LISTINGS)
    .map(([name]) => name)
    .sort();
  const costaCounts = new Map<string, Map<string, number>>();
  for (const costa of costaNames) costaCounts.set(costa, new Map());
  let mapped = 0;
  let unmapped = 0;
  for (const move of moves) {
    if (!(move.change_pct < 0)) continue;
    const costa = costaOf.get((move.town ?? '').trim().toLowerCase());
    if (!costa) {
      unmapped++;
      continue;
    }
    mapped++;
    const week = weekMonday(move.date);
    if (!clean.has(week)) continue;
    const m = costaCounts.get(costa);
    if (!m) continue;
    m.set(week, (m.get(week) ?? 0) + 1);
  }

  const series: ExploratorySeries[] = [];
  const weeksSorted = [...clean].sort();
  for (const region of regions) {
    const m = regionCounts.get(region)!;
    series.push({
      id: `exits-${region}`,
      label: `exits in ${region}`,
      points: weeksSorted.map((key) => ({ key, value: m.get(key) ?? 0 })),
    });
  }
  for (const costa of costaNames) {
    const m = costaCounts.get(costa)!;
    series.push({
      id: `cuts-${costa}`,
      label: `asking-price cuts in ${costa}`,
      points: weeksSorted.map((key) => ({ key, value: m.get(key) ?? 0 })),
    });
  }
  return { series, mapped, unmapped };
}

async function main() {
  const pricesArg = argValue('--prices');
  const prices: PriceFile = pricesArg
    ? JSON.parse(readFileSync(pricesArg, 'utf8')) as PriceFile
    : await fetchPrices();
  if (!prices.stocks?.length || !prices.market?.closes?.length) {
    throw new Error('price file has no stocks or no market closes');
  }

  const ledger = loadJson<LedgerDay[]>('public/open-data/movement-ledger.json');
  const refDev = loadJson<{ refs: Record<string, { first?: string }> }>('data/ref-dev-map.json');
  const arrivalsByDate: Record<string, number> = {};
  for (const entry of Object.values(refDev.refs)) {
    if (!entry.first) continue;
    arrivalsByDate[entry.first] = (arrivalsByDate[entry.first] ?? 0) + 1;
  }

  const book = loadJson<FeedRow[]>('public/data.json');
  const agencyLabels = [...new Set(book.map((p) => (p.d ?? '').trim()).filter(Boolean))].sort();
  const mentions = scanIssuerMentions(book.map((p) => ({
    ref: p.ref ?? '',
    text: `${p.d ?? ''} ${p.p ?? ''} ${p.f ?? ''}`,
  })));
  const exploratory = buildExploratory(ledger, new Map(Object.entries(arrivalsByDate)));

  const report = runSignal({
    ledger,
    arrivalsByDate,
    stocks: prices.stocks,
    market: prices.market,
    coverage: {
      listingsScanned: book.length,
      agencyLabels,
      issuerMentions: mentions,
      projectIdNote: 'The capture stores a project id on a listing, not a developer name. New listing refs are the first day that id appeared in a captured book. They are not a count of developer project launches, and they are not attributed to Neinor, AEDAS, Metrovacesa or anyone else.',
      unmappedMoveTowns: exploratory.unmapped,
      mappedMoveTowns: exploratory.mapped,
    },
    exploratory: exploratory.series,
    priceSource: prices.source,
    fetchedAt: prices.fetchedAt,
    adjustmentNote: prices.adjustmentNote,
  });

  mkdirSync(path.join(ROOT, 'research'), { recursive: true });
  if (!pricesArg) writeFileSync(PRICE_PATH, JSON.stringify(prices) + '\n');
  writeFileSync(OUT_JSON, JSON.stringify(report) + '\n');
  writeFileSync(OUT_MD, renderReport(report));
  console.log(report.headline);
  console.log(`wrote ${OUT_MD}`);
  console.log(`claim rows ${report.rows.filter((r) => r.claim).length}, verdict ${report.verdict}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
