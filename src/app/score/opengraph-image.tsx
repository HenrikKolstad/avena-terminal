import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Open Scoring Engine · MIT',
    title: 'Score any property.',
    italicWord: 'any',
    metrics: [
      { label: 'Paste URL', value: '→ Score', accent: true },
      { label: 'License', value: 'MIT' },
      { label: 'Data', value: 'CC BY 4.0' },
      { label: 'Cost', value: 'Free' },
    ],
    footerLeft: 'avenaterminal.com/score',
  });
}
