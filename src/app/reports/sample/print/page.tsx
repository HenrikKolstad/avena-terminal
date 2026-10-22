import type { Metadata } from 'next';
import { FundReportView } from '@/components/reports/FundReportView';
import { PrintButton } from '@/components/reports/PrintButton';
import { loadInstitutionalSample } from '@/lib/institutional-load';

export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Sample fund report, printable | Avena Terminal',
  description: 'Printable specimen of the Spanish coastal new-build asking-price report.',
  robots: { index: false, follow: false },
};

export default async function SampleReportPrintPage() {
  const data = await loadInstitutionalSample();
  return (
    <div className="avena-v2 rpt-paper min-h-screen">
      <main>
        <div className="mx-auto max-w-[1100px] px-5 sm:px-12 pt-8 policy-print-hide">
          <PrintButton />
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Use the print dialog and choose Save as PDF. Navigation is omitted from this version.
          </p>
        </div>
        <FundReportView data={data} />
      </main>
    </div>
  );
}
