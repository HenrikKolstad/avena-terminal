import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LiveCitations } from '@/components/v2/LiveCitations';
import { TikTokStrip } from '@/components/v2/TikTokBadge';
import { CredentialBar } from '@/components/v2/CredentialBar';
import { CoverageStrip } from '@/components/v2/CoverageStrip';
import { NewsletterForm } from '@/components/v2/NewsletterForm';
import { DealAlertsForm } from '@/components/v2/DealAlertsForm';
import { LaFincaProof } from '@/components/v2/LaFincaProof';
import { Hero } from './preview/_components/Hero';
import { Ticker } from './preview/_components/Ticker';
import { Indices } from './preview/_components/Indices';
import { FeaturedDeals } from './preview/_components/FeaturedDeals';
import { Regions } from './preview/_components/Regions';
import { CTA } from './preview/_components/CTA';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Avena Terminal — Where capital meets conviction',
  description: 'A real-time intelligence terminal scoring every new-build property across Europe. Find the deals the market hasn\'t priced in — ranked by the Avena Score, 0–100.',
  alternates: { canonical: 'https://avenaterminal.com' },
  openGraph: {
    title: 'Avena Terminal — Where capital meets conviction',
    description: 'Real-time European property intelligence. 1,881 scored new-builds. Avena Score 0–100.',
    url: 'https://avenaterminal.com',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Avena Terminal — Where capital meets conviction',
    description: 'Real-time European property intelligence. 1,881 scored new-builds. Avena Score 0–100.',
  },
};

export default function HomePage() {
  return (
    <div className="avena-v2 relative min-h-screen w-full">
      <Nav />
      <main className="pt-16">
        <Ticker />
        <Hero />
        <CredentialBar />
        <CoverageStrip />
        <LaFincaProof />
        <FeaturedDeals />
        <section
          className="border-y"
          style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}
        >
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-16">
            <div className="mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Never miss alpha
              </span>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                Get the <span className="italic text-gold">next deal</span> before the market does.
              </h2>
            </div>
            <DealAlertsForm />
          </div>
        </section>
        <NewsletterForm source="homepage" />
        <LiveCitations variant="banner" />
        <Indices />
        <Regions />
        <TikTokStrip />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
