import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'Avena Agent · autonomous',
    title: 'The AI that buys property.',
    italicWord: 'buys',
    metrics: [
      { label: 'Scans', value: 'Live inventory', accent: true },
      { label: 'Ranks', value: 'By fit 0–100' },
      { label: 'Drafts', value: 'Outreach per match' },
      { label: 'Sends', value: 'Only on approval' },
    ],
    footerLeft: 'avenaterminal.com/agent',
  });
}
