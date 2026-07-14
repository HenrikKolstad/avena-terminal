/**
 * /enquire — the lead-capture page (2026-07-02).
 * The single primary CTA of the buyer-facing site. Pre-fills from
 * ?ref=&name= when reached from a property card.
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { EnquireForm } from './EnquireForm';

export const metadata: Metadata = {
  title: 'Enquire — talk to a human about a coastal deal · Avena',
  description: 'Tell us your budget and region — or ask about a specific scored property. Your enquiry reaches our agent within seconds, and you hear back within the hour.',
  alternates: { canonical: 'https://avenaterminal.com/enquire' },
  robots: { index: true, follow: true },
};

export default function EnquirePage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-16">
        <section className="hero-glow relative mx-auto max-w-[820px] px-5 sm:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Enquire · answered within the hour
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-4 leading-[1.08] tracking-tight">
            Talk to a human about the deal.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
            Tell us what you&apos;re looking for — or ask about a specific property. Your enquiry lands directly with our agent, not a call centre, and you&apos;ll hear back within the hour.
          </p>
          <Suspense fallback={null}>
            <EnquireForm />
          </Suspense>
        </section>
      </main>
      <Footer />
    </>
  );
}
