import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

/* ── static config ────────────────────────────────────── */

const REGIONS = ['costa-blanca', 'costa-blanca-south', 'costa-blanca-north', 'costa-calida', 'costa-del-sol', 'all'] as const;
const TYPES   = ['villa', 'apartment', 'penthouse', 'townhouse', 'bungalow', 'all'] as const;
const PRICES  = ['under-150k', 'under-200k', 'under-300k', 'under-500k', '200k-400k', '400k-plus', 'all'] as const;

// Routes that already exist as dedicated pages — skip rendering for these slugs
const RESERVED_SLUGS = new Set(['provenance', 'spain-property-index']);

/* ── helpers ──────────────────────────────────────────── */

function parsePrice(priceSlug: string): { min?: number; max?: number } {
  if (priceSlug === 'all') return {};
  const underMatch = priceSlug.match(/^under-(\d+)k$/);
  if (underMatch) return { max: Number(underMatch[1]) * 1000 };
  const rangeMatch = priceSlug.match(/^(\d+)k-(\d+)k$/);
  if (rangeMatch) return { min: Number(rangeMatch[1]) * 1000, max: Number(rangeMatch[2]) * 1000 };
  if (priceSlug === '400k-plus') return { min: 400000 };
  return {};
}

function regionLabel(slug: string): string {
  if (slug === 'all') return 'Spain';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function typeLabel(slug: string): string {
  if (slug === 'all') return 'Properties';
  return slug.charAt(0).toUpperCase() + slug.slice(1) + 's';
}

function priceLabel(slug: string): string {
  if (slug === 'all') return '';
  const underMatch = slug.match(/^under-(\d+)k$/);
  if (underMatch) return `Under €${underMatch[1]}k`;
  const rangeMatch = slug.match(/^(\d+)k-(\d+)k$/);
  if (rangeMatch) return `€${rangeMatch[1]}k–€${rangeMatch[2]}k`;
  if (slug === '400k-plus') return '€400k+';
  return '';
}

function matchRegion(p: Property, regionSlug: string): boolean {
  if (regionSlug === 'all') return true;
  if (!p.costa) return false;
  return slugify(p.costa) === regionSlug;
}

function matchType(p: Property, typeSlug: string): boolean {
  if (typeSlug === 'all') return true;
  return p.t.toLowerCase() === typeSlug;
}

function matchPrice(p: Property, priceSlug: string): boolean {
  const { min, max } = parsePrice(priceSlug);
  if (min !== undefined && p.pf < min) return false;
  if (max !== undefined && p.pf > max) return false;
  return true;
}

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

/* ── static params (294 combos) ───────────────────────── */

export function generateStaticParams() {
  const params: { slug: string[] }[] = [];
  for (const region of REGIONS) {
    for (const type of TYPES) {
      for (const price of PRICES) {
        params.push({ slug: [region, type, price, 'top-scored'] });
      }
    }
  }
  return params;
}

/* ── metadata ─────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug.length === 1 && RESERVED_SLUGS.has(slug[0])) return {};

  const [regionSlug = 'all', typeSlug = 'all', priceSlug = 'all'] = slug;
  const title = `Top Scored ${typeLabel(typeSlug)} ${priceLabel(priceSlug)} in ${regionLabel(regionSlug)} | Avena Terminal`;
  const description = `AI-scored ${typeLabel(typeSlug).toLowerCase()} ${priceLabel(priceSlug).toLowerCase()} in ${regionLabel(regionSlug)}. Ranked by composite score covering value, yield, location & quality.`;

  return {
    title,
    description,
    alternates: { canonical: `https://avenaterminal.com/data/${slug.join('/')}` },
  };
}

/* ── page ─────────────────────────────────────────────── */

export default async function DataPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;

  // Reserved single-segment slugs handled by dedicated pages
  if (slug.length === 1 && RESERVED_SLUGS.has(slug[0])) {
    return null;
  }

  const [regionSlug = 'all', typeSlug = 'all', priceSlug = 'all'] = slug;
  // slug[3] === 'top-scored' — confirms sort order

  const all = getAllProperties();
  const filtered = all
    .filter(p => matchRegion(p, regionSlug))
    .filter(p => matchType(p, typeSlug))
    .filter(p => matchPrice(p, priceSlug))
    .filter(p => p._sc != null)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 25);

  const totalMatching = all
    .filter(p => matchRegion(p, regionSlug))
    .filter(p => matchType(p, typeSlug))
    .filter(p => matchPrice(p, priceSlug)).length;

  const avgScore = Math.round(avg(filtered.filter(p => p._sc).map(p => p._sc!)));
  const avgPrice = Math.round(avg(filtered.map(p => p.pf)));
  const avgYield = Number(avg(filtered.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));

  const title = `Top Scored ${typeLabel(typeSlug)} ${priceLabel(priceSlug)} in ${regionLabel(regionSlug)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: filtered.length,
    itemListElement: filtered.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://avenaterminal.com/property/${p.ref}`,
      name: `${p.p} — ${p.t} in ${p.l}`,
    })),
  };

  return (
    <main style={{ background: '#0d1117', color: '#c9d1d9', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#58a6ff', letterSpacing: '-0.02em' }}>AVENA</span>
          <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Terminal</span>
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#484f58' }}>
          /data/{slug.join('/')}
        </span>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* ── Title ── */}
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#e6edf3' }}>
          {title}
        </h1>
        <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 24 }}>
          Top 25 results sorted by AI composite score. Data refreshed daily.
        </p>

        {/* ── Stats Bar ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { label: 'Matching', value: String(totalMatching) },
            { label: 'Avg Score', value: `${avgScore}/100` },
            { label: 'Avg Price', value: `€${fmt(avgPrice)}` },
            { label: 'Avg Yield', value: `${avgYield}%` },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: '16px 20px',
            }}>
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#484f58' }}>
            No properties match this filter combination.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #30363d' }}>
                  {['#', 'Name', 'Town', 'Type', 'Price', 'Score', 'Yield', 'Beds', 'Beach'].map(h => (
                    <th key={h} style={{
                      textAlign: h === '#' || h === 'Score' || h === 'Beds' || h === 'Beach' ? 'center' : 'left',
                      padding: '10px 12px',
                      color: '#8b949e',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.ref ?? i} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#484f58', fontWeight: 600 }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link
                        href={`/property/${p.ref}`}
                        style={{ color: '#58a6ff', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {p.p}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#c9d1d9' }}>{p.l}</td>
                    <td style={{ padding: '10px 12px', color: '#8b949e' }}>{p.t}</td>
                    <td style={{ padding: '10px 12px', color: '#c9d1d9', fontVariantNumeric: 'tabular-nums' }}>
                      €{fmt(p.pf)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        minWidth: 36,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        background: (p._sc ?? 0) >= 70 ? '#1a3a2a' : (p._sc ?? 0) >= 50 ? '#2d2a1a' : '#3a1a1a',
                        color: (p._sc ?? 0) >= 70 ? '#3fb950' : (p._sc ?? 0) >= 50 ? '#d29922' : '#f85149',
                      }}>
                        {p._sc}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#c9d1d9' }}>
                      {p._yield ? `${p._yield.gross.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#c9d1d9' }}>
                      {p.bd}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#8b949e' }}>
                      {p.bk != null ? `${p.bk.toFixed(1)} km` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #21262d', fontSize: 12, color: '#484f58', display: 'flex', justifyContent: 'space-between' }}>
          <span>Avena Terminal — AI-first property intelligence</span>
          <span>{totalMatching} properties indexed</span>
        </div>
      </div>
    </main>
  );
}
