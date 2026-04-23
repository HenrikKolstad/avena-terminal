import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Track record',
    title: 'Every call. Every outcome.',
    italicWord: 'Every outcome',
    metrics: [
      { label: 'Transparency', value: '100%', accent: true },
      { label: 'Cherry-pick', value: 'Zero' },
      { label: 'Source of truth', value: 'ECB · Eurostat · INE' },
    ],
    footerLeft: 'avenaterminal.com/track-record',
  });
}
