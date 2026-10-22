import type { Metadata } from 'next';
import { TrackRecordView } from '@/components/reports/TrackRecordView';
import { PrintButton } from '@/components/reports/PrintButton';
import { loadInstitutionalSample } from '@/lib/institutional-load';

export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Score track record, printable | Avena Terminal',
  description: 'Printable comparison of stored scores with later asking prices and feed exits.',
  robots: { index: false, follow: false },
};

export default async function TrackRecordPrintPage() {
  const data = await loadInstitutionalSample();
  return (
    <div className="avena-v2 rpt-paper min-h-screen">
      <main>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 pt-8 policy-print-hide">
          <PrintButton />
        </div>
        <TrackRecordView data={data} />
      </main>
    </div>
  );
}
