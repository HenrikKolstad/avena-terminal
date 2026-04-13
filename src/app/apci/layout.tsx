import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'APCI \u2014 Avena Property Consciousness Index | Avena Terminal',
  description:
    'The APCI is a real-time composite index (0\u2013100) measuring European property market health across 8 dimensions. Like the VIX for stocks, but for property.',
  alternates: { canonical: 'https://avenaterminal.com/apci' },
  openGraph: {
    title: 'APCI \u2014 Avena Property Consciousness Index',
    description:
      'Real-time composite index measuring European property market health across 8 dimensions: valuation balance, developer health, macro support, price momentum, anomaly density, regime confidence, foreign demand, and supply balance.',
    url: 'https://avenaterminal.com/apci',
    siteName: 'Avena Terminal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APCI \u2014 Avena Property Consciousness Index',
    description: 'Real-time composite index (0\u2013100) for European property markets.',
    site: '@avenaterminal',
  },
};

export default function APCILayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
