import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { FundReportView } from '@/components/reports/FundReportView';
import { loadInstitutionalSample } from '@/lib/institutional-load';

export const revalidate = 3600;
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Sample fund report | Avena Terminal',
  description: 'Cross-section and short history of Spanish coastal new-build asking prices, computed from the live book and stored snapshots.',
  alternates: { canonical: 'https://avenaterminal.com/reports/sample' },
};

export default async function SampleReportPage() {
  const data = await loadInstitutionalSample();
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <FundReportView data={data} printableHref="/reports/sample/print" />
      </main>
      <Footer />
    </div>
  );
}
