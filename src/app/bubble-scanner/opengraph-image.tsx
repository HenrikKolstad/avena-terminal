import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Bubble scanner',
    title: 'Where the next crash lives.',
    italicWord: 'next',
    metrics: [
      { label: 'Cities scanned', value: '30', accent: true },
      { label: 'Risk dimensions', value: '4' },
      { label: 'Updated', value: 'Live' },
    ],
    footerLeft: 'avenaterminal.com/bubble-scanner',
  });
}
