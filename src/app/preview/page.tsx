import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { Hero } from './_components/Hero';
import { Ticker } from './_components/Ticker';
import { Indices } from './_components/Indices';
import { FeaturedDeals } from './_components/FeaturedDeals';
import { Regions } from './_components/Regions';
import { CTA } from './_components/CTA';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Avena Terminal — Where capital meets conviction | Preview',
  description: 'A real-time intelligence terminal scoring every new-build property across Europe. Find the deals the market hasn\'t priced in — ranked by the Avena Score, 0–100.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://avenaterminal.com/preview' },
};

export default function PreviewPage() {
  return (
    <div className="avena-v2 relative min-h-screen w-full">
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <FeaturedDeals />
        <Indices />
        <Regions />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
