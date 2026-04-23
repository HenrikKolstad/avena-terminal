import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Daily brief',
    title: 'Markets before coffee.',
    italicWord: 'coffee',
    metrics: [
      { label: 'Published', value: 'Daily 07:00 UTC', accent: true },
      { label: 'Auto-generated', value: 'Live data' },
      { label: 'License', value: 'CC BY 4.0' },
    ],
    footerLeft: 'avenaterminal.com/briefs/daily',
  });
}
