/**
 * Sell-Through Monitor: absorption, repricing and stock for Spanish coastal
 * new-build projects, computed from Avena's own daily capture.
 *
 * WHO IT IS FOR. Lenders that fund Costa new-build projects (development
 * debt funds, crowdlending platforms, banks) and the developers they fund.
 * A development loan is repaid out of unit sales, so the lender's real
 * question every week is: is this project, and the market around it, selling,
 * and is it holding price? Official statistics answer that months late and at
 * province level. This module answers it per project and per town, from the
 * listing book we snapshot every night.
 *
 * WHAT THE NUMBERS ARE, PRECISELY.
 * - A "listing" is one RedSP ref. For new-builds a ref is usually a unit type
 *   inside a development (e.g. "2-bed apartment, block B"), not one dwelling.
 *   So these are listing counts, never dwelling counts.
 * - An "exit" is a ref that was in a snapshot and is absent from the latest
 *   one. It means the listing left the market: sold out OR withdrawn. We
 *   cannot tell the two apart from the feed, and never call an exit a sale.
 * - A "price move" is a change in a ref's asking price between two snapshots.
 *   Asking prices only; no transaction prices are claimed.
 * - "Project" is RedSP's development_ref. Developer names are not in the
 *   feed; mapping projects to developers is a separate enrichment.
 * - History: the trusted daily series starts 2026-08-05. Nothing exists for
 *   2026-10-14 to 2026-10-20 (feed outage). Listings last seen on 2026-10-13
 *   and absent on 2026-10-21 left at an unknown date inside that gap; they
 *   are counted as exits and flagged `exit_in_gap`.
 *
 * Pure functions only: no I/O, no clock reads (asOf is an input), so the same
 * code path builds the API response, the sample report and the tests.
 */

export const SERIES_START = '2026-08-05';
export const KNOWN_GAPS: ReadonlyArray<{ from: string; to: string }> = [
  { from: '2026-10-14', to: '2026-10-20' },
];

/** One ref's compressed daily price series: only the days its price changed, plus first and last day seen. */
export interface RefSeries {
  ref: string;
  town: string | null;
  region: string | null;
  type: string | null;
  firstSeen: string; // first snapshot date in the series window
  lastSeen: string; // last snapshot date the ref was present
  points: Array<[string, number]>; // [date, asking price EUR], ascending, change points
}

/** Structural metadata per ref (from data/ref-dev-map.json). */
export interface RefMeta {
  dev: string | null;
  status: string | null;
  delivery: string | null; // e.g. "2027-Q3"
  beds: number | null;
  m2: number | null;
  first: string; // first date the ref appeared in any feed commit (may predate SERIES_START)
}

export interface MonitorOptions {
  asOf: string; // latest snapshot date (YYYY-MM-DD)
  windowDays?: number; // trailing window for flow metrics, default 30
  towns?: string[]; // optional watchlist filter (case-insensitive)
  projects?: string[]; // optional watchlist of development refs
  region?: string;
}

export interface GroupStats {
  key: string;
  label: string;
  region: string | null;
  live: number;
  exitsWindow: number;
  exitsSinceStart: number;
  newWindow: number;
  absorptionPct30d: number | null; // exits per 30d / (live + exits in window)
  monthsOfSupply: number | null; // live / exits per 30d
  cutsWindow: number;
  risesWindow: number;
  cutBreadthPct: number | null; // % of refs (live + exited in window) with >=1 cut in window
  medianCutPct: number | null; // median cut size in window, negative
  medianRisePct: number | null;
  medianPm2: number | null; // live listings, asking EUR per m2
  medianDaysListed: number | null; // live listings, asOf - first seen
}

export type ProjectFlag =
  | 'SOLD_OUT'
  | 'REPEAT_CUTS'
  | 'CUTTING_WHILE_TOWN_RISES'
  | 'DELIVERY_NEAR_WITH_STOCK'
  | 'EXIT_IN_GAP';

export interface ProjectStats {
  project: string;
  town: string | null;
  region: string | null;
  types: string[];
  status: string | null;
  delivery: string | null;
  firstObserved: string | null;
  listingsObserved: number;
  live: number;
  exitsSinceStart: number;
  exitsWindow: number;
  cutsSinceStart: number;
  risesSinceStart: number;
  cutsWindow: number;
  netPriceChangePct: number | null; // median over refs of (last / first observed price - 1)
  medianPm2: number | null;
  premiumToTownPct: number | null; // project median pm2 vs town median pm2 (live)
  minPrice: number | null;
  maxPrice: number | null;
  flags: ProjectFlag[];
}

/** One week of market flow (weeks start Monday, labelled by their Monday). */
export interface WeekStats {
  week: string;
  daysObserved: number; // snapshot days in the week we hold data for (0-7)
  exits: number;
  newListings: number;
  cuts: number;
  rises: number;
  medianCutPct: number | null;
}

export interface PriceMoveOut {
  ref: string;
  project: string | null;
  town: string | null;
  date: string;
  from: number;
  to: number;
  pct: number;
}

export interface MonitorResult {
  asOf: string;
  windowDays: number;
  windowStart: string;
  seriesStart: string;
  knownGaps: ReadonlyArray<{ from: string; to: string }>;
  observedDays: number | null;
  coverage: {
    listingsObserved: number;
    live: number;
    projects: number;
    towns: number;
    exitsSinceStart: number;
    exitsInGap: number;
    priceMovesSinceStart: number;
  };
  market: GroupStats;
  regions: GroupStats[];
  towns: GroupStats[];
  projects: ProjectStats[];
  weekly: WeekStats[];
  recentCuts: PriceMoveOut[];
  recentExits: Array<{ ref: string; project: string | null; town: string | null; type: string | null; lastSeen: string; lastPrice: number | null; inGap: boolean }>;
  methodology: string[];
}

// ---------- helpers ----------

const DAY = 86_400_000;
export const addDays = (d: string, n: number) =>
  new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);

export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const round = (x: number | null, dp = 1) =>
  x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** dp) / 10 ** dp;

export function inKnownGap(lastSeen: string): boolean {
  // A ref last seen the day before a gap, and absent after it, left inside the gap.
  return KNOWN_GAPS.some((g) => addDays(lastSeen, 1) === g.from);
}

/** Price moves of one ref: consecutive change points with a different price. */
export function movesOf(s: RefSeries): Array<{ date: string; from: number; to: number; pct: number }> {
  const out: Array<{ date: string; from: number; to: number; pct: number }> = [];
  for (let i = 1; i < s.points.length; i++) {
    const [, p0] = s.points[i - 1];
    const [d1, p1] = s.points[i];
    if (p0 > 0 && p1 > 0 && p1 !== p0) out.push({ date: d1, from: p0, to: p1, pct: (p1 / p0 - 1) * 100 });
  }
  return out;
}

const lastPrice = (s: RefSeries) => (s.points.length ? s.points[s.points.length - 1][1] : null);
const firstPrice = (s: RefSeries) => (s.points.length ? s.points[0][1] : null);

interface Enriched {
  s: RefSeries;
  meta: RefMeta | undefined;
  live: boolean;
  exitWindow: boolean;
  firstAny: string;
  moves: ReturnType<typeof movesOf>;
}

function groupStats(key: string, label: string, region: string | null, rows: Enriched[], o: Required<Pick<MonitorOptions, 'asOf' | 'windowDays'>>, windowStart: string): GroupStats {
  const live = rows.filter((r) => r.live);
  const exitsWindow = rows.filter((r) => r.exitWindow).length;
  const exitsSinceStart = rows.filter((r) => !r.live).length;
  const newWindow = rows.filter((r) => r.firstAny >= windowStart && r.firstAny <= o.asOf).length;
  const winMoves = rows.flatMap((r) => r.moves.filter((m) => m.date > windowStart && m.date <= o.asOf));
  const cuts = winMoves.filter((m) => m.pct < 0);
  const rises = winMoves.filter((m) => m.pct > 0);
  const base = live.length + exitsWindow;
  const cutRefs = rows.filter((r) => r.moves.some((m) => m.pct < 0 && m.date > windowStart && m.date <= o.asOf)).length;
  const exitsPer30 = (exitsWindow * 30) / o.windowDays;
  const pm2 = live
    .map((r) => {
      const p = lastPrice(r.s);
      return p && r.meta?.m2 ? p / r.meta.m2 : NaN;
    })
    .filter(Number.isFinite);
  return {
    key,
    label,
    region,
    live: live.length,
    exitsWindow,
    exitsSinceStart,
    newWindow,
    absorptionPct30d: base ? round((exitsPer30 / base) * 100) : null,
    monthsOfSupply: exitsPer30 > 0 ? round(live.length / exitsPer30) : null,
    cutsWindow: cuts.length,
    risesWindow: rises.length,
    cutBreadthPct: base ? round((cutRefs / base) * 100) : null,
    medianCutPct: round(median(cuts.map((m) => m.pct))),
    medianRisePct: round(median(rises.map((m) => m.pct))),
    medianPm2: round(median(pm2), 0),
    medianDaysListed: round(median(live.map((r) => daysBetween(r.firstAny, o.asOf))), 0),
  };
}

function quarterIndex(q: string | null): number | null {
  const m = q?.match(/^(\d{4})-Q([1-4])$/);
  return m ? Number(m[1]) * 4 + Number(m[2]) - 1 : null;
}

// ---------- main ----------

export function computeMonitor(series: RefSeries[], metaByRef: Record<string, RefMeta | undefined>, opts: MonitorOptions): MonitorResult {
  const windowDays = Math.max(7, Math.min(90, opts.windowDays ?? 30));
  const asOf = opts.asOf;
  const windowStart = addDays(asOf, -windowDays);
  const o = { asOf, windowDays };

  const townSet = opts.towns?.length ? new Set(opts.towns.map((t) => t.toLowerCase())) : null;
  const projSet = opts.projects?.length ? new Set(opts.projects.map((p) => p.toUpperCase())) : null;

  const all: Enriched[] = series
    .filter((s) => s.lastSeen <= asOf && s.points.length)
    .map((s) => {
      const meta = metaByRef[s.ref];
      const firstAny = meta?.first && meta.first < s.firstSeen ? meta.first : s.firstSeen;
      const live = s.lastSeen === asOf;
      return { s, meta, live, exitWindow: !live && s.lastSeen >= windowStart, firstAny, moves: movesOf(s) };
    });

  // Town medians are always computed on the full town (not the watchlist), so a
  // project's premium is measured against its whole local market.
  const townPm2 = new Map<string, number | null>();
  const townMomentum = new Map<string, { cuts: number; rises: number }>();
  {
    const byTown = new Map<string, Enriched[]>();
    for (const r of all) {
      const t = r.s.town ?? '?';
      if (!byTown.has(t)) byTown.set(t, []);
      byTown.get(t)!.push(r);
    }
    for (const [t, rows] of byTown) {
      townPm2.set(
        t,
        median(rows.filter((r) => r.live && r.meta?.m2).map((r) => (lastPrice(r.s) ?? NaN) / (r.meta!.m2 as number))),
      );
      const wm = rows.flatMap((r) => r.moves.filter((m) => m.date > windowStart && m.date <= asOf));
      townMomentum.set(t, { cuts: wm.filter((m) => m.pct < 0).length, rises: wm.filter((m) => m.pct > 0).length });
    }
  }

  const rows = all.filter((r) => {
    if (opts.region && r.s.region !== opts.region) return false;
    if (townSet && !townSet.has((r.s.town ?? '').toLowerCase())) return false;
    if (projSet && !projSet.has((r.meta?.dev ?? '').toUpperCase())) return false;
    return true;
  });

  const by = <K extends string>(f: (r: Enriched) => K | null) => {
    const m = new Map<K, Enriched[]>();
    for (const r of rows) {
      const k = f(r);
      if (k === null) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  };

  const market = groupStats('all', opts.region ?? 'All covered markets', opts.region ?? null, rows, o, windowStart);
  const regions = [...by((r) => r.s.region ?? 'unknown')].map(([k, v]) => groupStats(k, k, k, v, o, windowStart)).sort((a, b) => b.live - a.live);
  const towns = [...by((r) => r.s.town ?? 'unknown')]
    .map(([k, v]) => groupStats(k, k, v[0].s.region, v, o, windowStart))
    .sort((a, b) => b.live + b.exitsSinceStart - (a.live + a.exitsSinceStart));

  const nowQ = quarterIndex(`${asOf.slice(0, 4)}-Q${Math.ceil(Number(asOf.slice(5, 7)) / 3)}`)!;

  const projects: ProjectStats[] = [...by((r) => r.meta?.dev ?? null)].map(([dev, v]) => {
    const live = v.filter((r) => r.live);
    const moves = v.flatMap((r) => r.moves);
    const cutsSinceStart = moves.filter((m) => m.pct < 0).length;
    const risesSinceStart = moves.filter((m) => m.pct > 0).length;
    const cutsWindow = moves.filter((m) => m.pct < 0 && m.date > windowStart).length;
    const exitsSinceStart = v.length - live.length;
    const exitsWindow = v.filter((r) => r.exitWindow).length;
    const town = v[0].s.town;
    const net = median(v.filter((r) => r.s.points.length > 1).map((r) => ((lastPrice(r.s)! / firstPrice(r.s)!) - 1) * 100));
    const pm2 = median(live.filter((r) => r.meta?.m2).map((r) => lastPrice(r.s)! / (r.meta!.m2 as number)));
    const tpm2 = townPm2.get(town ?? '?') ?? null;
    const prices = live.map((r) => lastPrice(r.s)!).filter(Boolean);
    const latestMeta = [...v].sort((a, b) => (a.s.lastSeen < b.s.lastSeen ? 1 : -1))[0].meta;
    const deliveryQ = quarterIndex(latestMeta?.delivery ?? null);
    const firstObserved = v.map((r) => r.firstAny).sort()[0] ?? null;
    const flags: ProjectFlag[] = [];
    if (live.length === 0 && exitsSinceStart > 0) flags.push('SOLD_OUT');
    if (cutsWindow >= 2 || cutsSinceStart >= 3) flags.push('REPEAT_CUTS');
    const tm = townMomentum.get(town ?? '?');
    if (cutsWindow > 0 && tm && tm.rises > tm.cuts) flags.push('CUTTING_WHILE_TOWN_RISES');
    if (deliveryQ !== null && deliveryQ <= nowQ + 2 && live.length >= 3) flags.push('DELIVERY_NEAR_WITH_STOCK');
    if (v.some((r) => !r.live && inKnownGap(r.s.lastSeen))) flags.push('EXIT_IN_GAP');
    return {
      project: dev,
      town,
      region: v[0].s.region,
      types: [...new Set(v.map((r) => r.s.type).filter((t): t is string => !!t))].sort(),
      status: latestMeta?.status ?? null,
      delivery: latestMeta?.delivery ?? null,
      firstObserved,
      listingsObserved: v.length,
      live: live.length,
      exitsSinceStart,
      exitsWindow,
      cutsSinceStart,
      risesSinceStart,
      cutsWindow,
      netPriceChangePct: round(net),
      medianPm2: round(pm2, 0),
      premiumToTownPct: pm2 !== null && tpm2 ? round((pm2 / tpm2 - 1) * 100) : null,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      flags,
    };
  });
  projects.sort((a, b) => b.listingsObserved - a.listingsObserved || a.project.localeCompare(b.project));

  const recentCuts: PriceMoveOut[] = rows
    .flatMap((r) => r.moves.filter((m) => m.pct < 0 && m.date > windowStart).map((m) => ({
      ref: r.s.ref,
      project: r.meta?.dev ?? null,
      town: r.s.town,
      date: m.date,
      from: m.from,
      to: m.to,
      pct: round(m.pct)!,
    })))
    .sort((a, b) => (a.date === b.date ? a.pct - b.pct : a.date < b.date ? 1 : -1));

  const recentExits = rows
    .filter((r) => r.exitWindow)
    .map((r) => ({
      ref: r.s.ref,
      project: r.meta?.dev ?? null,
      town: r.s.town,
      type: r.s.type,
      lastSeen: r.s.lastSeen,
      lastPrice: lastPrice(r.s),
      inGap: inKnownGap(r.s.lastSeen),
    }))
    .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));

  // Weekly flow since SERIES_START. A ref's exit is dated the day after it was last seen.
  const weekOf = (d: string) => {
    const t = Date.parse(d + 'T00:00:00Z');
    const dow = (new Date(t).getUTCDay() + 6) % 7;
    return new Date(t - dow * DAY).toISOString().slice(0, 10);
  };
  const weeks = new Map<string, WeekStats & { cutPcts: number[] }>();
  const wk = (d: string) => {
    const k = weekOf(d);
    if (!weeks.has(k)) weeks.set(k, { week: k, daysObserved: 0, exits: 0, newListings: 0, cuts: 0, rises: 0, medianCutPct: null, cutPcts: [] });
    return weeks.get(k)!;
  };
  for (let d = SERIES_START; d <= asOf; d = addDays(d, 1)) {
    const w = wk(d);
    if (!KNOWN_GAPS.some((g) => d >= g.from && d <= g.to)) w.daysObserved++;
  }
  for (const r of rows) {
    if (!r.live) wk(addDays(r.s.lastSeen, 1)).exits++;
    if (r.firstAny > SERIES_START) wk(r.firstAny).newListings++;
    for (const m of r.moves) {
      const w = wk(m.date);
      if (m.pct < 0) {
        w.cuts++;
        w.cutPcts.push(m.pct);
      } else w.rises++;
    }
  }
  const weekly: WeekStats[] = [...weeks.values()]
    .filter((w) => w.week <= asOf)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(({ cutPcts, ...w }) => ({ ...w, medianCutPct: round(median(cutPcts)) }));

  const allMoves = rows.reduce((n, r) => n + r.moves.length, 0);
  return {
    asOf,
    windowDays,
    windowStart,
    seriesStart: SERIES_START,
    knownGaps: KNOWN_GAPS,
    observedDays: null,
    coverage: {
      listingsObserved: rows.length,
      live: rows.filter((r) => r.live).length,
      projects: new Set(rows.map((r) => r.meta?.dev).filter(Boolean)).size,
      towns: new Set(rows.map((r) => r.s.town).filter(Boolean)).size,
      exitsSinceStart: rows.filter((r) => !r.live).length,
      exitsInGap: rows.filter((r) => !r.live && inKnownGap(r.s.lastSeen)).length,
      priceMovesSinceStart: allMoves,
    },
    market,
    regions,
    towns,
    projects,
    weekly,
    recentCuts,
    recentExits,
    methodology: METHODOLOGY,
  };
}

export const METHODOLOGY: string[] = [
  'Source: Avena\'s daily capture of agency-marketed new-build listings (Costa Blanca, Costa Calida, Costa del Sol), one row per listing per day, stored in price_snapshots since 2026-08-05.',
  'Listing = one listing reference, usually a unit type within a development, not a single dwelling. Counts are listing counts.',
  'Exit = a listing present in an earlier snapshot and absent from the latest one: sold out or withdrawn. The feed does not distinguish the two, so exits are not called sales.',
  'Absorption (30d) = exits in the window, scaled to 30 days, divided by live listings plus window exits. Months of supply = live listings divided by exits per 30 days.',
  'Price move = change in a listing\'s asking price between two snapshots. Asking prices only; no transaction prices are claimed.',
  'Project = Avena development reference, joined from the history of Avena\'s captured listings. Developer names are not part of the captured data.',
  'The feed price is the listing\'s asking price, which for a unit type spanning several dwellings is the "from" price. A rise can therefore mean the cheapest unit sold, and a large cut can mean a cheaper unit was added; moves above ~20% should be read against the listing before being quoted as a repricing.',
  'Price per m2 uses usable living area where the feed provides it, otherwise built area.',
  'Known gap: no snapshots 2026-10-14 to 2026-10-20 (feed outage). Listings last seen 2026-10-13 and absent on 2026-10-21 are exits with an unknown date in that gap (flag EXIT_IN_GAP).',
  'Days listed are measured from the first time Avena saw the listing (earliest 2026-03-31), so older listings are understated.',
];
