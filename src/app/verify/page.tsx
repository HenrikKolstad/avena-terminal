/**
 * /verify — cryptographically verify any Avena artefact against the
 * integrity log. Architectural Commitment 7.
 *
 * SHA-256 + daily Merkle root, published here. Roots are NOT deposited to
 * Zenodo and carry no external (RFC 3161) timestamp today.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { recentDailyRoots, verifyByHash } from '@/lib/integrity';
import { VerifyForm } from './VerifyForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify · cryptographic integrity for any Avena artefact',
  description: 'Verify any Avena methodology, model output, or dataset snapshot against the published integrity log. SHA-256 fingerprints rolled into a daily Merkle root.',
  alternates: { canonical: 'https://avenaterminal.com/verify' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Avena Verification',
  description: 'Cryptographic integrity verification endpoint for Avena Terminal artefacts.',
  url: 'https://avenaterminal.com/verify',
};

interface Props {
  searchParams: Promise<{ hash?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initial = sp.hash ? await verifyByHash(sp.hash.toLowerCase()) : null;
  const roots = await recentDailyRoots(15);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pt-16 pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-3">
            Architectural Commitment 07 · Cryptographic Verification
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-foreground mb-4 leading-[1.05]">
            Don&apos;t trust us. Verify us.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground leading-relaxed">
            Every methodology version, model snapshot, and dataset batch Avena ships is fingerprinted with SHA-256. Each day, all fingerprints are rolled into a Merkle root, published on this page. The roots are not yet deposited with an external archive, so they carry no third-party timestamp today — treat them as Avena&apos;s own published record.
          </p>
        </section>

        {/* Verify form */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-10">
          <VerifyForm initial={initial} />
        </section>

        {/* Daily roots */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-3">
            Recent daily Merkle roots
          </div>
          {roots.length === 0 ? (
            <div className="rounded-sm border p-8 text-sm text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
              No daily roots yet. The integrity-roll cron at 03:30 UTC will create the first root once fingerprints exist.
            </div>
          ) : (
            <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Merkle root</th>
                    <th className="text-right p-3">Fingerprints</th>
                    <th className="text-left p-3">Zenodo</th>
                  </tr>
                </thead>
                <tbody>
                  {roots.map(r => (
                    <tr key={r.root_date} className="border-b last:border-b-0" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                      <td className="p-3 font-mono text-xs text-foreground tabular whitespace-nowrap">{r.root_date}</td>
                      <td className="p-3 font-mono text-[10px] text-foreground/85 truncate max-w-[400px]" title={r.merkle_root}>{r.merkle_root}</td>
                      <td className="p-3 font-mono text-xs text-foreground tabular text-right">{r.fingerprint_count.toLocaleString()}</td>
                      <td className="p-3 font-mono text-xs">
                        {r.zenodo_url ? (
                          <a href={r.zenodo_url} target="_blank" rel="noopener" className="text-primary hover:underline">{r.zenodo_deposit_id}</a>
                        ) : (
                          <span className="text-muted-foreground/60">not deposited</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Methodology */}
        <section className="mx-auto max-w-[1400px] px-5 sm:px-12 pb-20">
          <div className="rounded-sm border p-6" style={{ borderColor: 'hsl(var(--av-border) / 0.4)', background: 'hsl(var(--av-surface) / 0.2)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold mb-2">Why not blockchain</div>
            <p className="text-sm text-foreground/85 leading-relaxed max-w-3xl">
              A Merkle root lets anyone check that a fingerprinted artefact has not changed since the root was published. What it cannot prove on its own is when it was published: that needs an external timestamp (an RFC 3161 authority, an archive deposit or an on-chain commit), and Avena does not apply one yet. Until it does, these roots are a consistency check, not an independent timestamp.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
              <Link href="/methodology/evolution" className="text-foreground/85 hover:text-primary">Methodology audit trail →</Link>
              <Link href="/timetravel" className="text-foreground/85 hover:text-primary">Event store →</Link>
              <Link href="/defensibility#provenance" className="text-foreground/85 hover:text-primary">Provenance →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
