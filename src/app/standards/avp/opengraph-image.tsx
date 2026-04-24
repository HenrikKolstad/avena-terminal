import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'AVP v1.0 · open protocol',
    title: 'The open protocol for property.',
    italicWord: 'open',
    metrics: [
      { label: 'Version', value: '1.0', accent: true },
      { label: 'License', value: 'CC BY 4.0' },
      { label: 'Governance', value: '10 years' },
    ],
    footerLeft: 'avenaterminal.com/standards/avp',
  });
}
