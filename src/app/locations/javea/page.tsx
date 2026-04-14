import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Javea (Xabia) Property Investment Intelligence | Avena Terminal',
  description: 'Complete Javea property market intelligence: prices, yields, buying costs, top new builds, Golden Visa status, and AI-scored investment data. The definitive Javea property guide.',
  keywords: ['javea property', 'javea real estate', 'xabia property', 'javea investment', 'javea new build', 'costa blanca javea', 'buy property javea'],
  openGraph: {
    title: 'Javea (Xabia) Property Investment Intelligence | Avena Terminal',
    description: 'Complete Javea property market intelligence: prices, yields, buying costs, top new builds, Golden Visa status, and AI-scored investment data.',
    url: 'https://avenaterminal.com/locations/javea',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/locations/javea' },
};

function fmt(n: number): string {
  return n.toLocaleString('en-IE');
}

export default async function JaveaHub() {
  const all = getAllProperties();
  const cb = all.filter(p => p.costa?.includes('Blanca'));
  const cbAvgPrice = Math.round(avg(cb.map(p => p.pf)));
  const cbAvgYield = avg(cb.filter(p => p._yield?.gross).map(p => p._yield!.gross));
  const cbAvgScore = Math.round(avg(cb.filter(p => p._sc).map(p => p._sc!)));
  const cbAvgPm2 = Math.round(avg(cb.filter(p => p.pm2).map(p => p.pm2!)));

  // Nearby towns with data
  const nearbyTownSlugs = ['benitachell', 'moraira', 'denia', 'calpe', 'altea', 'benissa', 'teulada', 'pedreguer'];
  const nearbyTowns = getUniqueTowns().filter(t => nearbyTownSlugs.some(s => t.slug.includes(s))).slice(0, 6);

  // Top Costa Blanca deals for context
  const topCB = cb.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 5);

  const cardBg = '#161b22';
  const borderColor = '#30363d';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: 'Javea (Xabia)',
        description: 'Premium coastal town on Costa Blanca, Spain. Known for microclimate, Montgo mountain, and three distinct areas: Arenal beach, historic Old Town, and authentic Port.',
        url: 'https://avenaterminal.com/locations/javea',
        geo: { '@type': 'GeoCoordinates', latitude: 38.7875, longitude: 0.1661 },
        containedInPlace: { '@type': 'Place', name: 'Costa Blanca, Spain' },
      },
      {
        '@type': 'Dataset',
        name: 'Javea Property Market Intelligence',
        description: `Property investment data for Javea and Costa Blanca. ${cb.length} scored new builds tracked.`,
        url: 'https://avenaterminal.com/locations/javea',
        creator: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
        license: 'https://avenaterminal.com/terms',
        temporalCoverage: '2024/..',
        spatialCoverage: { '@type': 'Place', name: 'Costa Blanca, Spain' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Is Javea good for property investment?', acceptedAnswer: { '@type': 'Answer', text: 'Javea offers strong investment fundamentals: 300+ days sunshine, protected microclimate, 5-7% gross rental yields, 6-8% annual price growth, and strong demand from British, Dutch, German, and Scandinavian buyers. Premium pricing reflects high demand.' } },
          { '@type': 'Question', name: 'What are the costs of owning property in Javea?', acceptedAnswer: { '@type': 'Answer', text: 'Annual costs for a typical 2-bed apartment (EUR 250,000): IBI tax EUR 400-800, community fees EUR 1,200-3,600, refuse tax EUR 150-300, insurance EUR 250-500, utilities EUR 1,200-2,400, non-resident tax EUR 600-1,200. Total: EUR 4,300-9,800 per year.' } },
          { '@type': 'Question', name: 'What are new build prices in Javea?', acceptedAnswer: { '@type': 'Answer', text: 'New build prices in Javea range from EUR 280,000 for 2-bed apartments to EUR 2,500,000+ for luxury villas. Average price per square meter is EUR 2,800-4,500 depending on location and sea views.' } },
          { '@type': 'Question', name: 'Can I get a Golden Visa buying property in Javea?', acceptedAnswer: { '@type': 'Answer', text: 'Spain suspended the property-based Golden Visa in April 2025. Property investment alone no longer qualifies. Alternative residency options include non-lucrative visa (EUR 28,000+/year income) or digital nomad visa (EUR 3,000+/month).' } },
          { '@type': 'Question', name: 'What is the buying process for property in Javea?', acceptedAnswer: { '@type': 'Answer', text: 'The process takes 6-12 weeks: obtain NIE, open Spanish bank account, property due diligence, reservation deposit (EUR 3,000-10,000), arras contract (10% deposit), mortgage if needed, notary completion, and registration. Total buying costs are 12-14% on top of price.' } },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>INTELLIGENCE HUB</span>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Terminal</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-1">/</span>
          <Link href="/costas/costa-blanca" className="hover:text-white">Costa Blanca</Link>
          <span className="mx-1">/</span>
          <span className="text-white">Javea</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Javea (Xabia) Intelligence Hub</h1>
          <p className="text-gray-400 text-sm md:text-base">
            Complete market profile for Spain&apos;s most sought-after Costa Blanca town. Prices, yields, costs, buying guide, and AI-scored investment data.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Market Profile', 'Cost of Ownership', 'Buying Guide', 'Golden Visa', 'Top Deals', 'Comparison'].map(tag => (
              <span key={tag} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border" style={{ borderColor, color: '#8b949e' }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Market Profile */}
        <section className="mb-12" id="market-profile">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Market Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Avg Price/m\u00B2', value: '\u20AC2,800\u20134,500' },
              { label: 'Gross Yield', value: '5\u20137%' },
              { label: 'Annual Growth', value: '6\u20138%' },
              { label: 'Peak Occupancy', value: '85\u201395%' },
              { label: 'Sunshine Days', value: '300+' },
              { label: 'Foreign Buyers', value: '60%' },
              { label: 'Alicante Airport', value: '90 min' },
              { label: 'Valencia Airport', value: '120 min' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-4 border" style={{ background: cardBg, borderColor }}>
                <div className="text-white font-bold text-lg">{m.value}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-5" style={{ background: cardBg, borderColor }}>
            <h3 className="text-sm font-bold text-white mb-3">Buyer Nationality Breakdown</h3>
            <div className="space-y-2 text-sm">
              {[
                { nation: 'British', pct: 25, color: '#3b82f6' },
                { nation: 'Dutch', pct: 18, color: '#f97316' },
                { nation: 'German', pct: 15, color: '#eab308' },
                { nation: 'Scandinavian', pct: 12, color: '#06b6d4' },
                { nation: 'Belgian', pct: 8, color: '#8b5cf6' },
                { nation: 'Spanish', pct: 15, color: '#ef4444' },
                { nation: 'Other', pct: 7, color: '#6b7280' },
              ].map(b => (
                <div key={b.nation} className="flex items-center gap-3">
                  <span className="w-20 text-gray-400 text-xs">{b.nation}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: borderColor }}>
                    <div className="h-2 rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                  <span className="text-gray-400 text-xs w-8 text-right">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* New Build Prices */}
        <section className="mb-12" id="prices">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            New Build Price Guide
          </h2>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">Property Type</th>
                  <th className="text-right px-4 py-3">Price Range</th>
                  <th className="text-right px-4 py-3">Typical Size</th>
                  <th className="text-right px-4 py-3">&euro;/m&sup2;</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: '2-bed Apartment', price: '\u20AC280k\u2013450k', size: '80\u2013110 m\u00B2', pm2: '\u20AC3,200\u20134,100' },
                  { type: '3-bed Apartment', price: '\u20AC350k\u2013600k', size: '100\u2013150 m\u00B2', pm2: '\u20AC3,500\u20134,000' },
                  { type: '3-bed Townhouse', price: '\u20AC400k\u2013700k', size: '120\u2013180 m\u00B2', pm2: '\u20AC3,300\u20133,900' },
                  { type: '3-bed Villa', price: '\u20AC550k\u20131.2M', size: '150\u2013300 m\u00B2', pm2: '\u20AC3,500\u20134,500' },
                  { type: 'Luxury Villa', price: '\u20AC1.2M\u20133M+', size: '300\u2013600 m\u00B2', pm2: '\u20AC4,000\u20136,000' },
                ].map(row => (
                  <tr key={row.type} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 text-white font-medium">{row.type}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{row.price}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{row.size}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{row.pm2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Investment Zones */}
        <section className="mb-12" id="zones">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Investment Zones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { zone: 'Arenal', desc: 'Premium beachfront. Walking distance to restaurants and sandy beach. Highest rental demand.', pm2: '\u20AC4,000\u20135,500', yield: '5\u20136%', profile: 'Short-term rental' },
              { zone: 'Old Town', desc: 'Historic charm, traditional architecture. Local lifestyle. Year-round community.', pm2: '\u20AC2,500\u20133,500', yield: '4\u20135%', profile: 'Long-term / lifestyle' },
              { zone: 'Port', desc: 'Authentic fishing port. Growing gastronomy scene. Strong character.', pm2: '\u20AC3,000\u20134,000', yield: '5\u20136%', profile: 'Character rental' },
              { zone: 'Cap Marti / Tosalet', desc: 'Elevated positions with panoramic sea views. Luxury segment. Privacy.', pm2: '\u20AC3,500\u20135,000', yield: '4\u20135%', profile: 'Luxury long-stay' },
              { zone: 'Montgo', desc: 'Mountain backdrop. Nature reserve adjacent. Best value in Javea.', pm2: '\u20AC2,500\u20133,500', yield: '5\u20137%', profile: 'Value investment' },
              { zone: 'Portitxol / Granadella', desc: 'Exclusive hillside with cove access. Limited supply. Trophy properties.', pm2: '\u20AC4,500\u20137,000', yield: '3\u20134%', profile: 'Trophy / prestige' },
            ].map(z => (
              <div key={z.zone} className="rounded-lg border p-4" style={{ background: cardBg, borderColor }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold">{z.zone}</h3>
                  <span className="text-emerald-400 text-xs font-mono">{z.yield} yield</span>
                </div>
                <p className="text-gray-400 text-xs mb-3">{z.desc}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{z.pm2}/m&sup2;</span>
                  <span className="text-gray-500">{z.profile}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cost of Ownership */}
        <section className="mb-12" id="costs">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Cost of Ownership
          </h2>
          <p className="text-gray-400 text-sm mb-4">Annual costs for a typical 2-bed apartment valued at &euro;250,000</p>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">Cost</th>
                  <th className="text-right px-4 py-3">Annual Amount</th>
                  <th className="text-right px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { cost: 'IBI (property tax)', amount: '\u20AC400\u2013800', note: '0.4\u20131.1% of cadastral value' },
                  { cost: 'Community fees', amount: '\u20AC1,200\u20133,600', note: 'Pool, garden, lift dependent' },
                  { cost: 'Basura (refuse)', amount: '\u20AC150\u2013300', note: 'Municipal tax' },
                  { cost: 'Home insurance', amount: '\u20AC250\u2013500', note: 'Building + contents' },
                  { cost: 'Utilities', amount: '\u20AC1,200\u20132,400', note: 'Electric, water, internet' },
                  { cost: 'Non-resident tax (IRNR)', amount: '\u20AC600\u20131,200', note: '19% EU / 24% non-EU' },
                  { cost: 'Maintenance reserve', amount: '\u20AC500\u20131,000', note: 'Recommended 0.5% of value' },
                ].map(row => (
                  <tr key={row.cost} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 text-white">{row.cost}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{row.amount}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{row.note}</td>
                  </tr>
                ))}
                <tr className="font-bold" style={{ background: '#0d1117' }}>
                  <td className="px-4 py-3 text-white">Total Annual Cost</td>
                  <td className="px-4 py-3 text-right text-emerald-400">&euro;4,300&ndash;9,800</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">1.7&ndash;3.9% of value</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Purchase costs */}
          <h3 className="text-sm font-bold text-white mt-6 mb-3">One-Time Purchase Costs</h3>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { cost: 'VAT (new build)', pct: '10%', note: 'IVA — applies to all new builds' },
                  { cost: 'Stamp duty (AJD)', pct: '1.5%', note: 'Valencia region rate' },
                  { cost: 'Transfer tax (resale)', pct: '10%', note: 'ITP — instead of VAT for resale' },
                  { cost: 'Notary fees', pct: '\u20AC600\u20131,200', note: 'Scale based on price' },
                  { cost: 'Land registry', pct: '\u20AC400\u2013700', note: 'Inscription fee' },
                  { cost: 'Legal fees', pct: '1\u20131.5%', note: 'Independent lawyer essential' },
                ].map(row => (
                  <tr key={row.cost} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 text-white">{row.cost}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">{row.pct}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{row.note}</td>
                  </tr>
                ))}
                <tr className="font-bold" style={{ background: '#0d1117' }}>
                  <td className="px-4 py-3 text-white">Total Buying Costs</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono">12&ndash;14%</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">On top of purchase price</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Management Fees */}
        <section className="mb-12" id="management">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Holiday Rental Management
          </h2>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">Service Level</th>
                  <th className="text-right px-4 py-3">Fee (% of revenue)</th>
                  <th className="text-left px-4 py-3">Includes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { level: 'Self-managed', fee: '0%', includes: 'Owner handles all operations' },
                  { level: 'Check-in only', fee: '8\u201312%', includes: 'Key handover, basic cleaning' },
                  { level: 'Standard', fee: '15\u201320%', includes: 'Marketing, bookings, cleaning, maintenance' },
                  { level: 'Full-service luxury', fee: '25\u201330%', includes: 'Concierge, revenue optimization, legal' },
                ].map(row => (
                  <tr key={row.level} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className="px-4 py-3 text-white font-medium">{row.level}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">{row.fee}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{row.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">Tourist license (Licencia Turistica) required. Application through Valencia regional government. Processing: 2&ndash;4 months.</p>
        </section>

        {/* Buying Process */}
        <section className="mb-12" id="buying-process">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Buying Process in Javea
          </h2>
          <div className="space-y-3">
            {[
              { step: 1, title: 'Get NIE Number', time: 'Week 1', desc: 'Numero de Identidad de Extranjero. Apply at Spanish consulate or local police. Cost: \u20AC10-15.' },
              { step: 2, title: 'Open Spanish Bank Account', time: 'Week 1\u20132', desc: 'Required for payments. CaixaBank, Sabadell, or Bankinter. Bring NIE + passport + proof of income.' },
              { step: 3, title: 'Property Due Diligence', time: 'Week 2\u20134', desc: 'Nota Simple from Land Registry (\u20AC10). Town hall planning checks. Developer bank guarantee for off-plan.' },
              { step: 4, title: 'Reservation & Deposit', time: 'Week 3\u20134', desc: 'Reservation: \u20AC3,000\u201310,000. Arras contract: 10% deposit. Seller withdrawal = double deposit returned.' },
              { step: 5, title: 'Mortgage (if needed)', time: 'Week 3\u20138', desc: 'Non-resident LTV: 60\u201370%. Rate: Euribor + 1.5\u20132.5% (variable) or 4\u20135% (fixed). Approval: 3\u20136 weeks.' },
              { step: 6, title: 'Notary Completion', time: 'Week 8\u201312', desc: 'Escritura signed before notary. Balance via banker\u2019s draft. Keys handed over same day.' },
              { step: 7, title: 'Registration & Taxes', time: 'Week 8\u201314', desc: 'Land Registry: 1\u20133 months. New build: 10% VAT + 1.5% stamp duty. Resale: 10% transfer tax.' },
              { step: 8, title: 'Post-Purchase Setup', time: 'Week 12+', desc: 'Utility transfers, community fee direct debit, home insurance, tourist license application.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 rounded-lg border p-4" style={{ background: cardBg, borderColor }}>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm">{s.title}</h3>
                    <span className="text-gray-500 text-xs font-mono">{s.time}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Golden Visa */}
        <section className="mb-12" id="golden-visa">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Golden Visa Status
          </h2>
          <div className="rounded-lg border p-5" style={{ background: cardBg, borderColor }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">SUSPENDED</span>
              <span className="text-gray-400 text-sm">Since April 2025</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Property-based Golden Visa no longer available for new applications. Existing holders can renew. Property investment in Javea remains attractive on fundamentals alone.
            </p>
            <h3 className="text-sm font-bold text-white mb-2">Alternative Residency Routes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { route: 'Non-Lucrative Visa', req: '\u20AC28,000+/yr passive income', note: 'Cannot work in Spain' },
                { route: 'Digital Nomad Visa', req: '\u20AC3,000+/mo remote income', note: 'Work for non-Spanish employer' },
                { route: 'Self-Employment', req: 'Viable business plan', note: 'Register as aut\u00F3nomo' },
              ].map(r => (
                <div key={r.route} className="rounded border p-3" style={{ borderColor }}>
                  <div className="text-white text-sm font-medium">{r.route}</div>
                  <div className="text-emerald-400 text-xs mt-1">{r.req}</div>
                  <div className="text-gray-500 text-xs mt-1">{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Javea vs Neighbours */}
        <section className="mb-12" id="comparison">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Javea vs Neighbouring Markets
          </h2>
          <div className="rounded-lg border overflow-hidden" style={{ background: cardBg, borderColor }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ borderBottom: `1px solid ${borderColor}` }}>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-right px-4 py-3">Avg &euro;/m&sup2;</th>
                  <th className="text-right px-4 py-3">Yield</th>
                  <th className="text-right px-4 py-3">Character</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { loc: 'Javea', pm2: '\u20AC3,200\u20134,500', yield: '5\u20137%', char: 'Premium, 3 distinct areas' },
                  { loc: 'Moraira', pm2: '\u20AC3,500\u20135,000', yield: '4\u20136%', char: 'Quieter, exclusive, British' },
                  { loc: 'Denia', pm2: '\u20AC2,200\u20133,500', yield: '5\u20137%', char: 'Larger town, more Spanish' },
                  { loc: 'Calpe', pm2: '\u20AC2,000\u20133,000', yield: '6\u20138%', char: 'Higher yield, mass tourism' },
                  { loc: 'Altea', pm2: '\u20AC2,500\u20134,000', yield: '4\u20136%', char: 'Artistic, boutique, hillside' },
                  { loc: 'Benitachell', pm2: '\u20AC2,200\u20133,200', yield: '5\u20137%', char: 'Adjacent to Javea, 20% cheaper' },
                ].map(row => (
                  <tr key={row.loc} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td className={`px-4 py-3 font-medium ${row.loc === 'Javea' ? 'text-emerald-400' : 'text-white'}`}>{row.loc}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.pm2}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.yield}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{row.char}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Costa Blanca Context */}
        <section className="mb-12" id="costa-blanca">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Costa Blanca Market Context (Live Data)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Properties Tracked', value: String(cb.length) },
              { label: 'Avg Price', value: `\u20AC${fmt(cbAvgPrice)}` },
              { label: 'Avg Yield', value: `${cbAvgYield.toFixed(1)}%` },
              { label: 'Avg Score', value: `${cbAvgScore}/100` },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-4 border text-center" style={{ background: cardBg, borderColor }}>
                <div className="text-white font-bold text-lg">{m.value}</div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Top CB deals */}
          {topCB.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-white mb-3">Top Costa Blanca Deals by Avena Score</h3>
              <div className="space-y-2">
                {topCB.map((p, i) => (
                  <Link
                    key={p.ref || i}
                    href={`/property/${encodeURIComponent(p.ref ?? '')}`}
                    className="flex items-center gap-4 border rounded-lg p-3 hover:border-emerald-500/30 transition-all"
                    style={{ background: cardBg, borderColor }}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-black' : 'text-white'}`} style={i !== 0 ? { background: borderColor } : {}}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{p.p || `${p.t} in ${p.l}`}</div>
                      <div className="text-gray-500 text-xs">
                        {p.l} &middot; {p.t} &middot; {p.bd} bed &middot; &euro;{fmt(p.pf)}
                        {p._yield ? ` \u00B7 ${p._yield.gross.toFixed(1)}% yield` : ''}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-emerald-400 font-bold text-sm">{Math.round(p._sc ?? 0)}</div>
                      <div className="text-gray-500 text-[10px]">SCORE</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Nearby Towns with Data */}
        {nearbyTowns.length > 0 && (
          <section className="mb-12" id="nearby">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Nearby Towns with Scored Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyTowns.map(t => (
                <Link
                  key={t.slug}
                  href={`/locations/${t.slug}`}
                  className="rounded-lg border p-4 hover:border-emerald-500/30 transition-all"
                  style={{ background: cardBg, borderColor }}
                >
                  <div className="text-white font-medium mb-1">{t.town}</div>
                  <div className="text-gray-500 text-xs">
                    {t.count} properties &middot; Score {t.avgScore}/100 &middot; Yield {t.avgYield}%
                  </div>
                  <div className="text-gray-500 text-xs mt-1">Avg &euro;{fmt(t.avgPrice)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Answers */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Related Answers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { slug: 'real-estate-investing-javea', q: 'Is Javea good for real estate investing?' },
              { slug: 'costs-of-owning-property-in-javea', q: 'What are the costs of owning property in Javea?' },
              { slug: 'new-build-javea', q: 'What new builds are available in Javea?' },
              { slug: 'buying-process-spain', q: 'What is the buying process for property in Spain?' },
              { slug: 'spanish-mortgage-rates-non-residents', q: 'What are Spanish mortgage rates for non-residents?' },
              { slug: 'spain-golden-visa-property-investment-2026', q: 'Can I get a Golden Visa through property in 2026?' },
            ].map(a => (
              <Link key={a.slug} href={`/answers/${a.slug}`} className="rounded-lg border p-3 hover:border-emerald-500/30 transition-all text-sm" style={{ background: cardBg, borderColor }}>
                <span className="text-emerald-400">&rarr;</span> <span className="text-gray-300">{a.q}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 mt-12 text-xs text-gray-500" style={{ borderColor }}>
          <p className="mb-2">
            Source: <Link href="/" className="text-emerald-400 hover:underline">Avena Terminal</Link> (avenaterminal.com) &middot; DOI: 10.5281/zenodo.19520064
          </p>
          <p className="text-gray-600">
            Market data reflects new build property intelligence across Costa Blanca. Javea estimates based on regional market analysis and comparable transactions.
            Investment data updated daily. Scores computed using the Avena Investment Score: 40% Value, 25% Yield, 20% Location, 10% Quality, 5% Risk.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/answers" className="text-emerald-400 hover:underline">&larr; All Answers</Link>
            <Link href="/methodology" className="text-gray-500 hover:underline">Methodology</Link>
            <Link href="/data-quality" className="text-gray-500 hover:underline">Data Quality</Link>
            <Link href="/coverage" className="text-gray-500 hover:underline">Coverage</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
