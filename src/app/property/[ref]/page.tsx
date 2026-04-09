import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

function findProperty(ref: string): Property | null {
  return getAllProperties().find((p) => p.ref === ref) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const { ref } = await params;
  const p = findProperty(decodeURIComponent(ref));
  if (!p) return { title: 'Property Not Found | Avena Estate' };

  const title = `${p.bd}-bed new build in ${p.l} — ${Math.round(p._sc ?? 0)}/100 investment score | Avena Estate`;
  const description = `New build in ${p.l}. Asking from \u20AC${(p.pf ?? 0).toLocaleString()}. Estimated rental yield ${p._yield?.gross?.toFixed(1) ?? '\u2013'}%. Investment score ${Math.round(p._sc ?? 0)}/100. Analyse on Avena Terminal.`;

  return {
    title, description,
    openGraph: {
      title, description,
      url: `https://avena-estate.com/property/${encodeURIComponent(p.ref ?? '')}`,
      siteName: 'Avena Estate',
      images: p.imgs?.[0] ? [{ url: p.imgs[0], width: 1200, height: 630 }] : [{ url: '/opengraph-image', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: p.imgs?.[0] ? [p.imgs[0]] : ['/opengraph-image'] },
  };
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return <div className={`${color} text-white text-3xl font-bold rounded-2xl w-20 h-20 flex items-center justify-center shadow-lg`}>{score}</div>;
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">{label}</span><span className="text-white font-semibold">{value}</span></div>
      <div className="w-full rounded-full h-2" style={{ background: '#1c2333' }}><div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export default async function PropertyPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const property = findProperty(decodeURIComponent(ref));

  if (!property) {
    return (
      <div className="min-h-screen text-gray-100 flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Property Not Found</h1>
          <p className="text-gray-400 mb-6">This property reference does not exist.</p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-semibold">Back to Terminal</Link>
        </div>
      </div>
    );
  }

  const p = property;
  const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
  const townSlug = slugify(p.l);

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avena-estate.com' },
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avena-estate.com/towns' },
      { '@type': 'ListItem', position: 3, name: p.l, item: `https://avena-estate.com/towns/${townSlug}` },
      { '@type': 'ListItem', position: 4, name: p.p },
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/towns" className="hover:text-white">Towns</Link> <span className="mx-1">/</span>
          <Link href={`/towns/${townSlug}`} className="hover:text-white">{p.l}</Link> <span className="mx-1">/</span>
          <span className="text-white truncate">{p.p}</span>
        </nav>

        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
            {p.imgs?.[0] ? (
              <img src={p.imgs[0]} alt={`${p.p} in ${p.l}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">No image</div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{p.p}</h1>
                <p className="text-gray-400 text-lg"><Link href={`/towns/${townSlug}`} className="hover:text-white transition-colors">{p.l}</Link> &middot; {p.t}</p>
                {p.d && <p className="text-gray-500 text-sm mt-1">by {p.d}</p>}
              </div>
              {p._sc != null && <ScoreBadge score={Math.round(p._sc)} />}
            </div>

            <div className="text-3xl font-bold text-white mb-1">
              &euro;{p.pf.toLocaleString()}{p.pt > p.pf && <span className="text-lg text-gray-500 font-normal"> &ndash; &euro;{p.pt.toLocaleString()}</span>}
            </div>
            <p className="text-gray-500 text-sm mb-6">{p.s === 'ready' ? 'Ready to move in' : p.s === 'under-construction' ? 'Under construction' : 'Off-plan'}{p.c ? ` \u00B7 Completion: ${p.c}` : ''}</p>

            <Link href={`/?ref=${encodeURIComponent(p.ref ?? '')}`}
              className="inline-block text-center px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
              style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
              View Full Analysis on Avena Terminal
            </Link>
          </div>
        </div>

        {/* Key Stats */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Key Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Price', value: `\u20AC${p.pf.toLocaleString()}` },
              { label: 'Bedrooms', value: String(p.bd) },
              { label: 'Bathrooms', value: String(p.ba) },
              { label: 'Built m\u00B2', value: `${p.bm} m\u00B2` },
              { label: 'Price/m\u00B2', value: pm2 ? `\u20AC${pm2.toLocaleString()}` : '\u2013' },
              { label: 'Beach', value: p.bk != null ? `${p.bk} km` : '\u2013' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <div className="text-gray-500 text-xs mb-1">{stat.label}</div>
                <div className="text-white font-bold text-lg">{stat.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sub-Scores */}
        {p._scores && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Investment Sub-Scores</h2>
            <div className="rounded-2xl p-6 grid gap-4 border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <ProgressBar label="Value (40%)" value={Math.round(p._scores.value)} />
              <ProgressBar label="Yield (25%)" value={Math.round(p._scores.yield)} />
              <ProgressBar label="Location (20%)" value={Math.round(p._scores.location)} />
              <ProgressBar label="Quality (10%)" value={Math.round(p._scores.quality)} />
              <ProgressBar label="Risk (5%)" value={Math.round(p._scores.risk)} />
            </div>
          </section>
        )}

        {/* Rental Yield */}
        {p._yield && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Estimated Rental Yield</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl p-5 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <div className="text-gray-500 text-xs mb-1">Gross Yield</div>
                <div className="text-emerald-400 font-bold text-2xl">{p._yield.gross.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl p-5 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <div className="text-gray-500 text-xs mb-1">Net Yield</div>
                <div className="text-emerald-400 font-bold text-2xl">{p._yield.net.toFixed(1)}%</div>
              </div>
              <div className="rounded-xl p-5 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
                <div className="text-gray-500 text-xs mb-1">Est. Weekly Rent</div>
                <div className="text-white font-bold text-2xl">&euro;{Math.round(p._yield.rate * 7).toLocaleString()}</div>
              </div>
            </div>
          </section>
        )}

        {/* Internal links */}
        <section className="mb-10 flex flex-wrap gap-3">
          <Link href={`/towns/${townSlug}`} className="text-sm text-emerald-400 hover:underline">More properties in {p.l} &rarr;</Link>
          {p.costa && <Link href={`/costas/${slugify(p.costa)}`} className="text-sm text-emerald-400 hover:underline">All {p.costa} properties &rarr;</Link>}
        </section>

        {/* CTA */}
        <section className="text-center py-12 border-t" style={{ borderColor: '#1c2333' }}>
          <h2 className="text-xl font-bold text-white mb-3">Ready to analyse this deal?</h2>
          <p className="text-gray-400 mb-6 text-sm">Get full scoring breakdown, price history, AI investment memo, and more.</p>
          <Link href={`/?ref=${encodeURIComponent(p.ref ?? '')}`}
            className="inline-block px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all"
            style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', color: '#0d1117' }}>
            View Full Analysis on Avena Terminal
          </Link>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Estate &middot; <a href="https://avena-estate.com" className="text-gray-500 hover:text-gray-300">avena-estate.com</a>
      </footer>
    </div>
  );
}
