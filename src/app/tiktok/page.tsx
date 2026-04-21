import type { Metadata } from 'next';
import { getAllProperties } from '@/lib/properties';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { TikTokLanding } from './TikTokLanding';
import type { TikTokDeal } from './TikTokLanding';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'You saw our TikTok — Avena Terminal',
  description:
    "Spain's best new-build property deals, scored by AI. Find undervalued homes in under 60 seconds. From €79/month — cancel anytime.",
  // robots: noindex so this URL is only for ad destinations, not organic search
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://avenaterminal.com/tiktok' },
  openGraph: {
    title: 'Avena Terminal — Spanish property, scored',
    description:
      "Find undervalued Spanish new builds in 60 seconds. 1,881 properties, AI-scored, yield-calculated.",
    url: 'https://avenaterminal.com/tiktok',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function TikTokPage() {
  const all = getAllProperties();
  const top3: TikTokDeal[] = all
    .filter((p) => p._sc != null && p.pf > 0 && p.pm2 && p.mm2 && p.mm2 > p.pm2)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 3)
    .map((d) => {
      const pm2 = d.pm2 ?? 0;
      const mm2 = d.mm2 ?? 1;
      const built = Math.round(d.bm || 0);
      return {
        ref: d.ref ?? null,
        project: d.p || `${d.t} in ${d.l}`,
        town: d.l,
        type: d.t,
        price: d.pf,
        score: Math.round(d._sc ?? 0),
        discount: Math.round((1 - pm2 / mm2) * 100),
        saved: Math.round((mm2 - pm2) * built),
        thumb: Array.isArray(d.imgs) && d.imgs.length > 0 ? d.imgs[0] : null,
      };
    });

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <TikTokLanding deals={top3} totalProperties={all.length} />
      <Footer />
    </div>
  );
}
