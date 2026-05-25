/**
 * /contribute — onramp for data holders. Notaries, brokers, registries,
 * agencies who hold European residential property data and want it in
 * the open APIP network. Turns Avena from a vendor into a convener.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { ContributeForm } from './ContributeForm';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Contribute data · join the EU property data network',
  description: 'If your organisation holds European residential property data — transactions, listings, valuations, rents, completions — contribute it under APIP. Open standard, public attribution, durable DOI citation.',
  alternates: { canonical: 'https://avenaterminal.com/contribute' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Avena Data Contribution',
  description: 'Onramp for notaries, brokers, registries, and agencies to contribute EU residential property data under the open APIP standard.',
  url: 'https://avenaterminal.com/contribute',
};

export default function ContributePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen" style={{ background: 'hsl(var(--av-background))' }}>
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Data contributor onramp · APIP v1.0 · CC BY 4.0
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Avena is the network, not the vendor.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            If your organisation holds European residential property data — transactions, listings, valuations, rents, completions — there is a public path to contributing it to the open APIP network. You retain ownership. You name the licensing terms. You receive durable public attribution at the Zenodo-anchored DOI. Banks, regulators, and researchers consume the network; we operate the substrate.
          </p>
        </section>

        {/* Who & what */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="grid md:grid-cols-3 gap-4">
            <Card title="Notaries"  body="Closed-transaction data (notarial deeds). The gold standard of price truth. Spain, France, Italy, Germany, Portugal." />
            <Card title="Brokers / Agencies" body="Listing data with asking prices, days-on-market, withdrawals. Volume signal." />
            <Card title="Public registries"  body="Land registries, cadastral services. The structural backbone — ownership, area, age, energy band." />
            <Card title="National statistical agencies" body="INE, Insee, Istat, Destatis. Already feed many of our crons; explore deeper integration." />
            <Card title="Funds / Asset managers" body="Portfolio valuations and performance series under non-commercial terms. Federated learning option available." />
            <Card title="Academic institutions" body="Survey data, longitudinal panels, micro-data already cleared for redistribution. Co-citation flows in both directions." />
          </div>
        </section>

        {/* Why join */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">What contributors receive</div>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-foreground/90">
              <li>· Permanent attribution at the public DOI 10.5281/zenodo.19520064</li>
              <li>· A listing on /data-partners with logo and dataset description</li>
              <li>· Co-citation in every research paper using the contributed segment</li>
              <li>· Co-citation in regulator submissions where the data informs the position</li>
              <li>· Free API access for the contributor&apos;s own research team</li>
              <li>· Methodology audit trail for any model that uses the contributed data</li>
              <li>· Optional federated-learning path: data stays on contributor infrastructure</li>
              <li>· Right to withdraw at any time; we maintain ledger of the withdrawal date</li>
            </ul>
          </div>
        </section>

        {/* Form */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">Propose contribution</div>
          <ContributeForm />
        </section>

        {/* Footer */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Convener, not vendor</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              The structural play is that no single data vendor can be acquired without inheriting the network around it. We are deliberately building Avena so the network — the contributors, the standard, the public DOI, the methodology audit — outlasts any one operator. APIP v1.0 is open. The Foundation governs the standard. Acquirers buying Avena buy access to the substrate, not control of it.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/standards/apip" className="text-foreground/85 hover:text-primary">APIP v1.0 spec →</Link>
              <Link href="/apon-network" className="text-foreground/85 hover:text-primary">APON network →</Link>
              <Link href="/data-partners" className="text-foreground/85 hover:text-primary">Current partners →</Link>
              <Link href="/governance" className="text-foreground/85 hover:text-primary">Governance →</Link>
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
