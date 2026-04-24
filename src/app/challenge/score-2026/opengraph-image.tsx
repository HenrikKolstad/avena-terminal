import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Avena Score Challenge 2026',
    title: 'Beat our open engine.',
    italicWord: 'our',
    metrics: [
      { label: 'Open until', value: '2026-12-31', accent: true },
      { label: 'Baseline', value: 'v1.0 MIT' },
      { label: 'Data', value: 'CC BY 4.0' },
    ],
    footerLeft: 'avenaterminal.com/challenge/score-2026',
  });
}
