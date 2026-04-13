import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scenario Engine \u2014 Monte Carlo Stress Test | Avena Terminal',
  description:
    'Stress-test European property markets with Monte Carlo simulation. Adjust ECB rates, GDP, and FX to see projected APCI, resilient properties, and vulnerable positions.',
  alternates: { canonical: 'https://avenaterminal.com/scenarios' },
  openGraph: {
    title: 'Scenario Engine \u2014 Monte Carlo Stress Test',
    description:
      'Stress-test European property markets. Adjust ECB rates, GDP, FX. See projected APCI and resilient vs vulnerable properties.',
    url: 'https://avenaterminal.com/scenarios',
    siteName: 'Avena Terminal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scenario Engine \u2014 Monte Carlo Stress Test',
    description: 'Stress-test European property markets with Monte Carlo simulation.',
    site: '@avenaterminal',
  },
};

export default function ScenariosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
