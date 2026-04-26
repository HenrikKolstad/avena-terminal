import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';
import { verifyAvpOffer, type AvpOfferDocument } from '@/lib/avp-offer';
import { Shield, ShieldCheck, ShieldX, ArrowUpRight, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify AVP signature — Avena Standards',
  description: 'Cryptographically verify any AVP-signed Avena document. Paste a SHA-256 signature to retrieve and validate the original signed payload.',
  alternates: { canonical: 'https://avenaterminal.com/standards/avp/verify' },
  openGraph: {
    title: 'Verify AVP signature — Avena Standards',
    description: 'Public cryptographic verification for any AVP-signed Avena document.',
    url: 'https://avenaterminal.com/standards/avp/verify',
  },
};

interface EventRow {
  mission_id: number;
  occurred_at: string;
  event_type: string;
  property_ref: string | null;
  to_email: string | null;
  subject: string | null;
  signature: string;
  prev_signature: string | null;
  avp_doc: AvpOfferDocument | null;
}

async function lookup(sig: string): Promise<EventRow | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('mission_events')
      .select('mission_id, occurred_at, event_type, property_ref, to_email, subject, signature, prev_signature, avp_doc')
      .eq('signature', sig)
      .maybeSingle();
    return (data as EventRow | null) ?? null;
  } catch {
    return null;
  }
}

export default async function AvpVerifyPage({ searchParams }: { searchParams: Promise<{ sig?: string }> }) {
  const { sig: rawSig } = await searchParams;
  const sig = (rawSig ?? '').trim().toLowerCase();
  const sigValid = /^[0-9a-f]{64}$/.test(sig);

  let row: EventRow | null = null;
  let cryptoVerified: boolean | null = null;
  if (sigValid) {
    row = await lookup(sig);
    if (row?.avp_doc) {
      try { cryptoVerified = verifyAvpOffer(row.avp_doc); } catch { cryptoVerified = false; }
    }
  }

  return (
    <div className="avena-v2 min-h-screen overflow-x-hidden">
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14 sm:py-16">
            <span className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-6">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              AVP v1.0 · public signature verifier
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              Verify any <span className="italic text-gold">AVP signature</span>.
            </h1>
            <p className="text-base text-muted-foreground font-light max-w-2xl">
              Paste any SHA-256 signature emitted by Avena Agent (visible on emails, mission timelines,
              and AVP offer JSON files). The verifier re-canonicalizes the payload, re-hashes it under
              the production secret, and confirms whether the signature is valid.
            </p>
          </div>
        </section>

        {/* Search form */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-10">
            <form action="/standards/avp/verify" method="get" className="rounded-sm border p-5"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <label className="block">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
                  SHA-256 signature
                </div>
                <input
                  type="text"
                  name="sig"
                  defaultValue={sig}
                  placeholder="64-character hex string (e.g. 3c84c4737ddbae828cee4875b7c9d0975bb390fb03c35e3182a0b10e17bc29c8)"
                  className="w-full rounded-sm border px-3 py-3 text-sm bg-transparent text-foreground focus:outline-none focus:border-primary font-mono"
                  style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  spellCheck={false}
                />
              </label>
              <button
                type="submit"
                className="mt-3 inline-flex items-center gap-2 rounded-sm px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                <Shield className="h-3.5 w-3.5" />
                Verify
              </button>
            </form>
          </div>
        </section>

        {/* Result */}
        {sig && (
          <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-12">
              {!sigValid ? (
                <div
                  className="rounded-sm border p-5 flex items-center gap-3"
                  style={{ background: 'hsl(var(--av-warning) / 0.08)', borderColor: 'hsl(var(--av-warning) / 0.4)' }}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--av-warning))' }} />
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-warning))' }}>
                      Invalid format
                    </div>
                    <div className="text-sm text-foreground/85 mt-1">
                      Signature must be exactly 64 hexadecimal characters (0-9, a-f). Got {sig.length} characters.
                    </div>
                  </div>
                </div>
              ) : !row ? (
                <div
                  className="rounded-sm border p-5"
                  style={{ background: 'hsl(var(--av-destructive) / 0.06)', borderColor: 'hsl(var(--av-destructive) / 0.4)' }}
                >
                  <div className="flex items-center gap-3">
                    <ShieldX className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--av-destructive))' }} />
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--av-destructive))' }}>
                        Not found in chain
                      </div>
                      <div className="text-sm text-foreground/85 mt-1">
                        This signature was not issued by Avena. Either it is a forgery, was generated under a different
                        secret, or was logged outside the public mission_events ledger.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="rounded-sm border p-5 mb-6"
                    style={{
                      background: cryptoVerified ? 'hsl(var(--av-primary) / 0.08)' : 'hsl(var(--av-warning) / 0.06)',
                      borderColor: cryptoVerified ? 'hsl(var(--av-primary) / 0.4)' : 'hsl(var(--av-warning) / 0.4)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {cryptoVerified ? (
                        <>
                          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                          <div className="font-serif text-2xl font-light text-foreground">
                            <span className="italic text-gold">Verified.</span> Issued by Avena.
                          </div>
                        </>
                      ) : cryptoVerified === false ? (
                        <>
                          <AlertTriangle className="h-6 w-6 shrink-0" style={{ color: 'hsl(var(--av-warning))' }} />
                          <div className="font-serif text-2xl font-light text-foreground">
                            Found in chain — but signature does not re-validate.
                          </div>
                        </>
                      ) : (
                        <>
                          <Shield className="h-6 w-6 shrink-0 text-primary" />
                          <div className="font-serif text-2xl font-light text-foreground">
                            Found in chain. (No AVP doc attached for re-verification.)
                          </div>
                        </>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      Event type: <span className="text-foreground uppercase tracking-[0.22em] text-[10px]">{row.event_type}</span>
                      <span className="mx-2">·</span>
                      Mission: <Link href={`/agent/mission/${row.mission_id}`} className="text-primary hover:text-gold">AVN-MIS-{row.mission_id}</Link>
                      <span className="mx-2">·</span>
                      {new Date(row.occurred_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                    <div className="px-4 py-2.5 border-b font-mono text-[10px] uppercase tracking-[0.3em] text-primary" style={{ borderColor: 'hsl(var(--av-border) / 0.5)', background: 'hsl(var(--av-surface) / 0.5)' }}>
                      Event payload
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      {row.property_ref && (
                        <Row label="Property">
                          <Link href={`/property/${encodeURIComponent(row.property_ref)}`} className="font-mono text-foreground hover:text-primary break-all" style={{ overflowWrap: 'anywhere' }}>
                            {row.property_ref}
                          </Link>
                        </Row>
                      )}
                      {row.to_email && <Row label="Recipient"><span className="font-mono text-foreground break-all" style={{ overflowWrap: 'anywhere' }}>{row.to_email}</span></Row>}
                      {row.subject && <Row label="Subject"><span className="text-foreground break-words">{row.subject}</span></Row>}
                      <Row label="Signature">
                        <span className="font-mono text-foreground/85 break-all" style={{ overflowWrap: 'anywhere' }}>{row.signature}</span>
                      </Row>
                      {row.prev_signature && (
                        <Row label="Previous (chain)">
                          <Link href={`/standards/avp/verify?sig=${row.prev_signature}`} className="font-mono text-primary hover:text-gold break-all flex items-center gap-1" style={{ overflowWrap: 'anywhere' }}>
                            {row.prev_signature}<ArrowUpRight className="h-3 w-3 shrink-0" />
                          </Link>
                        </Row>
                      )}
                    </div>
                  </div>

                  {/* AVP doc payload */}
                  {row.avp_doc && (
                    <details className="mt-6 rounded-sm border" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                      <summary className="cursor-pointer px-4 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-primary" style={{ background: 'hsl(var(--av-surface) / 0.4)' }}>
                        Full AVP offer document (JSON)
                      </summary>
                      <pre className="p-4 font-mono text-[11px] text-foreground/85 leading-relaxed overflow-x-auto" style={{ background: 'hsl(32 14% 9%)' }}>
{JSON.stringify(row.avp_doc, null, 2)}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* How it works */}
        <section>
          <div className="mx-auto max-w-[900px] px-5 sm:px-12 py-14">
            <h2 className="font-serif text-2xl font-light tracking-tight text-foreground mb-5">
              How <span className="italic text-gold">verification</span> works.
            </h2>
            <ol className="space-y-3 text-base text-foreground/90 font-light leading-relaxed list-decimal pl-6">
              <li>Avena Agent issues every signed event a <span className="font-mono text-primary">SHA-256</span> hash of the canonical JSON payload + previous chain signature + production secret.</li>
              <li>The signature is published in three places: the email header (<span className="font-mono text-primary text-xs">X-Avena-AVP-Signature</span>), the attached JSON file, and the public <span className="font-mono text-primary text-xs">mission_events</span> ledger.</li>
              <li>This verifier reads the signature → looks up the row in the public ledger → re-canonicalizes the AVP document → re-hashes it → returns ✅ if the hashes match.</li>
              <li>Tampering with any single field of any event in the chain breaks every subsequent signature. The chain is mathematically immutable as long as the production secret remains uncompromised.</li>
            </ol>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Spec: <Link href="/standards/avp" className="text-primary hover:text-gold">AVP v1.0</Link>{' '}
              · Reference impl: <span className="text-foreground">src/lib/avp-offer.ts</span> · CC BY 4.0
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-4 items-baseline">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
