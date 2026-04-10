import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';
import type { Metadata } from 'next';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Spain New Build Index — Avena Terminal',
  robots: 'noindex',
};

export default async function MarketStatsWidget({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const { theme } = await searchParams;
  const isDark = theme !== 'light';

  const properties = getAllProperties();
  const towns = getUniqueTowns();
  const total = properties.length;

  const discounts = properties
    .filter(p => p.pm2 && p.mm2 && p.mm2 > 0)
    .map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100);
  const avgDiscount = avg(discounts);

  let bestYieldTown = '';
  let bestYieldValue = 0;
  for (const t of towns) {
    if (t.avgYield > bestYieldValue && t.count >= 5) {
      bestYieldValue = t.avgYield;
      bestYieldTown = t.town;
    }
  }

  const now = new Date();
  const updated = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const bg = isDark ? '#0d1117' : '#ffffff';
  const text = isDark ? '#e6edf3' : '#1f2937';
  const muted = isDark ? '#8b949e' : '#6b7280';
  const accent = isDark ? '#58a6ff' : '#2563eb';
  const border = isDark ? '#21262d' : '#e5e7eb';
  const statBg = isDark ? '#161b22' : '#f9fafb';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: '12px 14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: bg,
          color: text,
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Spain New Build Index
          </div>
          <div style={{ fontSize: 10, color: muted, marginTop: 1 }}>
            Live data &middot; Avena Terminal
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <div style={{ background: statBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: muted, marginTop: 1 }}>Properties</div>
          </div>
          <div style={{ background: statBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>
              {avgDiscount > 0 ? '-' : '+'}{Math.abs(avgDiscount).toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: muted, marginTop: 1 }}>Avg Discount</div>
          </div>
          <div style={{ background: statBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>{bestYieldValue.toFixed(1)}%</div>
            <div style={{ fontSize: 9, color: muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Top Yield &middot; {bestYieldTown}
            </div>
          </div>
          <div style={{ background: statBg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent }}>{towns.length}</div>
            <div style={{ fontSize: 9, color: muted, marginTop: 1 }}>Towns</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            color: muted,
          }}
        >
          <span>Updated {updated}</span>
          <a
            href="https://avenaterminal.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: accent, textDecoration: 'none', fontWeight: 600, fontSize: 10 }}
          >
            avenaterminal.com &rarr;
          </a>
        </div>
      </body>
    </html>
  );
}
