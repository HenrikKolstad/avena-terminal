import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, slugify } from '@/lib/properties';
import { CompareClient } from './CompareClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Compare deals — Avena Terminal',
  description: 'Side-by-side comparison of up to 4 scored property deals. All metrics, one view.',
  alternates: { canonical: 'https://avenaterminal.com/compare/deals' },
};

export interface CompareProp {
  ref: string;
  project: string;
  town: string;
  townSlug: string;
  costa: string | null;
  type: string;
  beds: number;
  baths: number;
  built: number;
  beach: number | null;
  price: number;
  pm2: number | null;
  mm2: number | null;
  discount: number;
  score: number;
  yield_gross: number;
  status: string | null;
  completion: number | null;
  developer: string | null;
  thumb: string | null;
}

export default async function CompareDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ refs?: string }>;
}) {
  const { refs = '' } = await searchParams;
  const refList = refs.split(',').filter(Boolean).slice(0, 4);
  const all = getAllProperties();

  const selected: CompareProp[] = refList
    .map((ref) => all.find((p) => p.ref === ref))
    .filter((p): p is (typeof all)[number] => !!p)
    .map((p) => {
      const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
      const mm2 = p.mm2 ? Math.round(p.mm2) : null;
      const rawDiscount = mm2 && pm2 ? Math.round((1 - pm2 / mm2) * 100) : 0;
      return {
        ref: p.ref!,
        project: p.p || `${p.t} in ${p.l}`,
        town: p.l,
        townSlug: slugify(p.l),
        costa: p.costa ?? null,
        type: p.t,
        beds: p.bd ?? 0,
        baths: p.ba ?? 0,
        built: p.bm ?? 0,
        beach: p.bk ?? null,
        price: p.pf,
        pm2,
        mm2,
        discount: Math.min(rawDiscount, 35),
        score: Math.round(p._sc ?? 0),
        yield_gross: p._yield?.gross ?? 0,
        status: p.s ?? null,
        completion: p.c ? Number(p.c) : null,
        developer: p.d ?? null,
        thumb: p.imgs?.[0] ?? null,
      };
    });

  const allLite = all
    .filter((p) => p.ref && p._sc != null && (p._sc ?? 0) > 60)
    .slice(0, 150)
    .map((p) => ({
      ref: p.ref!,
      project: p.p || `${p.t} in ${p.l}`,
      town: p.l,
      score: Math.round(p._sc ?? 0),
      price: p.pf,
    }));

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Side-by-side · up to 4 deals
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-light leading-[0.95] tracking-tight text-foreground">
              Compare <span className="italic text-gold">deals</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground font-light">
              All metrics lined up. Score, discount, yield, €/m², status, developer.
              Shareable URL — send the whole comparison in one link.
            </p>
          </div>
        </section>

        <CompareClient initial={selected} pool={allLite} />
      </main>
      <Footer />
    </div>
  );
}
