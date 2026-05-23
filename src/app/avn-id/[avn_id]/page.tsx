import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { lookupAVNID, verifyAVNID } from '@/lib/avn-id-registry';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ avn_id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { avn_id } = await params;
  return {
    title: `${decodeURIComponent(avn_id)} · AVN-ID Registry · Avena Terminal`,
    description: `Canonical, signed identifier ${decodeURIComponent(avn_id)} resolves at the Avena AVN-ID Registry. Public verification, CC BY 4.0.`,
    alternates: { canonical: `https://avenaterminal.com/avn-id/${avn_id}` },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  NB: 'New-build', EX: 'Existing / resale', CM: 'Commercial', LH: 'Leasehold', FR: 'Fractional', PL: 'Land parcel',
};

export default async function AVNIDDetailPage({ params }: PageProps) {
  const { avn_id } = await params;
  const decoded = decodeURIComponent(avn_id);
  const record = await lookupAVNID(decoded);
  if (!record) notFound();
  const valid = verifyAVNID(record.avn_id, record.payload_hash, record.signature);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <article className="mx-auto max-w-[900px] px-5 sm:px-12 py-12 sm:py-16">
          <header className="border-b pb-8 mb-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">AVN-ID Registry · Issued Identifier</div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light leading-[1.0] tracking-tight text-foreground mb-4 break-all">
              {record.avn_id}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ background: valid ? 'hsl(var(--av-success) / 0.15)' : 'hsl(var(--av-destructive) / 0.15)', color: valid ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))' }}>
                {valid ? '✓ Signature valid' : '✗ Signature invalid'}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Issued {new Date(record.issued_at).toISOString().slice(0, 16).replace('T', ' ')} UTC by {record.issuer}
              </span>
            </div>
          </header>

          <section className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Identity</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Country (ISO 3166-1)" value={record.country} />
              <Field label="Postal code" value={record.postal_code} />
              <Field label="Category" value={`${record.category} · ${CATEGORY_LABELS[record.category] ?? 'unknown'}`} />
              <Field label="Sequence" value={record.seq} />
            </div>
          </section>

          <section className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cryptographic provenance</div>
            <div className="rounded-sm border p-5 font-mono text-xs leading-relaxed break-all" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div><span className="text-muted-foreground">payload_hash</span> <span className="text-foreground">= sha256(fingerprint)</span></div>
              <div className="text-primary">{record.payload_hash}</div>
              <div className="mt-3"><span className="text-muted-foreground">signature</span> <span className="text-foreground">= HMAC-SHA256(avn_id::payload_hash, secret)[:32]</span></div>
              <div className="text-primary">{record.signature}</div>
              <div className="mt-3"><span className="text-muted-foreground">issuer</span> <span className="text-foreground">= {record.issuer}</span></div>
              <div><span className="text-muted-foreground">issued_at</span> <span className="text-foreground">= {record.issued_at}</span></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Any consumer can verify this AVN-ID by calling <code className="font-mono text-primary">GET /api/v1/avn-id/{encodeURIComponent(record.avn_id)}</code> — the response carries the same signature and a recomputed verification result. If they don&apos;t match, the record has been tampered with.
            </p>
          </section>

          <section className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Canonical fingerprint</div>
            <pre className="rounded-sm border p-5 font-mono text-xs overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <code>{JSON.stringify(record.fingerprint, null, 2)}</code>
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              These inputs are hashed deterministically to produce <code className="font-mono text-foreground">payload_hash</code>. Issuing the same fingerprint twice returns this exact AVN-ID — the registry is idempotent.
            </p>
          </section>

          <footer className="pt-8 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite as</div>
            <div className="rounded-sm border p-4 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              <div className="text-muted-foreground">Avena Terminal (2026). AVN-ID Registry.</div>
              <div className="text-foreground">{record.avn_id}</div>
              <div className="text-primary mt-1">avenaterminal.com/avn-id/{record.avn_id} · DOI 10.5281/zenodo.19520064</div>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/avn-id" className="text-foreground hover:text-primary">Back to registry</Link> · <Link href="/standards/avn-id" className="text-foreground hover:text-primary">View spec</Link> · CC BY 4.0
            </p>
          </footer>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
      <div className="font-mono text-sm text-foreground tabular">{value}</div>
    </div>
  );
}
