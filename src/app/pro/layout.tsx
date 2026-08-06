import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avena PRO — Live Spanish Property Intelligence',
  description:
    'The full Avena intelligence stack: unlimited Oracle, live alpha signals, developer stress scores, and Spanish coastal property data.',
  alternates: { canonical: 'https://avenaterminal.com/pro' },
  openGraph: {
    title: 'Avena PRO — Live Spanish Property Intelligence',
    description:
      'The full Avena intelligence stack: unlimited Oracle, live alpha signals, developer stress scores, and Spanish coastal property data.',
    url: 'https://avenaterminal.com/pro',
    siteName: 'Avena',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Avena PRO — Live Spanish Property Intelligence',
    description:
      'The full Avena intelligence stack: unlimited Oracle, live alpha signals, developer stress scores, and Spanish coastal property data.',
  },
};

export default function ProLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
