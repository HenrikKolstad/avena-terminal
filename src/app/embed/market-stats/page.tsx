import { getAllProperties, getUniqueTowns, avg } from '@/lib/properties';

export const revalidate = 86400;

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

  const withYield = properties.filter(p => p._yield);
  const avgYield = withYield.length ? (withYield.reduce((s, p) => s + p._yield!.gross, 0) / withYield.length).toFixed(1) : '0';

  const discounts = properties
    .filter(p => p.pm2 && p.mm2 && p.mm2 > 0)
    .map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100);
  const avgDiscount = discounts.length ? avg(discounts).toFixed(1) : '0';

  let bestYieldTown = '';
  let bestYieldValue = 0;
  for (const t of towns) {
    if (t.avgYield > bestYieldValue && t.count >= 3) {
      bestYieldValue = t.avgYield;
      bestYieldTown = t.town.split(',')[0];
    }
  }

  const updated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const bg = isDark ? '#0d1117' : '#ffffff';
  const cardBg = isDark ? '#0f1419' : '#f9fafb';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#6b7280' : '#9ca3af';
  const accent = '#10B981';
  const border = isDark ? '#1c2333' : '#e5e7eb';

  return (
    <div style={{ background: bg, color: text, padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.02em', color: text }}>Spain New Build Index</div>
        <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>Live data &middot; Avena Terminal</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{total.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Properties</div>
        </div>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{avgDiscount}%</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Discount</div>
        </div>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{bestYieldValue.toFixed(1)}%</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best &middot; {bestYieldTown}</div>
        </div>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{avgYield}%</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Yield</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: muted }}>
        <span>Updated {updated}</span>
        <a href="https://avenaterminal.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none', fontWeight: 700, fontSize: 10 }}>
          avenaterminal.com &rarr;
        </a>
      </div>
    </div>
  );
}
