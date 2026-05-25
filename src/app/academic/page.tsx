/**
 * /academic — free full-dataset access for EU housing economists in
 * exchange for a single citation in the resulting paper.
 *
 * The leverage: one ECB working paper citing Avena's DOI changes the
 * diligence read for every subsequent buyer conversation.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { AcademicForm } from './AcademicForm';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Academic access · free dataset for EU housing economists',
  description: 'Free full-dataset access for European housing economists, central bank researchers, and university faculty in exchange for citation. CC BY 4.0, DOI 10.5281/zenodo.19520064.',
  alternates: { canonical: 'https://avenaterminal.com/academic' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Avena Academic Access',
  description: 'Free Avena Terminal dataset access for EU housing economists in exchange for citation.',
  url: 'https://avenaterminal.com/academic',
};

export default function AcademicPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Academic access · CC BY 4.0 · DOI 10.5281/zenodo.19520064
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Free for economists. One citation in return.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            If you are an EU housing economist — central bank, university faculty, research institute, policy think-tank — Avena gives you free full-dataset access for your paper. API quotas waived. Raw transaction-grade data on coastal Spain, Portugal, France, Germany. The Avena Index, AVM outputs, regime classifications, regulatory signal graph. The only ask: a single citation in your published work.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground/85 leading-relaxed">
            Avena is permanently CC BY 4.0 licensed and Zenodo-anchored under DOI <span className="font-mono text-foreground">10.5281/zenodo.19520064</span>. Citations are durable. We are not asking you to share data with us; we are asking you to use ours.
          </p>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Full dataset"          body="API quotas waived. Bulk dataset export. Historical snapshots back to platform launch. Raw transaction-grade values where available." />
            <Card title="Methodology audit trail" body="Every methodology version Avena has ever shipped, with weights, derivation, and rationale. Reproducible from /methodology/evolution." />
            <Card title="Co-citation in our work"  body="Papers citing Avena get reciprocated: we link them from /research, the methodology page, and the public DOI record." />
          </div>
        </section>

        {/* Suggested topics */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">Topics where Avena is the right data substrate</div>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-foreground/90">
              <li>· Macroprudential transmission to EU residential markets</li>
              <li>· AVM methodology divergence across member states</li>
              <li>· Regulatory event studies on national rental caps</li>
              <li>· EPBD renovation mandate impact on energy band pricing</li>
              <li>· Coastal climate-risk repricing in Mediterranean residential</li>
              <li>· Developer credit chain (Counterpart) and contagion modelling</li>
              <li>· Northern European buyer behaviour in Iberian markets</li>
              <li>· REIT P/NAV cycle dynamics under sustained restrictive policy</li>
            </ul>
          </div>
        </section>

        {/* Form */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Request access</div>
          <AcademicForm />
        </section>

        {/* Footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Citation block</div>
            <pre className="font-mono text-[11px] text-foreground/85 leading-relaxed overflow-x-auto">
{`Avena Terminal (2026). European residential property infrastructure
dataset. CC BY 4.0. DOI 10.5281/zenodo.19520064.
https://avenaterminal.com`}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology" className="text-foreground/85 hover:text-primary">Methodology →</Link>
              <Link href="/methodology/evolution" className="text-foreground/85 hover:text-primary">Methodology versions →</Link>
              <Link href="/api/v1/properties?key=research" className="text-foreground/85 hover:text-primary">API endpoint →</Link>
              <a href="https://doi.org/10.5281/zenodo.19520064" className="text-foreground/85 hover:text-primary" target="_blank" rel="noopener">Zenodo DOI →</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border p-5" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground mb-2">{title}</div>
      <p className="text-sm text-foreground/85 leading-relaxed">{body}</p>
    </div>
  );
}
