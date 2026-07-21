'use client';

/**
 * LuxuryRankings (2026-07-20) — the ranked-deals table in the editorial
 * register. Real data, same PRO gating economics as before: non-paid
 * visitors see `freeVisible` rows clear, the rest blurred behind an
 * unlock CTA. Every clear row can be opened or enquired.
 */

import Link from 'next/link';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProModal } from '@/components/v2/ProModal';
import type { Deal } from '@/lib/deals';

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

export function LuxuryRankings({
  deals,
  total,
  freeVisible = 0,
  eyebrow = 'Live rankings · top by Avena Score',
  titleA = "The week's",
  titleEm = 'underpriced',
  titleB = 'homes.',
  seeAllHref,
}: {
  deals: Deal[];
  total: number;
  freeVisible?: number; // 0 = no gating on this surface
  eyebrow?: string;
  titleA?: string;
  titleEm?: string;
  titleB?: string;
  seeAllHref?: string;
}) {
  const { isPaid } = useAuth();
  const [proOpen, setProOpen] = useState(false);
  const gatedFrom = freeVisible > 0 && !isPaid ? freeVisible : Infinity;

  return (
    <section id="rankings" className="scroll-mt-16 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
      <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">{eyebrow}</span>
            <h2 className="mt-6 font-serif text-4xl font-light leading-[1.02] tracking-[-0.02em] text-foreground md:text-6xl">
              {titleA} <em className="italic" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>{titleEm}</em> {titleB}
            </h2>
          </div>
          {seeAllHref && (
            <Link href={seeAllHref} className="group inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/70 transition-colors hover:text-gold">
              <span className="h-px w-6 transition-all group-hover:w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              All ranked deals
            </Link>
          )}
        </div>

        {/* Mobile — editorial cards; a 900px table has no business on a phone */}
        <div className="mt-10 space-y-0 lg:hidden">
          {deals.map((d, idx) => {
            const gated = idx >= gatedFrom;
            const href = `/property/${encodeURIComponent(d.ref)}`;
            return (
              <div
                key={d.ref}
                className="border-b py-6"
                style={{ borderColor: 'hsl(var(--av-border) / 0.4)', ...(gated ? { filter: 'blur(6px) saturate(0.7)', opacity: 0.55, userSelect: 'none' as const, pointerEvents: 'none' as const } : {}) }}
                aria-hidden={gated}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] tracking-[0.3em] text-foreground/45">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="font-serif text-3xl font-light" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>{d.score}</span>
                </div>
                <Link href={gated ? '#' : href} tabIndex={gated ? -1 : undefined} className="mt-1 block font-serif text-xl font-light leading-snug text-foreground line-clamp-2">
                  {d.name}
                </Link>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50">{d.town.toUpperCase()} · {d.region.toUpperCase()}</div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <span className="font-serif text-lg text-foreground">€{fmt(d.price)}</span>
                  <span className="font-mono text-sm text-gold">−{d.discount}%</span>
                  <span className="font-serif text-lg" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>€{fmt(d.saved)} saved</span>
                </div>
                {!gated && (
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <Link
                      href={`/enquire?ref=${encodeURIComponent(d.ref)}&name=${encodeURIComponent(d.name)}`}
                      className="inline-flex items-center justify-center py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary-foreground shadow-gold"
                      style={{ background: 'var(--av-gradient-gold)' }}
                    >
                      Enquire →
                    </Link>
                    <Link href={href} className="inline-flex items-center justify-center border px-5 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>
                      View
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-y font-mono text-[10px] uppercase tracking-[0.35em] text-foreground/50" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                {['#', 'Score', 'Project', 'Region', 'Price', 'Market', 'Δ', 'Saved', ''].map((h, i) => (
                  <th key={i} className={`py-4 font-normal ${i === 8 ? 'pr-0 text-right' : 'pr-4 text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-serif text-foreground/85">
              {deals.map((d, idx) => {
                const gated = idx >= gatedFrom;
                const href = `/property/${encodeURIComponent(d.ref)}`;
                return (
                  <tr
                    key={d.ref}
                    className={`group border-b transition ${gated ? '' : 'hover:bg-[hsl(var(--av-foreground)/0.03)]'}`}
                    style={{ borderColor: 'hsl(var(--av-border) / 0.4)', ...(gated ? { filter: 'blur(7px) saturate(0.7)', opacity: 0.55, userSelect: 'none' as const, pointerEvents: 'none' as const } : {}) }}
                    aria-hidden={gated}
                  >
                    <td className="py-6 pr-4 font-mono text-[10px] tracking-[0.3em] text-foreground/45">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-6 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-3xl font-light" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>{d.score}</span>
                        <span className="h-px w-8" style={{ background: 'hsl(var(--av-primary) / 0.5)' }} />
                      </div>
                    </td>
                    <td className="py-6 pr-4">
                      <Link href={gated ? '#' : href} tabIndex={gated ? -1 : undefined} className="font-serif text-lg font-light leading-tight text-foreground transition-colors hover:text-gold line-clamp-1 max-w-[280px]" title={d.name}>
                        {d.name}
                      </Link>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50">{d.town.toUpperCase()}</div>
                    </td>
                    <td className="py-6 pr-4 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/65">{d.region.toUpperCase()}</td>
                    <td className="py-6 pr-4 font-serif text-lg text-foreground">€{fmt(d.price)}</td>
                    <td className="py-6 pr-4 text-foreground/55">€{fmt(d.marketValue)}</td>
                    <td className="py-6 pr-4 font-mono text-sm text-gold">−{d.discount}%</td>
                    <td className="py-6 pr-4 font-serif text-lg" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>€{fmt(d.saved)}</td>
                    <td className="py-6 pr-0 text-right whitespace-nowrap">
                      {gated ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center text-foreground/50" aria-hidden="true"><Lock className="h-3 w-3" /></span>
                      ) : (
                        <Link
                          href={`/enquire?ref=${encodeURIComponent(d.ref)}&name=${encodeURIComponent(d.name)}`}
                          className="inline-flex items-center gap-2 border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.35em] transition hover:text-primary-foreground"
                          style={{ borderColor: 'hsl(var(--av-primary) / 0.4)', color: 'hsl(var(--av-primary) / 0.92)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--av-primary))'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          Enquire →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {gatedFrom !== Infinity && deals.length > freeVisible && (
          <button
            onClick={() => setProOpen(true)}
            className="mt-6 flex w-full flex-col items-center justify-center gap-1 py-5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--av-gradient-gold)' }}
          >
            <span className="flex items-center gap-3">
              <Lock className="h-3.5 w-3.5" />
              Unlock {(total - freeVisible).toLocaleString()} more ranked properties · PRO €79/mo
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-85">Full terminal · yield calculator · alpha signals</span>
          </button>
        )}

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/50">
          Every score is built on a signed, audited data engine.{' '}
          <Link href="/engine" className="text-gold hover:underline">See how →</Link>
        </p>
      </div>
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </section>
  );
}
