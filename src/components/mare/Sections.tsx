/**
 * MARE sections (2026-07-20) — the editorial layer of the rollout:
 * town marquee, statement, collection plates, coast panels, enquire
 * invitation. Server components; all data live from the dataset.
 */

import Link from 'next/link';
import { Suspense } from 'react';
import { getUniqueTowns, getUniqueCostas, getAllProperties } from '@/lib/properties';
import type { Deal } from '@/lib/deals';
import { MareThumb } from '@/app/mare/MareThumb';
import { EnquireForm } from '@/app/enquire/EnquireForm';

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
const GOLD_SOFT = 'hsl(var(--av-primary) / 0.92)';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/* ── Quiet marquee — real towns from the dataset ── */
export function TownMarquee() {
  const towns = getUniqueTowns().slice(0, 12).map(t => t.town.toUpperCase());
  return (
    <div className="overflow-hidden border-y" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.4)' }}>
      <div className="av-marquee-track flex w-max gap-16 whitespace-nowrap py-4 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/55">
        {[...towns, ...towns].map((t, i) => (
          <span key={i} className="flex items-center gap-16">
            {t}<span className="text-gold">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Statement — the honest Avena philosophy ── */
export function Statement() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1200px] px-5 py-28 text-center sm:px-8 md:py-40">
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">The Avena Method</span>
        <h2 className="mt-8 font-serif text-4xl font-light leading-[1.05] tracking-[-0.02em] text-foreground md:text-6xl lg:text-7xl">
          We do not list houses.
          <br />
          <em className="italic" style={{ color: GOLD_SOFT }}>We score every one of them</em>
          <br />
          against the honest market.
        </h2>
        <div className="mx-auto mt-14 h-px w-40" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--av-primary) / 0.4), transparent)' }} />
        <p className="mx-auto mt-10 max-w-2xl font-serif text-xl font-light leading-[1.7] text-foreground/75 md:text-2xl">
          Every new-build on the coast is indexed daily and weighed against comparable sales — discount, yield, developer, completion risk — by an engine whose methodology is public to the last weight. The underpriced ones rise. Nothing else does.
        </p>
        <Link href="/engine" className="group mt-10 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/70 transition-colors hover:text-gold">
          <span className="h-px w-6 transition-all group-hover:w-10" style={{ background: 'hsl(var(--av-primary))' }} />
          See the engine
        </Link>
      </div>
    </section>
  );
}

/* ── Collection — the top residences as editorial plates ── */
export function LuxuryCollection({ deals }: { deals: Deal[] }) {
  return (
    <section id="collection" className="relative border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.25)' }}>
      <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:px-12 md:py-32">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">The Collection · scored this morning</span>
            <h2 className="mt-6 font-serif text-5xl font-light leading-[1] tracking-[-0.02em] text-foreground md:text-7xl">
              {ROMAN[deals.length - 1] ? `${['One','Two','Three','Four','Five','Six'][deals.length - 1]} residences,` : 'Residences,'}
              <br />
              <em className="italic" style={{ color: GOLD_SOFT }}>surfaced by the score.</em>
            </h2>
          </div>
          <p className="font-serif text-lg font-light leading-relaxed text-foreground/70 md:col-span-4">
            Chosen by the engine, not by a salesman: the highest-scored homes on the coast today, each priced beneath its market reference.
          </p>
        </div>

        <div className="mt-20 grid gap-x-12 gap-y-24 md:grid-cols-2">
          {deals.map((d, i) => (
            <article key={d.ref} className={`group ${i % 2 === 1 ? 'md:mt-24' : ''}`}>
              <Link href={`/property/${encodeURIComponent(d.ref)}`} className="block">
                <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 3', background: 'hsl(var(--av-surface))' }}>
                  <MareThumb src={d.image} alt={d.name} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--av-background) / 0.6), transparent 45%)' }} />
                  <div className="absolute left-6 top-6 flex items-center gap-3">
                    <span className="h-px w-6" style={{ background: 'hsl(var(--av-primary))' }} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">N° {ROMAN[i]}</span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.35em] text-foreground/80">
                    <span>{d.town.toUpperCase()}</span>
                    <span className="font-serif text-3xl font-light normal-case tracking-normal" style={{ color: GOLD_SOFT }}>{d.score}</span>
                  </div>
                </div>
              </Link>

              <div className="mt-8">
                <h3 className="font-serif text-3xl font-light leading-tight tracking-[-0.015em] text-foreground md:text-4xl">
                  <Link href={`/property/${encodeURIComponent(d.ref)}`} className="transition-colors hover:text-gold line-clamp-2" title={d.name}>
                    {d.name}
                  </Link>
                </h3>

                <div className="mt-7 grid grid-cols-3 gap-6 border-t pt-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  {[
                    { l: 'Price', v: `€${fmt(d.price)}`, accent: true },
                    { l: 'Beneath market', v: `−${d.discount}% · €${fmt(d.saved)}` },
                    { l: 'Interior', v: `${d.beds ? `${d.beds} bed · ` : ''}${d.built} m²` },
                  ].map(c => (
                    <div key={c.l}>
                      <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground/50">{c.l.toUpperCase()}</div>
                      <div className="mt-2 font-serif text-lg font-light md:text-xl" style={{ color: c.accent ? GOLD_SOFT : 'hsl(var(--av-foreground))' }}>{c.v}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center gap-6">
                  <Link
                    href={`/enquire?ref=${encodeURIComponent(d.ref)}&name=${encodeURIComponent(d.name)}`}
                    className="inline-flex items-center gap-3 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.35em] text-primary-foreground transition hover:-translate-y-0.5"
                    style={{ background: 'hsl(var(--av-primary) / 0.9)' }}
                  >
                    Enquire →
                  </Link>
                  <Link href={`/property/${encodeURIComponent(d.ref)}`} className="group/f inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/80 transition-colors hover:text-gold">
                    <span className="h-px w-6 transition-all group-hover/f:w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                    The dossier
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Coast panels — real aggregates per coast ── */
export function CoastPanels() {
  const all = getAllProperties();
  const groups = [
    { name: 'Costa Blanca', match: (c: string) => c.startsWith('Costa Blanca'), note: 'Year-round Northern-European demand and the strongest yield-to-price balance of the major costas.' },
    { name: 'Costa Cálida', match: (c: string) => c.startsWith('Costa Calida'), note: 'The value frontier — lower entry prices, Mar Menor warmth, and the widest discounts to market.' },
    { name: 'Costa del Sol', match: (c: string) => c.startsWith('Costa del Sol') || c.startsWith('Costa Tropical'), note: 'Spain’s prime international market: deepest resale liquidity and the capital-preservation story.' },
  ].map(g => {
    const props = all.filter(p => p.costa && g.match(p.costa));
    const scores = props.filter(p => p._sc != null).map(p => p._sc!);
    const yields = props.filter(p => p._yield?.gross).map(p => p._yield!.gross);
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return { ...g, count: props.length, score: Math.round(avg(scores)), yld: avg(yields) };
  }).filter(g => g.count > 0);

  return (
    <section id="coasts" className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
      <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:px-12 md:py-32">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">The Coastline</span>
            <h2 className="mt-6 font-serif text-5xl font-light leading-[1] text-foreground md:text-7xl">
              Three coasts,
              <br />
              <em className="italic" style={{ color: GOLD_SOFT }}>one honest score.</em>
            </h2>
          </div>
          <p className="font-serif text-lg font-light leading-relaxed text-foreground/70 md:col-span-5">
            A 78 on the Blanca means exactly what a 78 means on the Sol — the same open methodology, recomputed each morning.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden border md:grid-cols-3" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-border) / 0.6)' }}>
          {groups.map(g => (
            <div key={g.name} className="flex flex-col gap-5 p-9" style={{ background: 'hsl(var(--av-background))' }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">{g.count.toLocaleString()} TRACKED · AVG {g.yld ? `${g.yld.toFixed(1)}% YLD` : '—'}</span>
              <h3 className="font-serif text-3xl font-light italic leading-tight text-foreground">{g.name}</h3>
              <p className="font-serif text-base font-light leading-relaxed text-foreground/70">{g.note}</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-serif text-5xl font-light" style={{ color: GOLD_SOFT }}>{g.score}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50">avg Avena Score</span>
              </div>
              <Link href="/regions" className="group mt-auto inline-flex w-fit items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/80 transition-colors hover:text-gold">
                <span className="h-px w-5 transition-all group-hover:w-9" style={{ background: 'hsl(var(--av-primary))' }} />
                See the region
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── The Private Office — the enquiry, wired to the real money wire ── */
export function PrivateOffice() {
  return (
    <section id="enquire" className="relative overflow-hidden border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.5)' }}>
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mare/hero.jpg" alt="" className="h-full w-full object-cover opacity-25" loading="lazy" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(var(--av-background)), hsl(var(--av-background) / 0.88), hsl(var(--av-background)))' }} />
      </div>

      <div className="relative mx-auto max-w-[860px] px-5 py-24 sm:px-8 md:py-36">
        <div className="text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold">The Private Office</span>
          <h2 className="mt-8 font-serif text-5xl font-light leading-[1] tracking-[-0.02em] text-foreground md:text-7xl">
            A quiet conversation,
            <br />
            <em className="italic" style={{ color: GOLD_SOFT }}>within the hour.</em>
          </h2>
          <p className="mx-auto mt-8 max-w-xl font-serif text-xl font-light leading-relaxed text-foreground/75">
            Tell us what you are looking for — or ask about a specific home. Your enquiry lands directly with our agent, not a call centre.
          </p>
        </div>

        <div className="mt-14">
          <Suspense fallback={null}>
            <EnquireForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
