import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import type { PortugalLayer, PtRegion } from '@/lib/data-sources/ine-pt';
import layerJson from '../../../data/pt-official.json';

// Static: the layer is a committed file refreshed weekly by
// .github/workflows/pt-official-refresh.yml; each refresh commit redeploys.
const layer = layerJson as unknown as PortugalLayer;

const BORDER = 'hsl(var(--av-border) / 0.6)';

export const metadata: Metadata = {
  title: 'Portugal new-build price benchmarks · Avena Terminal',
  description:
    'Official new-build vs existing median €/m² for the Algarve, Lisbon, Porto, Madeira and the Silver Coast by municipality and parish, plus the licensed new-dwelling pipeline. Source: INE Portugal and Banco de Portugal.',
  alternates: { canonical: 'https://avenaterminal.com/portugal' },
  openGraph: {
    title: 'Portugal new-build price benchmarks · Avena Terminal',
    description: 'New-build €/m² benchmarks and the licensing pipeline for Portugal’s key markets, from INE Portugal and Banco de Portugal.',
    url: 'https://avenaterminal.com/portugal',
    siteName: 'Avena',
    type: 'website',
  },
};

// ─── formatting ────────────────────────────────────────────────────────────
const eur = (n: number | null | undefined) => (n == null ? '–' : `€${n.toLocaleString('en-GB')}`);
const num = (n: number | null | undefined) => (n == null ? '–' : n.toLocaleString('en-GB'));
const pct = (n: number | null | undefined, signed = true) => (n == null ? '–' : `${signed && n > 0 ? '+' : ''}${n.toFixed(1)}%`);
const growth = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev <= 0 ? null : ((cur - prev) / prev) * 100);
function quarterLabel(p: string) {
  const [y, q] = p.split('-Q');
  return `Q${q} ${y}`;
}
function monthLabel(p: string) {
  const d = new Date(`${p}-01T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function dateLabel(iso: string | null) {
  if (!iso) return '–';
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const PRICE_Q = quarterLabel(layer.sources.ine_prices.latest_period);
const FIRST_Q = quarterLabel(layer.sources.ine_prices.first_period);
const LIC_M = monthLabel(layer.sources.ine_licensing.latest_period);

export default function PortugalPage() {
  const n = layer.national;
  const licGrowth = growth(n.licensed_12m, n.licensed_12m_prev);
  const lastHpi = [...layer.bdp.hpi_yoy].reverse().find((r) => r.new != null || r.existing != null);
  const lastRate = [...layer.bdp.mortgage_rate_median].reverse().find((r) => r.variable != null || r.fixed != null);

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Portugal Market Layer: new-build price benchmarks and licensing pipeline',
    description:
      'Median €/m² of dwelling sales (new vs existing) by NUTS III, municipality and parish, and licensed new dwellings by municipality, for Portugal’s priority markets. Derived from INE Portugal indicators 0012234 and 0012098 (CC BY 4.0) and Banco de Portugal BPstat series.',
    url: 'https://avenaterminal.com/portugal',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    isBasedOn: [
      'https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=0012234&lingua=EN',
      'https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=0012098&lingua=EN',
      'https://bpstat.bportugal.pt',
    ],
    spatialCoverage: 'Portugal',
    temporalCoverage: `${layer.sources.ine_prices.first_period}/${layer.sources.ine_prices.latest_period}`,
    dateModified: layer.generated_at,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Avena · Portugal Market Layer</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              Portugal new-build,<br />
              <span className="text-gold italic">benchmarked.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-4">
              Official median prices per m² for new and existing dwellings across the Algarve, Lisbon, Porto, Madeira and the Silver Coast, down to municipality and parish, with the licensed new-dwelling pipeline behind them. Built from INE Portugal and Banco de Portugal statistics and refreshed every week.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground mb-8">
              This is an official-statistics layer. Avena does not yet publish Portuguese listings; listing coverage will be added only from feeds whose owners have given permission.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label={`New-build median, ${PRICE_Q}`} value={`${eur(n.latest.new)}/m²`} sub="Portugal, last 12 months of sales" />
              <Stat label="New-build premium" value={pct(n.new_premium_pct)} sub={`vs existing at ${eur(n.latest.existing)}/m²`} />
              <Stat label="New-build €/m², 1 year" value={pct(n.new_yoy_pct)} sub={`${PRICE_Q} vs a year earlier`} />
              <Stat label={`Licensed new dwellings, 12m to ${LIC_M}`} value={num(n.licensed_12m)} sub={`${pct(licGrowth)} vs a year earlier`} />
            </div>
          </div>
        </section>

        {/* Regions */}
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Priority markets</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Five markets, one benchmark table.</h2>
            <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
              <table className="w-full min-w-[760px]">
                <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  <tr>
                    <Th>Market (NUTS III)</Th>
                    <Th align="right">New €/m²</Th>
                    <Th align="right">Existing €/m²</Th>
                    <Th align="right">New premium</Th>
                    <Th align="right">New, 1y</Th>
                    <Th align="right">Licensed, 12m</Th>
                    <Th align="right">Licensed, 1y</Th>
                  </tr>
                </thead>
                <tbody>
                  {layer.regions.flatMap((r) =>
                    r.nuts3.map((x, i) => (
                      <tr key={x.geo} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td>
                          <a href={`#${r.slug}`} className="text-sm text-foreground hover:text-primary">{r.name}</a>
                          {r.nuts3.length > 1 && <span className="ml-2 text-xs text-muted-foreground">{x.name}</span>}
                        </Td>
                        <Td align="right"><Mono strong>{eur(x.latest.new)}</Mono></Td>
                        <Td align="right"><Mono>{eur(x.latest.existing)}</Mono></Td>
                        <Td align="right"><Mono>{pct(x.new_premium_pct)}</Mono></Td>
                        <Td align="right"><Mono>{pct(x.new_yoy_pct)}</Mono></Td>
                        <Td align="right">{i === 0 ? <Mono>{num(r.licensed_12m)}</Mono> : <Mono>&nbsp;</Mono>}</Td>
                        <Td align="right">{i === 0 ? <Mono>{pct(growth(r.licensed_12m, r.licensed_12m_prev))}</Mono> : <Mono>&nbsp;</Mono>}</Td>
                      </tr>
                    )),
                  )}
                  <tr className="border-t" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.25)' }}>
                    <Td><span className="text-sm text-foreground">Portugal</span></Td>
                    <Td align="right"><Mono strong>{eur(n.latest.new)}</Mono></Td>
                    <Td align="right"><Mono>{eur(n.latest.existing)}</Mono></Td>
                    <Td align="right"><Mono>{pct(n.new_premium_pct)}</Mono></Td>
                    <Td align="right"><Mono>{pct(n.new_yoy_pct)}</Mono></Td>
                    <Td align="right"><Mono>{num(n.licensed_12m)}</Mono></Td>
                    <Td align="right"><Mono>{pct(licGrowth)}</Mono></Td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Prices: INE median €/m² of dwelling sales in the 12 months to {PRICE_Q}. Licensing: new family dwellings licensed in the 12 months to {LIC_M}. Lisbon metro licensing combines Grande Lisboa and Península de Setúbal.
            </p>
          </div>
        </section>

        {/* Trends */}
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 grid gap-10 lg:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Price trend</div>
              <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-6">New-build median €/m², {FIRST_Q} to {PRICE_Q}</h2>
              <LineChart
                series={[
                  { name: 'Portugal', color: 'hsl(var(--av-foreground) / 0.55)', points: n.price_series.map((p) => p.new) },
                  ...layer.regions.map((r, i) => ({ name: r.nuts3[0].name === r.name ? r.name : `${r.name} (${r.nuts3[0].name})`, color: PALETTE[i], points: r.price_series.map((p) => p.new) })),
                ]}
                labels={n.price_series.map((p) => quarterLabel(p.period))}
                unit="€/m²"
              />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Supply pipeline</div>
              <h2 className="font-serif text-2xl sm:text-3xl font-light text-foreground mb-6">Licensed new dwellings, trailing 12 months</h2>
              <LineChart
                series={layer.regions.map((r, i) => ({ name: r.name, color: PALETTE[i], points: alignTo(n.licensing_series.map((p) => p.period), r.licensing_series) }))}
                labels={n.licensing_series.map((p) => monthLabel(p.period))}
                unit="dwellings"
              />
              <p className="mt-3 text-xs text-muted-foreground">Portugal total: {num(n.licensed_12m)} in the 12 months to {LIC_M} ({pct(licGrowth)} y/y).</p>
            </div>
          </div>
        </section>

        {/* Region detail */}
        {layer.regions.map((r) => (
          <RegionSection key={r.slug} r={r} />
        ))}

        {/* Banco de Portugal */}
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Prices and credit</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">House prices and mortgage rates, nationally.</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Stat label={`HPI new dwellings, y/y (${dateLabel(lastHpi?.date ?? null)})`} value={pct(lastHpi?.new ?? null)} sub="Quarterly, INE via BPstat" />
              <Stat label={`HPI existing dwellings, y/y (${dateLabel(lastHpi?.date ?? null)})`} value={pct(lastHpi?.existing ?? null)} sub="Quarterly, INE via BPstat" />
              <Stat label={`New housing loans, variable (${dateLabel(lastRate?.date ?? null)})`} value={lastRate?.variable == null ? '–' : `${lastRate.variable.toFixed(2)}%`} sub="Median rate, Banco de Portugal" />
              <Stat label={`New housing loans, fixed (${dateLabel(lastRate?.date ?? null)})`} value={lastRate?.fixed == null ? '–' : `${lastRate.fixed.toFixed(2)}%`} sub="Median rate, Banco de Portugal" />
            </div>
            <div className="grid gap-10 lg:grid-cols-2">
              <LineChart
                series={[
                  { name: 'New dwellings', color: PALETTE[0], points: layer.bdp.hpi_yoy.map((p) => p.new) },
                  { name: 'Existing dwellings', color: PALETTE[2], points: layer.bdp.hpi_yoy.map((p) => p.existing) },
                ]}
                labels={layer.bdp.hpi_yoy.map((p) => dateLabel(p.date))}
                unit="% y/y"
              />
              <LineChart
                series={[
                  { name: 'Variable rate (median)', color: PALETTE[0], points: layer.bdp.mortgage_rate_median.map((p) => p.variable) },
                  { name: 'Fixed rate (median)', color: PALETTE[2], points: layer.bdp.mortgage_rate_median.map((p) => p.fixed) },
                ]}
                labels={layer.bdp.mortgage_rate_median.map((p) => dateLabel(p.date))}
                unit="%"
              />
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="border-b" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology and sources</div>
              <h2 className="font-serif text-3xl font-light text-foreground">How these numbers are made.</h2>
            </div>
            <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
              <p>
                <span className="text-foreground">Prices.</span> INE Portugal, <em>Estatísticas de preços da habitação ao nível local</em>, indicator{' '}
                <a className="text-primary hover:text-foreground" href="https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=0012234&lingua=EN" target="_blank" rel="noopener">0012234</a>: median value per m² of dwellings sold in the last 12 months, by category (new, existing, total), from {FIRST_Q} to {PRICE_Q} (INE update of {layer.sources.ine_prices.last_updated}). They are built from completed sales in Tax Authority administrative records, not from asking prices. Where INE publishes no value (for confidentiality or too few sales), the table shows “–”.
              </p>
              <p>
                <span className="text-foreground">Licensing.</span> INE indicator{' '}
                <a className="text-primary hover:text-foreground" href="https://www.ine.pt/bddXplorer/htdocs/minfo.jsp?var_cd=0012098&lingua=EN" target="_blank" rel="noopener">0012098</a>: dwellings licensed in new constructions for family housing in the last 3 months, monthly by municipality (INE update of {layer.sources.ine_licensing.last_updated}). Avena sums four non-overlapping 3-month windows to give a trailing 12-month total.
              </p>
              <p>
                <span className="text-foreground">National prices and credit.</span> Banco de Portugal, BPstat: house price index y/y for new and existing dwellings (series 5739036, 5739037; compiled by INE) and the median interest rate on new loans for permanent residential property, variable and fixed (series 12710733, 12710738).
              </p>
              <p>
                <span className="text-foreground">Avena calculations.</span> New-build premium = new ÷ existing − 1. One-year changes compare the same quarter or month a year earlier. Regions are INE NUTS III areas (NUTS 2024): Algarve; Grande Lisboa and Península de Setúbal; Área Metropolitana do Porto; Região Autónoma da Madeira; Oeste for the Silver Coast. Figures are otherwise unchanged from the source. Refreshed weekly; last build {layer.generated_at.slice(0, 10)}.
              </p>
              <div className="rounded-sm border p-4 font-mono text-[11px] leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
                <div className="text-foreground">Fonte: INE, Estatísticas de preços da habitação ao nível local (0012234), {FIRST_Q}–{PRICE_Q}; Licenciamento de obras (0012098), to {LIC_M}. Licensed under CC BY 4.0. Modified by Avena Terminal (aggregation, ratios and rounding).</div>
                <div className="mt-2 text-foreground">Fonte: Banco de Portugal, BPstat. Modified by Avena Terminal (selection and rounding).</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-20 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">Need Portugal in your models?</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground mb-8">
              Municipality and parish benchmarks, the licensing pipeline and Avena’s Spanish coastal capture, delivered by API or file. Avena Terminal is an official RICS Tech Partner (2026).
            </p>
            <Link href="/access" className="inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold" style={{ background: 'var(--av-gradient-gold)' }}>
              Request access →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function RegionSection({ r }: { r: PtRegion }) {
  const lic = growth(r.licensed_12m, r.licensed_12m_prev);
  return (
    <section id={r.slug} className="border-b scroll-mt-20" style={{ borderColor: BORDER }}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">{r.nuts3.map((x) => `NUTS III ${x.geo} · ${x.name}`).join(' + ')}</div>
        <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-3">{r.name}</h2>
        <p className="max-w-3xl text-muted-foreground mb-8">{r.blurb}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label={`New-build median, ${PRICE_Q}`} value={`${eur(r.nuts3[0].latest.new)}/m²`} sub={r.nuts3.length > 1 ? r.nuts3[0].name : 'Region'} />
          <Stat label="New-build premium" value={pct(r.nuts3[0].new_premium_pct)} sub={`vs existing ${eur(r.nuts3[0].latest.existing)}/m²`} />
          <Stat label="New-build €/m², 1 year" value={pct(r.nuts3[0].new_yoy_pct)} sub={`${PRICE_Q} vs a year earlier`} />
          <Stat label={`Licensed new dwellings, 12m`} value={num(r.licensed_12m)} sub={`${pct(lic)} vs a year earlier`} />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))' }}>
            <table className="w-full min-w-[620px]">
              <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                <tr>
                  <Th>Municipality</Th>
                  <Th align="right">New €/m²</Th>
                  <Th align="right">Existing €/m²</Th>
                  <Th align="right">Premium</Th>
                  <Th align="right">New, 1y</Th>
                  <Th align="right">Licensed, 12m</Th>
                </tr>
              </thead>
              <tbody>
                {r.municipalities.map((m) => (
                  <tr key={m.geo} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    <Td><span className="text-sm text-foreground">{m.name}</span></Td>
                    <Td align="right"><Mono strong>{eur(m.latest.new)}</Mono></Td>
                    <Td align="right"><Mono>{eur(m.latest.existing)}</Mono></Td>
                    <Td align="right"><Mono>{pct(m.new_premium_pct)}</Mono></Td>
                    <Td align="right"><Mono>{pct(m.new_yoy_pct)}</Mono></Td>
                    <Td align="right"><Mono>{num(m.licensed_12m)}</Mono></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            {r.parishes.length > 0 ? (
              <div className="rounded-sm border" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <div className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                  Highest new-build €/m² by parish
                </div>
                <ul>
                  {r.parishes.map((p) => (
                    <li key={p.geo} className="flex items-baseline justify-between gap-3 border-t px-4 py-2.5" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <span className="text-xs text-foreground/90 leading-snug">
                        {p.name}
                        <span className="block text-[11px] text-muted-foreground">{p.municipality}</span>
                      </span>
                      <Mono strong>{eur(p.new)}</Mono>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">INE does not publish parish-level figures for this region; municipality is the finest level available.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── tiny server-rendered SVG line chart (no client JS) ─────────────────────
const PALETTE = ['hsl(42 85% 64%)', 'hsl(26 88% 62%)', 'hsl(152 55% 55%)', 'hsl(200 70% 62%)', 'hsl(280 45% 70%)'];

function alignTo(periods: string[], s: { period: string; licensed_12m: number }[]): (number | null)[] {
  const m = new Map(s.map((p) => [p.period, p.licensed_12m]));
  return periods.map((p) => m.get(p) ?? null);
}

function LineChart({ series, labels, unit }: { series: { name: string; color: string; points: (number | null)[] }[]; labels: string[]; unit: string }) {
  const W = 560;
  const H = 240;
  const P = { l: 52, r: 12, t: 12, b: 26 };
  const vals = series.flatMap((s) => s.points).filter((v): v is number => v != null);
  if (vals.length === 0 || labels.length < 2) return null;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || 1;
  lo = lo - pad;
  hi = hi + pad;
  if (Math.min(...vals) >= 0 && lo < 0) lo = 0;
  const x = (i: number) => P.l + (i / (labels.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));
  const fmtTick = (v: number) => (Math.abs(hi) >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.abs(hi) >= 20 ? Math.round(v).toString() : v.toFixed(1));
  const xTicks = [0, Math.floor((labels.length - 1) / 2), labels.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Line chart, ${unit}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="hsl(36 14% 22%)" strokeWidth={0.6} />
            <text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="hsl(38 14% 70%)" fontFamily="ui-monospace, monospace">{fmtTick(t)}</text>
          </g>
        ))}
        {lo < 0 && hi > 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="hsl(38 14% 70% / 0.6)" strokeWidth={0.8} />}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'} fontSize={9} fill="hsl(38 14% 70%)" fontFamily="ui-monospace, monospace">{labels[i]}</text>
        ))}
        {series.map((s) => {
          let d = '';
          let pen = false;
          s.points.forEach((v, i) => {
            if (v == null) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            pen = true;
          });
          return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth={1.6} strokeLinejoin="round" />;
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="inline-block h-[2px] w-4" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">· {unit}</span>
      </figcaption>
    </figure>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: BORDER, background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-2.5 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}
function Mono({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={`font-mono text-xs tabular ${strong ? 'text-foreground' : 'text-foreground/75'}`}>{children}</span>;
}
