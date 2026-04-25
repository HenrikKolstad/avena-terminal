import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { INGESTION_SWARM, agentStatus, todayCount, recentActivity, totalsToday, type IngestionAgent } from './_agents';
import { TickClient } from './TickClient';
import { WarRoomClock } from './WarRoomClock';
import { EuropeMap } from './EuropeMap';

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

export default function EUTakeoverPage() {
  const now = new Date();
  const totals = totalsToday(now);
  const activity = recentActivity(now, 28);

  const byCountry = INGESTION_SWARM.reduce<Record<string, IngestionAgent[]>>((acc, a) => {
    if (!acc[a.country]) acc[a.country] = [];
    acc[a.country].push(a);
    return acc;
  }, {});

  const coverage = Object.entries(byCountry).map(([country, agents]) => ({
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

            <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-light leading-[0.92] tracking-tight text-foreground mb-6">
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
              <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Theatre <span className="italic text-gold">of operations</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Pings = active scans · gold = ≥80% covered
              </span>
            </div>
            <EuropeMap countries={coverage} />
          </div>
        </section>

        {/* Coverage progress */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
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

        {/* Campaign timeline */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-8">
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
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                Active <span className="italic text-gold">agents</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {INGESTION_SWARM.filter((a) => a.active).length} live · {INGESTION_SWARM.filter((a) => !a.active).length} roadmap
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INGESTION_SWARM.map((agent) => {
                const { status, nextRunMin } = agentStatus(agent, now);
                const count = todayCount(agent, now);
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
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                Operations <span className="italic text-gold">feed</span>.
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Last 3 hours
              </span>
            </div>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ background: 'hsl(32 14% 9%)', borderColor: 'hsl(var(--av-border-strong))' }}
            >
              <div className="px-4 py-2 border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground flex justify-between" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.5)' }}>
                <span>$ tail -f /var/log/avena/ingestion.log</span>
                <span className="text-primary">{activity.length} events</span>
              </div>
              {activity.length === 0 ? (
                <div className="p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Quiet window — agents on next-cron-tick rotation.
                </div>
              ) : (
                activity.map((e, i) => (
                  <div
                    key={i}
                    className="px-4 py-1.5 border-b flex items-center gap-3 font-mono text-[12px] hover:bg-primary/5 transition-colors"
                    style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}
                  >
                    <span className="text-muted-foreground tabular w-12 text-right shrink-0">
                      {e.minutesAgo === 0 ? 'now' : `T-${String(e.minutesAgo).padStart(2, '0')}m`}
                    </span>
                    <span className="text-base shrink-0">{e.flag}</span>
                    <span className="text-foreground/90 truncate">
                      <span className="text-primary">{e.agent}</span>
                      <span className="text-muted-foreground"> // </span>
                      <span style={{ color: e.action === 'ingested' ? 'hsl(var(--av-primary))' : e.action === 'scored' ? 'hsl(var(--av-warning))' : 'hsl(var(--av-foreground))' }}>{e.action.toUpperCase()}</span>
                      <span className="text-muted-foreground"> </span>
                      <span className="text-foreground">{e.count}</span>
                      <span className="text-muted-foreground"> from </span>
                      <span className="text-foreground">{e.source}</span>
                      <span className="text-muted-foreground"> · {e.region}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* What this proves */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">For institutions</span>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-6">
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
