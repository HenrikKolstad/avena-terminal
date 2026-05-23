import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { loadMemoByShortId } from '@/lib/memo-engine';
import type { MemoCandidate } from '@/lib/memo-engine';
import { CheckCircle2, AlertTriangle, MinusCircle, Sparkles } from 'lucide-react';
import { PrintButton } from './PrintButton';

interface PageProps { params: Promise<{ short_id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { short_id } = await params;
  const memo = await loadMemoByShortId(short_id);
  if (!memo) return { title: 'Memo not found · Avena Terminal' };
  return {
    title: `${memo.thesis.slice(0, 60)}${memo.thesis.length > 60 ? '…' : ''} · Avena Memo`,
    description: memo.executive_summary?.slice(0, 200),
    alternates: { canonical: `https://avenaterminal.com/memo/${short_id}` },
  };
}

function RecommendationPill({ rec, confidence }: { rec: string; confidence: number }) {
  const styles: Record<string, { bg: string; color: string; Icon: typeof CheckCircle2 }> = {
    BUY:       { bg: 'hsl(var(--av-success) / 0.15)',     color: 'hsl(var(--av-success))',     Icon: CheckCircle2 },
    CONSIDER:  { bg: 'hsl(var(--av-warning) / 0.15)',     color: 'hsl(var(--av-warning))',     Icon: AlertTriangle },
    PASS:      { bg: 'hsl(var(--av-destructive) / 0.15)', color: 'hsl(var(--av-destructive))', Icon: MinusCircle },
  };
  const s = styles[rec] ?? styles.CONSIDER;
  const Icon = s.Icon;
  return (
    <div className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5" style={{ background: s.bg, color: s.color }}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] font-medium">{rec}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">· conf {confidence}</span>
    </div>
  );
}

function CandidateCard({ c, i }: { c: MemoCandidate; i: number }) {
  // Only render the image column when there's actually an image, otherwise the
  // body collapses into a sliver against an empty 180px gap.
  const hasImage = !!c.image;
  return (
    <div
      className="rounded-sm border overflow-hidden"
      style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}
    >
      <div className={hasImage ? 'grid sm:grid-cols-[180px_1fr] gap-0' : ''}>
        {hasImage && (
          <div
            className="relative h-full min-h-[140px] bg-cover bg-center"
            style={{ backgroundImage: `url(${c.image})` }}
          >
            <span className="absolute top-2 left-2 font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 rounded-sm" style={{ background: 'hsl(var(--av-background) / 0.85)', color: 'hsl(var(--av-primary))' }}>
              #{i + 1}
            </span>
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                {!hasImage && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">#{i + 1}</span>
                )}
                <h3 className="font-serif text-lg text-foreground leading-tight">{c.name}</h3>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {c.location} · {c.type} · {c.bedrooms} bd · {c.built_m2}m²
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-serif text-2xl text-gold tabular leading-none">{c.score}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mt-1">Avena</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-sm mb-3" style={{ background: 'hsl(var(--av-border) / 0.5)' }}>
            <div className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Price</div>
              <div className="font-mono text-sm text-foreground tabular">€{Math.round(c.price_eur / 1000).toLocaleString()}k</div>
            </div>
            <div className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">€/m²</div>
              <div className="font-mono text-sm text-foreground tabular">{c.pm2 ?? '—'}</div>
            </div>
            <div className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Underprice</div>
              <div className={`font-mono text-sm tabular ${c.underprice_pct != null && c.underprice_pct > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                {c.underprice_pct != null ? `${c.underprice_pct > 0 ? '−' : '+'}${Math.abs(c.underprice_pct)}%` : '—'}
              </div>
            </div>
            <div className="p-3" style={{ background: 'hsl(var(--av-background))' }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Yield</div>
              <div className="font-mono text-sm text-foreground tabular">{c.yield_gross != null ? `${c.yield_gross}%` : '—'}</div>
            </div>
          </div>

          {(c.one_liner || c.risk_note) && (
            <div className="mt-3 space-y-1.5 text-xs leading-relaxed">
              {c.one_liner && <div className="text-foreground/90"><span className="text-success">+</span> {c.one_liner}</div>}
              {c.risk_note && <div className="text-muted-foreground"><span className="text-destructive">−</span> {c.risk_note}</div>}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t flex-wrap" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              {c.developer}{c.developer_grade ? ` · Counterpart ${c.developer_grade}` : ''}{c.energy ? ` · Energy ${c.energy}` : ''}
            </div>
            {c.url && c.url !== '#' && (
              <a href={c.url} target="_blank" rel="noopener" className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary hover:underline">
                Source →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function MemoViewPage({ params }: PageProps) {
  const { short_id } = await params;
  const memo = await loadMemoByShortId(short_id);
  if (!memo) notFound();

  const generated = new Date(memo.generated_at);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16 print:pt-0">
        {/* Cover / hero */}
        <article id="memo-print-root" className="mx-auto max-w-[900px] px-5 sm:px-12 py-12 sm:py-16">
          {/* Header band */}
          <header className="border-b pb-8 mb-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
                Avena Investment Memo · {memo.short_id}
              </div>
              <PrintButton />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-light leading-tight tracking-tight text-foreground">
              {memo.thesis}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <RecommendationPill rec={memo.recommendation} confidence={memo.confidence} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Generated {generated.toISOString().slice(0, 16).replace('T', ' ')} UTC · {memo.candidates.length} candidates · {memo.generated_by}
              </span>
            </div>
          </header>

          {/* Executive summary */}
          <section className="mb-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">§00 · Executive Summary</div>
            <p className="font-serif text-xl sm:text-2xl font-light leading-relaxed text-foreground">
              {memo.executive_summary}
            </p>
          </section>

          {/* Candidates */}
          <section className="mb-14">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-4">Universe · Top {memo.candidates.length} ranked by Avena Score × underpricing</div>
            <div className="space-y-3">
              {memo.candidates.map((c, i) => <CandidateCard key={c.ref || i} c={c} i={i} />)}
            </div>
          </section>

          {/* 10 sections */}
          <section className="space-y-12">
            {memo.sections.map((s, i) => (
              <div key={s.title}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  §{String(i + 1).padStart(2, '0')} · {s.title}
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-light leading-tight tracking-tight text-foreground mb-4">
                  {s.title}
                </h2>
                <div className="text-base leading-relaxed text-foreground/90 whitespace-pre-line font-light">
                  {s.body}
                </div>
              </div>
            ))}
          </section>

          {/* Footer / citation */}
          <footer className="mt-16 pt-8 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite as</div>
            <div className="rounded-sm border p-4 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground">Avena Terminal (2026).</div>
              <div className="text-foreground">{memo.thesis}</div>
              <div className="text-muted-foreground">Memo {memo.short_id}. Generated {generated.toISOString().slice(0, 10)}.</div>
              <div className="text-primary mt-1">avenaterminal.com/memo/{memo.short_id} · DOI 10.5281/zenodo.19520064</div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <span className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full mr-2" style={{ background: 'hsl(var(--av-primary))' }} />
                Live · APIP v1.0 · CC BY 4.0
              </div>
              <Link href="/memo" className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline">
                Generate another →
              </Link>
            </div>
          </footer>
        </article>

        {/* "Want this for your fund?" CTA — hidden in print */}
        <section className="border-t print:hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-12">
            <div className="rounded-sm border p-6 sm:p-8" style={{ borderColor: 'hsl(var(--av-primary) / 0.3)', background: 'linear-gradient(180deg, hsl(var(--av-primary) / 0.05) 0%, hsl(var(--av-surface) / 0.4) 100%)' }}>
              <div className="flex items-start gap-4">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-serif text-xl text-foreground mb-2">White-label this memo for your fund</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Desk / Fund / Sovereign tiers include your branding on the memo header, unlimited generations, and dedicated thesis library. The same artefact your analyst spends two weeks producing — generated on demand.
                  </p>
                  <Link
                    href="/institutional"
                    className="inline-flex items-center gap-2 rounded-sm border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground hover:text-primary hover:border-primary transition-colors"
                    style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                  >
                    See institutional pricing →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
