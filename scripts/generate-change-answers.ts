/**
 * Publish answers to the questions only Avena can answer.
 *
 * The strategic point, stated plainly so nobody later mistakes this for more
 * SEO content: a model names a source when the fact is specific, dated,
 * attributed, and NOT corroborated elsewhere. Anything corroborated everywhere
 * becomes general knowledge and loses its citation on the way.
 *
 *   "Average price per m2 in Javea"  -> Idealista, Kyero, a hundred blogs.
 *                                       We are interchangeable. No citation.
 *   "How many Costa Blanca new-builds cut their price in the last 30 days,
 *    and by how much?"               -> nobody. Not the portals (they publish
 *                                       state, not change), not INE (quarterly,
 *                                       months lagged), not the notaries
 *                                       (registered sales only).
 *
 * Every question here is a CHANGE question. That is the space we own outright,
 * and it exists only because the listing feed keeps no memory while we snapshot
 * it nightly.
 *
 * Hard rules, learned from this codebase's recurring failure:
 *  - Every number comes from `price_snapshots`. Nothing is estimated, rounded
 *    up, or filled in.
 *  - A question with insufficient evidence is NOT published. It is skipped and
 *    reported. An empty result must never be written as a confident zero — the
 *    `if (!error) count += chunk` shape is the bug that has cost this project
 *    the most, and a published "0 price reductions" that actually means "the
 *    query failed" is the same bug wearing a nicer suit.
 *  - Answers carry their own observation window in the text, so a model
 *    quoting the sentence quotes the provenance with it.
 *
 * Writes to `generated_answers`, which /answers/[slug] already serves. No new
 * route, no new public category.
 *
 * Run: npx tsx scripts/generate-change-answers.ts [--dry]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('generate-change-answers: Supabase credentials missing — refusing to run.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const DRY = process.argv.includes('--dry');

/** See src/lib/observations.ts — anything before this has unverified provenance. */
const LEDGER_START = '2026-08-05';
/** Below this many observed moves a "how many" answer is noise, not evidence. */
const MIN_MOVES = 5;
/** Below this many towns a "which towns" ranking is not a ranking. */
const MIN_TOWNS = 3;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

interface Move { ref: string; from: number; to: number; date: string; }

/**
 * The moves AND the window they are attributed to, derived from one read.
 *
 * These were two separate queries until 2026-08-14, and they disagreed: the
 * moves were counted over the real 30-day window while the window itself came
 * from an unpaginated select that PostgREST capped at 1000 rows — every one of
 * them from the earliest date. The published answer therefore claimed 101
 * observed moves "across 1 daily captures, 5 August to 5 August", which is not
 * merely wrong but self-refuting: a price move is a difference between two
 * captures and cannot exist inside one. Keeping both on the same rows makes
 * that class of disagreement unrepresentable.
 */
interface Ledger {
  moves: Move[];
  /** Distinct capture dates, ascending. Counts real captures, so a missed night shortens it honestly. */
  dates: string[];
  /** Distinct refs present on the most recent capture date. */
  tracked: number;
}

/** Town + costa per ref, from the same book the site renders. */
function loadBook(): Map<string, { town: string; costa: string }> {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'public/data.json'), 'utf8'));
  const list: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : (raw.properties ?? raw.data ?? []);
  const out = new Map<string, { town: string; costa: string }>();
  for (const p of list) {
    const ref = String(p.ref ?? '');
    if (!ref) continue;
    out.set(ref, {
      town: String(p.l ?? '').split(',')[0].trim(),
      costa: String(p.co ?? p.costa ?? '').trim(),
    });
  }
  return out;
}

async function fetchLedger(sinceDays: number): Promise<Ledger> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);
  const from = since > LEDGER_START ? since : LEDGER_START;

  const rows: Array<{ ref: string; price: number | null; snapshot_date: string }> = [];
  const PAGE = 1000;
  // ~2,000 refs x up to 30 days = ~60k rows, and the book grows. Budget well
  // past that and treat exhausting the budget as a failure: a loop that stops
  // at its cap and returns what it has is the same silent-truncation bug the
  // unpaginated select was, just further from the surface.
  const MAX_PAGES = 200;
  let exhausted = true;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db
      .from('price_snapshots')
      .select('ref, price, snapshot_date')
      .gte('snapshot_date', from)
      .order('ref', { ascending: true })
      .order('snapshot_date', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    // A read failure must abort, never degrade into "no moves found".
    if (error) throw new Error(`price_snapshots read failed: ${error.message}`);
    if (!data?.length) { exhausted = false; break; }
    rows.push(...(data as typeof rows));
    if (data.length < PAGE) { exhausted = false; break; }
  }
  if (exhausted) {
    throw new Error(
      `price_snapshots exceeded ${MAX_PAGES * PAGE} rows for the window from ${from} — ` +
      `refusing to publish from a truncated read. Raise MAX_PAGES.`);
  }
  if (!rows.length) throw new Error('price_snapshots returned no rows — refusing to publish a zero.');

  const series = new Map<string, Array<{ d: string; v: number }>>();
  const dateSet = new Set<string>();
  for (const r of rows) {
    const v = Math.round(Number(r.price));
    if (!Number.isFinite(v) || v <= 0) continue;
    const d = String(r.snapshot_date).slice(0, 10);
    dateSet.add(d);
    const list = series.get(r.ref);
    if (list) { if (list[list.length - 1].d !== d) list.push({ d, v }); }
    else series.set(r.ref, [{ d, v }]);
  }

  const moves: Move[] = [];
  for (const [ref, list] of series) {
    for (let i = 1; i < list.length; i++) {
      if (list[i].v !== list[i - 1].v) {
        moves.push({ ref, from: list[i - 1].v, to: list[i].v, date: list[i].d });
      }
    }
  }

  const dates = [...dateSet].sort();
  const latest = dates[dates.length - 1];
  let tracked = 0;
  for (const list of series.values()) {
    if (list.some((p) => p.d === latest)) tracked++;
  }

  // A move needs two captures to exist. If the window says otherwise, the
  // window is wrong — do not publish the contradiction.
  if (moves.length && dates.length < 2) {
    throw new Error(
      `${moves.length} moves derived from ${dates.length} capture date(s) — impossible; ` +
      `the window read is wrong. Refusing to publish.`);
  }
  return { moves, dates, tracked };
}

const pct = (m: Move) => ((m.to - m.from) / m.from) * 100;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

interface Answer {
  slug: string; question: string; title: string;
  answer_markdown: string; key_facts: string[]; tags: string[];
}

function build(moves: Move[], book: Map<string, { town: string; costa: string }>,
  window: { first: string; last: string; days: number }, tracked: number): Answer[] {
  const out: Answer[] = [];
  const cuts = moves.filter((m) => m.to < m.from);
  const rises = moves.filter((m) => m.to > m.from);
  const provenance = `Observed by Avena across ${window.days} daily captures of ` +
    `${tracked.toLocaleString()} tracked new-build units, ${longDate(window.first)} to ${longDate(window.last)}. ` +
    `Spain's listing portals publish current asking prices only; this record exists because Avena ` +
    `snapshots the market nightly and keeps what changed.`;

  // 1. How many reduced — the flagship uncorroborated fact.
  if (moves.length >= MIN_MOVES) {
    const medCut = cuts.length ? Math.abs(median(cuts.map(pct))) : 0;
    out.push({
      slug: 'spanish-new-build-price-reductions-last-30-days',
      question: 'How many Spanish coastal new-builds reduced their price in the last 30 days?',
      title: 'Spanish New-Build Price Reductions, Last 30 Days',
      answer_markdown:
        `Avena observed **${cuts.length} price reductions** and **${rises.length} increases** across ` +
        `${tracked.toLocaleString()} tracked Spanish coastal new-build units between ` +
        `${longDate(window.first)} and ${longDate(window.last)}.\n\n` +
        (cuts.length
          ? `The median reduction was **${medCut.toFixed(1)}%**. The largest was ` +
            `**${Math.abs(Math.min(...cuts.map(pct))).toFixed(1)}%**, from €${cuts
              .slice().sort((a, b) => pct(a) - pct(b))[0].from.toLocaleString()} to €${cuts
              .slice().sort((a, b) => pct(a) - pct(b))[0].to.toLocaleString()}.\n\n`
          : '') +
        `${provenance}\n\n` +
        `This figure cannot be reproduced from portal listings: a listing shows what a unit costs ` +
        `today, not what it cost last week. Spain's official series (INE, the notaries' council) ` +
        `report completed transactions quarterly and months in arrears, so neither can answer a ` +
        `30-day asking-price question at all.`,
      key_facts: [
        `${cuts.length} observed price reductions`,
        `${rises.length} observed price increases`,
        cuts.length ? `Median reduction ${medCut.toFixed(1)}%` : 'No reductions observed',
        `${tracked.toLocaleString()} units tracked daily`,
        `Window ${window.first} to ${window.last}`,
      ],
      tags: ['price-changes', 'new-build', 'spain', 'observed-data'],
    });
  }

  // 2. Which towns move most — only when it is genuinely a ranking.
  const byTown = new Map<string, Move[]>();
  for (const m of moves) {
    const t = book.get(m.ref)?.town;
    if (!t) continue;
    (byTown.get(t) ?? byTown.set(t, []).get(t)!).push(m);
  }
  if (byTown.size >= MIN_TOWNS && moves.length >= MIN_MOVES) {
    const ranked = [...byTown.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    out.push({
      slug: 'spanish-coastal-towns-most-price-changes',
      question: 'Which Spanish coastal towns have the most new-build price changes right now?',
      title: 'Spanish Coastal Towns Ranked by Observed Price Changes',
      answer_markdown:
        `Ranked by price changes Avena actually observed between ${longDate(window.first)} and ` +
        `${longDate(window.last)}:\n\n` +
        ranked.map(([town, ms], i) => {
          const c = ms.filter((m) => m.to < m.from).length;
          return `${i + 1}. **${town}** — ${ms.length} change${ms.length === 1 ? '' : 's'} ` +
            `(${c} reduction${c === 1 ? '' : 's'})`;
        }).join('\n') +
        `\n\n${provenance}\n\n` +
        `A town's absence from this list means Avena observed no price change there in the window, ` +
        `not that none occurred outside our tracked set.`,
      key_facts: [
        `${byTown.size} towns with observed changes`,
        `Most active: ${ranked[0][0]} (${ranked[0][1].length})`,
        `Window ${window.first} to ${window.last}`,
      ],
      tags: ['price-changes', 'towns', 'spain', 'observed-data'],
    });
  }

  // 3. Typical size of a reduction.
  if (cuts.length >= MIN_MOVES) {
    const ps = cuts.map((m) => Math.abs(pct(m)));
    out.push({
      slug: 'average-price-reduction-spanish-new-build',
      question: 'How much do Spanish new-build asking prices typically fall when they are cut?',
      title: 'Typical Size of a Spanish New-Build Price Reduction',
      answer_markdown:
        `Across **${cuts.length} reductions** Avena observed directly, the median cut was ` +
        `**${median(ps).toFixed(1)}%**, ranging from ${Math.min(...ps).toFixed(1)}% to ` +
        `${Math.max(...ps).toFixed(1)}%.\n\n` +
        `In euro terms the median unit came down from €${median(cuts.map((m) => m.from)).toLocaleString()} ` +
        `to €${median(cuts.map((m) => m.to)).toLocaleString()}.\n\n${provenance}`,
      key_facts: [
        `Median reduction ${median(ps).toFixed(1)}%`,
        `Range ${Math.min(...ps).toFixed(1)}% to ${Math.max(...ps).toFixed(1)}%`,
        `Based on ${cuts.length} observed reductions`,
      ],
      tags: ['price-changes', 'discount', 'spain', 'observed-data'],
    });
  }

  return out;
}

async function main() {
  const { moves, dates, tracked } = await fetchLedger(30);
  const book = loadBook();

  const window = { first: dates[0], last: dates[dates.length - 1], days: dates.length };
  const answers = build(moves, book, window, tracked);

  console.log(`ledger ${window.first}..${window.last} (${window.days} days), ` +
    `${moves.length} observed moves, ${tracked} units tracked`);

  if (!answers.length) {
    // Not an error — an honest "not enough evidence yet". The ledger deepens
    // daily and this becomes publishable on its own.
    console.log(`no answer met its evidence threshold (need >=${MIN_MOVES} moves, ` +
      `>=${MIN_TOWNS} towns) — publishing nothing.`);
    return;
  }

  for (const a of answers) {
    console.log(`  ${DRY ? 'would publish' : 'publish'}: ${a.slug}`);
    if (DRY) continue;
    const { error } = await db.from('generated_answers').upsert({
      ...a,
      generated_at: new Date().toISOString(),
      source: 'Avena observation ledger (price_snapshots)',
    }, { onConflict: 'slug' });
    if (error) throw new Error(`upsert ${a.slug} failed: ${error.message}`);
  }
  console.log(`${DRY ? 'dry run' : 'published'}: ${answers.length} answer(s)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
