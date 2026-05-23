import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'EU Coverage | Avena Terminal',
  description: 'Live per-country property data coverage across the 27 EU member states. APIP v1.0 standard. Real-time feed sync status.',
  alternates: { canonical: 'https://avenaterminal.com/eu-coverage' },
  openGraph: {
    title: 'Avena EU Coverage — live property data infrastructure',
    description: 'One API. One standard. 27 countries. Country-by-country live feed status.',
    url: 'https://avenaterminal.com/eu-coverage',
  },
};

interface CoverageRow {
  country_code: string;
  country_name: string;
  portal_name: string | null;
  feed_url: string | null;
  status: 'live' | 'beta' | 'stub';
  last_sync_at: string | null;
  property_count: number;
  last_sync_status: string | null;
  active: boolean;
}

async function loadCoverage(): Promise<CoverageRow[]> {
  if (!supabase) return [];
  try {
    const { data: configs } = await supabase
      .from('feed_configs')
      .select('country_code, country_name, portal_name, feed_url, active, last_sync')
      .order('country_code');

    if (!configs) return [];

    const { data: lastSyncs } = await supabase
      .from('feed_sync_log')
      .select('country_code, completed_at, properties_total, status')
      .order('completed_at', { ascending: false })
      .limit(1000);

    const latestByCountry = new Map<string, { completed_at: string; properties_total: number; status: string }>();
    for (const row of (lastSyncs ?? []) as Array<{ country_code: string; completed_at: string; properties_total: number; status: string }>) {
      if (!latestByCountry.has(row.country_code)) latestByCountry.set(row.country_code, row);
    }

    return configs.map((cfg) => {
      const last = latestByCountry.get(cfg.country_code);
      let status: 'live' | 'beta' | 'stub';
      if (last && (last.properties_total ?? 0) >= 50) status = 'live';
      else if (last && (last.properties_total ?? 0) > 0) status = 'beta';
      else status = 'stub';
      return {
        country_code: cfg.country_code,
        country_name: cfg.country_name ?? cfg.country_code,
        portal_name: cfg.portal_name,
        feed_url: cfg.feed_url,
        status,
        last_sync_at: last?.completed_at ?? null,
        property_count: last?.properties_total ?? 0,
        last_sync_status: last?.status ?? null,
        active: cfg.active,
      };
    });
  } catch {
    return [];
  }
}

const FLAGS: Record<string, string> = {
  ES: '🇪🇸', PT: '🇵🇹', FR: '🇫🇷', DE: '🇩🇪', NL: '🇳🇱', IT: '🇮🇹', GR: '🇬🇷', CY: '🇨🇾',
  HR: '🇭🇷', MT: '🇲🇹', AT: '🇦🇹', BE: '🇧🇪', SE: '🇸🇪', DK: '🇩🇰', FI: '🇫🇮', IE: '🇮🇪',
  LU: '🇱🇺', PL: '🇵🇱', CZ: '🇨🇿', SK: '🇸🇰', HU: '🇭🇺', RO: '🇷🇴', BG: '🇧🇬', SI: '🇸🇮',
  EE: '🇪🇪', LV: '🇱🇻', LT: '🇱🇹',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  live: { bg: 'hsl(var(--av-success) / 0.15)', color: 'hsl(var(--av-success))',           label: 'LIVE' },
  beta: { bg: 'hsl(var(--av-warning) / 0.15)', color: 'hsl(var(--av-warning))',           label: 'BETA' },
  stub: { bg: 'hsl(var(--av-muted) / 0.4)',    color: 'hsl(var(--av-muted-foreground))', label: 'PIPELINE' },
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (ageH < 1) return `${Math.round(ageH * 60)} min ago`;
  if (ageH < 24) return `${Math.round(ageH)}h ago`;
  return `${Math.round(ageH / 24)}d ago`;
}

export default async function EuCoveragePage() {
  const rows = await loadCoverage();
  const liveCount = rows.filter((r) => r.status === 'live').length;
  const betaCount = rows.filter((r) => r.status === 'beta').length;
  const totalProps = rows.reduce((s, r) => s + r.property_count, 0);

  return (
    <div className="avena-v2 min-h-screen" style={{ background: 'hsl(var(--av-background))', color: 'hsl(var(--av-foreground))' }}>
      <header className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
          <Link href="/" className="font-serif text-2xl tracking-tight">AVENA</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/data-partners">Partners</Link>
            <Link href="/standards/apip-v1.json" target="_blank">APIP</Link>
            <Link href="/institutional">Institutional</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14">
        <span className="inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
          EU coverage · APIP v1.0 · Updated daily 03:00 UTC
        </span>
        <h1 className="font-serif text-5xl md:text-6xl leading-tight font-light mb-4">
          The unified <span className="italic text-gold">data layer</span> for European property.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground mb-3">
          Avena Terminal indexes every EU property market at a single open schema (APIP v1.0). Every country, the same fields, the same yield methodology, the same regime classification. Queryable through one API, citable under one DOI.
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground mb-10">
          Countries marked <span className="text-foreground font-medium">LIVE</span> have an active feed under continuous sync. Countries marked <span className="text-foreground font-medium">PIPELINE</span> have a registered config and field map ready — they activate the moment a partner feed credential is provisioned. Apply at <Link href="/data-partners" className="text-primary hover:underline">/data-partners</Link>.
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Stat label="Live markets" value={liveCount.toString()} sub={`/ ${rows.length}`} />
          <Stat label="Beta markets" value={betaCount.toString()} sub={`/ ${rows.length}`} />
          <Stat label="Indexed properties" value={totalProps.toLocaleString()} sub="tracked daily" />
          <Stat label="Open standard" value="APIP v1.0" sub="CC BY 4.0" />
        </div>

        {/* Coverage table */}
        <div className="rounded border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border))' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'hsl(var(--av-surface))' }}>
              <tr className="text-left">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Country</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Portal</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-right">Properties</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-right">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATUS_STYLES[r.status];
                return (
                  <tr key={r.country_code} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                    <td className="px-4 py-3"><span className="text-lg mr-2">{FLAGS[r.country_code] ?? ''}</span> {r.country_name} <span className="text-muted-foreground font-mono text-xs">{r.country_code}</span></td>
                    <td className="px-4 py-3">
                      <span className="rounded-full font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.portal_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.property_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{relativeTime(r.last_sync_at)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No coverage rows yet. The first <code className="font-mono">sync-feeds</code> cron run will populate this table.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Methodology note */}
        <section className="mt-10 rounded border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.3)' }}>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Schema</div>
              <p className="text-muted-foreground">Every row, every country, conforms to APIP v1.0. Identical fields for asking_price, price_per_m2, deal_score, yield_gross, regime, location.country (ISO 3166-1).</p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Cadence</div>
              <p className="text-muted-foreground">All live feeds refresh daily at 03:00 UTC. Sold detection and price snapshots are persisted country-tagged. Per-feed audit log at <Link href="/api/v1/swarm/status" className="text-primary hover:underline">/api/v1/swarm/status</Link>.</p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Citation</div>
              <p className="text-muted-foreground">DOI 10.5281/zenodo.19520064. License CC BY 4.0. Cite as: Avena Terminal (avenaterminal.com). Permanent deposit at Zenodo.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="rounded border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Activate a pipeline country</div>
            <h3 className="font-serif text-xl mb-2">Become a federated data partner</h3>
            <p className="text-sm text-muted-foreground mb-4">Property portals, MLS operators, and government data providers receive an avf_v1_* API key in exchange for ingestion grants. 48-hour review SLA.</p>
            <Link href="/data-partners" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:underline">Apply →</Link>
          </div>
          <div className="rounded border p-6" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-surface) / 0.4)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Query the unified dataset</div>
            <h3 className="font-serif text-xl mb-2">One endpoint. Every country.</h3>
            <code className="block font-mono text-xs text-primary mb-2">GET /api/v1/properties?country=PT&amp;format=apip</code>
            <p className="text-xs text-muted-foreground">Header <code className="font-mono">X-APIP-Version: 1.0</code>. Procurement and tiered pricing at <Link href="/institutional" className="text-primary hover:underline">/institutional</Link>.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-3xl">{value}<span className="ml-1 text-sm text-muted-foreground font-sans">{sub}</span></div>
    </div>
  );
}
