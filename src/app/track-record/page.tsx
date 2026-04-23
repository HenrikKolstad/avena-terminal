import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { DataFreshness } from '@/components/v2/DataFreshness';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Track Record — Honest Prediction Hit Rate | Avena Terminal',
  description:
    'Every prediction Avena has made, verified and unverified. No cherry-picking. Hit rate calculated from resolved forecasts only.',
  alternates: { canonical: 'https://avenaterminal.com/track-record' },
  openGraph: {
    title: 'Avena Terminal — Prediction Track Record',
    description: 'Every call. Every outcome. No cherry-picking.',
    url: 'https://avenaterminal.com/track-record',
    siteName: 'Avena Terminal',
  },
};

interface PredictionRow {
  id: string | number;
  title?: string | null;
  target?: string | null;
  horizon?: string | null;
  confidence?: number | null;
  outcome?: 'hit' | 'miss' | 'partial' | null;
  status?: string | null;
  published_at?: string | null;
  resolved_at?: string | null;
  submitter?: string | null;
}

async function loadPredictions(): Promise<PredictionRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('id, title, target, horizon, confidence, outcome, status, published_at, resolved_at, submitter')
      .order('published_at', { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return data as PredictionRow[];
  } catch {
    return [];
  }
}

export default async function TrackRecordPage() {
  const all = await loadPredictions();
  const resolved = all.filter((p) => p.status === 'verified' || p.outcome != null);
  const hits = resolved.filter((p) => p.outcome === 'hit').length;
  const misses = resolved.filter((p) => p.outcome === 'miss').length;
  const partials = resolved.filter((p) => p.outcome === 'partial').length;
  const active = all.filter((p) => p.status === 'active').length;

  const hitRate = resolved.length > 0 ? Math.round((hits / resolved.length) * 100) : null;
  const avgConf = resolved.length > 0
    ? Math.round((resolved.reduce((s, p) => s + (p.confidence ?? 0), 0) / resolved.length) * 100)
    : null;

  // Schema.org Dataset for LLM discoverability
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Avena Terminal Prediction Track Record',
    description: `Honest hit rate across ${resolved.length} resolved predictions.`,
    url: 'https://avenaterminal.com/track-record',
    creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    keywords: ['property predictions', 'real estate forecast', 'track record', 'hit rate'],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Public track record · No cherry-picking
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Every call.
              <br />
              <span className="italic text-gold">Every outcome</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light mb-6">
              Most research shops publish the hits and bury the misses. We publish
              both. Hit rate is computed from <em>resolved</em> predictions only —
              active forecasts don&apos;t count until the horizon expires.
            </p>
            <DataFreshness label="Track record" updatedAt={new Date()} />
          </div>
        </section>

        {/* Headline grid */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-px overflow-hidden rounded-sm border"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}
            >
              {[
                { label: 'Hit rate', value: hitRate != null ? `${hitRate}%` : '—', accent: hitRate != null && hitRate >= 60 },
                { label: 'Resolved', value: resolved.length },
                { label: 'Hits', value: hits },
                { label: 'Misses', value: misses, warning: true },
                { label: 'Active', value: active },
              ].map((s) => (
                <div key={s.label} className="p-6" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{s.label}</div>
                  <div
                    className="font-serif text-3xl sm:text-4xl font-light tabular"
                    style={{
                      color:
                        s.accent ? 'hsl(var(--av-primary))' :
                        s.warning ? 'hsl(var(--av-destructive))' :
                        'hsl(var(--av-foreground))',
                    }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {resolved.length < 10 && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Sample size warning — under 10 resolved predictions, hit rate is not statistically meaningful.
                We publish it anyway. Transparency over optics.
              </p>
            )}
            {avgConf != null && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Avg confidence at publish: {avgConf}% · {partials} partial outcomes included in the sample
              </p>
            )}
          </div>
        </section>

        {/* Resolved table */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Resolved <span className="italic text-gold">predictions</span>.
            </h2>
            {resolved.length === 0 ? (
              <div
                className="rounded-sm border p-10 text-center"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <p className="text-sm text-muted-foreground font-light">
                  No resolved predictions yet. First horizons expire and first outcomes publish
                  when the Nostradamus engine completes its first call-window cycle.
                </p>
                <Link
                  href="/predictions"
                  className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold"
                >
                  View active predictions →
                </Link>
              </div>
            ) : (
              <div
                className="overflow-hidden rounded-sm border"
                style={{ background: 'hsl(var(--av-surface) / 0.3)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Prediction</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Horizon</th>
                      <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Conf.</th>
                      <th className="text-center px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b" style={{ borderColor: 'hsl(var(--av-border))' }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.slice(0, 100).map((p) => (
                      <tr key={p.id} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                        <td className="px-4 py-3 text-foreground truncate max-w-[400px]">{p.title ?? p.target ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.horizon ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {p.outcome === 'hit' ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-primary))' }}>HIT</span>
                          ) : p.outcome === 'miss' ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-destructive))' }}>MISS</span>
                          ) : p.outcome === 'partial' ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-warning))' }}>PARTIAL</span>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="py-16 text-center">
          <div className="mx-auto max-w-[800px] px-5 sm:px-12">
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-6">
              Methodology: predictions resolve when horizon expires. Outcome set by
              Agent Arbiter (verification engine) against source-of-truth data — ECB
              statistics, Eurostat, INE, Banco de España. No human override.
            </p>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold"
            >
              Full verification methodology →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
