import type { Metadata } from 'next';
import { ArrowUpRight, Check, Mail } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { ACCESS_EMAIL, ACCESS_OFFERS, accessMailto, offerMailto } from '@/lib/access-offers';

export const metadata: Metadata = {
  title: 'Institutional access · Avena Terminal',
  description:
    'Avena Terminal access for lenders, funds, valuers and estate agents: daily new-build sell-through data on the Spanish coasts. Access by request.',
  alternates: { canonical: 'https://avenaterminal.com/access' },
  openGraph: {
    title: 'Institutional access · Avena Terminal',
    description: 'Sell-through monitoring for lenders and funds, and a Buyer Desk for agents. Access by request.',
    url: 'https://avenaterminal.com/access',
    siteName: 'Avena',
    type: 'website',
  },
};

export default function AccessPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1200px] px-5 sm:px-12">
            <div className="text-center">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Institutional access
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              </span>
              <h1 className="font-serif text-5xl sm:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Access by <span className="italic text-gold">request</span>.
              </h1>
              <p className="mx-auto mt-8 max-w-xl font-light text-base text-muted-foreground sm:text-lg">
                Daily new-build sell-through data on the Spanish coasts, for lenders, funds, valuers and
                estate agents. Every plan starts with a complimentary two-week trial on your own projects.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              {ACCESS_OFFERS.map(o => (
                <div
                  key={o.id}
                  className="flex flex-col rounded-sm border p-7"
                  style={{ borderColor: 'hsl(var(--av-border-strong))', background: 'hsl(var(--av-surface) / 0.4)' }}
                >
                  <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{o.audience}</div>
                  <h2 className="mt-3 font-serif text-2xl font-light text-foreground">{o.name}</h2>
                  <div className="mt-2 font-mono text-sm tabular text-primary">{o.price}</div>
                  <ul className="mt-5 flex-1 space-y-2">
                    {o.includes.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85 font-light">
                        <Check className="h-3.5 w-3.5 mt-1 flex-shrink-0" style={{ color: 'hsl(var(--av-primary))' }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={offerMailto(o)}
                    className="mt-7 inline-flex items-center justify-center gap-2 rounded-sm border px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
                    style={{ borderColor: 'hsl(var(--av-primary) / 0.45)' }}
                  >
                    Request access <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <a
                href={accessMailto()}
                className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                <Mail className="h-3.5 w-3.5" />
                Contact for access
              </a>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {ACCESS_EMAIL} · replies by email
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
