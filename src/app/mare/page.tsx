/**
 * /mare — AVENA MARE: the luxury marketside scratch (2026-07-18).
 *
 * Design study for the deal-first Avena reimagined as a private
 * collection: cinematic shader-painted Mediterranean dusk (the water
 * MOVES — see MareHero), Cormorant editorial typography, RICS marque,
 * and below the fold a bright, gallery-grade rendering of the real
 * scored deals. Hidden: noindex, not in nav or sitemap. Data is live.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties } from '@/lib/properties';
import { MareSea } from './MareHero';
import { MareThumb } from './MareThumb';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'AVENA · MARE — a private collection of the Spanish coast',
  description: 'An unhurried collection of the finest seafront and hillside residences on the Costa Blanca and Costa Cálida — chosen for their light, their value, and their view.',
  robots: { index: false, follow: false },
};

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const DISPLAY_CAP_PCT = 35;

function topDeals(n: number) {
  const all = getAllProperties();
  return all
    .filter(p => p.ref && p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2 && p.bm)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, n)
    .map(p => {
      const built = Math.round(p.bm || 0);
      const rawDiscount = Math.round((1 - p.pm2! / p.mm2!) * 100);
      const discount = Math.min(rawDiscount, DISPLAY_CAP_PCT);
      const saved = rawDiscount > DISPLAY_CAP_PCT
        ? Math.round(p.mm2! * built * (DISPLAY_CAP_PCT / 100))
        : Math.round((p.mm2! - p.pm2!) * built);
      return {
        ref: p.ref!,
        name: p.p || `${p.t} in ${p.l}`,
        town: p.l,
        costa: p.costa ?? 'Costa Blanca',
        type: p.t,
        beds: p.bd ?? null,
        built,
        price: p.pf,
        score: Math.round(p._sc ?? 0),
        discount,
        saved,
        yield: p._yield?.gross ?? null,
        thumb: Array.isArray(p.imgs) && p.imgs.length ? p.imgs[0] : null,
      };
    });
}

/* Ink-on-cream palette for the bright collection */
const INK = '#1f1b14';
const INK_SOFT = '#6d6353';
const CREAM = '#f6f2e9';
const CREAM_DEEP = '#efe9db';
const GOLD = '#a8823c';
const HAIR = '#d8cfbc';

function Seal({ score }: { score: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="relative h-[72px] w-[72px]">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill={CREAM} stroke={HAIR} strokeWidth="1" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${filled} ${c - filled}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[22px] leading-none" style={{ color: INK }}>{score}</span>
        <span className="font-mono text-[6.5px] uppercase tracking-[0.3em] mt-0.5" style={{ color: INK_SOFT }}>Avena</span>
      </div>
    </div>
  );
}

export default function MarePage() {
  const deals = topDeals(6);

  return (
    <div style={{ background: '#070a12' }}>
      {/* ═══════════════════════ HERO — the living dusk ═══════════════════════ */}
      <section className="relative h-[100svh] min-h-[640px] overflow-hidden">
        <MareSea className="absolute inset-0 h-full w-full" />

        {/* Cliffside villa silhouette, warm windows */}
        <svg
          viewBox="0 0 1000 620" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-[86%] w-auto max-w-[62%] opacity-95"
        >
          <defs>
            <linearGradient id="cliff" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d0f16" />
              <stop offset="1" stopColor="#05060b" />
            </linearGradient>
            <filter id="warm" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          {/* headland */}
          <path d="M1000,620 L1000,150 C930,160 905,205 860,225 C815,246 800,300 748,318 C700,335 690,392 640,410 C596,427 560,470 545,505 C525,552 470,585 430,620 Z" fill="url(#cliff)" />
          {/* terraced villa block */}
          <path d="M1000,620 L1000,235 L870,255 L868,330 L780,348 L778,430 L690,448 L688,530 L600,548 L598,620 Z" fill="#090b12" />
          {/* arched loggia hints */}
          <g fill="#f5b56a" filter="url(#warm)">
            <rect x="912" y="286" width="16" height="26" rx="8" opacity="0.9" />
            <rect x="944" y="286" width="16" height="26" rx="8" opacity="0.75" />
            <rect x="822" y="376" width="15" height="24" rx="7.5" opacity="0.9" />
            <rect x="852" y="376" width="15" height="24" rx="7.5" opacity="0.65" />
            <rect x="732" y="470" width="14" height="22" rx="7" opacity="0.85" />
            <rect x="762" y="470" width="14" height="22" rx="7" opacity="0.7" />
            <rect x="642" y="562" width="13" height="20" rx="6.5" opacity="0.8" />
          </g>
          {/* cypresses */}
          <g fill="#04060a">
            <path d="M585,620 C578,560 580,528 585,505 C590,528 592,560 585,620 Z" />
            <path d="M853,255 C847,205 849,180 853,162 C857,180 859,205 853,255 Z" />
            <path d="M760,352 C755,308 756,286 760,270 C764,286 765,308 760,352 Z" />
          </g>
          {/* pool lip catching light */}
          <rect x="600" y="616" width="400" height="4" fill="#f5b56a" opacity="0.28" filter="url(#warm)" />
        </svg>

        {/* legibility gradient */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(4,6,12,0.72) 0%, rgba(4,6,12,0.28) 45%, rgba(4,6,12,0.05) 70%)' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28" style={{ background: 'linear-gradient(180deg, rgba(4,6,12,0.6), transparent)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(0deg, rgba(4,6,12,0.55), transparent)' }} />

        {/* ── nav ── */}
        <header className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 sm:px-10 py-7">
            <Link href="/mare" className="flex items-baseline gap-3">
              <span className="font-serif text-[22px] tracking-[0.34em] text-[#f3ead9]">AVENA</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.5em] text-[#c9a86a]">· Mare ·</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-9">
              {[
                { l: 'Collection', h: '#collection' },
                { l: 'Regions', h: '/regions' },
                { l: 'The House', h: '/engine' },
                { l: 'Private Office', h: '/institutional' },
              ].map(i => (
                <Link key={i.l} href={i.h} className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#e8dfcc]/80 transition-colors hover:text-[#c9a86a]">
                  {i.l}
                </Link>
              ))}
            </nav>
            <Link
              href="/enquire"
              className="border px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.34em] text-[#f3ead9] transition-colors hover:border-[#c9a86a] hover:text-[#c9a86a]"
              style={{ borderColor: 'rgba(243,234,217,0.35)' }}
            >
              Enquire →
            </Link>
          </div>
        </header>

        {/* ── hero copy ── */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-center px-6 sm:px-10">
          <div className="max-w-[760px] pt-10">
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12" style={{ background: '#c9a86a' }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.44em] text-[#c9a86a]">
                Est. MMXXVI · A private collection
              </span>
            </div>

            <h1 className="font-serif font-light leading-[1.02] tracking-tight text-[#f6f0e2]" style={{ fontSize: 'clamp(3rem, 7.2vw, 6.4rem)' }}>
              Where the sea
              <br />
              <em className="italic" style={{ color: '#d9b878' }}>keeps the light.</em>
            </h1>

            <p className="mt-8 max-w-[540px] font-serif text-[19px] leading-[1.75] text-[#e9e0cd]/90">
              An unhurried collection of the finest seafront and hillside residences on the Costa Blanca and Costa&nbsp;Cálida — chosen for their light, their silence, and their value against the market.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-7">
              <a
                href="#collection"
                className="px-8 py-4 font-mono text-[10.5px] uppercase tracking-[0.34em] text-[#171204] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #d9b878, #c9a24b)' }}
              >
                View the collection →
              </a>
              <Link href="/enquire" className="group flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.34em] text-[#e8dfcc]/85 hover:text-[#d9b878] transition-colors">
                <span className="h-px w-10 transition-all group-hover:w-14" style={{ background: '#c9a86a' }} />
                Request a viewing
              </Link>
            </div>

            {/* RICS marque */}
            <a
              href="https://www.rics.org" target="_blank" rel="noopener noreferrer"
              className="mt-12 inline-flex items-center gap-4 opacity-85 transition-opacity hover:opacity-100"
            >
              <span className="flex items-center px-3 py-1.5 font-serif text-[13px] font-bold tracking-[0.2em] text-[#e8e2d2]" style={{ background: 'linear-gradient(135deg, #12253f, #1c3a64)', border: '1px solid rgba(201,168,106,0.45)' }}>
                RICS
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.38em] text-[#c9b98f]">
                Official Tech Partner · MMXXVI
              </span>
            </a>
          </div>
        </div>

        {/* ── hero footer line ── */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 sm:px-10 py-6 font-mono text-[9px] uppercase tracking-[0.4em] text-[#cfc4a8]/70">
            <span>38°47′ N · 0°10′ E</span>
            <a href="#collection" className="hidden sm:inline hover:text-[#d9b878] transition-colors">Scroll ↓</a>
            <span>MMXXVI · N° VII</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════ THE COLLECTION — bright gallery ═══════════════════ */}
      <section id="collection" style={{ background: CREAM }}>
        <div className="mx-auto max-w-[1500px] px-6 sm:px-10 pt-20 sm:pt-28 pb-10">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-12" style={{ background: GOLD }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.44em]" style={{ color: GOLD }}>
              The collection · scored daily
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="font-serif font-light leading-[1.04] tracking-tight" style={{ color: INK, fontSize: 'clamp(2.4rem, 4.6vw, 4.2rem)' }}>
              Six residences,
              <br />
              <em className="italic" style={{ color: GOLD }}>priced beneath the market.</em>
            </h2>
            <p className="max-w-[380px] font-serif text-[16px] leading-[1.8] pb-2" style={{ color: INK_SOFT }}>
              Every residence carries the Avena seal — a 0–100 score of discount-to-market, rental yield, developer quality and completion risk, recomputed each morning.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-6 sm:px-10 pb-14">
          <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 xl:grid-cols-3 pt-8">
            {deals.map((d, i) => (
              <article key={d.ref} className="group">
                <Link href={`/property/${encodeURIComponent(d.ref)}`} className="block">
                  <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3', background: CREAM_DEEP }}>
                    <MareThumb src={d.thumb} alt={d.name} />
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(31,27,20,0.08)' }} />
                    <div className="absolute -bottom-6 right-6 drop-shadow-md">
                      <Seal score={d.score} />
                    </div>
                    <span className="absolute top-5 left-5 font-mono text-[9px] uppercase tracking-[0.4em] px-2.5 py-1" style={{ background: 'rgba(246,242,233,0.92)', color: INK_SOFT }}>
                      N° {ROMAN[i]}
                    </span>
                  </div>
                </Link>

                <div className="pt-9">
                  <div className="font-mono text-[9px] uppercase tracking-[0.38em] mb-2" style={{ color: GOLD }}>
                    {d.costa} · {d.town}
                  </div>
                  <Link href={`/property/${encodeURIComponent(d.ref)}`}>
                    <h3 className="font-serif text-[26px] font-light leading-snug tracking-tight transition-colors group-hover:opacity-80" style={{ color: INK }}>
                      {d.name}
                    </h3>
                  </Link>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.3em] mt-1.5" style={{ color: INK_SOFT }}>
                    {d.type}{d.beds ? ` · ${d.beds} bedrooms` : ''} · {d.built} m²
                  </div>

                  <div className="mt-6 grid grid-cols-3 border-t" style={{ borderColor: HAIR }}>
                    {[
                      { k: 'Price', v: `€${fmt(d.price)}` },
                      { k: 'Beneath market', v: `−${d.discount}%` },
                      { k: 'Yield', v: d.yield ? `${d.yield.toFixed(1)}%` : '—' },
                    ].map(s => (
                      <div key={s.k} className="pt-4 pr-4">
                        <div className="font-mono text-[8px] uppercase tracking-[0.3em] mb-1.5" style={{ color: INK_SOFT }}>{s.k}</div>
                        <div className="font-serif text-[19px]" style={{ color: s.k === 'Beneath market' ? GOLD : INK }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.26em]" style={{ color: INK_SOFT }}>
                    ≈ €{fmt(d.saved)} beneath the market reference
                  </div>

                  <div className="mt-6 flex items-center gap-6">
                    <Link
                      href={`/enquire?ref=${encodeURIComponent(d.ref)}&name=${encodeURIComponent(d.name)}`}
                      className="px-6 py-3 font-mono text-[9.5px] uppercase tracking-[0.3em] transition-colors"
                      style={{ background: INK, color: CREAM }}
                    >
                      Enquire →
                    </Link>
                    <Link
                      href={`/property/${encodeURIComponent(d.ref)}`}
                      className="group/v flex items-center gap-3 font-mono text-[9.5px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                      style={{ color: INK_SOFT }}
                    >
                      <span className="h-px w-7" style={{ background: GOLD }} />
                      The dossier
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* collection footer band */}
        <div className="border-t" style={{ borderColor: HAIR, background: CREAM_DEEP }}>
          <div className="mx-auto max-w-[1500px] px-6 sm:px-10 py-14 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <h3 className="font-serif text-[28px] sm:text-[34px] font-light tracking-tight leading-snug" style={{ color: INK }}>
                Every seal is earned by <em className="italic" style={{ color: GOLD }}>the Engine</em> — a signed, audited data infrastructure, open to inspection.
              </h3>
              <p className="mt-4 max-w-[560px] font-serif text-[15.5px] leading-[1.8]" style={{ color: INK_SOFT }}>
                Open methodology to the last weight. Cryptographic proof on every artefact. Two world-first AI instruments reading the market each dawn. The house does not guess.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 lg:justify-end">
              <Link href="/engine" className="px-7 py-3.5 font-mono text-[10px] uppercase tracking-[0.32em] border transition-colors hover:opacity-70" style={{ color: INK, borderColor: INK }}>
                Enter the engine
              </Link>
              <Link href="/deals" className="px-7 py-3.5 font-mono text-[10px] uppercase tracking-[0.32em]" style={{ background: 'linear-gradient(135deg, #d9b878, #c9a24b)', color: '#171204' }}>
                The full ranking →
              </Link>
            </div>
          </div>
        </div>

        {/* mare footer line */}
        <div className="border-t" style={{ borderColor: HAIR }}>
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-6 sm:px-10 py-8 font-mono text-[8.5px] uppercase tracking-[0.36em]" style={{ color: INK_SOFT }}>
            <span>Avena · Mare — a design study</span>
            <span>RICS Tech Partner · DOI 10.5281/zenodo.19520064</span>
            <span>38°47′ N · 0°10′ E · MMXXVI</span>
          </div>
        </div>
      </section>
    </div>
  );
}
