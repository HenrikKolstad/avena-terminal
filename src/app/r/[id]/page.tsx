/**
 * /r/[id] — the result card. The one screen that matters.
 *
 * One number, big. The gap in plain words. Three reasons. Honest about thin
 * data. One primary button (Xavia). Shareable: the id encodes the inputs,
 * so the page recomputes on load and needs no database.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FrontNav, FrontFooter } from '@/components/front/FrontNav';
import { ShareButton } from '@/components/front/ShareButton';
import { decodeCheckId, runCheck, fmtEur } from '@/lib/check';
import { portalOf } from '@/lib/listing-extract';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const inputs = decodeCheckId(id);
  if (!inputs) return { title: 'Price check — Avena' };
  const r = runCheck(inputs);
  const title = `${r.headline} — ${inputs.type} in ${inputs.town}, ${fmtEur(inputs.asking_eur)}`;
  const description = `Our estimate: ${fmtEur(r.estimate_eur)}. ${r.reasons[0]}.`;
  return {
    title: `${title} · Avena`,
    description,
    alternates: { canonical: `https://avenaterminal.com/r/${id}` },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `https://avenaterminal.com/r/${id}`, siteName: 'Avena', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const inputs = decodeCheckId(id);
  if (!inputs) notFound();
  const r = runCheck(inputs);

  const gold = 'hsl(var(--av-primary))';
  const muted = 'hsl(var(--av-muted-foreground))';
  const verdictColor = r.verdict === 'above' ? 'hsl(var(--av-destructive))' : r.verdict === 'below' ? 'hsl(var(--av-success))' : gold;
  const arrow = r.verdict === 'above' ? '▲' : r.verdict === 'below' ? '▼' : '●';
  const portal = inputs.source_url ? portalOf(inputs.source_url) : null;

  const specs = [
    inputs.condition === 'resale' ? 'Resale' : 'New build',
    inputs.type,
    inputs.bedrooms ? `${inputs.bedrooms} bed` : null,
    `${inputs.built_m2} m²`,
    inputs.town,
  ].filter(Boolean).join(' · ');

  const enquireName = `${inputs.type} ${inputs.built_m2}m² in ${inputs.town}, listed ${fmtEur(inputs.asking_eur)} (our estimate ${fmtEur(r.estimate_eur)})`;

  return (
    <div className="avena-v2 min-h-screen">
      <FrontNav />
      <main className="av-clean mx-auto max-w-[680px] px-4 sm:px-6 pt-24 pb-16">
        <article className="rounded-xl border p-6 sm:p-8" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-card) / 0.5)' }}>
          {/* What we checked */}
          <div className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: muted }}>{specs}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 font-mono text-[12px]" style={{ color: muted }}>
            <span>Listed: <span className="text-foreground">{fmtEur(inputs.asking_eur)}</span></span>
            {inputs.source_url && portal && (
              <a href={inputs.source_url} target="_blank" rel="nofollow noopener" className="underline underline-offset-4 hover:text-foreground">on {portal}</a>
            )}
          </div>

          {/* The number */}
          <div className="mt-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: muted }}>Our estimate</div>
            <div className="mt-2 font-serif text-5xl sm:text-6xl font-light tracking-[-0.02em] text-foreground">{fmtEur(r.estimate_eur)}</div>
            <div className="mt-3 font-mono text-[13px] tracking-[0.15em]" style={{ color: verdictColor }}>
              {arrow} {r.headline}
            </div>
          </div>

          {/* Why */}
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8" style={{ background: gold }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em]" style={{ color: gold }}>Why</span>
            </div>
            <ul className="space-y-2 text-[15px] leading-relaxed text-foreground">
              {r.reasons.map((s) => (
                <li key={s} className="flex gap-3"><span style={{ color: gold }}>•</span><span>{s}</span></li>
              ))}
            </ul>
            {r.confidence_note && (
              <p className="mt-4 text-sm" style={{ color: muted }}>{r.confidence_note}</p>
            )}
          </div>

          {/* Comps */}
          {r.comps.length > 0 && (
            <details className="mt-8 group">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.25em] list-none" style={{ color: muted }}>
                {r.comps.length} comparable new-builds <span className="group-open:hidden">[see]</span><span className="hidden group-open:inline">[hide]</span>
              </summary>
              <ul className="mt-3 divide-y" style={{ borderColor: 'hsl(var(--av-border))' }}>
                {r.comps.map((c) => (
                  <li key={c.ref} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href={c.url} className="block truncate text-foreground hover:underline underline-offset-4">{c.name}</Link>
                      <div className="font-mono text-[11px]" style={{ color: muted }}>{c.type} · {c.built_m2} m² · {c.location}</div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[12px]">
                      <div className="text-foreground">{fmtEur(c.price_eur)}</div>
                      <div style={{ color: muted }}>{fmtEur(c.pm2)}/m²</div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Actions */}
          <div className="mt-10 flex flex-col gap-3">
            <Link
              href={`/enquire?name=${encodeURIComponent(enquireName)}`}
              className="block rounded-md px-6 py-3.5 text-center font-mono text-[12px] uppercase tracking-[0.25em]"
              style={{ background: 'hsl(var(--av-primary) / 0.9)', color: 'hsl(var(--av-primary-foreground))' }}
            >
              Talk to a Norwegian agent about this
            </Link>
            <div className="flex gap-3">
              <ShareButton path={`/r/${id}`} />
              <Link href="/" className="rounded-md border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em]" style={{ borderColor: 'hsl(var(--av-border))', color: muted }}>
                Check another
              </Link>
            </div>
          </div>
        </article>

        <p className="mt-6 text-xs leading-relaxed" style={{ color: muted }}>
          Estimate from asking prices of comparable new-builds on the market today, compared on total built area (incl. terraces), not from completed sales. Model accuracy is published on the methodology page. Not a valuation.
        </p>
      </main>
      <FrontFooter />
    </div>
  );
}
