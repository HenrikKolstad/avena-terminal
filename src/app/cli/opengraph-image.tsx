import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'CLI · npx avena',
    title: 'avena from your terminal.',
    italicWord: 'avena',
    metrics: [
      { label: 'Commands', value: '6' },
      { label: 'Runtime', value: 'Node 18+' },
      { label: 'License', value: 'MIT', accent: true },
    ],
    footerLeft: 'avenaterminal.com/cli',
  });
}
