import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { statsCoverage, recentStatRows } from '@/lib/eu-stats-feeds';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'EU Official Statistics · Avena Terminal',
  description: 'European residential property statistics ingested directly from Eurostat, ECB Statistical Data Warehouse, INE Spain, and other national NSOs. Refreshed daily, fully citable, CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/eu-official' },
};

const SOURCE_META: Record<string, { label: string; org: string; url: string }> = {
  eurostat: { label: 'Eurostat',         org: 'European Commission · DG ESTAT',                  url: 'https://ec.europa.eu/eurostat' },
  ecb_sdw:  { label: 'ECB SDW',          org: 'European Central Bank · Statistical Data Warehouse', url: 'https://data.ecb.europa.eu' },
  ine_es:   { label: 'INE Spain',        org: 'Instituto Nacional de Estadística (ES)',          url: 'https://www.ine.es' },
  istat:    { label: 'ISTAT',            org: 'Istituto Nazionale di Statistica (IT)',           url: 'https://www.istat.it' },
  destatis: { label: 'Destatis',         org: 'Statistisches Bundesamt (DE)',                    url: 'https://www.destatis.de' },
  insee:    { label: 'INSEE',            org: 'Institut national de la statistique (FR)',        url: 'https://www.insee.fr' },
  cbs:      { label: 'CBS',              org: 'Centraal Bureau voor de Statistiek (NL)',         url: 'https://www.cbs.nl' },
  bis:      { label: 'BIS',              org: 'Bank for International Settlements',              url: 'https://www.bis.org/statistics/pp.htm' },
};

const COUNTRY_NAMES: Record<string, string> = {
  EU27_2020: 'EU27', EA20: 'Euro area',
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CY: 'Cyprus', CZ: 'Czechia',
  DE: 'Germany', DK: 'Denmark', EE: 'Estonia', ES: 'Spain', FI: 'Finland',
  FR: 'France', GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland',
  IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MT: 'Malta',
  NL: 'Netherlands', PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden',
  SI: 'Slovenia', SK: 'Slovakia',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

export default async function EUOfficialPage() {
  const [coverage, recent] = await Promise.all([statsCoverage(), recentStatRows(60)]);
  const sourceEntries = Object.entries(coverage.by_source).sort((a, b) => b[1] - a[1]);
  const countryEntries = Object.entries(coverage.by_country)
    .filter(([c]) => c !== 'EU27_2020' && c !== 'EA20')
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16 sm:py-24">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
              Avena · Official Statistics Layer
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.0] tracking-tight text-foreground mb-6">
              EU residential data,<br />
              <span className="text-gold italic">straight from the source.</span>
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl font-light leading-relaxed text-muted-foreground mb-8">
              Avena ingests official residential property statistics from Eurostat, the ECB Statistical Data Warehouse, and national statistical offices. Every observation in this layer is sourced directly from a public, authoritative API and is fully citable. Cross-referenced daily with the Avena ground-truth corpus of <span className="font-mono text-foreground">1,881 scored properties</span>.
            </p>

            {/* Coverage strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              <Stat label="Total observations" value={fmt(coverage.total_rows)} />
              <Stat label="Countries covered" value={coverage.countries_covered.toString()} />
              <Stat label="Latest period"     value={coverage.latest_period ?? '—'} />
              <Stat label="Last refresh"      value={coverage.last_run_at ? new Date(coverage.last_run_at).toISOString().slice(0, 10) : 'pending'} />
            </div>
          </div>
        </section>

        {/* Sources */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Sources wired</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Eight institutional feeds, refreshed daily.</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(SOURCE_META).map(([key, meta]) => {
                const count = coverage.by_source[key] ?? 0;
                const live = count > 0;
                return (
                  <div key={key} className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-serif text-xl text-foreground">{meta.label}</div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: live ? 'hsl(var(--av-success))' : 'hsl(var(--av-muted-foreground))' }}>
                        {live ? '● live' : '○ pending'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 leading-relaxed">{meta.org}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      <span className="text-foreground/85 tabular">{fmt(count)}</span> observations
                    </div>
                    <a href={meta.url} target="_blank" rel="noopener" className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-foreground">
                      Source homepage →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Country coverage */}
        {countryEntries.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Country coverage</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">27 EU members, plus euro-area aggregates.</h2>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {countryEntries.map(([cc, n]) => (
                  <div key={cc} className="flex items-baseline justify-between rounded-sm border px-4 py-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{cc}</div>
                      <div className="text-sm text-foreground">{COUNTRY_NAMES[cc] ?? cc}</div>
                    </div>
                    <div className="font-mono text-sm text-foreground/85 tabular">{fmt(n)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Latest observations */}
        {recent.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Latest observations</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-10">Freshest 60 datapoints across all sources.</h2>

              <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                    <tr>
                      <Th>Source</Th>
                      <Th>Country</Th>
                      <Th>Indicator</Th>
                      <Th>Period</Th>
                      <Th align="right">Value</Th>
                      <Th>Unit</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <Td><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{SOURCE_META[r.source]?.label ?? r.source}</span></Td>
                        <Td><span className="font-mono text-xs">{r.country_code}</span></Td>
                        <Td><span className="text-xs text-foreground/90">{r.indicator_name}</span></Td>
                        <Td><span className="font-mono text-xs tabular text-muted-foreground">{r.period}</span></Td>
                        <Td align="right"><span className="font-mono text-sm tabular text-foreground">{Number(r.value).toFixed(2)}</span></Td>
                        <Td><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{r.unit}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Citation */}
        <section>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite this layer</div>
            <div className="rounded-sm border p-5 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground">Avena Terminal (2026). EU Official Statistics Layer.</div>
              <div className="text-foreground mt-1">Ingested from Eurostat, ECB SDW, INE Spain. Refreshed daily.</div>
              <div className="text-primary mt-1">avenaterminal.com/eu-official · CC BY 4.0 · DOI 10.5281/zenodo.19520064</div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              The Avena ground-truth corpus of 1,881 micro-validated coastal properties is used as a calibration set against the official series — discrepancies flagged in the <Link href="/sovereign-briefing" className="text-foreground hover:text-primary">Sovereign Briefing</Link> research notes.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-2xl font-light text-foreground tabular">{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className={`px-4 py-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td className={`px-4 py-3 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}
