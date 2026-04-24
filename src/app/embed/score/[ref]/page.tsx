import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;
export const dynamic = 'force-static';

export function generateMetadata({ params }: { params: { ref: string } }) {
  return {
    title: `Avena Score · ${params.ref}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Embeddable per-property score card. 320×180 iframe drop-in.
 * Usage:
 *   <iframe src="https://avenaterminal.com/embed/score/N9171"
 *           width="320" height="180" frameborder="0"></iframe>
 */

export default async function EmbedScorePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = getAllProperties().find((x) => x.ref === ref);

  if (!p || p._sc == null) {
    return (
      <html>
        <body style={{ margin: 0, padding: 0, background: '#1D1815' }}>
          <div style={{ width: 320, height: 180, padding: 20, color: '#C9C0B6', fontFamily: 'system-ui, sans-serif', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1D1815' }}>
            Property not found
          </div>
        </body>
      </html>
    );
  }

  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const mm2 = p.mm2 ? Math.round(p.mm2) : null;
  const disc = pm2 && mm2 && mm2 > pm2 ? Math.min(Math.round((1 - pm2 / mm2) * 100), 35) : 0;
  const score = Math.round(p._sc);
  const scoreColor = score >= 80 ? '#F5A623' : score >= 65 ? '#F5B555' : score >= 50 ? '#C9C0B6' : '#E05A5A';
  const title = (p.p || `${p.t} in ${p.l}`).slice(0, 54);

  return (
    <html>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=320" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#1D1815' }}>
        <a
          href={`https://avenaterminal.com/property/${encodeURIComponent(ref)}`}
          target="_blank"
          rel="noopener"
          style={{
            display: 'block',
            width: 320,
            height: 180,
            background: '#1D1815',
            color: '#F4EFE8',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            padding: '16px 20px',
            boxSizing: 'border-box',
            border: '1px solid rgba(245, 166, 35, 0.35)',
            textDecoration: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(245, 166, 35, 0.4)',
                background: 'rgba(245, 166, 35, 0.06)',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 14,
                color: '#F5A623',
              }}
            >A</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#F4EFE8' }}>Avena</div>
            <div style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#C9C0B6' }}>{ref}</div>
          </div>

          {/* Score + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: 1, color: scoreColor, fontWeight: 300 }}>
                {score}
              </div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6', marginTop: 2 }}>
                Avena Score
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#F4EFE8', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6', marginTop: 4 }}>
                {p.l}{p.costa ? ` · ${p.costa}` : ''}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(59, 53, 48, 0.5)' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6' }}>Price</div>
              <div style={{ fontSize: 13, fontFamily: 'SF Mono, ui-monospace, monospace', color: '#F4EFE8', marginTop: 2 }}>
                €{p.pf.toLocaleString()}
              </div>
            </div>
            {pm2 && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6' }}>€/m²</div>
                <div style={{ fontSize: 13, fontFamily: 'SF Mono, ui-monospace, monospace', color: '#F4EFE8', marginTop: 2 }}>
                  €{pm2.toLocaleString()}
                </div>
              </div>
            )}
            {disc > 0 && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6' }}>Discount</div>
                <div style={{ fontSize: 13, fontFamily: 'SF Mono, ui-monospace, monospace', color: '#F5A623', marginTop: 2 }}>
                  −{disc}%
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C9C0B6', opacity: 0.7 }}>
            avenaterminal.com
          </div>
        </a>
      </body>
    </html>
  );
}
