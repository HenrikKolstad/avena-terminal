import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { Check, Circle, CircleDashed } from 'lucide-react';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Roadmap — Avena Terminal',
  description: 'What we\'re building next at Avena Terminal. Public, dated, honest.',
  alternates: { canonical: 'https://avenaterminal.com/roadmap' },
};

type Status = 'shipped' | 'building' | 'planned';

interface Item {
  title: string;
  detail: string;
  status: Status;
  quarter?: string;
}

const ITEMS: Item[] = [
  // Shipped recently
  { title: 'Watchlist system', detail: 'Star any property, persists per-browser, visible in Nav + /watchlist.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Command palette (⌘K)', detail: 'Global fuzzy search across pages, towns, properties.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Compare deals', detail: 'Side-by-side up to 4 properties, shareable URL.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Deal alerts (email)', detail: 'Email subscribers when new deals match filters.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'AVN_PROP_ID v1.0', detail: 'Open canonical identifier for European property with 10-year governance.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Score history + deltas', detail: 'Daily snapshots, 7d/30d deltas on every property.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Dynamic per-property OG images', detail: 'Rich preview cards for every shared link.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Terminal v2', detail: 'Bloomberg-style keyboard interface with 12 commands.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Honest cron logging', detail: 'Real cron_logs table; /swarm shows real task counts.', status: 'shipped', quarter: 'Q2 2026' },
  { title: 'Portugal intelligence hub', detail: 'NHR, Golden Visa, IMT brackets, buying process, ES-vs-PT table.', status: 'shipped', quarter: 'Q2 2026' },

  // Building
  { title: 'Kaggle + Hugging Face dataset distribution', detail: 'Full property dataset + score methodology pushed to external ML hubs.', status: 'building', quarter: 'Q3 2026' },
  { title: 'GitHub mirror + Zenodo release', detail: 'Versioned research paper and code with DOI per release.', status: 'building', quarter: 'Q3 2026' },
  { title: 'Third-party PropertyEval adoption', detail: 'Open benchmark with independent evaluators beyond self-scoring.', status: 'building', quarter: 'Q3 2026' },

  // Planned
  { title: 'France scoring (Q3 2026)', detail: 'Expand active scoring from Spain (1,881) to France — Côte d\'Azur + Paris metro first.', status: 'planned', quarter: 'Q3 2026' },
  { title: 'Italy scoring (Q4 2026)', detail: 'Italian coastal + Lakes scoring. OMI integration for local comps.', status: 'planned', quarter: 'Q4 2026' },
  { title: 'Live portal streaming', detail: 'Real-time deal ingestion from dev portals — sub-hour freshness.', status: 'planned', quarter: 'Q4 2026' },
  { title: 'Mobile native app', detail: 'iOS + Android with watchlist sync + push alerts.', status: 'planned', quarter: 'Q1 2027' },
  { title: 'Scandinavia scoring', detail: 'Sweden, Denmark, Norway, Finland — phase 2 macro + scoring.', status: 'planned', quarter: '2027' },
];

const STATUS_META: Record<Status, { label: string; Icon: typeof Check; color: string }> = {
  shipped: { label: 'Shipped', Icon: Check, color: 'hsl(var(--av-primary))' },
  building: { label: 'Building', Icon: Circle, color: 'hsl(var(--av-warning))' },
  planned: { label: 'Planned', Icon: CircleDashed, color: 'hsl(var(--av-muted-foreground))' },
};

export default function RoadmapPage() {
  const grouped = {
    shipped: ITEMS.filter((i) => i.status === 'shipped'),
    building: ITEMS.filter((i) => i.status === 'building'),
    planned: ITEMS.filter((i) => i.status === 'planned'),
  };

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Public roadmap · honest + dated
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              What&apos;s <span className="italic text-gold">next</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              {grouped.shipped.length} shipped · {grouped.building.length} building · {grouped.planned.length} planned.
              Things on the planned list move to building when work starts. Nothing is
              committed-and-invisible — if it&apos;s not here, we&apos;re not working on it yet.
            </p>
          </div>
        </section>

        {(['shipped', 'building', 'planned'] as const).map((s) => {
          const meta = STATUS_META[s];
          const items = grouped[s];
          if (items.length === 0) return null;
          return (
            <section
              key={s}
              className="border-b"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-14">
                <div className="flex items-baseline gap-3 mb-8">
                  <meta.Icon className="h-4 w-4" style={{ color: meta.color }} />
                  <h2 className="font-serif text-3xl font-light tracking-tight text-foreground">
                    {meta.label}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    · {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.title}
                      className="rounded-sm border p-5"
                      style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-serif text-xl text-foreground">{it.title}</h3>
                        {it.quarter && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground flex-shrink-0">
                            {it.quarter}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-light leading-relaxed">{it.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Request a feature: <a href="mailto:henrik@avenaterminal.com" className="text-primary hover:text-gold">henrik@avenaterminal.com</a>
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Past shipped: <Link href="/changelog" className="text-primary hover:text-gold">/changelog</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
