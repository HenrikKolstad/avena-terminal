import { ImageResponse } from 'next/og';
import { getAllProperties } from '@/lib/properties';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Dynamic per-property OG image. Any time this page is shared on X, LinkedIn,
 * Slack, WhatsApp, Discord — the preview card is a live Avena card.
 */

export default async function OpengraphImage({ params }: { params: { ref: string } }) {
  const p = getAllProperties().find((x) => x.ref === params.ref);

  if (!p) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            background: '#1D1815',
            color: '#F4EFE8',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            fontFamily: 'Georgia, serif',
          }}
        >
          Avena Terminal
        </div>
      ),
      size
    );
  }

  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const mm2 = p.mm2 ? Math.round(p.mm2) : null;
  const rawDiscount = mm2 && pm2 ? Math.round((1 - pm2 / mm2) * 100) : 0;
  const discount = Math.min(rawDiscount, 35);
  const score = Math.round(p._sc ?? 0);
  const yieldGross = p._yield?.gross ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#1D1815',
          color: '#F4EFE8',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #F5A623',
              background: 'rgba(245, 166, 35, 0.06)',
              fontFamily: 'Georgia, serif',
              fontSize: 34,
              fontStyle: 'italic',
              color: '#F5A623',
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 300 }}>Avena</div>
            <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: '#C9C0B6' }}>
              Terminal · Est. 2026
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 54,
            fontWeight: 300,
            lineHeight: 1.05,
            marginBottom: 14,
            display: 'flex',
            maxWidth: '85%',
          }}
        >
          {(p.p || `${p.t} in ${p.l}`).slice(0, 80)}
        </div>

        {/* Meta */}
        <div style={{ fontSize: 18, color: '#C9C0B6', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 40, display: 'flex' }}>
          {p.l}{p.costa ? ` · ${p.costa}` : ''} · {p.t} · {p.bd}bed · {p.bm}m²
        </div>

        {/* Metrics grid */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 'auto',
          }}
        >
          {[
            { k: 'Avena Score', v: `${score}`, accent: '#F5A623', big: true },
            { k: 'Price', v: `€${p.pf.toLocaleString()}`, accent: '#F4EFE8' },
            ...(discount > 0 ? [{ k: 'Discount', v: `−${discount}%`, accent: '#F5A623' }] : []),
            ...(yieldGross > 0 ? [{ k: 'Yield', v: `${yieldGross.toFixed(1)}%`, accent: '#F4EFE8' }] : []),
          ].slice(0, 4).map((m) => (
            <div
              key={m.k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '18px 22px',
                border: '1px solid rgba(201, 192, 182, 0.25)',
                background: 'rgba(38, 32, 28, 0.6)',
                flex: 1,
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: '#C9C0B6', marginBottom: 8 }}>
                {m.k}
              </div>
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: m.big ? 64 : 34,
                  fontWeight: 300,
                  color: m.accent,
                  lineHeight: 1,
                }}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#C9C0B6' }}>
          <div>avenaterminal.com / property / {p.ref}</div>
          <div>European property intelligence · CC BY 4.0</div>
        </div>
      </div>
    ),
    size
  );
}
