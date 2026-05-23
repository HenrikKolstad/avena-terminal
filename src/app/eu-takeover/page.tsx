import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LiveTransactionsTicker } from '@/components/v2/LiveTransactionsTicker';
import { INGESTION_SWARM, agentStatus, type IngestionAgent } from '@/lib/ingestion-swarm';
import { TickClient } from './TickClient';
import { WarRoomClock } from './WarRoomClock';
import { EuropeMap } from './EuropeMap';
import { MissionControlBar } from './MissionControlBar';
import { DealFlowTicker } from './DealFlowTicker';
import { totalFindings, findingsRecent, findingsByCountry, findingsByAgent, findingsLatest } from '@/lib/findings';
import { supabase } from '@/lib/supabase';

interface RegistryStats {
  total: number;
  cadastralVerified: number;
  osmMatched: number;
  transactionRecords: number;
  marketContextPopulated: number;
  perCountry: Array<{ country: string; count: number; portals: number }>;
  topMunicipalities: Array<{ municipality: string; country: string; count: number }>;
}

async function loadRegistryStats(): Promise<RegistryStats> {
  const empty: RegistryStats = {
    total: 0, cadastralVerified: 0, osmMatched: 0, transactionRecords: 0,
    marketContextPopulated: 0, perCountry: [], topMunicipalities: [],
  };
  if (!supabase) return empty;
  try {
    const [totalRes, cadRes, osmRes, txRes, mktRes, byCountryRes, byMuniRes] = await Promise.all([
      supabase.from('properties_registry').select('avn_prop_id', { count: 'exact', head: true }),
      supabase.from('properties_registry').select('avn_prop_id', { count: 'exact', head: true }).not('cadastral_ref', 'is', null),
      supabase.from('properties_registry').select('avn_prop_id', { count: 'exact', head: true }).not('osm_id', 'is', null),
      supabase.from('property_transactions').select('id', { count: 'exact', head: true }),
      supabase.from('property_market').select('avn_prop_id', { count: 'exact', head: true }),
      supabase.from('properties_coverage').select('*'),
      supabase.from('properties_registry').select('municipality, country').not('municipality', 'is', null).limit(5000),
    ]);

    const muniCounts = new Map<string, { count: number; country: string }>();
    for (const r of (byMuniRes.data ?? []) as Array<{ municipality: string; country: string }>) {
      const key = `${r.country}|${r.municipality}`;
      const cur = muniCounts.get(key) ?? { count: 0, country: r.country };
      muniCounts.set(key, { count: cur.count + 1, country: r.country });
    }
    const topMunicipalities = [...muniCounts.entries()]
      .map(([key, v]) => ({ municipality: key.split('|')[1], country: v.country, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const countryRollup = new Map<string, { count: number; portals: Set<string> }>();
    for (const r of (byCountryRes.data ?? []) as Array<{ country: string; record_count: number; source_portal: string }>) {
      const cur = countryRollup.get(r.country) ?? { count: 0, portals: new Set() };
      cur.count += r.record_count;
      cur.portals.add(r.source_portal);
      countryRollup.set(r.country, cur);
    }
    const perCountry = [...countryRollup.entries()]
      .map(([country, v]) => ({ country, count: v.count, portals: v.portals.size }))
      .sort((a, b) => b.count - a.count);

    return {
      total: totalRes.count ?? 0,
      cadastralVerified: cadRes.count ?? 0,
      osmMatched: osmRes.count ?? 0,
      transactionRecords: txRes.count ?? 0,
      marketContextPopulated: mktRes.count ?? 0,
      perCountry,
      topMunicipalities,
    };
  } catch {
    return empty;
  }
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'EU Takeover — Avena ingestion swarm, live | Avena Terminal',
  description: 'Avena\'s ingestion swarm scanning every European new-build in real time. War-room dashboard for institutions. 14 agents. 5 countries active. Spain 100% scored, Portugal advancing, France + Italy onboarding.',
  alternates: { canonical: 'https://avenaterminal.com/eu-takeover' },
  openGraph: {
    title: 'EU Takeover — Avena is mapping every new-build in Europe',
    description: 'Live ingestion swarm. War-room dashboard for institutions.',
    url: 'https://avenaterminal.com/eu-takeover',
  },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  scanning: { label: 'SCANNING', color: 'hsl(var(--av-primary))' },
  scoring:  { label: 'SCORING',  color: 'hsl(var(--av-warning))' },
  indexed:  { label: 'INDEXED',  color: 'hsl(var(--av-primary))' },
  queued:   { label: 'QUEUED',   color: 'hsl(var(--av-muted-foreground))' },
};

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

interface CampaignMilestone {
  quarter: string;
  label: string;
  status: 'shipped' | 'in-flight' | 'planned';
  detail: string;
}

const CAMPAIGN: CampaignMilestone[] = [
  { quarter: 'Q1 2026', label: 'Spain — 100% scored',         status: 'shipped',   detail: '1,881 new-builds · 30+ towns · daily refresh' },
  { quarter: 'Q2 2026', label: 'Portugal — onboarding',       status: 'in-flight', detail: 'Algarve · Lisbon · Porto · 51% indexed' },
  { quarter: 'Q2 2026', label: 'France beachhead',            status: 'in-flight', detail: 'Côte d\'Azur + Paris metro entering pipeline' },
  { quarter: 'Q3 2026', label: 'Cadastral Atlas v2',          status: 'planned',   detail: 'Catastro + AT join — every parcel in Iberia scored' },
  { quarter: 'Q3 2026', label: 'Italy expansion',             status: 'planned',   detail: 'Milan · Lakes · Italian Riviera · Roma' },
  { quarter: 'Q4 2026', label: 'RICS Tech conference debut',  status: 'planned',   detail: 'November stage · standards working group pitch' },
  { quarter: '2027',    label: 'Scandinavia activation',      status: 'planned',   detail: 'SE · DK · NO · FI · cold-market pioneer agents' },
];

export default async function EUTakeoverPage() {
  const now = new Date();

  // REAL data from the findings ledger + properties registry
  const [allTime, last24, byCountry, byAgent, latest, registryStats] = await Promise.all([
    totalFindings(),
    findingsRecent(24),
    findingsByCountry(24),
    findingsByAgent(24),
    findingsLatest(28),
    loadRegistryStats(),
  ]);

  const totals = {
    allTime,
    ingested: last24.ingested,
    scored: last24.scored,
    countriesActive: Math.max(1, Object.keys(byCountry).length),
    agentsLive: INGESTION_SWARM.filter((a) => a.active).length,
  };

  const agentsByCountry = INGESTION_SWARM.reduce<Record<string, IngestionAgent[]>>((acc, a) => {
    if (!acc[a.country]) acc[a.country] = [];
    acc[a.country].push(a);
    return acc;
  }, {});

  const coverage = Object.entries(agentsByCountry).map(([country, agents]) => ({
    name: country,
    flag: agents[0].flag,
    pct: Math.round(agents.reduce((s, a) => s + a.scope_pct, 0) / agents.length),
    agents: agents.length,
    active: agents.some((a) => a.active),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'EU Takeover — Avena Ingestion Swarm War Room',
    description: 'Live operations dashboard tracking Avena\'s European property data ingestion across 5 active countries and 14 agents. Public, audit-ready, CC BY 4.0.',
    url: 'https://avenaterminal.com/eu-takeover',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <MissionControlBar />
        <LiveTransactionsTicker />
        <DealFlowTicker />
        {/* HERO — operations clock + manifesto */}
        <section
          className="border-b relative overflow-hidden"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'linear-gradient(180deg, hsl(32 14% 8%) 0%, hsl(32 14% 11%) 100%)' }}
        >
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14 sm:py-20">
            <div className="flex items-center gap-3 mb-8 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--av-primary))' }} />
              War room · campaign 2026 · day 1 of European property
            </div>

            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
              EU <span className="italic text-gold">takeover</span>.
            </h1>

            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground font-light mb-10">
              Avena&apos;s ingestion swarm is mapping every new-build property in
              Europe. Live counters, audit trail, no marketing fluff. Refresh
              the page — the numbers move.
            </p>

            <WarRoomClock />
          </div>
        </section>

        {/* Live counters — big number reveal */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">
              Today&apos;s output
            </div>
            <TickClient initial={totals} />
          </div>
        </section>

        {/* WAR-ROOM MAP */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="font-serif text-2xl sm:text-4xl font-light tracking-tight text-foreground">
                Theatre <span className="italic text-gold">of operations</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Live · ranked by 24h ingestion velocity
              </span>
            </div>
            <EuropeMap countries={coverage} byAgent={byAgent} />
          </div>
        </section>

        {/* Coverage progress */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                Country <span className="italic text-gold">coverage</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Compounds · never resets
              </span>
            </div>
            <div className="space-y-5">
              {coverage.map((c) => (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-serif text-base sm:text-lg text-foreground flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                      {!c.active && <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground ml-2">roadmap</span>}
                    </span>
                    <span className="font-mono tabular text-sm text-primary">{c.pct}% · {c.agents} {c.agents === 1 ? 'agent' : 'agents'}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
                    <div
                      style={{
                        width: `${c.pct}%`,
                        height: '100%',
                        background: c.pct >= 80 ? 'linear-gradient(90deg, hsl(42 85% 64%) 0%, hsl(42 95% 72%) 100%)' : c.pct >= 30 ? 'hsl(var(--av-warning))' : 'hsl(var(--av-muted-foreground))',
                        transition: 'width 0.6s ease',
                        boxShadow: c.pct >= 80 ? '0 0 12px hsl(42 85% 64% / 0.5)' : 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Property registry depth — institutional inventory */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Property <span className="italic text-gold">registry</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Canonical AVN_PROP_ID · cadastrally verified · CC BY 4.0
              </span>
            </div>

            {/* Hero counters */}
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px overflow-hidden rounded-sm border mb-6"
              style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'Properties', value: fmt(registryStats.total), accent: true },
                { label: 'Cadastral verified', value: fmt(registryStats.cadastralVerified) },
                { label: 'OSM matched', value: fmt(registryStats.osmMatched) },
                { label: 'Transactions', value: fmt(registryStats.transactionRecords) },
                { label: 'Market context', value: fmt(registryStats.marketContextPopulated) },
              ].map((s) => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                  <div className={`mt-2 font-serif font-light tabular text-3xl sm:text-4xl leading-none ${s.accent ? 'text-primary' : 'text-foreground'}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Per-country + top-municipalities side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div
                className="rounded-sm border overflow-hidden"
                style={{ background: '#100E0C', borderColor: 'hsl(var(--av-border-strong))' }}
              >
                <div
                  className="px-4 py-2.5 border-b font-mono text-[9px] uppercase tracking-[0.3em] text-primary"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}
                >
                  Records by country
                </div>
                {registryStats.perCountry.length === 0 ? (
                  <div className="p-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Registry seed pending
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    {registryStats.perCountry.map((c) => (
                      <div
                        key={c.country}
                        className="px-4 py-3 grid grid-cols-[36px_1fr_auto] items-center gap-3"
                        style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}
                      >
                        <div className="font-mono text-[11px] tabular text-center py-1 rounded-sm border text-primary"
                          style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', background: 'hsl(var(--av-primary) / 0.08)' }}
                        >
                          {c.country}
                        </div>
                        <div className="font-mono text-xs text-foreground/85">
                          {c.portals} portal{c.portals === 1 ? '' : 's'}
                        </div>
                        <div className="font-mono tabular text-sm text-foreground text-right">
                          {fmt(c.count)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-sm border overflow-hidden"
                style={{ background: '#100E0C', borderColor: 'hsl(var(--av-border-strong))' }}
              >
                <div
                  className="px-4 py-2.5 border-b font-mono text-[9px] uppercase tracking-[0.3em] text-primary"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}
                >
                  Deepest municipalities
                </div>
                {registryStats.topMunicipalities.length === 0 ? (
                  <div className="p-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Registry seed pending
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    {registryStats.topMunicipalities.map((m, i) => (
                      <div
                        key={`${m.country}-${m.municipality}`}
                        className="px-4 py-2.5 grid grid-cols-[24px_1fr_auto] items-center gap-3"
                      >
                        <span className="font-mono text-[10px] tabular text-muted-foreground text-right">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-xs text-foreground/90 truncate">
                          {m.country} · {m.municipality}
                        </span>
                        <span className="font-mono tabular text-sm text-foreground">
                          {fmt(m.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Per-property institutional data sheets at{' '}
              <span className="text-foreground">/property/&#123;ref&#125;/data-sheet</span>
              {' '}· bundled API at{' '}
              <span className="text-foreground">/api/v1/property/&#123;avn_prop_id&#125;</span>
            </p>
          </div>
        </section>

        {/* Campaign timeline */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-8">
              Campaign <span className="italic text-gold">timeline</span>.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CAMPAIGN.map((m) => {
                const color =
                  m.status === 'shipped' ? 'hsl(var(--av-primary))' :
                  m.status === 'in-flight' ? 'hsl(var(--av-warning))' :
                  'hsl(var(--av-muted-foreground))';
                return (
                  <div
                    key={m.label}
                    className="rounded-sm border p-4"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{m.quarter}</span>
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.22em]"
                        style={{
                          color,
                          background: `${color.replace(')', ' / 0.1)')}`,
                          padding: '2px 6px',
                          border: `1px solid ${color.replace(')', ' / 0.4)')}`,
                        }}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="font-serif text-lg text-foreground leading-tight mb-2">{m.label}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed">
                      {m.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mission map — agent grid */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                Active <span className="italic text-gold">agents</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {INGESTION_SWARM.filter((a) => a.active).length} live · {INGESTION_SWARM.filter((a) => !a.active).length} roadmap
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INGESTION_SWARM.map((agent) => {
                const { status, nextRunMin } = agentStatus(agent, now);
                const count = byAgent[agent.id] ?? 0;
                const meta = STATUS_META[status];
                const inactive = !agent.active;
                return (
                  <div
                    key={agent.id}
                    className="rounded-sm border p-4 transition-colors"
                    style={{
                      background: inactive ? 'hsl(var(--av-surface) / 0.2)' : 'hsl(var(--av-surface) / 0.4)',
                      borderColor: inactive ? 'hsl(var(--av-border) / 0.4)' : 'hsl(var(--av-border) / 0.6)',
                      opacity: inactive ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="font-serif text-base text-foreground flex items-center gap-2">
                          <span>{agent.flag}</span>{agent.name}
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                          {agent.region}
                        </div>
                      </div>
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 border whitespace-nowrap"
                        style={{
                          color: meta.color,
                          borderColor: `${meta.color.replace(')', ' / 0.4)')}`,
                          background: `${meta.color.replace(')', ' / 0.08)')}`,
                        }}
                      >
                        {inactive ? 'ROADMAP' : meta.label}
                      </span>
                    </div>

                    {!inactive && (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Today</div>
                            <div className="font-mono tabular text-sm text-foreground">{fmt(count)} listings</div>
                          </div>
                          <div>
                            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Next run</div>
                            <div className="font-mono tabular text-sm text-foreground">
                              {nextRunMin <= 0 ? 'now' : `${nextRunMin}m`}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground border-t pt-2" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                          Sources: {agent.sources.join(' · ')}
                        </div>
                      </>
                    )}
                    {inactive && (
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Activation Q3 2026
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live activity feed — terminal style */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-light tracking-tight text-foreground">
                Operations <span className="italic text-gold">feed</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Last 3 hours
              </span>
            </div>
            <div
              className="rounded-sm border overflow-x-auto"
              style={{ background: 'hsl(32 14% 9%)', borderColor: 'hsl(var(--av-border-strong))' }}
            >
              <div className="px-4 py-2 border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground flex justify-between" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}>
                <span>$ tail -f /var/log/avena/ingestion.log</span>
                <span className="text-primary">{latest.length} events · all-time {allTime.toLocaleString()}</span>
              </div>
              {latest.length === 0 ? (
                <div className="p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  First ingestion tick lands at 12:30 UTC daily — counter starts climbing then.
                </div>
              ) : (
                latest.map((e) => {
                  const ago = Math.floor((now.getTime() - new Date(e.recorded_at).getTime()) / 60000);
                  const flag = e.country === 'Spain' ? '🇪🇸' : e.country === 'Portugal' ? '🇵🇹' : e.country === 'France' ? '🇫🇷' : e.country === 'Italy' ? '🇮🇹' : e.country === 'Greece' ? '🇬🇷' : '🇪🇺';
                  return (
                    <div
                      key={e.id}
                      className="px-4 py-1.5 border-b flex items-center gap-3 font-mono text-[12px] hover:bg-primary/5 transition-colors"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}
                    >
                      <span className="text-muted-foreground tabular w-12 text-right shrink-0">
                        {ago <= 0 ? 'now' : `T-${String(Math.min(ago, 999)).padStart(2, '0')}m`}
                      </span>
                      <span className="text-base shrink-0">{flag}</span>
                      <span className="text-foreground/90 truncate">
                        <span className="text-primary">{e.agent_name ?? e.agent_id}</span>
                        <span className="text-muted-foreground"> // </span>
                        <span style={{ color: e.action === 'ingested' ? 'hsl(var(--av-primary))' : e.action === 'scored' ? 'hsl(var(--av-warning))' : 'hsl(var(--av-foreground))' }}>{e.action.toUpperCase()}</span>
                        {e.property_ref && <span className="text-foreground"> {e.property_ref}</span>}
                        {e.score != null && <span className="text-foreground"> @ {e.score}</span>}
                        {e.source && <><span className="text-muted-foreground"> from </span><span className="text-foreground">{e.source}</span></>}
                        {e.region && <span className="text-muted-foreground"> · {e.region}</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* What this proves */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">For institutions</span>
            <h2 className="mt-3 font-serif text-2xl sm:text-4xl font-light tracking-tight text-foreground mb-6">
              What this <span className="italic text-gold">proves</span>.
            </h2>
            <div className="space-y-5 text-base text-foreground/90 font-light leading-relaxed">
              <p>
                Most PropTech pitches arrive as decks. This is not a deck. The
                counters above are computed from agents on cron schedules,
                writing into a canonical registry that&apos;s already powering
                publicly-cited indices and a peer-reviewable methodology.
              </p>
              <p>
                Spain reached 100% scored coverage in Q1 2026. Portugal closes
                in this quarter. France and Italy are onboarding. By the time
                Avena meets you across a table, the next country on the
                roadmap is half-done.
              </p>
              <p className="text-muted-foreground">
                Every ingestion event is signed, timestamped, and queryable.
                We can produce a per-property provenance chain on request.
                The methodology is open under MIT (engine) and CC BY 4.0
                (data). The terminal is RICS-credentialed.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/institutional"
                className="inline-flex items-center rounded-sm px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                Institutional API access →
              </Link>
              <Link
                href="/research/avena-score"
                className="inline-flex items-center rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                Methodology paper →
              </Link>
              <Link
                href="/standards/avp"
                className="inline-flex items-center rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground hover:border-primary"
                style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                AVP open protocol →
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            CC BY 4.0 · DOI 10.5281/zenodo.19520064 · Official RICS Tech Partner 2026 · No human bottleneck
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
