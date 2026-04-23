import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Coverage',
    title: 'European coverage.',
    italicWord: 'European',
    metrics: [
      { label: 'Markets', value: '14', accent: true },
      { label: 'Cities', value: '30' },
      { label: 'Macro feeds', value: '60+' },
      { label: 'Indices', value: '5' },
    ],
    footerLeft: 'avenaterminal.com/coverage',
  });
}
