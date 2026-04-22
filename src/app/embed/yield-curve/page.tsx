import { getAllProperties, avg } from '@/lib/properties';

export const revalidate = 3600;

export const metadata = {
  title: 'Yield Curve — Avena Terminal',
  description: 'Live yield curve by beach-distance band.',
  robots: { index: false, follow: false },
};

const BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: '0–0.5km', min: 0, max: 0.5 },
  { label: '0.5–1km', min: 0.5, max: 1 },
  { label: '1–2km', min: 1, max: 2 },
  { label: '2–5km', min: 2, max: 5 },
  { label: '5–10km', min: 5, max: 10 },
  { label: '10km+', min: 10, max: 999 },
];

export default async function EmbedYieldCurve({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const params = await searchParams;
  const theme = params.theme === 'light' ? 'light' : 'dark';
  const dark = theme === 'dark';
  const all = getAllProperties();

  const points = BANDS.map((b) => {
    const matched = all.filter(
      (p) => p.bk != null && p.bk >= b.min && p.bk < b.max && p._yield?.gross
    );
    const y = matched.length > 0 ? avg(matched.map((p) => p._yield!.gross)) : 0;
    return { label: b.label, yield: y, count: matched.length };
  });

  const maxYield = Math.max(...points.map((p) => p.yield), 7);
  const bg = dark ? '#1D1815' : '#ffffff';
  const fg = dark ? '#F4EFE8' : '#1D1815';
  const muted = dark ? '#8B827A' : '#6B625A';
  const border = dark ? '#3B3530' : '#D9D4CD';
  const gold = '#F5A623';

  return (
    <html>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
        <div
          style={{
            width: 480,
            background: bg,
            color: fg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div style={{ background: `linear-gradient(90deg, ${gold}, #E07A1F)`, height: 3 }} />
          <div
            style={{
              padding: '10px 16px',
              fontSize: 10,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: gold,
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Spanish Property Yield Curve</span>
            <span style={{ color: muted }}>{all.length.toLocaleString()} props</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120, borderBottom: `1px solid ${border}`, paddingBottom: 6 }}>
              {points.map((p) => {
                const h = Math.max(4, (p.yield / maxYield) * 100);
                return (
                  <div key={p.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: gold, fontWeight: 600, fontFamily: 'Menlo, Consolas, monospace' }}>
                      {p.yield.toFixed(1)}%
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: `${h}%`,
                        background: `linear-gradient(180deg, ${gold}, #E07A1F)`,
                        borderRadius: 2,
                      }}
                      title={`${p.label}: ${p.yield.toFixed(2)}% yield (${p.count} props)`}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {points.map((p) => (
                <div
                  key={p.label}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    color: muted,
                    fontFamily: 'Menlo, Consolas, monospace',
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: `1px solid ${border}`,
                fontSize: 10,
                color: muted,
                textAlign: 'center',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Gross yield by distance from beach · <a href="https://avenaterminal.com/yield" style={{ color: gold, textDecoration: 'none' }}>avenaterminal.com/yield</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
