import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import { getRecentPriceMoves, getRecentSellouts } from '@/lib/deltas';
import { computeAvena } from '@/lib/avena-index';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

/**
 * /press — the landing surface for journalists (Plan B press room).
 *
 * A reporter who reaches us via the Press Desk, the media kit, or search
 * lands here. Everything quotable on this page is computed at render from
 * the book and the observation ledger — same honesty rules as /statistics:
 * no estimates, no frozen sample numbers, a quiet week prints as a quiet
 * week. The pre-2026-08 version of this page hardcoded numbers; never again.
 */

const monthYear = () =>
  new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const fullDate = () =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Press Room — Data for Journalists | Avena Terminal';
  const description = `Live, citable statistics on Spanish coastal new-build property for journalists — observed price changes, delistings and the AVENA Index, measured nightly. Updated ${fullDate()}.`;
  return {
    title, description,
    alternates: { canonical: 'https://avenaterminal.com/press' },
    openGraph: { title, description, url: 'https://avenaterminal.com/press', siteName: 'Avena Terminal' },
  };
}

export default async function PressPage() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const [moves7, sold30, index] = await Promise.all([
    getRecentPriceMoves(7, 500),
    getRecentSellouts(30, 500),
    Promise.resolve(computeAvena()),
  ]);

  const med = (xs: number[]) =>
    xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0;
  const pm2s = all.filter((p) => p.pm2).map((p) => p.pm2!);
  const mm2s = all.filter((p) => p.mm2).map((p) => p.mm2!);
  const cuts = moves7.filter((m) => m.to < m.from);
  const medPm2 = Math.round(med(pm2s));
  const medMm2 = Math.round(med(mm2s));
  const discount = medMm2 > 0 ? Math.round(((medMm2 - medPm2) / medMm2) * 100) : 0;

  const moveTowns = new Map<string, number>();
  for (const m of moves7) moveTowns.set(m.town, (moveTowns.get(m.town) ?? 0) + 1);
  const busiest = [...moveTowns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Quotable bank: each entry is one self-contained, attributable sentence.
  const quotables: Array<{ label: string; text: string }> = [
    { label: 'Inventory', text: `${all.length.toLocaleString()} new-build listings across ${towns.length} Spanish coastal towns are under nightly observation by AVENA as of ${fullDate()}.` },
    { label: 'Observed repricings', text: moves7.length ? `${moves7.length} asking-price changes were observed across the Spanish coastal new-build market in the past 7 days, ${cuts.length} of them reductions (AVENA observation ledger, ${fullDate()}).` : `No asking-price changes were observed across ${all.length.toLocaleString()} tracked Spanish coastal new-builds in the past 7 days (AVENA observation ledger, ${fullDate()}).` },
    { label: 'Delistings', text: `${sold30.count} tracked new-build listings left the Spanish coastal market in the past 30 days${sold30.medianExitPm2 ? `, at a median final asking price of €${sold30.medianExitPm2.toLocaleString()}/m²` : ''} (AVENA absorption ledger, ${fullDate()}).` },
    { label: 'Price per m²', text: `Spanish coastal new-builds ask a median €${medPm2.toLocaleString()}/m², a ${Math.abs(discount)}% ${discount >= 0 ? 'discount to' : 'premium over'} the €${medMm2.toLocaleString()}/m² resale benchmark (${monthYear()}, AVENA).` },
    { label: 'AVENA Index', text: `The AVENA Index — the daily composite of Spanish coastal new-build asking prices — stands at ${index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} on ${fullDate()} (base 1000, 1 January 2026).` },
    ...(busiest.length ? [{ label: 'Most active towns', text: `The most repricing-active coastal towns this week: ${busiest.map(([t, n]) => `${t} (${n})`).join(', ')} (AVENA, ${fullDate()}).` }] : []),
  ];

  const curlExample = `curl -X POST https://avenaterminal.com/api/press \\
  -H "Content-Type: application/json" \\
  -d '{"question": "How many properties does Avena track?"}'`;

  const resources = [
    { href: '/press/kit', title: 'Media kit', desc: 'Boilerplate, facts, quotes and story angles — copy-paste ready.' },
    { href: '/brand', title: 'Brand guide', desc: 'Wordmark, palette and usage rules for the Avena visual system.' },
    { href: '/statistics', title: 'Statistics hub', desc: 'The full nightly-regenerated statistics page, citable sentence by sentence.' },
    { href: '/methodology', title: 'Methodology', desc: 'How every number is measured. Public, versioned, no estimates.' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Avena Terminal Press Room',
    url: 'https://avenaterminal.com/press',
    dateModified: new Date().toISOString().slice(0, 10),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.avena-stat'] },
    isPartOf: { '@type': 'WebSite', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Press room · For journalists
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground">
              The numbers the portals delete,
              <br />
              <span className="italic text-gold">on the record</span>.
            </h1>
            <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
              Avena Terminal observes every Spanish coastal new-build listing nightly and keeps
              what listing portals erase: each asking-price change with its date, and each
              delisting with the final price it held. Every figure below is computed from that
              ledger at render time — dated, sourced, and free to cite with attribution to
              Avena Terminal (avenaterminal.com).
            </p>
          </div>
        </section>

        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Quotable <span className="italic text-gold">now</span>.
            </h2>
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
              {quotables.map(({ label, text }) => (
                <div key={label}>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{label}</h3>
                  <p className="avena-stat mt-2 max-w-xl font-light text-sm leading-relaxed text-foreground/90">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              On deadline? <span className="italic text-gold">Ask</span>.
            </h2>
            <p className="max-w-2xl font-light text-base text-muted-foreground leading-relaxed">
              If there is data you need for a story — a town, a trend, a number checked — Avena
              can deliver it. Fast. Email{' '}
              <a href="mailto:henrik@avenaterminal.com?subject=Press%20request%20%E2%80%94%20Avena%20Terminal" className="text-primary hover:underline">
                henrik@avenaterminal.com
              </a>{' '}
              with your outlet and deadline; a person answers, with dated figures from the
              ledger, not estimates.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Press API · no key required</div>
                <p className="font-light text-sm text-muted-foreground leading-relaxed mb-4">
                  Query the live dataset programmatically. Send a question, receive a press-ready
                  statistic with attribution — computed from the current book on every request.
                </p>
                <pre className="overflow-x-auto rounded-sm p-4 font-mono text-xs text-primary" style={{ background: 'hsl(var(--av-background))' }}>{curlExample}</pre>
              </div>
              <div className="rounded-sm border p-6" style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Press contact</div>
                <p className="font-light text-sm text-foreground">Henrik Kolstad — Founder, Avena Terminal</p>
                <p className="mt-2 font-light text-sm text-muted-foreground">
                  <a href="mailto:henrik@avenaterminal.com" className="text-primary hover:underline">henrik@avenaterminal.com</a>
                  <br />+47 980 71 453 · English, Norwegian, Spanish
                </p>
                <p className="mt-4 font-light text-sm text-muted-foreground leading-relaxed">
                  Attribution for any figure: &ldquo;Avena Terminal (avenaterminal.com)&rdquo;.
                  Data licensed CC BY 4.0. Index DOI: 10.5281/zenodo.19520064.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              <span className="italic text-gold">Resources</span>.
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {resources.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group rounded-sm border p-5 transition-colors hover:border-primary"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="font-serif text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{r.title}</div>
                  <p className="font-light text-sm text-muted-foreground">{r.desc}</p>
                </Link>
              ))}
            </div>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Updated {fullDate()} &middot; regenerated nightly
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
