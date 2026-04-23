import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Founder · Henrik Kolstad',
    title: 'Carpenter to Bloomberg.',
    italicWord: 'Carpenter',
    metrics: [
      { label: 'From', value: 'Trøndelag, NO' },
      { label: 'Building', value: 'Avena Terminal', accent: true },
      { label: 'Partner', value: 'AI + stubborn' },
    ],
    footerLeft: 'avenaterminal.com/founder',
  });
}
