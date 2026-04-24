import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';
import { computeAvena } from '@/lib/avena-index';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  const snap = computeAvena();
  return renderOgCard({
    eyebrow: 'AVENA · European New-Build Composite',
    title: `AVENA ${snap.value.toFixed(2)}`,
    italicWord: 'AVENA',
    metrics: [
      { label: 'Value index', value: snap.value_index.toFixed(3), accent: true },
      { label: 'Score index', value: snap.score_index.toFixed(3) },
      { label: 'Depth index', value: snap.depth_index.toFixed(3) },
      { label: 'Ticker', value: 'AVENA.TERMINAL' },
    ],
    footerLeft: 'avenaterminal.com/indices/avena',
  });
}
