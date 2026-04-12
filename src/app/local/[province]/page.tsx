import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

function extractProvince(location: string): string | null {
  const parts = location.split(',');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].trim();
}

function getProvinceData() {
  const all = getAllProperties();
  const map = new Map<string, Property[]>();
  for (const p of all) {
    const prov = extractProvince(p.l);
    if (!prov) continue;
    if (!map.has(prov)) map.set(prov, []);
    map.get(prov)!.push(p);
  }
  return map;
}

function getProvinceStats(props: Property[]) {
  return {
    total: props.length,
    avgPrice: Math.round(avg(props.map(p => p.pf))),
    avgYield: Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)),
    avgScore: Math.round(avg(props.filter(p => p._sc).map(p => p._sc!))),
  };
}

export async function generateStaticParams() {
  const map = getProvinceData();
  return [...map.keys()].map((prov) => ({ province: slugify(prov) }));
}

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }): Promise<Metadata> {
  const { province: slug } = await params;
  const map = getProvinceData();
  const entry = [...map.entries()].find(([prov]) => slugify(prov) === slug);
  if (!entry) return { title: 'Province Not Found | Avena Terminal' };
  const [name, props] = entry;

  const towns = new Set(props.map(p => p.l));
  const title = `New Build Properties in ${name}, Spain | Avena Terminal`;
  const description = `New build properties in ${name}, Spain. ${props.length} scored properties across ${towns.size} towns.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/local/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default async function ProvincePage({ params }: { params: Promise<{ province: string }> }) {
  const { province: slug } = await params;
  const map = getProvinceData();
  const entry = [...map.entries()].find(([prov]) => slugify(prov) === slug);

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Province Not Found</h1>
          <Link href="/local" className="text-emerald-400">Browse all provinces</Link>
        </div>
      </div>
    );
  }

  const [name, props] = entry;
  const stats = getProvinceStats(props);

  // Group by town
  const townMap = new Map<string, Property[]>();
  for (const p of props) {
    if (!townMap.has(p.l)) townMap.set(p.l, []);
    townMap.get(p.l)!.push(p);
  }
  const townList = [...townMap.entries()]
    .map(([town, tp]) => ({
      town,
      slug: slugify(town),
      count: tp.length,
      avgScore: Math.round(avg(tp.filter(p => p._sc).map(p => p._sc!))),
      avgPrice: Math.round(avg(tp.map(p => p.pf))),
      avgYield: Number(avg(tp.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  const top10 = [...props].sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 10);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Provinces', item: 'https://avenaterminal.com/local' },
      { '@type': 'ListItem', position: 3, name },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/local" className="hover:text-white">Provinces</Link> <span className="mx-1">/</span>
          <span className="text-white">{name}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          New Builds in {name} &mdash; {stats.total} Properties Tracked
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          {stats.total} scored properties across {townList.length} towns in {name}, Spain.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Properties', value: String(stats.total) },
            { label: 'Avg Price', value: `\u20AC${stats.avgPrice.toLocaleString()}` },
            { label: 'Avg Yield', value: `${stats.avgYield}%` },
            { label: 'Avg Score', value: `${stats.avgScore}/100` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-white mb-4">Towns in {name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {townList.map((t) => (
            <Link key={t.slug} href={`/towns/${t.slug}`} className="block border rounded-xl p-4 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-semibold text-sm">{t.town}</h3>
                <span className="text-[10px] text-gray-500">{t.count} properties</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-gray-500">Score </span><span className="text-emerald-400 font-semibold">{t.avgScore}</span></div>
                <div><span className="text-gray-500">Yield </span><span className="text-emerald-400 font-semibold">{t.avgYield}%</span></div>
                <div><span className="text-gray-500">Avg </span><span className="text-white font-semibold">&euro;{t.avgPrice.toLocaleString()}</span></div>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="text-lg font-bold text-white mb-4">Top 10 Properties in {name}</h2>
        <div className="space-y-2">
          {top10.map((p, i) => (
            <Link key={p.ref ?? i} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{p.p}</div>
                <div className="text-gray-500 text-xs">{p.t} &middot; {p.bd} bed &middot; &euro;{p.pf.toLocaleString()}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                <div className="text-gray-500 text-[10px]">{p._yield ? `${p._yield.gross.toFixed(1)}% yield` : ''}</div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}
