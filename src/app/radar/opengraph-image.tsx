import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Avena Radar',
    title: 'Every scored property, on the map.',
    italicWord: 'Every',
    metrics: [
      { label: 'Scored', value: '1 881', accent: true },
      { label: 'Countries', value: '10 EU' },
      { label: 'Full cadastral', value: 'Q3 2026' },
    ],
    footerLeft: 'avenaterminal.com/radar',
  });
}
