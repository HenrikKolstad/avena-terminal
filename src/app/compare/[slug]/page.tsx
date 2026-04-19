import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, slugify, avg } from '@/lib/properties';
import { Property } from '@/lib/types';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

/* ------------------------------------------------------------------ */
/*  Town-vs-town helpers (original logic)                              */
/* ------------------------------------------------------------------ */

const TOP_N = 30;

function townStats(props: Property[]) {
  const prices = props.map(p => p.pf);
  const yields = props.filter(p => p._yield).map(p => p._yield!.gross);
  const discounts = props.filter(p => p.pm2 && p.mm2 > 0).map(p => ((p.mm2 - p.pm2!) / p.mm2) * 100);
  const scores = props.filter(p => p._sc).map(p => p._sc!);
  return {
    count: props.length,
    avgPrice: Math.round(avg(prices)),
    avgYield: Number(avg(yields).toFixed(1)),
    avgDiscount: Number(avg(discounts).toFixed(1)),
    avgScore: Math.round(avg(scores)),
  };
}

function getTop30Towns() {
  return getUniqueTowns().slice(0, TOP_N);
}

function generateTownPairs() {
  const towns = getTop30Towns();
  const pairs: { slugA: string; slugB: string }[] = [];
  for (let i = 0; i < towns.length; i++) {
    for (let j = i + 1; j < towns.length; j++) {
      pairs.push({ slugA: towns[i].slug, slugB: towns[j].slug });
    }
  }
  return pairs;
}

function parseTownsFromSlug(slug: string) {
  const parts = slug.split('-vs-');
  if (parts.length !== 2) return null;
  const [slugA, slugB] = parts;
  const all = getAllProperties();

  const propsA = all.filter(p => slugify(p.l) === slugA);
  const propsB = all.filter(p => slugify(p.l) === slugB);
  if (!propsA.length || !propsB.length) return null;

  return {
    nameA: propsA[0].l,
    nameB: propsB[0].l,
    slugA,
    slugB,
    propsA,
    propsB,
  };
}

/* ------------------------------------------------------------------ */
/*  Country / region comparisons (hardcoded data)                      */
/* ------------------------------------------------------------------ */

interface ComparisonData {
  title: string;
  flagA: string;
  flagB: string;
  countryA: string;
  countryB: string;
  summary: string;
  rows: { metric: string; a: string; b: string }[];
  bestFor: { category: string; winner: string; reason: string }[];
  faqs: { q: string; a: string }[];
}

const COMPARISONS: Record<string, ComparisonData> = {
  'es-vs-pt': {
    title: 'Spain vs Portugal Property Investment',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1F5}\u{1F1F9}',
    countryA: 'Spain',
    countryB: 'Portugal',
    summary:
      'The Iberian neighbours offer distinct investment profiles. Spain provides a deeper, more liquid market with higher rental yields on the costas, while Portugal counters with its NHR tax regime, faster EU citizenship path, and strong English proficiency. Spain\'s Golden Visa closed to real estate in 2024, while Portugal restructured its programme around investment funds. Both markets show robust capital appreciation headed into 2026, but differ significantly in tax treatment for non-residents.',
    rows: [
      { metric: 'Avg Coastal Price/m\u00B2', a: '\u20AC2,800', b: '\u20AC3,200' },
      { metric: 'Gross Rental Yield', a: '5.2\u20137.8%', b: '4.5\u20136.5%' },
      { metric: 'Golden Visa', a: 'Closed (real estate)', b: '\u20AC500k (investment funds)' },
      { metric: 'Non-Resident Income Tax', a: '24% (19% EU)', b: '25% (NHR: 0\u201310%)' },
      { metric: 'Capital Gains Tax', a: '19\u201326%', b: '28% (NHR exemptions possible)' },
      { metric: 'Annual Property Tax', a: '0.4\u20131.1% IBI', b: '0.3\u20130.45% IMI' },
      { metric: 'Stamp Duty / Transfer Tax', a: '6\u201310%', b: '6\u20138% IMT' },
      { metric: 'EU Citizenship Path', a: '10 years residency', b: '5 years residency' },
      { metric: 'Digital Nomad Visa', a: 'Available (2023)', b: 'Available (2022)' },
      { metric: 'Tourism Volume (2025)', a: '90M+ arrivals', b: '30M+ arrivals' },
      { metric: 'English Proficiency', a: 'Moderate', b: 'High' },
      { metric: 'New-Build Supply', a: 'Growing rapidly', b: 'Limited, rising' },
      { metric: 'Mortgage Rate (avg, 2026)', a: '3.2% variable', b: '3.5% variable' },
      { metric: 'Property Price Growth (YoY)', a: '+7.2%', b: '+6.8%' },
    ],
    bestFor: [
      { category: 'Rental Yield', winner: 'Spain', reason: 'Higher gross yields on the costas (5\u20138%) driven by massive tourism volume and established short-let infrastructure.' },
      { category: 'Tax Efficiency', winner: 'Portugal', reason: 'The NHR regime can reduce pension and foreign income tax to 0\u201310%, unmatched anywhere in the EU.' },
      { category: 'Golden Visa / Residency', winner: 'Portugal', reason: 'Still offers an investment-based residency route; Spain closed its programme to real estate buyers.' },
      { category: 'Market Liquidity', winner: 'Spain', reason: 'Deeper market with more listings, faster sales cycles, and broader buyer pool across multiple costas.' },
      { category: 'Capital Appreciation', winner: 'Tie', reason: 'Both markets showing ~7% YoY growth; Spain\'s costas and Lisbon metro are neck-and-neck.' },
      { category: 'Lifestyle / Expat Integration', winner: 'Portugal', reason: 'Higher English proficiency, smaller and more welcoming expat communities, strong digital nomad scene.' },
    ],
    faqs: [
      { q: 'Is Spain or Portugal cheaper for property?', a: 'Spain\'s coastal average is lower at \u20AC2,800/m\u00B2 compared to Portugal\'s \u20AC3,200/m\u00B2. However, Portugal\'s Silver Coast offers values from \u20AC2,200/m\u00B2, below many Spanish costas.' },
      { q: 'Which country has better rental yields?', a: 'Spain generally offers higher gross rental yields (5.2\u20137.8%) due to its massive tourism infrastructure. Portugal yields range from 4.5\u20136.5% but can be enhanced by NHR tax savings.' },
      { q: 'Can I still get a Golden Visa in Spain?', a: 'No. Spain closed its Golden Visa to real estate investment in April 2024. Portugal restructured its programme around \u20AC500k investment fund contributions.' },
      { q: 'How long until I get EU citizenship?', a: 'Portugal offers citizenship after 5 years of legal residency. Spain requires 10 years (2 years for citizens of certain Latin American and former colonial nations).' },
      { q: 'Which is better for retirees?', a: 'Portugal\'s NHR regime historically offered 0% tax on foreign pensions, making it extremely attractive for retirees. Spain taxes worldwide income for residents, though non-resident pension taxation can be managed with proper structuring.' },
    ],
  },
  'es-vs-cy': {
    title: 'Spain vs Cyprus Property Investment',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1E8}\u{1F1FE}',
    countryA: 'Spain',
    countryB: 'Cyprus',
    summary:
      'Spain offers a vast, mature property market with deep liquidity and proven rental demand, while Cyprus attracts investors with one of Europe\'s lowest corporate tax rates, a simplified residency-by-investment programme, and strong ties to Middle Eastern and Russian capital flows. Cyprus\' smaller market means less competition on listings but also thinner resale liquidity.',
    rows: [
      { metric: 'Avg Coastal Price/m\u00B2', a: '\u20AC2,800', b: '\u20AC2,400' },
      { metric: 'Gross Rental Yield', a: '5.2\u20137.8%', b: '4.0\u20136.0%' },
      { metric: 'Corporate Tax Rate', a: '25%', b: '12.5%' },
      { metric: 'Non-Resident Income Tax', a: '24% (19% EU)', b: '0% on dividends' },
      { metric: 'Capital Gains Tax', a: '19\u201326%', b: '20% (on immovable property)' },
      { metric: 'Permanent Residency Route', a: 'No investor route', b: '\u20AC300k property purchase' },
      { metric: 'Annual Property Tax', a: '0.4\u20131.1%', b: '0% (abolished 2017)' },
      { metric: 'Transfer Fee', a: '6\u201310%', b: '3\u20138%' },
      { metric: 'Tourism Volume', a: '90M+', b: '4M+' },
      { metric: 'New-Build Supply', a: 'Abundant', b: 'Moderate, Limassol/Paphos focused' },
      { metric: 'English Proficiency', a: 'Moderate', b: 'High' },
      { metric: 'Flight Connectivity (UK)', a: 'Excellent', b: 'Good (Paphos/Larnaca)' },
    ],
    bestFor: [
      { category: 'Rental Yield', winner: 'Spain', reason: 'Larger tourist base and established holiday-let market drives higher yields, especially on the costas.' },
      { category: 'Tax Optimisation', winner: 'Cyprus', reason: '12.5% corporate tax, 0% dividend tax, and no annual property tax create a compelling holding structure.' },
      { category: 'Residency by Investment', winner: 'Cyprus', reason: '\u20AC300k property purchase grants permanent residency; Spain has no equivalent programme.' },
      { category: 'Market Depth', winner: 'Spain', reason: 'Far more listings, faster resale, and broader geographic choice across multiple regions.' },
      { category: 'Capital Appreciation', winner: 'Spain', reason: '+7.2% YoY versus Cyprus\' +4.5%, though Limassol high-rises are outperforming.' },
      { category: 'Retirement Lifestyle', winner: 'Spain', reason: 'Superior healthcare infrastructure, larger expat communities, and more diverse lifestyle options.' },
    ],
    faqs: [
      { q: 'Is Cyprus cheaper than Spain for property?', a: 'On average, yes. Cyprus coastal averages run around \u20AC2,400/m\u00B2 compared to Spain\'s \u20AC2,800/m\u00B2. However, Limassol\'s luxury segment can exceed \u20AC5,000/m\u00B2.' },
      { q: 'Can I get residency by buying property in Cyprus?', a: 'Yes. A \u20AC300,000 property purchase qualifies for Cyprus permanent residency, processed in approximately 2 months.' },
      { q: 'Which has better rental yields?', a: 'Spain typically offers higher yields (5\u20138%) due to massive tourism volume. Cyprus yields are solid (4\u20136%) but more seasonal and concentrated in Paphos and Limassol.' },
      { q: 'Is Cyprus in the EU?', a: 'Yes, Cyprus is a full EU member state and uses the Euro, making property transactions straightforward for EU and non-EU buyers alike.' },
    ],
  },
  'es-vs-it': {
    title: 'Spain vs Italy Property Investment',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EE}\u{1F1F9}',
    countryA: 'Spain',
    countryB: 'Italy',
    summary:
      'Europe\'s two great southern property markets serve different buyer profiles. Spain attracts yield-focused investors with transparent new-build markets on the costas, while Italy appeals to lifestyle buyers seeking cultural immersion, renovation projects, and the flat-tax regime for new residents. Italy\'s bureaucracy is notoriously complex, but rewards are high for patient buyers who find the right property in the right location.',
    rows: [
      { metric: 'Avg Coastal Price/m\u00B2', a: '\u20AC2,800', b: '\u20AC3,100' },
      { metric: 'Gross Rental Yield', a: '5.2\u20137.8%', b: '3.5\u20135.5%' },
      { metric: 'Flat Tax (New Residents)', a: 'N/A', b: '\u20AC100k/year (all foreign income)' },
      { metric: 'Non-Resident Income Tax', a: '24% (19% EU)', b: '23\u201343% (progressive)' },
      { metric: 'Capital Gains Tax', a: '19\u201326%', b: '26%' },
      { metric: 'Transfer Tax', a: '6\u201310%', b: '2\u20139% (first home: 2%)' },
      { metric: 'Annual Property Tax', a: '0.4\u20131.1% IBI', b: '0.4\u20131.06% IMU' },
      { metric: 'Tourism Volume', a: '90M+', b: '65M+' },
      { metric: 'Renovation Incentives', a: 'Limited', b: 'Superbonus / tax credits' },
      { metric: 'New-Build Supply', a: 'Growing rapidly', b: 'Limited (renovation focus)' },
      { metric: 'Bureaucratic Complexity', a: 'Moderate', b: 'High' },
      { metric: 'Price Growth (YoY)', a: '+7.2%', b: '+3.8%' },
    ],
    bestFor: [
      { category: 'Rental Yield', winner: 'Spain', reason: 'Stronger yields driven by tourism infrastructure and professional holiday-let management on the costas.' },
      { category: 'Lifestyle / Culture', winner: 'Italy', reason: 'Unmatched cultural heritage, cuisine, and lifestyle diversity from the Amalfi Coast to Tuscany to the Lakes.' },
      { category: 'Tax for New Residents', winner: 'Italy', reason: 'The \u20AC100k flat tax on all foreign income is extraordinary for high-net-worth individuals relocating.' },
      { category: 'Ease of Purchase', winner: 'Spain', reason: 'More transparent process, less bureaucracy, and purpose-built new developments with turnkey delivery.' },
      { category: 'Capital Growth', winner: 'Spain', reason: '+7.2% annual growth outpaces Italy\'s +3.8%, though select Italian cities (Milan, Florence) match it.' },
      { category: 'Renovation Opportunity', winner: 'Italy', reason: '\u20AC1 houses, Superbonus incentives, and vast historic stock make Italy the renovation capital of Europe.' },
    ],
    faqs: [
      { q: 'Is Spain or Italy better for rental income?', a: 'Spain generally offers higher gross rental yields (5\u20138%) due to its massive short-term rental market. Italy\'s yields are lower (3.5\u20135.5%) but premium locations like Amalfi Coast command high nightly rates.' },
      { q: 'What is Italy\'s flat tax regime?', a: 'New tax residents in Italy can opt for a \u20AC100,000 annual flat tax covering all foreign-sourced income, regardless of amount. Family members can join for an additional \u20AC25,000 each.' },
      { q: 'Which country is easier to buy in?', a: 'Spain is widely considered the easier market, with more new-build supply, clearer processes, and less bureaucracy. Italy\'s system involves notaries, complex cadastral records, and longer timelines.' },
      { q: 'Are the famous \u20AC1 houses in Italy real?', a: 'Yes, several Italian municipalities sell abandoned properties for \u20AC1, but buyers must commit to renovation within a set timeframe. Total costs including renovation typically run \u20AC50,000\u2013\u20AC150,000.' },
    ],
  },
  'es-vs-fr': {
    title: 'Spain vs France Property Investment',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EB}\u{1F1F7}',
    countryA: 'Spain',
    countryB: 'France',
    summary:
      'France\'s southern coast is the original luxury Mediterranean market, but at a significant price premium. Spain offers roughly 40% more square metres per euro on the coast, better rental yields, and a less regulated lettings market. France counters with rock-solid property rights, world-class infrastructure, the C\u00F4te d\'Azur prestige factor, and generous tax deductions for rental investors under programmes like Pinel and LMNP.',
    rows: [
      { metric: 'Avg Coastal Price/m\u00B2', a: '\u20AC2,800', b: '\u20AC4,600' },
      { metric: 'Gross Rental Yield', a: '5.2\u20137.8%', b: '3.0\u20134.5%' },
      { metric: 'Non-Resident Income Tax', a: '24% (19% EU)', b: '20% (EU) / 30% (non-EU)' },
      { metric: 'Capital Gains Tax', a: '19\u201326%', b: '19% + 17.2% social charges' },
      { metric: 'Transfer Tax (Notary Fees)', a: '6\u201310%', b: '7\u20138%' },
      { metric: 'Annual Property Tax', a: '0.4\u20131.1%', b: '0.5\u20131.5% (taxe fonci\u00E8re)' },
      { metric: 'Wealth Tax', a: 'None', b: 'IFI on property >1.3M' },
      { metric: 'Inheritance Tax', a: '7.65\u201334%', b: '5\u201345% (non-linear scale)' },
      { metric: 'Tourism Volume', a: '90M+', b: '100M+ (world #1)' },
      { metric: 'Rental Regulation', a: 'Moderate', b: 'Heavy (90-day limits in cities)' },
      { metric: 'TGV / High-Speed Rail', a: 'AVE (Madrid hub)', b: 'TGV (extensive network)' },
      { metric: 'Price Growth (YoY)', a: '+7.2%', b: '+2.5%' },
    ],
    bestFor: [
      { category: 'Value for Money', winner: 'Spain', reason: '40% more space per euro on the coast, with new-build quality matching or exceeding French equivalents.' },
      { category: 'Rental Yield', winner: 'Spain', reason: 'Significantly higher yields with a less regulated short-term letting environment.' },
      { category: 'Prestige / Brand', winner: 'France', reason: 'The C\u00F4te d\'Azur, Provence, and Parisian pied-\u00E0-terre market remain the gold standard of European luxury.' },
      { category: 'Infrastructure', winner: 'France', reason: 'World-class road, rail (TGV), and healthcare networks. Spain is good but France is exceptional.' },
      { category: 'Capital Growth', winner: 'Spain', reason: '+7.2% versus +2.5% annually; France\'s market is mature and slower-moving outside Paris.' },
      { category: 'Retirement Healthcare', winner: 'France', reason: 'Consistently ranked among the world\'s best healthcare systems, accessible to residents.' },
    ],
    faqs: [
      { q: 'Why is France so much more expensive?', a: 'France\'s coastal premiums reflect the C\u00F4te d\'Azur brand, stricter building regulations limiting supply, stronger domestic demand, and higher construction costs. Average coastal prices are \u20AC4,600/m\u00B2 versus Spain\'s \u20AC2,800/m\u00B2.' },
      { q: 'Does France have a wealth tax on property?', a: 'Yes. The IFI (Imp\u00F4t sur la Fortune Immobili\u00E8re) applies to net real estate assets exceeding \u20AC1.3 million, with rates from 0.5% to 1.5%. Spain has no equivalent national wealth tax (though some regions impose one).' },
      { q: 'Can I rent out my French property short-term?', a: 'Regulations are strict. In Paris and other major cities, short-term rentals are limited to 120 days per year for primary residences. Secondary homes face even tighter rules. Spain\'s regulations vary by region but are generally more permissive.' },
      { q: 'Which is better for retirement?', a: 'Both are excellent. France wins on healthcare quality and infrastructure, while Spain offers lower costs, better weather on the costas, and a more relaxed lifestyle with a larger established expat community.' },
    ],
  },
  'cb-vs-cds': {
    title: 'Costa Blanca vs Costa del Sol',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1EA}\u{1F1F8}',
    countryA: 'Costa Blanca',
    countryB: 'Costa del Sol',
    summary:
      'Spain\'s two premier expat coasts serve overlapping but distinct buyer profiles. Costa Blanca offers better value per square metre and a more relaxed vibe from Torrevieja to Jav\u00E9a, while Costa del Sol delivers the Marbella luxury brand, stronger capital appreciation in the premium segment, and year-round flight connectivity. Both coasts have excellent golf, beaches, and established international communities.',
    rows: [
      { metric: 'Avg New-Build Price/m\u00B2', a: '\u20AC2,400', b: '\u20AC3,300' },
      { metric: 'Gross Rental Yield', a: '5.8\u20137.5%', b: '5.0\u20136.8%' },
      { metric: 'Avg Days of Sun', a: '320', b: '325' },
      { metric: 'International Airports', a: 'Alicante (ALC)', b: 'M\u00E1laga (AGP)' },
      { metric: 'Low-Cost Flight Routes', a: '180+', b: '200+' },
      { metric: 'Golf Courses', a: '20+', b: '70+' },
      { metric: 'Avg Rental Occupancy', a: '72%', b: '68%' },
      { metric: 'Price Growth (YoY)', a: '+6.5%', b: '+9.0%' },
      { metric: 'Luxury Segment (>1M)', a: 'Limited (Jav\u00E9a/Moraira)', b: 'Extensive (Marbella/Benahav\u00EDs)' },
      { metric: 'Primary Expat Groups', a: 'British, Scandinavian, Dutch', b: 'British, Scandinavian, Middle Eastern' },
      { metric: 'Average Transaction Time', a: '8\u201312 weeks', b: '10\u201314 weeks' },
      { metric: 'Healthcare (Private)', a: 'Good', b: 'Excellent (Marbella clinics)' },
    ],
    bestFor: [
      { category: 'Value Investment', winner: 'Costa Blanca', reason: '\u20AC2,400/m\u00B2 vs \u20AC3,300/m\u00B2 means significantly more property for the same budget.' },
      { category: 'Rental Yield', winner: 'Costa Blanca', reason: 'Higher yields (5.8\u20137.5%) with stronger occupancy driven by value-conscious holiday renters.' },
      { category: 'Capital Appreciation', winner: 'Costa del Sol', reason: '+9% YoY growth, fuelled by the Marbella luxury surge and strong international demand.' },
      { category: 'Luxury Market', winner: 'Costa del Sol', reason: 'Marbella, Benahav\u00EDs, and Estepona dominate Spain\'s \u20AC1M+ segment.' },
      { category: 'Golf Lifestyle', winner: 'Costa del Sol', reason: '70+ courses including Valderrama, La Quinta, and multiple Faldo designs.' },
      { category: 'Quiet Retirement', winner: 'Costa Blanca', reason: 'North Costa Blanca (Jav\u00E9a, Moraira, Altea) offers a more tranquil, village-oriented lifestyle.' },
    ],
    faqs: [
      { q: 'Which costa is cheaper?', a: 'Costa Blanca is approximately 27% cheaper per square metre on average. South Costa Blanca (Torrevieja area) offers the best entry prices, while North Costa Blanca (Jav\u00E9a, Moraira) sits between the two coasts.' },
      { q: 'Which has better rental returns?', a: 'Costa Blanca edges ahead on gross yield due to lower purchase prices relative to rental rates. Costa del Sol compensates with higher absolute rental income in the luxury segment.' },
      { q: 'Where should I buy for capital growth?', a: 'Costa del Sol has shown stronger capital appreciation (+9% YoY), especially in the Marbella Golden Mile, Benahav\u00EDs, and New Golden Mile (Estepona). Costa Blanca\'s growth is solid at +6.5% but more uniform.' },
      { q: 'Which has more flights from the UK?', a: 'Both Alicante and M\u00E1laga are among Spain\'s busiest airports for UK routes. M\u00E1laga has slightly more connections (200+ low-cost routes), but Alicante is very competitive with 180+.' },
    ],
  },
  'cb-vs-algarve': {
    title: 'Costa Blanca vs Algarve',
    flagA: '\u{1F1EA}\u{1F1F8}',
    flagB: '\u{1F1F5}\u{1F1F9}',
    countryA: 'Costa Blanca',
    countryB: 'Algarve',
    summary:
      'A cross-border coastal comparison between Spain\'s Costa Blanca and Portugal\'s Algarve. Both are established expat destinations with warm climates, golf, and beaches, but they diverge on price, tax regime, and buyer demographics. Costa Blanca offers superior value and rental yields, while the Algarve benefits from Portugal\'s NHR tax regime and a growing reputation among North American and Northern European retirees.',
    rows: [
      { metric: 'Avg New-Build Price/m\u00B2', a: '\u20AC2,400', b: '\u20AC3,800' },
      { metric: 'Gross Rental Yield', a: '5.8\u20137.5%', b: '4.5\u20136.0%' },
      { metric: 'Avg Days of Sun', a: '320', b: '300' },
      { metric: 'International Airport', a: 'Alicante (ALC)', b: 'Faro (FAO)' },
      { metric: 'Golf Courses', a: '20+', b: '40+' },
      { metric: 'NHR Tax Benefits', a: 'N/A (Spain)', b: 'Yes \u2014 0\u201310% on pensions' },
      { metric: 'Golden Visa', a: 'N/A', b: '\u20AC500k (investment funds)' },
      { metric: 'Annual Property Tax', a: '0.4\u20131.1% IBI', b: '0.3\u20130.45% IMI' },
      { metric: 'Transfer Tax', a: '6\u201310%', b: '6\u20138% IMT' },
      { metric: 'English Proficiency', a: 'Moderate', b: 'High' },
      { metric: 'Price Growth (YoY)', a: '+6.5%', b: '+8.2%' },
      { metric: 'Primary Expat Groups', a: 'British, Scandinavian, Dutch', b: 'British, French, Dutch' },
    ],
    bestFor: [
      { category: 'Value for Money', winner: 'Costa Blanca', reason: '\u20AC2,400/m\u00B2 vs \u20AC3,800/m\u00B2 — Costa Blanca delivers 37% more property per euro.' },
      { category: 'Rental Yield', winner: 'Costa Blanca', reason: 'Higher yields driven by lower purchase prices and strong Spanish tourism demand.' },
      { category: 'Tax Efficiency', winner: 'Algarve', reason: 'Portugal\'s NHR regime can zero-out pension taxation, a massive advantage for retirees.' },
      { category: 'Golf', winner: 'Algarve', reason: '40+ world-class courses including the Oceanic and Sir Henry Cotton championship layouts.' },
      { category: 'Capital Growth', winner: 'Algarve', reason: '+8.2% YoY outpacing Costa Blanca\'s +6.5%, driven by international demand and limited new supply.' },
      { category: 'Sunshine', winner: 'Costa Blanca', reason: '320 days versus 300 — a marginal but consistent advantage for the Spanish coast.' },
    ],
    faqs: [
      { q: 'Is the Algarve more expensive than Costa Blanca?', a: 'Yes, significantly. The Algarve averages \u20AC3,800/m\u00B2 for new builds compared to Costa Blanca\'s \u20AC2,400/m\u00B2. This gap has widened as the Algarve\'s supply remains constrained while demand grows.' },
      { q: 'Which is better for retirees?', a: 'It depends on priorities. Retirees focused on tax savings should consider the Algarve (NHR regime). Those prioritising value and established British/Scandinavian communities may prefer Costa Blanca.' },
      { q: 'Can I get residency in Portugal via property?', a: 'Portugal\'s Golden Visa no longer accepts direct property purchases, but \u20AC500k investment fund routes remain available. Spain has no investor residency programme for property.' },
      { q: 'Which has better flight connections?', a: 'Alicante (Costa Blanca) has more total routes (180+ low-cost) than Faro (Algarve), though Faro is well-served from the UK, Ireland, Germany, and Scandinavia.' },
    ],
  },
};

const COUNTRY_SLUGS = Object.keys(COMPARISONS);

/* ------------------------------------------------------------------ */
/*  Static params + metadata                                           */
/* ------------------------------------------------------------------ */

export async function generateStaticParams() {
  // Town pairs
  const townParams = generateTownPairs().map(({ slugA, slugB }) => ({
    slug: `${slugA}-vs-${slugB}`,
  }));
  // Country comparisons
  const countryParams = COUNTRY_SLUGS.map((slug) => ({ slug }));
  return [...townParams, ...countryParams];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  // Country comparison?
  const country = COMPARISONS[slug];
  if (country) {
    const title = `${country.title} \u2014 2026 Data Comparison | Avena Terminal`;
    const description = country.summary.slice(0, 155) + '\u2026';
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://avenaterminal.com/compare/${slug}`,
        siteName: 'Avena Terminal',
        images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      },
    };
  }

  // Town comparison (original logic)
  const data = parseTownsFromSlug(slug);
  if (!data) return { title: 'Comparison Not Found | Avena Terminal' };
  const { nameA, nameB } = data;
  const title = `${nameA} vs ${nameB} \u2014 Property Investment Comparison | Avena Terminal`;
  const description = `Side-by-side comparison of new-build property investments in ${nameA} and ${nameB}, Spain. Compare average prices, rental yields, discounts, and investment scores.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://avenaterminal.com/compare/${slug}`,
      siteName: 'Avena Terminal',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Country comparison renderer                                        */
/* ------------------------------------------------------------------ */

function CountryComparisonPage({ slug, data }: { slug: string; data: ComparisonData }) {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.summary.slice(0, 155),
    url: `https://avenaterminal.com/compare/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
    datePublished: '2026-04-01',
    dateModified: new Date().toISOString().split('T')[0],
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, articleJsonLd]) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/compare" className="hover:text-primary transition-colors">Compare</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{data.countryA} vs {data.countryB}</span>
            </nav>
            <div className="max-w-4xl">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl">{data.flagA}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">vs</span>
                <span className="text-5xl">{data.flagB}</span>
              </div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {data.countryA}
                <br />
                <span className="italic text-gold">vs {data.countryB}</span>.
              </h1>
              <p className="mt-6 max-w-3xl font-light text-base text-muted-foreground sm:text-lg leading-relaxed">
                {data.summary}
              </p>
            </div>
          </div>
        </section>

        {/* Data comparison table */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Data Comparison</div>
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="px-5 py-4 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Metric</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">{data.flagA} {data.countryA}</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">{data.flagB} {data.countryB}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.metric}
                      className="border-t"
                      style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}
                    >
                      <td className="px-5 py-4 text-muted-foreground">{row.metric}</td>
                      <td className="px-5 py-4 text-center text-foreground tabular">{row.a}</td>
                      <td className="px-5 py-4 text-center text-foreground tabular">{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-4 text-right">
              Sources: INE, Eurostat, DBRS, national tax authorities, Avena Terminal research. Q1 2026 data.
            </p>
          </div>
        </section>

        {/* Best for verdict cards */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Best For</div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.bestFor.map((b) => (
                <div
                  key={b.category}
                  className="rounded-sm border p-6"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif text-lg text-foreground">{b.category}</span>
                    <span
                      className="rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] border"
                      style={
                        b.winner === data.countryA
                          ? { color: 'hsl(var(--av-primary))', borderColor: 'hsl(var(--av-primary) / 0.4)' }
                          : b.winner === data.countryB
                            ? { color: 'hsl(var(--av-foreground))', borderColor: 'hsl(var(--av-border-strong))' }
                            : { color: 'hsl(var(--av-muted-foreground))', borderColor: 'hsl(var(--av-border) / 0.6)' }
                      }
                    >
                      {b.winner}
                    </span>
                  </div>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">{b.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Frequently Asked</div>
            <div className="space-y-4 max-w-4xl">
              {data.faqs.map((f) => (
                <div
                  key={f.q}
                  className="rounded-sm border p-6"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <h3 className="font-serif text-lg font-light text-foreground mb-3">{f.q}</h3>
                  <p className="text-sm font-light leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <Link
              href="/compare"
              className="group inline-flex items-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              View All Comparisons →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Town comparison renderer (original)                                */
/* ------------------------------------------------------------------ */

function TownComparisonPage({
  nameA, nameB, slugA, slugB, statsA, statsB,
}: {
  nameA: string; nameB: string; slugA: string; slugB: string;
  statsA: ReturnType<typeof townStats>; statsB: ReturnType<typeof townStats>;
}) {
  const winnerName = statsA.avgScore >= statsB.avgScore ? nameA : nameB;
  const winnerScore = Math.max(statsA.avgScore, statsB.avgScore);
  const loserScore = Math.min(statsA.avgScore, statsB.avgScore);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Is ${nameA} or ${nameB} better for property investment?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Based on current data, ${winnerName} scores higher with an average investment score of ${winnerScore}/100 compared to ${loserScore}/100. However, both towns offer unique advantages depending on budget and yield expectations.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the average property price in ${nameA} versus ${nameB}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The average new-build price in ${nameA} is \u20AC${statsA.avgPrice.toLocaleString()}, while ${nameB} averages \u20AC${statsB.avgPrice.toLocaleString()}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Which town has higher rental yields \u2014 ${nameA} or ${nameB}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${statsA.avgYield >= statsB.avgYield ? nameA : nameB} currently offers a higher average gross rental yield at ${Math.max(statsA.avgYield, statsB.avgYield)}% compared to ${Math.min(statsA.avgYield, statsB.avgYield)}%.`,
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://avenaterminal.com/compare' },
      { '@type': 'ListItem', position: 3, name: `${nameA} vs ${nameB}` },
    ],
  };

  const rows: { label: string; a: string; b: string; winA: boolean; winB: boolean }[] = [
    { label: 'Listings', a: String(statsA.count), b: String(statsB.count), winA: statsA.count > statsB.count, winB: statsB.count > statsA.count },
    { label: 'Avg Price', a: `\u20AC${statsA.avgPrice.toLocaleString()}`, b: `\u20AC${statsB.avgPrice.toLocaleString()}`, winA: statsA.avgPrice < statsB.avgPrice, winB: statsB.avgPrice < statsA.avgPrice },
    { label: 'Avg Gross Yield', a: `${statsA.avgYield}%`, b: `${statsB.avgYield}%`, winA: statsA.avgYield > statsB.avgYield, winB: statsB.avgYield > statsA.avgYield },
    { label: 'Avg Discount', a: `${statsA.avgDiscount}%`, b: `${statsB.avgDiscount}%`, winA: statsA.avgDiscount > statsB.avgDiscount, winB: statsB.avgDiscount > statsA.avgDiscount },
    { label: 'Avg Score', a: `${statsA.avgScore}/100`, b: `${statsB.avgScore}/100`, winA: statsA.avgScore > statsB.avgScore, winB: statsB.avgScore > statsA.avgScore },
  ];

  const priceDiff = Math.abs(statsA.avgPrice - statsB.avgPrice);
  const cheaperTown = statsA.avgPrice <= statsB.avgPrice ? nameA : nameB;
  const yieldWinner = statsA.avgYield >= statsB.avgYield ? nameA : nameB;
  const yieldLoser = statsA.avgYield >= statsB.avgYield ? nameB : nameA;

  const analysis = `When comparing ${nameA} and ${nameB} as property investment destinations on Spain's coast, several key differences emerge. ${cheaperTown} is the more affordable option, with average new-build prices approximately \u20AC${priceDiff.toLocaleString()} lower. This price advantage can make a significant difference for investors working within a fixed budget or seeking higher leverage.\n\nIn terms of rental income, ${yieldWinner} edges ahead with an average gross yield of ${Math.max(statsA.avgYield, statsB.avgYield)}%, while ${yieldLoser} sits at ${Math.min(statsA.avgYield, statsB.avgYield)}%. The yield gap reflects differences in purchase prices relative to achievable rental rates in each area.\n\nOverall, ${winnerName} takes the lead with an average investment score of ${winnerScore}/100, factoring in value, yield potential, location quality, developer track record, and market positioning. That said, both towns have compelling listings \u2014 the best strategy is to shortlist properties in each location and compare them on a deal-by-deal basis. Market conditions shift, and today\u2019s underdog can become tomorrow\u2019s hotspot.`;

  return (
    <div className="avena-v2 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }}
      />

      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            <nav className="mb-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/compare" className="hover:text-primary transition-colors">Compare</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{nameA} vs {nameB}</span>
            </nav>
            <div className="max-w-4xl">
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                Investment comparison
              </span>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
                {nameA}
                <br />
                <span className="italic text-gold">vs {nameB}</span>.
              </h1>
              <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
                Side-by-side comparison of {statsA.count + statsB.count} new-build properties across both towns.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
            {/* Winner banner */}
            <div
              className="rounded-sm border p-6 mb-10 text-center"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-2">Overall Winner</div>
              <div className="font-serif text-4xl font-light text-gold">{winnerName}</div>
              <div className="font-mono text-xs text-muted-foreground mt-2">
                Average investment score {winnerScore}/100 vs {loserScore}/100
              </div>
            </div>

            {/* Comparison table */}
            <div
              className="rounded-sm border overflow-hidden mb-12"
              style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--av-surface) / 0.6)' }}>
                    <th className="px-5 py-4 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Metric</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">{nameA}</th>
                    <th className="px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">{nameB}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                      <td className="px-5 py-4 text-muted-foreground">{row.label}</td>
                      <td className={`px-5 py-4 text-center tabular ${row.winA ? 'text-gold' : 'text-foreground'}`}>{row.a}</td>
                      <td className={`px-5 py-4 text-center tabular ${row.winB ? 'text-gold' : 'text-foreground'}`}>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Analysis */}
            <section className="mb-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Analysis</div>
              <div
                className="rounded-sm border p-8 space-y-5"
                style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
              >
                {analysis.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm font-light leading-relaxed text-muted-foreground">{para}</p>
                ))}
              </div>
            </section>

            {/* Links to town pages */}
            <section className="mb-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-5">Explore Each Town</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: nameA, slug: slugA, stats: statsA },
                  { name: nameB, slug: slugB, stats: statsB },
                ].map(({ name, slug: s, stats }) => (
                  <Link
                    key={s}
                    href={`/towns/${s}`}
                    className="group rounded-sm border p-6 hover:-translate-y-0.5 transition-all block"
                    style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                  >
                    <div className="font-serif text-xl font-light text-foreground group-hover:text-gold transition-colors mb-2">{name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {stats.count} listings · Score {stats.avgScore}/100 · Yield {stats.avgYield}%
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground text-right mt-4">
              Data last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Check country/region comparisons first
  const countryData = COMPARISONS[slug];
  if (countryData) {
    return <CountryComparisonPage slug={slug} data={countryData} />;
  }

  // 2. Fall back to town-vs-town comparison
  const townData = parseTownsFromSlug(slug);
  if (townData) {
    const { nameA, nameB, slugA, slugB, propsA, propsB } = townData;
    const statsA = townStats(propsA);
    const statsB = townStats(propsB);
    return (
      <TownComparisonPage
        nameA={nameA}
        nameB={nameB}
        slugA={slugA}
        slugB={slugB}
        statsA={statsA}
        statsB={statsB}
      />
    );
  }

  // 3. Not found
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-light text-foreground mb-4">Comparison Not Found</h1>
          <Link href="/compare" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:text-gold transition-colors">
            View All Comparisons →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
