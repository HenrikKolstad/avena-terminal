import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

export const metadata = {
  title: 'Deal of the Day — Avena Terminal',
  description: 'Top-scored European new-build property of the day.',
  robots: { index: false, follow: false },
};

function fmtEur(n: number): string {
  return `€${n.toLocaleString('en-US').replace(/,/g, ' ')}`;
}

export default async function EmbedDealOfDay({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const params = await searchParams;
  const theme = params.theme === 'light' ? 'light' : 'dark';
  const dark = theme === 'dark';

  const all = getAllProperties();
  const eligible = all.filter(
    (p) =>
      p._sc != null &&
      p.pf > 0 &&
      p.pm2 &&
      p.mm2 &&
      p.mm2 > p.pm2 &&
      (p._sc ?? 0) >= 75
  );
  eligible.sort((a, b) => {
    const sA = (a._sc ?? 0) + (((a.mm2 ?? 0) - (a.pm2 ?? 0)) / (a.mm2 ?? 1)) * 100;
    const sB = (b._sc ?? 0) + (((b.mm2 ?? 0) - (b.pm2 ?? 0)) / (b.mm2 ?? 1)) * 100;
    return sB - sA;
  });
  const top = eligible[0];
  if (!top) return null;

  const bg = dark ? '#1D1815' : '#ffffff';
  const fg = dark ? '#F4EFE8' : '#1D1815';
  const muted = dark ? '#8B827A' : '#6B625A';
  const border = dark ? '#3B3530' : '#D9D4CD';
  const gold = '#F5A623';
  const img =
    Array.isArray(top.imgs) && top.imgs.length > 0 ? top.imgs[0] : null;
  const discount = Math.round((1 - (top.pm2 ?? 0) / (top.mm2 ?? 1)) * 100);
  const score = Math.round(top._sc ?? 0);
  const project = top.p || `${top.t} in ${top.l}`;
  const href = `https://avenaterminal.com/property/${encodeURIComponent(top.ref ?? '')}`;

  return (
    <html>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: 360,
            background: bg,
            color: fg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            overflow: 'hidden',
            textDecoration: 'none',
          }}
        >
          {/* Gold top band */}
          <div style={{ background: `linear-gradient(90deg, ${gold}, #E07A1F)`, height: 3 }} />

          {/* Image */}
          {img && (
            <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={project} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: `linear-gradient(135deg, ${gold}, #E07A1F)`,
                  color: '#1D1815',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Deal of the Day
              </div>
            </div>
          )}

          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: muted }}>
                {top.t} · {top.l}
              </span>
              <span style={{ fontSize: 28, fontWeight: 300, color: gold, fontFamily: 'Georgia, serif' }}>{score}</span>
            </div>
            <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', fontWeight: 300, color: fg, marginBottom: 10, lineHeight: 1.2 }}>
              {project}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${border}` }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: muted }}>Price</div>
                <div style={{ fontSize: 14, color: fg, fontFamily: 'Menlo, Consolas, monospace' }}>{fmtEur(top.pf)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: muted }}>vs Market</div>
                <div style={{ fontSize: 14, color: gold, fontFamily: 'Menlo, Consolas, monospace' }}>−{discount}%</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '8px 0', borderTop: `1px solid ${border}`, fontSize: 9, color: muted, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Powered by Avena Terminal
          </div>
        </a>
      </body>
    </html>
  );
}
