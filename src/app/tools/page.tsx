'use client';

import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

const tools = [
  {
    title: 'Mortgage Calculator',
    description: 'Estimate monthly mortgage payments, total interest and loan-to-value for Spanish property purchases.',
    href: '/tools/mortgage-calculator',
    eyebrow: 'Finance',
  },
  {
    title: 'Property Tax Calculator',
    description: 'Calculate IVA, ITP, stamp duty, notary, registry and legal fees when buying property in Spain.',
    href: '/tools/tax-calculator',
    eyebrow: 'Tax',
  },
  {
    title: 'ROI Calculator',
    description: 'Model gross yield, net yield, annual cashflow and a full 10-year year-by-year projection.',
    href: '/tools/roi-calculator',
    eyebrow: 'Returns',
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <title>Free Spanish Property Investment Tools | Avena Terminal</title>
      <meta name="description" content="Free tools for Spanish property investors. Mortgage calculator, tax calculator, and ROI calculator for new build properties in Spain." />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">Tools</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Calculators
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                Property investment
                <br />
                <span className="italic text-gold">tools</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Free calculators to help you estimate costs, returns and financing for Spanish property investments.
              </p>
            </div>
          </div>
        </section>

        {/* Tools grid */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-sm border p-8 transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                    {tool.eyebrow}
                  </div>
                  <h2 className="font-serif text-2xl font-light leading-tight text-foreground mb-3 group-hover:text-gold transition-colors">
                    {tool.title}
                  </h2>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                  <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
                    Open tool →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
