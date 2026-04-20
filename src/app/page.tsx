import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LiveCitations } from '@/components/v2/LiveCitations';
import { TikTokStrip } from '@/components/v2/TikTokBadge';
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
      <main>
        <Hero />
        <TikTokStrip />
        <Ticker />
        <LiveCitations variant="banner" />
        <FeaturedDeals />
        <Indices />
        <Regions />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
