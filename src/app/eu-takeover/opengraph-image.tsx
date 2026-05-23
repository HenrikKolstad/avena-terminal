import { renderOgCard, ogSize, ogContentType } from '@/lib/og-card';
import { totalsToday } from '@/lib/ingestion-swarm';

export const runtime = 'nodejs';
export const size = ogSize;
export const contentType = ogContentType;

export default function OGImage() {
  const t = totalsToday(new Date());
  return renderOgCard({
    eyebrow: 'EU Takeover · live ingestion swarm',
    title: 'Avena is mapping every new-build in Europe.',
    italicWord: 'mapping',
    metrics: [
      { label: 'Ingested today', value: t.ingested.toLocaleString().replace(/,/g, ' '), accent: true },
      { label: 'Countries', value: String(t.countriesActive) },
      { label: 'Agents live', value: String(t.agentsLive) },
      { label: 'Coverage', value: 'Compounding' },
    ],
    footerLeft: 'avenaterminal.com/eu-takeover',
  });
}
