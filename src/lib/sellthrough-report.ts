/**
 * Renders a MonitorResult as one self-contained HTML document (inline CSS and
 * SVG, no external assets) so it prints to PDF and can be emailed as a file.
 * Pure: the same function serves /lender/report and scripts/sellthrough-report.ts.
 * Every number on the page comes from the MonitorResult passed in.
 */
import type { GroupStats, MonitorResult, ProjectStats, WeekStats } from './sellthrough';
import { FLAG_LABEL, REGION_LABEL, eur, pct } from './sellthrough-format';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const num = (n: number | null | undefined, dp = 0) => (n === null || n === undefined ? '–' : n.toFixed(dp));
const region = (r: string | null) => (r ? REGION_LABEL[r] ?? r : '–');

function weeklyChart(weeks: WeekStats[]): string {
  if (!weeks.length) return '';
  const W = 760, H = 220, pad = 34, bw = (W - pad * 2) / weeks.length;
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.exits, w.rises, w.cuts)));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const bars = weeks.map((w, i) => {
    const x = pad + i * bw;
    const g = w.daysObserved < 7;
    const one = (v: number, off: number, cls: string) =>
      `<rect class="${cls}" x="${(x + off).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw / 3.6).toFixed(1)}" height="${(H - pad - y(v)).toFixed(1)}"/>`;
    return `${g ? `<rect class="gap" x="${x.toFixed(1)}" y="${pad}" width="${bw.toFixed(1)}" height="${H - pad * 2}"/>` : ''}
      ${one(w.exits, bw * 0.08, 'b-exit')}${one(w.cuts, bw * 0.36, 'b-cut')}${one(w.rises, bw * 0.64, 'b-rise')}
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - pad + 14}" class="ax">${w.week.slice(5)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Weekly exits, cuts and rises">
    <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" class="axis"/>
    <text x="${pad - 6}" y="${y(max) + 4}" class="ax" text-anchor="end">${max}</text>
    <text x="${pad - 6}" y="${H - pad + 4}" class="ax" text-anchor="end">0</text>
    ${bars}
  </svg>
  <div class="legend"><span class="k b-exit"></span>Exits (listings that left the market) <span class="k b-cut"></span>Price cuts <span class="k b-rise"></span>Price rises <span class="k gap"></span>Week with missing snapshot days</div>`;
}

const groupRow = (g: GroupStats, label: string) => `<tr>
  <td>${esc(label)}</td><td class="n">${g.live}</td><td class="n">${g.exitsWindow}</td><td class="n">${pct(g.absorptionPct30d, false)}</td>
  <td class="n">${num(g.monthsOfSupply, 1)}</td><td class="n">${g.cutsWindow}</td><td class="n">${g.risesWindow}</td>
  <td class="n">${pct(g.medianCutPct)}</td><td class="n">${eur(g.medianPm2)}</td><td class="n">${num(g.medianDaysListed)}</td></tr>`;

const groupHead = (first: string) => `<tr><th>${first}</th><th>Live</th><th>Exits (window)</th><th>Absorption /30d</th><th>Months of supply</th><th>Cuts</th><th>Rises</th><th>Median cut</th><th>Median €/m²</th><th>Median days listed</th></tr>`;

const projRow = (p: ProjectStats) => `<tr>
  <td class="mono">${esc(p.project)}</td><td>${esc(p.town)}</td><td>${esc(p.types.join(', '))}</td><td>${esc(p.status ?? '–')}</td><td>${esc(p.delivery ?? '–')}</td>
  <td class="n">${p.live}/${p.listingsObserved}</td><td class="n">${p.exitsSinceStart}</td><td class="n">${p.cutsSinceStart}/${p.risesSinceStart}</td>
  <td class="n">${pct(p.netPriceChangePct)}</td><td class="n">${eur(p.medianPm2)}</td><td class="n">${pct(p.premiumToTownPct)}</td>
  <td>${p.flags.map((f) => `<span class="flag">${esc(FLAG_LABEL[f] ?? f)}</span>`).join(' ')}</td></tr>`;

const projHead = `<tr><th>Project</th><th>Town</th><th>Types</th><th>Status</th><th>Delivery</th><th>Live / seen</th><th>Exits</th><th>Cuts / rises</th><th>Net price chg</th><th>Median €/m²</th><th>vs town €/m²</th><th>Flags</th></tr>`;

export interface ReportOptions {
  title?: string;
  subtitle?: string;
  licensee?: string;
  maxTowns?: number;
  maxProjects?: number;
}

export function renderReportHtml(r: MonitorResult, o: ReportOptions = {}): string {
  const title = o.title ?? 'Costa New-Build Sell-Through Monitor';
  const flagged = r.projects
    .filter((p) => p.flags.some((f) => f !== 'EXIT_IN_GAP'))
    .sort((a, b) => b.cutsWindow - a.cutsWindow || b.cutsSinceStart - a.cutsSinceStart || b.live - a.live);
  const pick = (f: string, n: number) => flagged.filter((p) => p.flags.includes(f as never)).slice(0, n);
  const maxP = o.maxProjects ?? 15;
  const towns = r.towns.slice(0, o.maxTowns ?? 25);
  const cuts = [...r.recentCuts].sort((a, b) => a.pct - b.pct).slice(0, 20);
  const gaps = r.knownGaps.map((g) => `${g.from} to ${g.to}`).join(', ');
  const m = r.market;
  const fastest = r.towns.filter((t) => t.live + t.exitsWindow >= 20 && t.absorptionPct30d !== null).sort((a, b) => b.absorptionPct30d! - a.absorptionPct30d!).slice(0, 3);
  const slowest = r.towns.filter((t) => t.live >= 30).sort((a, b) => (b.monthsOfSupply ?? 1e9) - (a.monthsOfSupply ?? 1e9)).slice(0, 3);
  const exitDate = (d: string) => d;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)} · ${esc(r.asOf)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font: 11px/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #14171c; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 24px; margin: 0 0 2px; letter-spacing: -0.01em; } h2 { font-size: 15px; margin: 26px 0 8px; border-bottom: 2px solid #b8913a; padding-bottom: 4px; break-after: avoid; }
  .sub { color: #5a6270; margin-bottom: 14px; } .eyebrow { font: 600 9px/1 ui-monospace, Menlo, monospace; letter-spacing: .3em; text-transform: uppercase; color: #8a6d2a; }
  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 12px 0; }
  .kpi { border: 1px solid #e3e5ea; border-radius: 6px; padding: 8px 10px; } .kpi b { display: block; font-size: 18px; } .kpi span { color: #5a6270; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; break-inside: auto; } tr { break-inside: avoid; }
  th, td { border-bottom: 1px solid #eceef2; padding: 4px 6px; text-align: left; vertical-align: top; } th { background: #f6f4ee; font-weight: 600; font-size: 10px; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; } .mono { font-family: ui-monospace, Menlo, monospace; }
  .flag { display: inline-block; background: #fbeee0; color: #8a4b0f; border-radius: 3px; padding: 0 4px; margin: 1px 0; font-size: 9.5px; white-space: nowrap; }
  .note { color: #5a6270; font-size: 10px; } .box { background: #f7f8fa; border-left: 3px solid #b8913a; padding: 8px 12px; margin: 8px 0; }
  .chart { width: 100%; max-width: 900px; height: auto; } .axis { stroke: #9aa1ad; } .ax { font-size: 9px; fill: #5a6270; text-anchor: middle; }
  .b-exit { fill: #1f6f5c; background: #1f6f5c; } .b-cut { fill: #c0392b; background: #c0392b; } .b-rise { fill: #8a9bb0; background: #8a9bb0; } .gap { fill: #f4e7c5; background: #f4e7c5; }
  .legend { font-size: 10px; color: #5a6270; } .legend .k { display: inline-block; width: 10px; height: 10px; margin: 0 4px 0 12px; vertical-align: -1px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; } ol { margin: 4px 0; padding-left: 18px; }
  .pb { break-before: page; }
</style></head><body>
<div class="eyebrow">Avena Terminal · Lender &amp; developer intelligence</div>
<h1>${esc(title)}</h1>
<div class="sub">${esc(o.subtitle ?? 'Spanish coastal new-build projects: who is selling, who is cutting, and how much stock is left.')} Data as of <b>${esc(r.asOf)}</b>; flow window ${r.windowDays} days (${esc(r.windowStart)} to ${esc(r.asOf)}).${o.licensee ? ` Prepared for ${esc(o.licensee)}.` : ''}</div>

<div class="kpis">
  <div class="kpi"><b>${r.coverage.live.toLocaleString('en-GB')}</b><span>live listings tracked daily</span></div>
  <div class="kpi"><b>${r.coverage.projects}</b><span>projects (development refs)</span></div>
  <div class="kpi"><b>${r.coverage.towns}</b><span>towns, 4 costas</span></div>
  <div class="kpi"><b>${r.coverage.exitsSinceStart}</b><span>listing exits since ${esc(r.seriesStart)}</span></div>
  <div class="kpi"><b>${r.coverage.priceMovesSinceStart}</b><span>asking-price moves since ${esc(r.seriesStart)}</span></div>
  <div class="kpi"><b>${num(m.monthsOfSupply, 1)}</b><span>months of supply at the ${r.windowDays}-day exit pace</span></div>
</div>

<div class="box"><b>This window in one line:</b> ${m.exitsWindow} listings left the market and ${m.newWindow} came on, while asking prices moved ${m.cutsWindow + m.risesWindow} times: ${m.risesWindow} rises (median ${pct(m.medianRisePct)}) against ${m.cutsWindow} cuts (median ${pct(m.medianCutPct)}).
${fastest.length ? ` Fastest-absorbing towns: ${fastest.map((t) => `${esc(t.label)} (${pct(t.absorptionPct30d, false)}/30d)`).join(', ')}.` : ''}
${slowest.length ? ` Deepest stock relative to exits: ${slowest.map((t) => `${esc(t.label)} (${t.monthsOfSupply === null ? 'no exits' : num(t.monthsOfSupply, 1) + ' months'})`).join(', ')}.` : ''}</div>

<h2>1. Market by costa</h2>
<table>${groupHead('Costa')}${r.regions.map((g) => groupRow(g, region(g.key))).join('')}${groupRow(m, 'All covered markets')}</table>
<p class="note">Absorption = window exits scaled to 30 days ÷ (live + window exits). Months of supply = live ÷ exits per 30 days. Exits are listings that left the market (sold out or withdrawn), not confirmed sales.</p>

<h2>2. Weekly tape since ${esc(r.seriesStart)}</h2>
${weeklyChart(r.weekly)}
<p class="note">Weeks start Monday. Shaded weeks hold fewer than 7 snapshot days; ${esc(gaps)} has no data (feed outage): listings that left during it are dated the day after they were last seen, and price changes across it are dated the first day back (2026-10-21 onward).</p>

<h2 class="pb">3. Town league table (top ${towns.length} by tracked listings)</h2>
<table>${groupHead('Town')}${towns.map((g) => groupRow(g, `${g.label} · ${region(g.region)}`)).join('')}</table>

<h2>4. Projects to watch</h2>
<p class="note">Project = Avena development reference. Developer names are not in the captured data; the project-to-developer mapping is delivered separately once verified. "Live / seen" counts listings (unit types), not dwellings.</p>
<h3>Repeated price cuts</h3><table>${projHead}${pick('REPEAT_CUTS', maxP).map(projRow).join('')}</table>
<h3>Delivery within two quarters, ≥3 listings still live</h3><table>${projHead}${pick('DELIVERY_NEAR_WITH_STOCK', maxP).map(projRow).join('')}</table>
<h3>All listings gone since ${esc(r.seriesStart)}</h3><table>${projHead}${pick('SOLD_OUT', maxP).map(projRow).join('')}</table>

<h2 class="pb">5. Largest asking-price cuts in the window</h2>
<table><tr><th>Date</th><th>Listing</th><th>Project</th><th>Town</th><th class="n">From</th><th class="n">To</th><th class="n">Change</th></tr>
${cuts.map((c) => `<tr><td>${esc(c.date)}</td><td class="mono">${esc(c.ref)}</td><td class="mono">${esc(c.project ?? '–')}</td><td>${esc(c.town)}</td><td class="n">${eur(c.from)}</td><td class="n">${eur(c.to)}</td><td class="n">${pct(c.pct)}</td></tr>`).join('')}</table>

<h2>6. Latest exits</h2>
<table><tr><th>Last seen</th><th>Listing</th><th>Project</th><th>Town</th><th>Type</th><th class="n">Last asking price</th><th>Note</th></tr>
${r.recentExits.slice(0, 20).map((x) => `<tr><td>${esc(exitDate(x.lastSeen))}</td><td class="mono">${esc(x.ref)}</td><td class="mono">${esc(x.project ?? '–')}</td><td>${esc(x.town)}</td><td>${esc(x.type)}</td><td class="n">${eur(x.lastPrice)}</td><td>${x.inGap ? 'left during data gap' : ''}</td></tr>`).join('')}</table>

<h2 class="pb">Methodology and limits</h2>
<ol>${r.methodology.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
<p class="note">Coverage: ${r.coverage.listingsObserved.toLocaleString('en-GB')} listings observed in the series, ${r.coverage.exitsInGap} of the ${r.coverage.exitsSinceStart} exits fall inside the known data gap. The full per-project table (all ${r.projects.length} projects) is delivered as CSV and via the API.</p>
<p class="note">Generated by Avena Terminal from its own nightly captures. Asking prices only. Not investment advice and not a valuation under ECO 805/2003.</p>
</body></html>`;
}
