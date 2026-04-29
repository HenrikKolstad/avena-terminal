import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { Database, Download, Shield, ArrowUpRight, FileJson, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Avena Registry — the canonical European property registry',
  description: 'Open, signed, daily-refreshed registry of European residential properties. Cross-country schema. Free bulk download. AVN_PROP_ID canonical. RICS Tech Partner credentialed. CC BY 4.0.',
  alternates: { canonical: 'https://avenaterminal.com/registry' },
  openGraph: {
    title: 'Avena Registry — European property data, open and signed',
    description: 'The canonical EU property registry. Cross-country, AVP-compliant, daily-refreshed, citable.',
    url: 'https://avenaterminal.com/registry',
  },
};

interface CoverageRow {
  country: string;
  source_portal: string;
  record_count: number;
  scored_count: number;
  oldest_record: string;
  newest_record: string;
  avg_price_eur: number | null;
  avg_score: number | null;
}

interface SampleRow {
  avn_prop_id: string;
  country: string;
  region: string | null;
  municipality: string | null;
  property_type: string | null;
  bedrooms: number | null;
  built_m2: number | null;
  price_eur: number | null;
  avena_score: number | null;
  source_portal: string;
  last_seen_at: string;
}

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  ES: { name: 'Spain',    flag: '🇪🇸' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  FR: { name: 'France',   flag: '🇫🇷' },
  IT: { name: 'Italy',    flag: '🇮🇹' },
  GR: { name: 'Greece',   flag: '🇬🇷' },
  SE: { name: 'Sweden',   flag: '🇸🇪' },
  DK: { name: 'Denmark',  flag: '🇩🇰' },
  NO: { name: 'Norway',   flag: '🇳🇴' },
};

async function loadCoverage(): Promise<{ coverage: CoverageRow[]; total: number }> {
  if (!supabase) return { coverage: [], total: 0 };
  try {
    const [coverageRes, countRes] = await Promise.all([
      supabase.from('properties_coverage').select('*').order('record_count', { ascending: false }),
      supabase.from('properties_registry').select('avn_prop_id', { count: 'exact', head: true }),
    ]);
    return {
      coverage: (coverageRes.data as CoverageRow[]) ?? [],
      total: countRes.count ?? 0,
    };
  } catch {
    return { coverage: [], total: 0 };
  }
}

async function loadSample(): Promise<SampleRow[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('properties_registry')
      .select('avn_prop_id, country, region, municipality, property_type, bedrooms, built_m2, price_eur, avena_score, source_portal, last_seen_at')
      .order('avena_score', { ascending: false, nullsFirst: false })
      .limit(50);
    return (data as SampleRow[]) ?? [];
  } catch {
    return [];
  }
}

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default async function RegistryPage() {
  const [{ coverage, total }, sample] = await Promise.all([loadCoverage(), loadSample()]);

  const countryRollup = coverage.reduce<Record<string, { count: number; scored: number; portals: Set<string> }>>((acc, r) => {
    if (!acc[r.country]) acc[r.country] = { count: 0, scored: 0, portals: new Set() };
    acc[r.country].count += r.record_count;
    acc[r.country].scored += r.scored_count;
    acc[r.country].portals.add(r.source_portal);
    return acc;
  }, {});

  const countryRows = Object.entries(countryRollup)
    .map(([code, v]) => ({
      code,
      ...COUNTRY_NAMES[code],
      ...v,
      portals: [...v.portals],
    }))
    .sort((a, b) => b.count - a.count);

  const portalRollup = coverage.reduce<Record<string, number>>((acc, r) => {
    acc[r.source_portal] = (acc[r.source_portal] ?? 0) + r.record_count;
    return acc;
  }, {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena European Property Registry',
    description: 'Canonical, cross-country, signed registry of European residential properties. Daily-refreshed. AVN_PROP_ID identifier system. AVP v1.0 compliant.',
    url: 'https://avenaterminal.com/registry',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    identifier: '10.5281/zenodo.19520064',
    isAccessibleForFree: true,
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: 'https://avenaterminal.com/api/v1/registry?format=json' },
      { '@type': 'DataDownload', encodingFormat: 'text/csv',         contentUrl: 'https://avenaterminal.com/api/v1/registry?format=csv' },
    ],
  };

  return (
    <div className="avena-v2 min-h-screen overflow-x-clip" style={{ maxWidth: '100vw' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16 overflow-x-clip" style={{ maxWidth: '100vw' }}>
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1300px] px-5 sm:px-12 py-16 sm:py-20 min-w-0">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10 hidden sm:inline-block" style={{ background: 'hsl(var(--av-primary))' }} />
              The European property registry · open · signed · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6 break-words" style={{ overflowWrap: 'anywhere' }}>
              Avena <span className="italic text-gold">Registry</span>.
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light mb-10">
              Every property scored, signed, timestamped. One canonical schema across countries.
              AVN_PROP_ID identifiers. Bulk download. Daily refresh. RICS Tech Partner credentialed.
              The dataset that makes European property analysable, not just listable.
            </p>

            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                  Total records
                </div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-primary leading-none break-words">
                  {fmt(total)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                  Countries
                </div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-foreground leading-none">
                  {countryRows.length}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                  Source portals
                </div>
                <div className="font-serif text-5xl sm:text-6xl tabular text-foreground leading-none">
                  {Object.keys(portalRollup).length}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Coverage by country */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1300px] px-5 sm:px-12 py-12 min-w-0">
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2">
              Coverage by <span className="italic text-gold">country</span>.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-8">
              Live counts · last refresh now
            </p>

            {countryRows.length === 0 ? (
              <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-warning) / 0.4)', background: 'hsl(var(--av-warning) / 0.06)' }}>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-warning))' }}>
                  Registry not yet seeded
                </p>
                <p className="mt-2 text-sm text-foreground/85">
                  Run the seed endpoint to populate from the existing 1,881-record Xavia dataset:
                </p>
                <pre className="mt-3 font-mono text-[11px] text-foreground/85 overflow-x-auto rounded-sm border p-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(32 14% 9%)' }}>
{`curl -X POST https://avenaterminal.com/api/admin/seed-registry \\
  -H "X-Avena-Admin-Secret: $ADMIN_SECRET"`}
                </pre>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {countryRows.map((c) => (
                  <div
                    key={c.code}
                    className="rounded-sm border p-5"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="font-serif text-lg text-foreground flex items-center gap-2">
                        <span>{c.flag ?? '🇪🇺'}</span>
                        <span>{c.name ?? c.code}</span>
                      </span>
                      <span className="font-mono tabular text-[11px] text-muted-foreground">{c.code}</span>
                    </div>
                    <div className="font-serif font-light tabular text-3xl text-primary">{fmt(c.count)}</div>
                    <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      {c.scored} scored · {c.portals.length} portal{c.portals.length === 1 ? '' : 's'}
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
                      {c.portals.slice(0, 3).join(' · ')}{c.portals.length > 3 ? ` +${c.portals.length - 3}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sample browse */}
        {sample.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1300px] px-5 sm:px-12 py-12 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                  Top <span className="italic text-gold">50</span>.
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Sorted by Avena Score · descending
                </span>
              </div>

              <div className="rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full text-sm" style={{ minWidth: 700 }}>
                  <thead style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                    <tr className="text-left font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      <th className="px-3 py-2.5">AVN_PROP_ID</th>
                      <th className="px-3 py-2.5">Where</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5 text-right">Beds</th>
                      <th className="px-3 py-2.5 text-right">m²</th>
                      <th className="px-3 py-2.5 text-right">Price</th>
                      <th className="px-3 py-2.5 text-right">Score</th>
                      <th className="px-3 py-2.5">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((p) => (
                      <tr key={p.avn_prop_id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-3 py-2 font-mono text-[10px] text-foreground/85 break-all" style={{ overflowWrap: 'anywhere' }}>
                          {p.avn_prop_id}
                        </td>
                        <td className="px-3 py-2 text-foreground/85">
                          {COUNTRY_NAMES[p.country]?.flag ?? '🇪🇺'} {p.municipality}
                          {p.region ? <span className="text-muted-foreground"> · {p.region}</span> : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground/85 capitalize">{p.property_type ?? '—'}</td>
                        <td className="px-3 py-2 font-mono tabular text-right">{p.bedrooms ?? '—'}</td>
                        <td className="px-3 py-2 font-mono tabular text-right">{p.built_m2 ?? '—'}</td>
                        <td className="px-3 py-2 font-mono tabular text-right">
                          {p.price_eur ? `€${fmt(Math.round(p.price_eur))}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono tabular text-right text-primary">
                          {p.avena_score ?? '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {p.source_portal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Showing 50 of {fmt(total)}. Full registry via API or bulk download.
              </p>
            </div>
          </section>
        )}

        {/* Access */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1300px] px-5 sm:px-12 py-12 min-w-0">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Access the <span className="italic text-gold">data</span>.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  <FileJson className="h-3.5 w-3.5" />
                  JSON
                </div>
                <p className="text-sm text-foreground/85 mb-4">
                  Machine-readable registry feed. Pagination + filters via query params. CORS enabled.
                </p>
                <Link
                  href="/api/v1/registry?format=json&limit=100"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                >
                  GET /api/v1/registry <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  CSV bulk download
                </div>
                <p className="text-sm text-foreground/85 mb-4">
                  Full registry as CSV. Free for non-commercial use under CC BY 4.0.
                </p>
                <Link
                  href="/api/v1/registry?format=csv"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                >
                  Download CSV <Download className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-sm border p-5" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  <Database className="h-3.5 w-3.5" />
                  MCP server
                </div>
                <p className="text-sm text-foreground/85 mb-4">
                  AI agents query the registry directly via the Model Context Protocol.
                </p>
                <Link
                  href="/mcp-server"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                >
                  MCP docs <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Schema + provenance */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14 min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-3 inline-block">
              For institutions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-6">
              Why Avena Registry is <span className="italic text-gold">institutional-grade</span>.
            </h2>

            <div className="space-y-4 text-base text-foreground/90 font-light leading-relaxed">
              <p>
                <span className="font-mono text-primary text-sm">Cross-country canonical schema.</span>{' '}
                One record format for every property across every European market. No country-specific
                quirks leaking into pricing models.
              </p>
              <p>
                <span className="font-mono text-primary text-sm">Provenance on every row.</span>{' '}
                Source portal, source listing ID, source URL, first-seen and last-seen timestamps,
                raw payload preserved as JSONB. Auditable end-to-end.
              </p>
              <p>
                <span className="font-mono text-primary text-sm">AVN_PROP_ID canonical identifier.</span>{' '}
                Cross-portal deduplication and stable lookup. The first universal property identifier
                for European real estate. Specification:{' '}
                <Link href="/standards/avn-id" className="text-primary hover:text-gold underline">/standards/avn-id</Link>.
              </p>
              <p>
                <span className="font-mono text-primary text-sm">RICS Tech Partner methodology.</span>{' '}
                Avena Score computed under a peer-reviewable hedonic regression model with public
                methodology (DOI 10.5281/zenodo.19520064).
              </p>
              <p>
                <span className="font-mono text-primary text-sm">CC BY 4.0 license.</span>{' '}
                Use the data for research, commercial models, citation in publications. Attribution
                required, derivative works permitted.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/institutional"
                className="inline-flex items-center gap-2 rounded-sm px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                <Shield className="h-3.5 w-3.5" />
                Institutional access →
              </Link>
              <Link
                href="/standards/avp"
                className="inline-flex items-center gap-2 rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                AVP v1.0 specification →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · RICS Tech Partner 2026 · Daily refresh
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
