import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';

export const revalidate = 86400;

const AREAS = [
  { name: 'La Zenia', parent: 'Orihuela Costa, Alicante', search: ['la zenia', 'zenia'] },
  { name: 'Cabo Roig', parent: 'Orihuela Costa, Alicante', search: ['cabo roig'] },
  { name: 'Punta Prima', parent: 'Orihuela Costa, Alicante', search: ['punta prima'] },
  { name: 'Playa Flamenca', parent: 'Orihuela Costa, Alicante', search: ['playa flamenca', 'flamenca'] },
  { name: 'Villamartin', parent: 'Orihuela Costa, Alicante', search: ['villamartin'] },
  { name: 'Los Dolses', parent: 'Orihuela Costa, Alicante', search: ['los dolses', 'dolses'] },
  { name: 'La Florida', parent: 'Orihuela Costa, Alicante', search: ['la florida'] },
  { name: 'Blue Lagoon', parent: 'Orihuela Costa, Alicante', search: ['blue lagoon'] },
  { name: 'Las Ramblas Golf', parent: 'Orihuela Costa, Alicante', search: ['las ramblas', 'ramblas golf'] },
  { name: 'Campoamor', parent: 'Orihuela Costa, Alicante', search: ['campoamor'] },
  { name: 'Pilar de la Horadada', parent: 'Pilar de La Horadada, Alicante', search: ['pilar de la horadada', 'pilar horadada'] },
  { name: 'Torre de la Horadada', parent: 'Pilar de La Horadada, Alicante', search: ['torre de la horadada'] },
  { name: 'San Pedro del Pinatar', parent: 'San Pedro del Pinatar, Murcia', search: ['san pedro del pinatar', 'san pedro pinatar'] },
  { name: 'Lo Pagan', parent: 'San Pedro del Pinatar, Murcia', search: ['lo pagan'] },
  { name: 'La Manga', parent: 'La Manga, Murcia', search: ['la manga'] },
  { name: 'Mar Menor', parent: 'Torre Pacheco, Murcia', search: ['mar menor'] },
  { name: 'Los Alcazares', parent: 'Los Alcazares, Murcia', search: ['los alcazares', 'alcazares'] },
  { name: 'Benidorm Old Town', parent: 'Benidorm, Alicante', search: ['benidorm old town', 'benidorm casco antiguo'] },
  { name: 'Finestrat', parent: 'Finestrat, Alicante', search: ['finestrat'] },
  { name: 'La Nucia', parent: 'La Nucia, Alicante', search: ['la nucia', 'nucia'] },
  { name: 'Calpe Old Town', parent: 'Calpe, Alicante', search: ['calpe old town'] },
  { name: 'Moraira', parent: 'Moraira, Alicante', search: ['moraira'] },
  { name: 'Javea Port', parent: 'Javea, Alicante', search: ['javea port', 'javea puerto'] },
  { name: 'Altea Hills', parent: 'Altea, Alicante', search: ['altea hills'] },
  { name: 'Gran Alacant', parent: 'Gran Alacant, Alicante', search: ['gran alacant'] },
  { name: 'Guardamar', parent: 'Guardamar del Segura, Alicante', search: ['guardamar'] },
  { name: 'Ciudad Quesada', parent: 'Ciudad Quesada, Alicante', search: ['ciudad quesada', 'quesada'] },
  { name: 'Rojales', parent: 'Rojales, Alicante', search: ['rojales'] },
  { name: 'San Miguel de Salinas', parent: 'San Miguel de Salinas, Alicante', search: ['san miguel de salinas', 'san miguel salinas'] },
  { name: 'Estepona Port', parent: 'Estepona, Malaga', search: ['estepona port', 'estepona puerto'] },
];

function findArea(slug: string) {
  return AREAS.find((a) => slugify(a.name) === slug) ?? null;
}

function getAreaProperties(area: (typeof AREAS)[number]): Property[] {
  const all = getAllProperties();
  return all
    .filter((p) => p.l === area.parent)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
}

function getAreaDescription(area: (typeof AREAS)[number], count: number, avgPrice: number, avgYieldVal: string): string {
  const province = area.parent.split(', ')[1] ?? 'Spain';
  const town = area.parent.split(', ')[0];

  const descriptions: Record<string, string> = {
    'La Zenia': `La Zenia is one of the most sought-after neighbourhoods along the Orihuela Costa, renowned for its proximity to the golden-sand La Zenia beach and the popular La Zenia Boulevard shopping centre. The area attracts a vibrant international community, with excellent restaurants, bars, and services within walking distance. New build developments here range from modern apartments to luxurious villas, many featuring communal pools, underground parking, and rooftop solariums with sea views. Property investors benefit from strong year-round rental demand driven by both holiday makers and long-term residents. The neighbourhood sits just minutes from the AP-7 motorway, providing easy access to Alicante and Murcia airports. With ${count} new build properties currently available at an average price of \u20AC${avgPrice.toLocaleString()} and gross rental yields averaging ${avgYieldVal}%, La Zenia represents a compelling blend of lifestyle appeal and investment potential on Spain\u2019s Costa Blanca South.`,
    'Cabo Roig': `Cabo Roig is an established coastal neighbourhood on the Orihuela Costa known for its dramatic cliff-top promenade, the famous Cabo Roig strip of restaurants and bars, and its picturesque cove beaches. The twice-weekly street market is one of the largest in the region, drawing visitors from across the coast. New developments offer contemporary apartments and townhouses with sea views and communal amenities. The area enjoys excellent infrastructure including supermarkets, pharmacies, and medical centres. Investors value Cabo Roig for its proven rental track record, with strong summer season occupancy and a growing winter-let market among northern European retirees. With ${count} available new builds averaging \u20AC${avgPrice.toLocaleString()} and yields around ${avgYieldVal}%, Cabo Roig delivers a mature micro-market with reliable demand and solid capital growth prospects on the southern Costa Blanca.`,
    'Punta Prima': `Punta Prima is a coastal neighbourhood on the Orihuela Costa prized for its blue-flag beach and the landmark Punta Prima commercial centre. The area offers a relaxed residential atmosphere while remaining close to the amenities of Torrevieja and La Zenia. New build projects here typically feature modern apartments and penthouses with sea or salt-lake views, communal pools, and landscaped gardens. The beach promenade connects to neighbouring Playa Flamenca, making it ideal for walkers and cyclists. Rental demand is strong thanks to the beach proximity and family-friendly environment. With ${count} new build properties averaging \u20AC${avgPrice.toLocaleString()} and gross yields of ${avgYieldVal}%, Punta Prima combines coastal living with solid investment fundamentals in one of southern Alicante\u2019s most reliable micro-markets.`,
  };

  if (descriptions[area.name]) return descriptions[area.name];

  // Generic description for areas without a specific write-up
  const isCoastal = ['beach', 'port', 'puerto', 'manga', 'mar', 'punta', 'cabo', 'flamenca', 'lagoon', 'horadada', 'pagan', 'alcazares', 'guardamar', 'gran alacant', 'estepona'].some((k) => area.name.toLowerCase().includes(k) || area.search.some((s) => s.includes(k)));
  const isGolf = area.name.toLowerCase().includes('golf') || area.name.toLowerCase().includes('ramblas') || area.name.toLowerCase().includes('villamartin');
  const isHill = area.name.toLowerCase().includes('hills') || area.name.toLowerCase().includes('nucia') || area.name.toLowerCase().includes('finestrat');
  const isOldTown = area.name.toLowerCase().includes('old town') || area.name.toLowerCase().includes('casco');

  let flavour = '';
  if (isOldTown) flavour = `${area.name} offers the charm of a traditional Spanish centre with narrow streets, historic architecture, and authentic local dining. Modern new build developments in the surrounding area provide easy access to this cultural heart while delivering contemporary comfort and amenities.`;
  else if (isGolf) flavour = `${area.name} is a prestigious address for golf enthusiasts, set among championship courses with manicured fairways and panoramic views. New developments here cater to buyers seeking a resort lifestyle with clubhouses, communal pools, and landscaped gardens just steps from the first tee.`;
  else if (isHill) flavour = `${area.name} is a hillside neighbourhood offering elevated views across the coast and surrounding countryside. The area combines a quieter residential feel with easy access to beaches and town centres below, attracting buyers who value space, privacy, and panoramic vistas.`;
  else if (isCoastal) flavour = `${area.name} is a popular coastal neighbourhood known for its beaches, promenades, and Mediterranean lifestyle. The area draws both holiday visitors and permanent residents, supporting a healthy rental market throughout the year.`;
  else flavour = `${area.name} is a well-connected neighbourhood in ${town} offering a blend of local Spanish character and modern infrastructure. The area appeals to both lifestyle buyers and property investors seeking value outside the main tourist hubs.`;

  return `${flavour} Situated in ${province}, the neighbourhood benefits from over 300 days of sunshine per year, excellent transport links, and proximity to international airports. New build properties here feature modern energy-efficient designs, open-plan layouts, and private or communal outdoor spaces. With ${count} new build developments currently listed at an average price of \u20AC${avgPrice.toLocaleString()} and gross rental yields averaging ${avgYieldVal}%, ${area.name} offers a compelling entry point for investors and homebuyers exploring the Spanish property market. The area continues to see growing demand from northern European buyers attracted by the climate, affordability, and quality of life on offer.`;
}

export async function generateStaticParams() {
  return AREAS.map((a) => ({ area: slugify(a.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area: areaSlug } = await params;
  const area = findArea(areaSlug);
  if (!area) return { title: 'Area Not Found | Avena Terminal' };

  const props = getAreaProperties(area);
  const title = `New Builds in ${area.name} \u2014 Property Scores & Yields | Avena Terminal`;
  const avgScore = Math.round(avg(props.filter((p) => p._sc).map((p) => p._sc!)));
  const maxYield = Math.max(...props.filter((p) => p._yield).map((p) => p._yield!.gross), 0);
  const description = `Explore ${props.length} new build properties in ${area.name}, ${area.parent}. Average score ${avgScore}/100, yields up to ${maxYield.toFixed(1)}%. Updated weekly.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/area/${areaSlug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaSlug } = await params;
  const area = findArea(areaSlug);

  if (!area) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: '#0d1117' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Area Not Found</h1>
          <Link href="/towns" className="text-emerald-400 hover:underline">Browse all towns</Link>
        </div>
      </div>
    );
  }

  const props = getAreaProperties(area);
  const avgScore = Math.round(avg(props.filter((p) => p._sc).map((p) => p._sc!)));
  const avgPrice = Math.round(avg(props.map((p) => p.pf)));
  const avgYieldVal = avg(props.filter((p) => p._yield).map((p) => p._yield!.gross)).toFixed(1);
  const top20 = props.slice(0, 20);
  const townSlug = slugify(area.parent);
  const description = getAreaDescription(area, props.length, avgPrice, avgYieldVal);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `New Builds in ${area.name}`,
    numberOfItems: top20.length,
    itemListElement: top20.slice(0, 5).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`,
      name: p.p,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Towns', item: 'https://avenaterminal.com/towns' },
      { '@type': 'ListItem', position: 3, name: area.parent.split(', ')[0], item: `https://avenaterminal.com/towns/${townSlug}` },
      { '@type': 'ListItem', position: 4, name: area.name },
    ],
  };

  return (
    <div className="min-h-screen text-gray-100" style={{ background: '#0d1117' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />

      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumbs */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/towns" className="hover:text-white">Towns</Link> <span className="mx-1">/</span>
          <Link href={`/towns/${townSlug}`} className="hover:text-white">{area.parent.split(', ')[0]}</Link> <span className="mx-1">/</span>
          <span className="text-white">{area.name}</span>
        </nav>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">New Builds in {area.name}</h1>
        <p className="text-gray-400 text-sm mb-6">Part of {area.parent}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Properties', value: String(props.length) },
            { label: 'Avg Price', value: `\u20AC${avgPrice.toLocaleString()}` },
            { label: 'Avg Yield', value: `${avgYieldVal}%` },
            { label: 'Avg Score', value: `${avgScore}/100` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center border" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Property list */}
        <h2 className="text-lg font-bold text-white mb-4">Top Properties by Investment Score</h2>
        {top20.length === 0 ? (
          <p className="text-gray-500 text-sm">No properties currently listed in this area. Check the parent town for nearby options.</p>
        ) : (
          <div className="space-y-2">
            {top20.map((p, i) => (
              <Link
                key={p.ref ?? i}
                href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all"
                style={{ background: '#0f1419', borderColor: '#1c2333' }}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-[#1c2333] text-white'}`}>
                  {i + 1}
                </span>
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
        )}

        {/* Area description */}
        <section className="mt-10 border rounded-xl p-6" style={{ background: '#0f1419', borderColor: '#1c2333' }}>
          <h2 className="text-lg font-bold text-white mb-3">About {area.name}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </section>

        {/* Link to parent town */}
        <div className="mt-8 text-center">
          <Link href={`/towns/${townSlug}`} className="text-emerald-400 text-sm hover:underline">
            View all properties in {area.parent.split(', ')[0]} &rarr;
          </Link>
        </div>

        <p className="text-[9px] text-gray-600 text-right mt-4">Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-gray-600 text-xs" style={{ borderColor: '#1c2333' }}>
        &copy; 2026 Avena Terminal &middot; <a href="https://avenaterminal.com" className="text-gray-500 hover:text-gray-300">avenaterminal.com</a>
      </footer>
    </div>
  );
}
