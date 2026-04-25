import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Backlink Drafts — Admin | Avena Terminal',
  description: 'Review queue for Hermes-generated Reddit / Quora / StackExchange replies awaiting manual posting.',
  robots: { index: false, follow: false },
};

interface Draft {
  id: number;
  surface: string;
  target: string;
  question: string;
  draft: string;
  links_used: string[] | null;
  language: string | null;
  posted: boolean | null;
  posted_url: string | null;
  created_at: string;
}

async function loadDrafts(): Promise<Draft[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('backlink_drafts')
      .select('id, surface, target, question, draft, links_used, language, posted, posted_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []) as Draft[];
  } catch {
    return [];
  }
}

const surfaceTone: Record<string, string> = {
  reddit: 'hsl(15 95% 60%)',
  quora: 'hsl(355 80% 55%)',
  stackexchange: 'hsl(28 95% 55%)',
  facebook: 'hsl(220 80% 60%)',
  blog: 'hsl(var(--av-warning))',
};

export default async function AdminBacklinksPage() {
  const drafts = await loadDrafts();
  const pending = drafts.filter((d) => !d.posted);
  const posted = drafts.filter((d) => d.posted);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              Hermes · backlink drafts
            </span>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-light tracking-tight text-foreground">
              Backlink <span className="italic text-gold">drafts</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground font-light">
              Hermes drafts 3 Reddit / Quora / StackExchange replies on Mon, Wed, Fri.
              Email delivery requires <code className="font-mono text-[12px] text-primary">RESEND_API_KEY</code>.
              This page is the fallback review queue — copy a draft, post it manually,
              mark it posted via the <code className="font-mono text-[12px] text-primary">posted</code> column.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-sm border" style={{ background: 'hsl(var(--av-border) / 0.6)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              {[
                { label: 'Total drafts', value: drafts.length },
                { label: 'Pending', value: pending.length, accent: true },
                { label: 'Posted', value: posted.length },
              ].map((s) => (
                <div key={s.label} className="p-5" style={{ background: 'hsl(var(--av-background))' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</div>
                  <div className="mt-2 font-serif font-light tabular text-4xl" style={{ color: s.accent ? 'hsl(var(--av-primary))' : 'hsl(var(--av-foreground))' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">
              Pending review ({pending.length})
            </h2>

            {pending.length === 0 ? (
              <div className="rounded-sm border p-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                Nothing pending. Hermes runs Mon · Wed · Fri at 10:00 UTC.
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((d) => {
                  const tone = surfaceTone[d.surface] ?? 'hsl(var(--av-primary))';
                  return (
                    <article
                      key={d.id}
                      className="rounded-sm border overflow-hidden"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}
                    >
                      <header
                        className="px-4 py-2.5 border-b flex flex-wrap items-baseline justify-between gap-2"
                        style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.6)' }}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className="font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 border"
                            style={{
                              color: tone,
                              borderColor: tone.replace(')', ' / 0.4)'),
                              background: tone.replace(')', ' / 0.08)'),
                            }}
                          >
                            {d.surface}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                            {d.target}
                          </span>
                          {d.language && d.language !== 'en' && (
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                              {d.language}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </header>

                      <div className="px-4 py-4">
                        <div className="font-serif text-base text-foreground/90 mb-3">
                          Q: {d.question}
                        </div>
                        <pre
                          className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground/85 rounded-sm border p-3"
                          style={{ background: 'hsl(32 14% 9%)', borderColor: 'hsl(var(--av-border) / 0.4)' }}
                        >
{d.draft}
                        </pre>

                        {d.links_used && d.links_used.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {d.links_used.map((u) => (
                              <a
                                key={u}
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary hover:underline"
                              >
                                {u.replace('https://avenaterminal.com', '')}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {posted.length > 0 && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-10">
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">
                Posted ({posted.length})
              </h2>
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" style={{ background: 'hsl(var(--av-surface) / 0.5)' }}>
                      <th className="px-4 py-2">Surface</th>
                      <th className="px-4 py-2">Target</th>
                      <th className="px-4 py-2">Question</th>
                      <th className="px-4 py-2">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posted.map((d) => (
                      <tr key={d.id} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                        <td className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{d.surface}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{d.target}</td>
                        <td className="px-4 py-2 text-foreground/85 truncate max-w-[400px]">{d.question}</td>
                        <td className="px-4 py-2">
                          {d.posted_url ? (
                            <a href={d.posted_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[11px]">
                              link →
                            </a>
                          ) : (
                            <span className="text-muted-foreground font-mono text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
