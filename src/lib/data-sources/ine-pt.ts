/**
 * INE Portugal (Statistics Portugal) + Banco de Portugal (BPstat) adapters
 * for the Avena Portugal market layer.
 *
 * Sources and licences
 *   - INE, "Estatísticas de preços da habitação ao nível local" (indicator
 *     0012234): median value per m² of dwelling sales in the LAST 12 MONTHS,
 *     split New / Existing / Total, quarterly, Q4 2019 onwards, country →
 *     NUTS → municipality → parish. CC BY 4.0, attribution "Fonte: INE".
 *   - INE, licensed dwellings in new constructions for family housing in the
 *     LAST 3 MONTHS (indicator 0012098), monthly, by municipality. CC BY 4.0.
 *   - Banco de Portugal, BPstat (JSON-stat): house price index y/y for new
 *     and existing dwellings (INE series republished by BdP) and the median
 *     interest rate on new loans for house purchase. Free reuse with source
 *     cited and modifications stated.
 *
 * Every parser here THROWS when it stops understanding its input rather than
 * returning an empty result. An empty benchmark table that renders as "no
 * data" is indistinguishable from a dead source, which is the failure shape
 * this repo has been bitten by before (see test-bis-parse.ts).
 *
 * The functions are pure; network I/O lives in scripts/ingest-pt-official.ts.
 */

export const INE_PRICE_INDICATOR = '0012234';
export const INE_LICENSING_INDICATOR = '0012098';

export const INE_API = 'https://www.ine.pt/ine/json_indicador/pindica.jsp';
export const BPSTAT_API = 'https://bpstat.bportugal.pt/data/v1';

/** Priority regions for Avena Portugal, keyed to INE NUTS 2024 codes. */
export interface PtRegionDef {
  slug: string;
  name: string;
  /** NUTS III code(s) whose municipalities make up the region. */
  nuts3: string[];
  /** One-line context shown on the page. */
  blurb: string;
}

export const PT_REGIONS: PtRegionDef[] = [
  { slug: 'algarve', name: 'Algarve', nuts3: ['150'], blurb: 'Resort coast sold to UK, Nordic, Dutch, German and Irish buyers. INE publishes it down to parish level.' },
  { slug: 'lisbon', name: 'Lisbon metro', nuts3: ['1A0', '1B0'], blurb: 'Grande Lisboa (incl. Cascais, Oeiras, Mafra/Ericeira) and the Setúbal peninsula.' },
  { slug: 'porto', name: 'Porto metro', nuts3: ['11A'], blurb: 'Área Metropolitana do Porto: Porto, Vila Nova de Gaia, Matosinhos, Maia and neighbours.' },
  { slug: 'madeira', name: 'Madeira', nuts3: ['300'], blurb: 'Região Autónoma da Madeira: Funchal, Santa Cruz, Calheta and the island municipalities.' },
  { slug: 'silver-coast', name: 'Silver Coast', nuts3: ['1D1'], blurb: 'Oeste NUTS III: Óbidos, Caldas da Rainha, Nazaré, Peniche, Torres Vedras, Lourinhã.' },
];

export type HousingCategory = 'new' | 'existing' | 'total';

const CATEGORY_BY_LABEL: Record<string, HousingCategory> = {
  New: 'new',
  Existing: 'existing',
  Total: 'total',
};

export interface IneRow {
  period: string; // normalised: 2026-Q1 or 2026-08
  geo: string; // INE geocod
  name: string;
  category: HousingCategory | null;
  value: number | null; // null = INE confidentiality / not applicable
}

export interface IneParsed {
  indicator: string;
  title: string;
  lastUpdated: string; // YYYY-MM-DD as reported by INE
  latestPeriod: string; // normalised
  rows: IneRow[];
}

const ORDINAL_Q: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "1st Quarter 2026" → "2026-Q1"; "August 2026" → "2026-08". Throws otherwise. */
export function normalisePeriod(label: string): string {
  const q = /^(1st|2nd|3rd|4th) Quarter (\d{4})$/.exec(label.trim());
  if (q) return `${q[2]}-Q${ORDINAL_Q[q[1]]}`;
  const m = /^([A-Z][a-z]+) (\d{4})$/.exec(label.trim());
  if (m) {
    const idx = MONTHS.indexOf(m[1]);
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}`;
  }
  throw new Error(`INE period label not understood: "${label}"`);
}

/**
 * Parse an INE `pindica.jsp?op=2` JSON response (lang=EN).
 * `expectCategories` is true for the price indicator (dim_3 = New/Existing/Total).
 */
export function parseIneIndicator(json: unknown, expectedCode: string, expectCategories: boolean): IneParsed {
  if (!Array.isArray(json) || json.length !== 1 || typeof json[0] !== 'object' || json[0] === null) {
    throw new Error('INE response is not a one-element array');
  }
  const x = json[0] as Record<string, unknown>;
  if (x.IndicadorCod !== expectedCode) {
    throw new Error(`INE indicator mismatch: wanted ${expectedCode}, got ${String(x.IndicadorCod)}`);
  }
  const ok = (x.Sucesso as { Verdadeiro?: unknown } | undefined)?.Verdadeiro;
  if (!ok) throw new Error(`INE ${expectedCode} did not report success: ${JSON.stringify(x.Sucesso)}`);
  const dados = x.Dados as Record<string, unknown> | undefined;
  if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
    throw new Error(`INE ${expectedCode} returned no Dados`);
  }

  const rows: IneRow[] = [];
  for (const [label, list] of Object.entries(dados)) {
    const period = normalisePeriod(label);
    if (!Array.isArray(list) || list.length === 0) throw new Error(`INE ${expectedCode} period ${label} is empty`);
    for (const r of list as Record<string, unknown>[]) {
      const geo = r.geocod;
      const name = r.geodsg;
      if (typeof geo !== 'string' || typeof name !== 'string') throw new Error(`INE ${expectedCode} row missing geocod/geodsg`);
      let category: HousingCategory | null = null;
      if (expectCategories) {
        const c = CATEGORY_BY_LABEL[String(r.dim_3_t)];
        if (!c) throw new Error(`INE ${expectedCode} unknown housing category "${String(r.dim_3_t)}"`);
        category = c;
      }
      let value: number | null = null;
      if (r.valor !== undefined && r.valor !== null && r.valor !== '') {
        const v = Number(r.valor);
        if (!Number.isFinite(v)) throw new Error(`INE ${expectedCode} non-numeric value "${String(r.valor)}" for ${geo}`);
        value = v;
      }
      rows.push({ period, geo, name, category, value });
    }
  }
  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const latestPeriod = normalisePeriod(String(x.UltimoPref ?? ''));
  if (periods[periods.length - 1] !== latestPeriod) {
    throw new Error(`INE ${expectedCode} latest period ${latestPeriod} not the last period in Dados (${periods[periods.length - 1]})`);
  }
  if (!rows.some((r) => r.value !== null)) throw new Error(`INE ${expectedCode} has no numeric values at all`);
  return {
    indicator: expectedCode,
    title: String(x.IndicadorDsg ?? ''),
    lastUpdated: String(x.DataUltimoAtualizacao ?? ''),
    latestPeriod,
    rows,
  };
}

export interface BpPoint { date: string; value: number | null }

/**
 * Parse a BPstat JSON-stat dataset response that was filtered to exactly ONE
 * series (`?series_ids=<id>`). Every non-date dimension must then have size 1,
 * so `value[i]` lines up with `reference_date[i]`.
 */
export function parseBpstatSingleSeries(json: unknown, seriesId: number): { label: string; points: BpPoint[] } {
  const x = json as {
    id?: string[]; size?: number[]; value?: unknown;
    dimension?: Record<string, { category?: { index?: string[] | Record<string, number> } }>;
    extension?: { series?: { id: number; label: string }[] };
  };
  if (!x || !Array.isArray(x.id) || !Array.isArray(x.size) || x.id.length !== x.size.length) {
    throw new Error(`BPstat ${seriesId}: not a JSON-stat dataset`);
  }
  const series = x.extension?.series ?? [];
  if (series.length !== 1 || series[0].id !== seriesId) {
    throw new Error(`BPstat ${seriesId}: expected exactly that one series, got ${JSON.stringify(series.map((s) => s.id))}`);
  }
  const dateIdx = x.id.indexOf('reference_date');
  if (dateIdx < 0) throw new Error(`BPstat ${seriesId}: no reference_date dimension`);
  x.id.forEach((d, i) => {
    if (i !== dateIdx && x.size![i] !== 1) throw new Error(`BPstat ${seriesId}: dimension ${d} has size ${x.size![i]}, wanted 1`);
  });
  const cat = x.dimension?.reference_date?.category?.index;
  const dates = Array.isArray(cat) ? cat : cat ? Object.entries(cat).sort((a, b) => a[1] - b[1]).map(([k]) => k) : [];
  const values = x.value;
  if (!Array.isArray(values)) throw new Error(`BPstat ${seriesId}: value is not a dense array`);
  if (dates.length === 0 || dates.length !== values.length) {
    throw new Error(`BPstat ${seriesId}: ${dates.length} dates vs ${values.length} values`);
  }
  const points = dates.map((date, i) => {
    const v = values[i];
    return { date, value: v === null || v === undefined ? null : Number(v) };
  });
  if (!points.some((p) => p.value !== null && Number.isFinite(p.value))) throw new Error(`BPstat ${seriesId}: no numeric values`);
  return { label: series[0].label, points };
}

// ─── Layer builder ───────────────────────────────────────────────────────────

export interface PriceTriple { new: number | null; existing: number | null; total: number | null }

export interface PtMunicipality {
  geo: string;
  name: string;
  latest: PriceTriple;
  /** % premium of new over existing, rounded to 1 dp; null when either is missing. */
  new_premium_pct: number | null;
  /** New-build €/m² y/y change vs the same quarter a year earlier, %. */
  new_yoy_pct: number | null;
  /** Licensed new dwellings, trailing 12 months (sum of four non-overlapping 3-month INE windows). */
  licensed_12m: number | null;
  licensed_12m_prev: number | null;
}

export interface PtRegion {
  slug: string;
  name: string;
  blurb: string;
  nuts3: { geo: string; name: string; latest: PriceTriple; new_premium_pct: number | null; new_yoy_pct: number | null }[];
  /** Quarterly new / existing €/m² for the region's first NUTS III, Q4 2019 → latest. */
  price_series: { period: string; new: number | null; existing: number | null }[];
  municipalities: PtMunicipality[];
  /** Top parishes by new-build €/m² (only where INE publishes parish level). */
  parishes: { geo: string; name: string; municipality: string; new: number | null; existing: number | null }[];
  licensing_series: { period: string; licensed_12m: number }[];
  licensed_12m: number | null;
  licensed_12m_prev: number | null;
}

export interface PortugalLayer {
  generated_at: string;
  sources: {
    ine_prices: { indicator: string; title: string; last_updated: string; latest_period: string; first_period: string };
    ine_licensing: { indicator: string; title: string; last_updated: string; latest_period: string };
    bdp: { series_id: number; label: string; latest_date: string | null }[];
  };
  national: {
    latest: PriceTriple;
    new_premium_pct: number | null;
    new_yoy_pct: number | null;
    price_series: { period: string; new: number | null; existing: number | null }[];
    licensed_12m: number | null;
    licensed_12m_prev: number | null;
    licensing_series: { period: string; licensed_12m: number }[];
  };
  regions: PtRegion[];
  bdp: {
    hpi_yoy: { date: string; new: number | null; existing: number | null }[];
    mortgage_rate_median: { date: string; variable: number | null; fixed: number | null }[];
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function premiumPct(t: PriceTriple): number | null {
  if (t.new == null || t.existing == null || t.existing <= 0) return null;
  return r1(((t.new - t.existing) / t.existing) * 100);
}

function yoyPct(cur: number | null | undefined, prev: number | null | undefined): number | null {
  if (cur == null || prev == null || prev <= 0) return null;
  return r1(((cur - prev) / prev) * 100);
}

/** "2026-Q1" → "2025-Q1". "2026-08" → "2025-08". */
export function yearEarlier(period: string): string {
  return `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`;
}

/** Monthly key minus n months. */
export function monthMinus(period: string, n: number): string {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  const t = y * 12 + (m - 1) - n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

/**
 * Trailing-12-month licensed dwellings from INE's rolling 3-month series:
 * value(m) + value(m-3) + value(m-6) + value(m-9). Null if any window is missing.
 */
export function trailing12(byMonth: Map<string, number | null>, month: string): number | null {
  let s = 0;
  for (const k of [0, 3, 6, 9]) {
    const v = byMonth.get(monthMinus(month, k));
    if (v == null) return null;
    s += v;
  }
  return s;
}

export function buildPortugalLayer(
  prices: IneParsed,
  licensing: IneParsed,
  bdp: { hpiNew: { label: string; points: BpPoint[] }; hpiExisting: { label: string; points: BpPoint[] }; rateVariable: { label: string; points: BpPoint[] }; rateFixed: { label: string; points: BpPoint[] } },
  bdpIds: { hpiNew: number; hpiExisting: number; rateVariable: number; rateFixed: number },
  now: Date = new Date(),
): PortugalLayer {
  // price[geo][period] = triple
  const price = new Map<string, Map<string, PriceTriple>>();
  const names = new Map<string, string>();
  for (const r of prices.rows) {
    names.set(r.geo, r.name);
    if (!price.has(r.geo)) price.set(r.geo, new Map());
    const byP = price.get(r.geo)!;
    if (!byP.has(r.period)) byP.set(r.period, { new: null, existing: null, total: null });
    if (r.category) byP.get(r.period)![r.category] = r.value;
  }
  const lic = new Map<string, Map<string, number | null>>();
  for (const r of licensing.rows) {
    if (!names.has(r.geo)) names.set(r.geo, r.name);
    if (!lic.has(r.geo)) lic.set(r.geo, new Map());
    lic.get(r.geo)!.set(r.period, r.value);
  }

  const pLatest = prices.latestPeriod;
  const lLatest = licensing.latestPeriod;
  const pPeriods = [...new Set(prices.rows.map((r) => r.period))].sort();
  const lPeriods = [...new Set(licensing.rows.map((r) => r.period))].sort();

  const triple = (geo: string, period = pLatest): PriceTriple => price.get(geo)?.get(period) ?? { new: null, existing: null, total: null };
  const series = (geo: string) => pPeriods.map((p) => ({ period: p, new: triple(geo, p).new, existing: triple(geo, p).existing }));
  const lic12 = (geo: string, month = lLatest) => {
    const m = lic.get(geo);
    return m ? trailing12(m, month) : null;
  };
  // Licensing trend: trailing-12m total at every month from Jan 2019 where computable.
  const licSeries = (geos: string[]) => {
    const out: { period: string; licensed_12m: number }[] = [];
    for (const p of lPeriods) {
      if (p < '2019-01') continue;
      let s = 0;
      let ok = true;
      for (const g of geos) {
        const v = lic12(g, p);
        if (v == null) { ok = false; break; }
        s += v;
      }
      if (ok) out.push({ period: p, licensed_12m: s });
    }
    return out;
  };

  if (!price.has('PT')) throw new Error('INE price indicator has no national (PT) row');
  if (!lic.has('PT')) throw new Error('INE licensing indicator has no national (PT) row');

  const regions: PtRegion[] = PT_REGIONS.map((def) => {
    const nuts3 = def.nuts3.map((g) => {
      if (!price.has(g)) throw new Error(`INE price indicator has no NUTS III ${g} (${def.name})`);
      const t = triple(g);
      return { geo: g, name: names.get(g) ?? g, latest: t, new_premium_pct: premiumPct(t), new_yoy_pct: yoyPct(t.new, triple(g, yearEarlier(pLatest)).new) };
    });
    const muniGeos = [...price.keys()].filter((g) => g.length === 7 && def.nuts3.some((n) => g.startsWith(n)));
    if (muniGeos.length === 0) throw new Error(`No municipalities found for ${def.name}`);
    const municipalities: PtMunicipality[] = muniGeos.map((g) => {
      const t = triple(g);
      return {
        geo: g,
        name: names.get(g) ?? g,
        latest: t,
        new_premium_pct: premiumPct(t),
        new_yoy_pct: yoyPct(t.new, triple(g, yearEarlier(pLatest)).new),
        licensed_12m: lic12(g),
        licensed_12m_prev: lic12(g, yearEarlier(lLatest)),
      };
    }).sort((a, b) => (b.latest.new ?? b.latest.total ?? 0) - (a.latest.new ?? a.latest.total ?? 0));
    const parishes = [...price.keys()]
      .filter((g) => g.length === 9 && def.nuts3.some((n) => g.startsWith(n)))
      .map((g) => ({ geo: g, name: names.get(g) ?? g, municipality: names.get(g.slice(0, 7)) ?? '', new: triple(g).new, existing: triple(g).existing }))
      .filter((p) => p.new != null)
      .sort((a, b) => (b.new ?? 0) - (a.new ?? 0))
      .slice(0, 12);
    const licGeos = def.nuts3.filter((g) => lic.has(g));
    if (licGeos.length !== def.nuts3.length) throw new Error(`INE licensing indicator missing NUTS III for ${def.name}`);
    return {
      slug: def.slug,
      name: def.name,
      blurb: def.blurb,
      nuts3,
      price_series: series(def.nuts3[0]),
      municipalities,
      parishes,
      licensing_series: licSeries(licGeos),
      licensed_12m: licGeos.reduce<number | null>((s, g) => (s == null || lic12(g) == null ? null : s + (lic12(g) as number)), 0),
      licensed_12m_prev: licGeos.reduce<number | null>((s, g) => (s == null || lic12(g, yearEarlier(lLatest)) == null ? null : s + (lic12(g, yearEarlier(lLatest)) as number)), 0),
    };
  });

  const ptLatest = triple('PT');
  const byDate = (pts: BpPoint[]) => new Map(pts.map((p) => [p.date, p.value]));
  const hn = byDate(bdp.hpiNew.points);
  const he = byDate(bdp.hpiExisting.points);
  const rv = byDate(bdp.rateVariable.points);
  const rf = byDate(bdp.rateFixed.points);
  const hpiDates = [...new Set([...hn.keys(), ...he.keys()])].sort().filter((d) => d >= '2019-01-01');
  const rateDates = [...new Set([...rv.keys(), ...rf.keys()])].sort();
  const lastDate = (pts: BpPoint[]) => [...pts].reverse().find((p) => p.value != null)?.date ?? null;

  return {
    generated_at: now.toISOString(),
    sources: {
      ine_prices: { indicator: prices.indicator, title: prices.title, last_updated: prices.lastUpdated, latest_period: pLatest, first_period: pPeriods[0] },
      ine_licensing: { indicator: licensing.indicator, title: licensing.title, last_updated: licensing.lastUpdated, latest_period: lLatest },
      bdp: [
        { series_id: bdpIds.hpiNew, label: bdp.hpiNew.label, latest_date: lastDate(bdp.hpiNew.points) },
        { series_id: bdpIds.hpiExisting, label: bdp.hpiExisting.label, latest_date: lastDate(bdp.hpiExisting.points) },
        { series_id: bdpIds.rateVariable, label: bdp.rateVariable.label, latest_date: lastDate(bdp.rateVariable.points) },
        { series_id: bdpIds.rateFixed, label: bdp.rateFixed.label, latest_date: lastDate(bdp.rateFixed.points) },
      ],
    },
    national: {
      latest: ptLatest,
      new_premium_pct: premiumPct(ptLatest),
      new_yoy_pct: yoyPct(ptLatest.new, triple('PT', yearEarlier(pLatest)).new),
      price_series: series('PT'),
      licensed_12m: lic12('PT'),
      licensed_12m_prev: lic12('PT', yearEarlier(lLatest)),
      licensing_series: licSeries(['PT']),
    },
    regions,
    bdp: {
      hpi_yoy: hpiDates.map((d) => ({ date: d, new: hn.get(d) ?? null, existing: he.get(d) ?? null })),
      mortgage_rate_median: rateDates.map((d) => ({ date: d, variable: rv.get(d) ?? null, fixed: rf.get(d) ?? null })),
    },
  };
}
