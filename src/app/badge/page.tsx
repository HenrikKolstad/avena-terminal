import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Avena Badges — embed live property scores anywhere | Avena Terminal',
  description: 'Drop a live Avena Score SVG badge into any README, blog post, or website. Like shields.io but for European property intelligence.',
  alternates: { canonical: 'https://avenaterminal.com/badge' },
};

const EXAMPLES = [
  {
    title: 'Property score',
    path: '/badge/N9171.svg',
    markdown: '![Avena Score](https://avenaterminal.com/badge/N9171.svg)',
    html: '<a href="https://avenaterminal.com/property/N9171"><img src="https://avenaterminal.com/badge/N9171.svg" alt="Avena Score" /></a>',
  },
  {
    title: 'Town average score',
    path: '/badge/town/torrevieja.svg',
    markdown: '![Torrevieja Avg](https://avenaterminal.com/badge/town/torrevieja.svg)',
    html: '<img src="https://avenaterminal.com/badge/town/torrevieja.svg" alt="Torrevieja avg score" />',
  },
];

export default function BadgePage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Embeddable · live · CC BY 4.0
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.98] tracking-tight text-foreground mb-6">
              Avena <span className="italic text-gold">badges</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              Shields.io-style SVG badges that render the live Avena Score inline.
              Drop them in a GitHub README, a blog post, a research paper — they
              auto-refresh every hour from the same backend the terminal uses.
            </p>
          </div>
        </section>

        {EXAMPLES.map((e) => (
          <section key={e.path} className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">{e.title}</h2>
              <div
                className="rounded-sm border p-8 mb-6 flex items-center justify-center"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.path} alt={e.title} style={{ height: 28 }} />
              </div>
              <div className="space-y-3">
                <CodeBlock label="Markdown" code={e.markdown} />
                <CodeBlock label="HTML" code={e.html} />
                <CodeBlock label="Raw URL" code={`https://avenaterminal.com${e.path}`} />
              </div>
            </div>
          </section>
        ))}

        <section className="py-16">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">Colors</h2>
            <p className="text-sm text-muted-foreground font-light mb-6">
              The right-side color reflects the score band: gold (80+), amber (65–79),
              muted (50–64), red (&lt;50). Refreshes hourly.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              No API key needed · CORS open · cached 1h with stale-while-revalidate
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
      <pre
        className="rounded-sm border px-4 py-3 font-mono text-xs text-foreground overflow-x-auto"
        style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
      >
        {code}
      </pre>
    </div>
  );
}
