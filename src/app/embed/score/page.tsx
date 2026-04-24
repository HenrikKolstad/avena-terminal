import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Embed a property score — Avena Terminal',
  description: 'Drop a live Avena Score card into any blog, listing page or brokerage site. 320×180 iframe, one line of HTML.',
  alternates: { canonical: 'https://avenaterminal.com/embed/score' },
};

const EXAMPLE_REF = 'N9171';

export default function EmbedScoreLandingPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Embed · 320×180 · iframe
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.98] tracking-tight text-foreground mb-6">
              Embed an <span className="italic text-gold">Avena Score</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              Drop a live score card into any webpage — a blog post, a
              brokerage listing, a research memo. 320×180 iframe, one line of
              HTML. Updates hourly. Click-through opens the full property on
              Avena Terminal.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">Live preview</h2>
            <div
              className="rounded-sm border p-8 flex items-center justify-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <iframe
                src={`/embed/score/${EXAMPLE_REF}`}
                width={320}
                height={180}
                frameBorder={0}
                title="Avena Score embed preview"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">Install</h2>
            <CodeBlock label="HTML" code={`<iframe
  src="https://avenaterminal.com/embed/score/${EXAMPLE_REF}"
  width="320"
  height="180"
  frameborder="0"
></iframe>`} />
            <p className="mt-6 text-sm text-muted-foreground font-light">
              Replace <code className="font-mono text-primary">{EXAMPLE_REF}</code> with any Avena property ref.
              Not sure of the ref? Open the property on{' '}
              <a href="https://avenaterminal.com/#deals" className="text-primary hover:text-gold">avenaterminal.com/#deals</a>
              {' '}and copy the last segment of the URL.
            </p>
          </div>
        </section>

        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">Other embed surfaces</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: 'Score badge (SVG)', sub: '/badge/{ref}.svg', href: '/badge' },
                { title: 'Bubble scanner card', sub: '/embed/bubble?city=munich', href: '/integrate/widget' },
                { title: 'AVENA Index feed', sub: '/api/v1/indices/avena', href: '/indices/avena' },
              ].map((c) => (
                <a
                  key={c.title}
                  href={c.href}
                  className="rounded-sm border p-5 hover:border-primary/50 transition-colors"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="font-serif text-base text-foreground mb-1">{c.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.sub}</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            No API key · CORS open · CC BY 4.0 · attribution appreciated
          </p>
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
        className="rounded-sm border px-4 py-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre"
        style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border) / 0.6)' }}
      >
        {code}
      </pre>
    </div>
  );
}
