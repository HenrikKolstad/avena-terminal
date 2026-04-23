import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  return renderOgCard({
    eyebrow: 'API Playground',
    title: 'Live API. No key.',
    italicWord: 'Live',
    metrics: [
      { label: 'Endpoints', value: '10+', accent: true },
      { label: 'Key required', value: 'None' },
      { label: 'CORS', value: 'Open' },
      { label: 'License', value: 'CC BY 4.0' },
    ],
    footerLeft: 'avenaterminal.com/playground',
  });
}
