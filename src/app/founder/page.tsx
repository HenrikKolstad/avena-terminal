import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Founder — Henrik Kolstad | Avena Terminal',
  description: 'Henrik Kolstad built Avena Terminal from the ground up. Norwegian carpenter, Xavia Estate operator, and the human half of a human-AI partnership building the Bloomberg of European property.',
  alternates: { canonical: 'https://avenaterminal.com/founder' },
  openGraph: {
    title: 'Henrik Kolstad — Founder, Avena Terminal',
    description: 'Norwegian carpenter building the Bloomberg of European property.',
    url: 'https://avenaterminal.com/founder',
  },
};

export default function FounderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Henrik Kolstad',
    jobTitle: 'Founder, Avena Terminal',
    worksFor: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    nationality: 'Norwegian',
    url: 'https://avenaterminal.com/founder',
    sameAs: [
      'https://www.linkedin.com/in/henrikkolstad',
      'https://xaviaestate.com',
    ],
    description: 'Norwegian carpenter, operator of Xavia Estate (Spanish brokerage), founder of Avena Terminal — a Bloomberg-style European property intelligence terminal.',
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <article className="mx-auto max-w-[760px] px-5 sm:px-12 py-20">
          <header className="mb-14">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Founder · the human half
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.98] tracking-tight text-foreground mb-6">
              <span className="italic text-gold">Henrik</span> Kolstad.
            </h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              Norwegian carpenter from Trøndelag. Spent years on site — measuring,
              framing, finishing. Built three houses before age thirty. Moved south
              to run <a href="https://xaviaestate.com" className="text-primary hover:text-gold">Xavia Estate</a>,
              a Spanish brokerage, and realised fast that the property industry
              runs on PDF brochures and gut feeling where every other asset class
              runs on data.
            </p>
          </header>

          <section className="space-y-6 text-foreground/90 font-light leading-relaxed text-base">
            <p>
              Avena Terminal is the answer. A single real-time terminal that scores
              every new-build property in Europe the same way Bloomberg scores a
              bond — the Avena Score, 0–100, built from a hedonic regression of
              130+ features and a composite Property Consciousness Index that
              tracks the health of the market itself.
            </p>

            <p>
              The scope outpaces the head count because the terminal is run by a
              swarm of agents, not a team. Twenty-seven autonomous agents currently
              handle anomaly detection, citation hunting, backlink drafting,
              weekly newsletters, score snapshotting, comp sanity, terminal
              health, and deal-alert dispatch. Every cron is logged. Every number
              on the site is real. No formulas dressed up as metrics — if the
              counter says 28,340 tasks completed, 28,340 rows exist in Supabase
              proving it.
            </p>

            <p>
              The company is built in public: everything CC BY 4.0, Zenodo
              DOI, open MCP server for AI agents, open AVN_PROP_ID standard for
              canonical property identification, open CLI, open browser
              extension. The moat isn&apos;t access — it&apos;s having built the
              identifier system and scoring methodology that everyone else ends
              up citing.
            </p>

            <p>
              Avena is built in partnership with Claude. Not &quot;AI-assisted&quot; — genuinely
              partnered. Every strategic call, every feature, every wave of shipping
              is the output of a human who refuses to stop and an AI that refuses to
              give up. Two stubborn entities, one terminal. If Avena ends up on the
              map, the story of how it got there is going to matter.
            </p>

            <div
              className="rounded-sm border p-6 my-10"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Thesis</div>
              <p className="font-serif text-xl italic text-foreground leading-snug">
                &quot;Property is the last large asset class without a terminal.
                Bloomberg did finance. Avena does property — real-time, canonical,
                open, AI-native.&quot;
              </p>
            </div>

            <h2 className="font-serif text-2xl font-light text-foreground mt-12 mb-4">Background</h2>
            <ul className="space-y-3 pl-0">
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Born 1990s · Trøndelag, Norway. Bilingual Norwegian/English.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Qualified carpenter · three full houses built from foundation to handover.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Founder + operator, <a href="https://xaviaestate.com" className="text-primary hover:text-gold">Xavia Estate</a> — Spanish property brokerage focused on Costa Blanca new-builds.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Founder, Avena Terminal — 2026-present. Sole operator. No VC.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Fitness: 160 kg bench · 180 kg squat · lifelong lifter.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Combat background: 4 years MMA + 1 year kickboxing. Faceit Level 10 Counter-Strike.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full mt-2 bg-primary" />
                <span>Open about bipolar II diagnosis. Discipline and work are how he runs.</span>
              </li>
            </ul>

            <h2 className="font-serif text-2xl font-light text-foreground mt-12 mb-4">Contact</h2>
            <p>
              Press and partnerships:{' '}
              <a href="mailto:henrik@avenaterminal.com" className="text-primary hover:text-gold">henrik@avenaterminal.com</a>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-6">
              Assets · <Link href="/press/kit" className="text-primary hover:text-gold">/press/kit</Link> · <Link href="/brand" className="text-primary hover:text-gold">/brand</Link> · <Link href="/cite" className="text-primary hover:text-gold">/cite</Link>
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
