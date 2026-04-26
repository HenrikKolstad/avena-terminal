import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { Shield, AlertTriangle, Send, CheckCircle2, FileText, Clock, ArrowUpRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Mission {
  id: number;
  status: string;
  brief: Record<string, unknown>;
  matches: Array<{ ref: string; project: string; price: number; score: number; fit_score: number }>;
  outreach: Array<{ ref: string; to_email: string; subject: string; body: string }>;
  user_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: number;
  occurred_at: string;
  actor: string;
  event_type: string;
  property_ref: string | null;
  to_email: string | null;
  subject: string | null;
  signature: string | null;
  prev_signature: string | null;
  avp_doc: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

async function loadMission(id: number): Promise<{ mission: Mission | null; events: Event[] }> {
  if (!supabase) return { mission: null, events: [] };
  try {
    const [missionRes, eventsRes] = await Promise.all([
      supabase
        .from('agent_missions')
        .select('id, status, brief, matches, outreach, user_email, notes, created_at, updated_at')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('mission_events')
        .select('id, occurred_at, actor, event_type, property_ref, to_email, subject, signature, prev_signature, avp_doc, metadata')
        .eq('mission_id', id)
        .order('occurred_at', { ascending: true }),
    ]);
    return {
      mission: (missionRes.data as Mission | null) ?? null,
      events: (eventsRes.data as Event[]) ?? [],
    };
  } catch {
    return { mission: null, events: [] };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Mission AVN-MIS-${id} — Avena Agent | Avena Terminal`,
    description: `Public audit trail for Avena Agent mission ${id}. AVP-signed events, hash-chained, cryptographically verifiable.`,
    alternates: { canonical: `https://avenaterminal.com/agent/mission/${id}` },
    openGraph: {
      title: `Mission AVN-MIS-${id} — Avena Agent`,
      description: 'AVP-signed autonomous property mission. Public audit trail.',
    },
  };
}

const EVENT_META: Record<string, { label: string; color: string; icon: typeof Send }> = {
  mission_created:    { label: 'Mission created',     color: 'hsl(var(--av-muted-foreground))', icon: FileText },
  outreach_drafted:   { label: 'Outreach drafted',    color: 'hsl(var(--av-warning))',          icon: FileText },
  outreach_sent:      { label: 'Outreach sent',       color: 'hsl(var(--av-primary))',          icon: Send },
  send_failed:        { label: 'Send failed',         color: 'hsl(var(--av-destructive))',      icon: AlertTriangle },
  reply_received:     { label: 'Reply received',      color: 'hsl(var(--av-warning))',          icon: ArrowUpRight },
  offer_signed:       { label: 'Offer signed',        color: 'hsl(var(--av-primary))',          icon: Shield },
  counter_signed:     { label: 'Counter signed',      color: 'hsl(var(--av-warning))',          icon: Shield },
  closed:             { label: 'Mission closed',      color: 'hsl(var(--av-primary))',          icon: CheckCircle2 },
  aborted:            { label: 'Mission aborted',     color: 'hsl(var(--av-destructive))',      icon: AlertTriangle },
};

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (!id || Number.isNaN(id)) notFound();

  const { mission, events } = await loadMission(id);
  if (!mission) notFound();

  const sentCount = events.filter((e) => e.event_type === 'outreach_sent').length;
  const failedCount = events.filter((e) => e.event_type === 'send_failed').length;
  const avpCount = events.filter((e) => e.avp_doc).length;
  const lastSignature = [...events].reverse().find((e) => e.signature)?.signature ?? null;

  const brief = mission.brief as {
    budget_max_eur?: number;
    regions?: string[];
    property_types?: string[];
    min_beds?: number;
    min_score?: number;
    buyer_persona?: string;
    buyer_nationality?: string;
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    name: `Avena Agent Mission AVN-MIS-${id}`,
    datePublished: mission.created_at,
    dateModified: mission.updated_at,
    url: `https://avenaterminal.com/agent/mission/${id}`,
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-14 sm:py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Agent · public mission record · AVP v1.0
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-foreground mb-3 break-words" style={{ overflowWrap: 'anywhere' }}>
              Mission <span className="italic text-gold">AVN-MIS-{id}</span>.
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Status: <span className="text-primary">{mission.status}</span>
              <span className="mx-2">·</span>
              Created {new Date(mission.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              <span className="mx-2">·</span>
              {events.length} event{events.length === 1 ? '' : 's'}
            </p>

            {mission.notes && (
              <p className="mt-6 font-serif text-lg sm:text-xl text-foreground/90 leading-relaxed max-w-2xl">
                {mission.notes}
              </p>
            )}
          </div>
        </section>

        {/* Stat strip */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              {[
                { label: 'Matches', value: String(mission.matches?.length ?? 0) },
                { label: 'Outreach sent', value: String(sentCount) },
                { label: 'AVP docs signed', value: String(avpCount), accent: avpCount > 0 },
                { label: 'Failed retries', value: String(failedCount) },
              ].map((s) => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                  <div className={`mt-2 font-serif font-light tabular text-3xl ${s.accent ? 'text-primary' : 'text-foreground'}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {lastSignature && (
              <div className="mt-4 rounded-sm border p-4 flex flex-wrap items-center gap-3 font-mono text-[11px]"
                style={{ background: 'hsl(var(--av-surface) / 0.5)', borderColor: 'hsl(var(--av-primary) / 0.3)' }}
              >
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground uppercase tracking-[0.22em] text-[9px]">Latest chain head</span>
                <span className="text-foreground break-all" style={{ overflowWrap: 'anywhere' }}>{lastSignature}</span>
                <Link
                  href={`/standards/avp/verify?sig=${lastSignature}`}
                  className="ml-auto text-primary hover:text-gold flex items-center gap-1 uppercase tracking-[0.22em] text-[9px]"
                >
                  Verify <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Brief */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-10">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">
              Buyer <span className="italic text-gold">brief</span>.
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ['Budget max', brief.budget_max_eur ? `€${fmt(brief.budget_max_eur)}` : '—'],
                ['Min beds', brief.min_beds ?? '—'],
                ['Min score', brief.min_score ?? '—'],
                ['Persona', brief.buyer_persona ?? '—'],
                ['Nationality', brief.buyer_nationality ?? '—'],
                ['Regions', (brief.regions ?? []).join(', ') || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-sm border p-3" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.5)' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Event timeline */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12 py-10">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">
              Hash-chained <span className="italic text-gold">audit trail</span>.
            </h2>

            {events.length === 0 ? (
              <div className="rounded-sm border p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                No events recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((e, i) => {
                  const meta = EVENT_META[e.event_type] ?? { label: e.event_type, color: 'hsl(var(--av-muted-foreground))', icon: Clock };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={e.id}
                      className="rounded-sm border p-4"
                      style={{
                        background: 'hsl(var(--av-surface) / 0.4)',
                        borderColor: e.event_type === 'outreach_sent' ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-border) / 0.5)',
                      }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                          <span className="font-mono text-xs uppercase tracking-[0.22em]" style={{ color: meta.color }}>
                            #{i + 1} · {meta.label}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            by {e.actor}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {new Date(e.occurred_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                        </span>
                      </div>

                      {(e.property_ref || e.to_email || e.subject) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 font-mono text-[11px]">
                          {e.property_ref && (
                            <div>
                              <span className="text-muted-foreground uppercase tracking-[0.18em] text-[9px]">Property</span>
                              <div className="text-foreground break-all" style={{ overflowWrap: 'anywhere' }}>{e.property_ref}</div>
                            </div>
                          )}
                          {e.to_email && (
                            <div>
                              <span className="text-muted-foreground uppercase tracking-[0.18em] text-[9px]">Recipient</span>
                              <div className="text-foreground break-all" style={{ overflowWrap: 'anywhere' }}>{e.to_email}</div>
                            </div>
                          )}
                          {e.subject && (
                            <div>
                              <span className="text-muted-foreground uppercase tracking-[0.18em] text-[9px]">Subject</span>
                              <div className="text-foreground break-words">{e.subject}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {e.signature && (
                        <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2 font-mono text-[10px]" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                          <Shield className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-muted-foreground uppercase tracking-[0.22em] text-[9px]">SHA-256</span>
                          <span className="text-foreground/85 break-all" style={{ overflowWrap: 'anywhere' }}>{e.signature}</span>
                          <Link
                            href={`/standards/avp/verify?sig=${e.signature}`}
                            className="ml-auto text-primary hover:text-gold uppercase tracking-[0.22em] text-[9px] flex items-center gap-1 shrink-0"
                          >
                            Verify <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Footer note */}
        <section className="py-12">
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              This page is publicly verifiable · cryptographic chain · CC BY 4.0 ·{' '}
              <Link href="/standards/avp" className="text-primary hover:text-gold">AVP v1.0</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
