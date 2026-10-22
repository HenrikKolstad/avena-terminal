import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { TrackRecordView } from '@/components/reports/TrackRecordView';
import { loadInstitutionalSample } from '@/lib/institutional-load';

export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Score track record | Avena Terminal',
  description: 'Stored Avena scores compared with later asking prices and feed exits. The window is short, and the page says so.',
  alternates: { canonical: 'https://avenaterminal.com/track-record' },
};

export default async function TrackRecordPage() {
  const data = await loadInstitutionalSample();
  const description = data.track
    ? `Stored scores from ${data.track.cohortDate} compared with asking prices on ${data.track.outcomeDate}. ${data.track.claim}.`
    : 'Stored scores could not be compared with later snapshots.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Avena score track record',
    description,
    url: 'https://avenaterminal.com/track-record',
  };
  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <TrackRecordView data={data} printableHref="/track-record/print" />
      </main>
      <Footer />
    </div>
  );
}
