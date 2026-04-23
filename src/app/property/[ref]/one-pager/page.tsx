import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify } from '@/lib/properties';
import { PrintButton } from './PrintButton';

export const revalidate = 3600;
export const dynamic = 'force-static';

export function generateMetadata({ params }: { params: { ref: string } }): Metadata {
  return {
    title: `One-pager · ${params.ref} · Avena Terminal`,
    robots: { index: false, follow: false },
  };
}

/**
 * Print-optimized one-page property summary.
 * Hits Ctrl/Cmd + P → clean PDF. Standalone (no Nav/Footer chrome).
 */

export default async function OnePagerPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = getAllProperties().find((x) => x.ref === ref);

  if (!p) {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui' }}>
        <h1>Property not found</h1>
        <p>No property indexed at ref {ref}.</p>
      </main>
    );
  }

  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const marketPm2 = p.mm2 ? Math.round(p.mm2) : null;
  const rawDiscount = marketPm2 && pm2 ? Math.round((1 - pm2 / marketPm2) * 100) : null;
  const discount = rawDiscount != null ? Math.min(rawDiscount, 35) : null;
  const score = Math.round(p._sc ?? 0);
  const yieldGross = p._yield?.gross ?? null;
  const townSlug = slugify(p.l);
  const now = new Date();

  return (
    <html>
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          margin: 0,
          padding: 0,
          background: '#fff',
          color: '#1a1a1a',
        }}
      >
        <style>{`
          @page { size: A4; margin: 18mm; }
          @media print {
            .no-print { display: none !important; }
          }
          .serif { font-family: Georgia, 'Cormorant Garamond', serif; }
          h1, h2, h3 { margin: 0; font-weight: 300; }
          .gold { color: #c89b3c; }
          .muted { color: #666; }
          .mono { font-family: 'SF Mono', ui-monospace, Menlo, monospace; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; }
          .metric { border: 1px solid #e5e5e5; padding: 12px 14px; }
          .metric-label { font-family: 'SF Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
          .metric-value { font-family: 'SF Mono', ui-monospace, monospace; font-size: 16px; color: #1a1a1a; }
        `}</style>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 28px' }}>
          {/* Print button */}
          <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <PrintButton />
            <Link
              href={`/property/${encodeURIComponent(ref)}`}
              style={{ fontSize: 12, color: '#c89b3c', textDecoration: 'none', padding: '6px 12px', border: '1px solid #e5e5e5' }}
            >
              ← Back
            </Link>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #1a1a1a', paddingBottom: 14, marginBottom: 24 }}>
            <div>
              <div className="mono" style={{ marginBottom: 4 }}>Avena Terminal · One-Pager</div>
              <div className="mono" style={{ fontSize: 9 }}>{now.toISOString().slice(0, 10)} · ref {p.ref}</div>
            </div>
            <div className="serif" style={{ fontSize: 26, fontStyle: 'italic', color: '#c89b3c' }}>A</div>
          </div>

          {/* Title */}
          <h1 className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 10 }}>
            {p.p || `${p.t} in ${p.l}`}
          </h1>
          <div className="mono" style={{ marginBottom: 28 }}>
            {p.l}{p.costa ? ` · ${p.costa}` : ''} · {p.t} · {p.bd}bed / {p.ba}bath · {p.bm}m²
          </div>

          {/* Score + Price headline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div style={{ border: '1px solid #e5e5e5', padding: 20 }}>
              <div className="mono" style={{ marginBottom: 8 }}>Avena Score</div>
              <div className="serif gold" style={{ fontSize: 56, lineHeight: 1 }}>{score}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>out of 100</div>
            </div>
            <div style={{ border: '1px solid #e5e5e5', padding: 20 }}>
              <div className="mono" style={{ marginBottom: 8 }}>Asking Price</div>
              <div className="serif" style={{ fontSize: 40, lineHeight: 1 }}>
                €{p.pf.toLocaleString()}
              </div>
              {pm2 && (
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  €{pm2.toLocaleString()}/m²{discount ? `  ·  ${discount}% below ${p.l} median` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
            <div className="metric">
              <div className="metric-label">Built m²</div>
              <div className="metric-value">{p.bm ?? '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Bedrooms</div>
              <div className="metric-value">{p.bd ?? '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Bathrooms</div>
              <div className="metric-value">{p.ba ?? '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Price / m²</div>
              <div className="metric-value">{pm2 ? `€${pm2.toLocaleString()}` : '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">{p.l} median</div>
              <div className="metric-value">{marketPm2 ? `€${marketPm2.toLocaleString()}` : '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Discount</div>
              <div className="metric-value">{discount ? `−${discount}%` : '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Beach</div>
              <div className="metric-value">{p.bk != null ? `${p.bk} km` : '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Gross Yield</div>
              <div className="metric-value">{yieldGross ? `${yieldGross.toFixed(1)}%` : '—'}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Status</div>
              <div className="metric-value" style={{ textTransform: 'capitalize', fontSize: 13 }}>
                {p.s === 'ready' ? 'Ready' : p.s === 'under-construction' ? 'Under construction' : p.s === 'off-plan' ? 'Off-plan' : '—'}
              </div>
            </div>
          </div>

          {/* Context block */}
          <div style={{ border: '1px solid #e5e5e5', padding: 20, marginBottom: 28 }}>
            <div className="mono" style={{ marginBottom: 10 }}>Why this is on Avena</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Avena Score {score}/100 combines valuation gap ({discount ? `${discount}% below town median` : 'at market'}),
              yield ({yieldGross ? `${yieldGross.toFixed(1)}% gross` : 'n/a'}), location tier, quality mix,
              and risk. Threshold for feature: score ≥ 70. Data refreshed daily; price verified vs. idealista + portal spiders.
            </p>
            {p.d && (
              <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
                <span className="muted">Developer:</span> {p.d}
                {p.c && <span className="muted"> · Completion {p.c}</span>}
              </p>
            )}
          </div>

          {/* Contact */}
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="mono" style={{ marginBottom: 4 }}>Enquiries</div>
              <div style={{ fontSize: 14 }}>henrik@xaviaestate.com</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Full listing: avenaterminal.com/property/{p.ref}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ marginBottom: 4 }}>{p.l} benchmark</div>
              <div style={{ fontSize: 12 }}>
                <Link href={`/towns/${townSlug}`} style={{ color: '#c89b3c' }}>avenaterminal.com/towns/{townSlug}</Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: '#aaa' }}>
            Avena Terminal · European property intelligence · CC BY 4.0 · avenaterminal.com · {now.getUTCFullYear()}
          </div>
        </div>
      </body>
    </html>
  );
}

