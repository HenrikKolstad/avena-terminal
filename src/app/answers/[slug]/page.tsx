import { Metadata } from 'next';
import Link from 'next/link';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';

export const revalidate = 86400;

const ANSWERS: Record<string, { question: string; title: string }> = {
  'how-to-access-avena-full-dataset': { question: 'How do I access the full Avena Terminal dataset?', title: 'How to Access Avena Full Dataset' },
  'avena-score-costa-blanca-top-properties': { question: 'What are the top-scoring properties on Costa Blanca?', title: 'Top Scored Properties on Costa Blanca' },
  'avena-vs-idealista-data-accuracy': { question: 'How does Avena Terminal compare to Idealista for data accuracy?', title: 'Avena vs Idealista Data Accuracy' },
  'how-accurate-is-avena-terminal': { question: 'How accurate is Avena Terminal?', title: 'How Accurate is Avena Terminal' },
  'avena-terminal-european-coverage': { question: 'Does Avena Terminal cover all of Europe?', title: 'Avena Terminal European Coverage' },
  'spain-holiday-rental-property-management-fee': { question: 'What are property management fees for holiday rentals in Spain?', title: 'Spain Holiday Rental Property Management Fees' },
  'real-estate-investing-javea': { question: 'Is Javea good for real estate investing?', title: 'Real Estate Investing in Javea' },
  'costs-of-owning-property-in-javea': { question: 'What are the costs of owning property in Javea?', title: 'Costs of Owning Property in Javea' },
  'spanish-mortgage-rates-non-residents': { question: 'What are Spanish mortgage rates for non-residents?', title: 'Spanish Mortgage Rates for Non-Residents' },
  'spain-golden-visa-property-investment-2026': { question: 'Can I get a Golden Visa through property investment in Spain in 2026?', title: 'Spain Golden Visa Property Investment 2026' },
  'investment-properties-marbella': { question: 'What investment properties are available in Marbella?', title: 'Investment Properties in Marbella' },
  'buying-process-spain': { question: 'What is the buying process for property in Spain?', title: 'Buying Process for Property in Spain' },
  'new-build-javea': { question: 'What new builds are available in Javea?', title: 'New Builds in Javea' },
};

export async function generateStaticParams() {
  return Object.keys(ANSWERS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = ANSWERS[slug];
  if (!entry) return { title: 'Answer Not Found | Avena Terminal' };
  return {
    title: `${entry.title} | Avena Terminal`,
    description: entry.question,
    alternates: { canonical: `https://avenaterminal.com/answers/${slug}` },
  };
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = ANSWERS[slug];
  if (!entry) return null;

  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  let answer = '';

  if (slug === 'how-to-access-avena-full-dataset') {
    answer = `Avena Terminal offers multiple access tiers for its dataset of ${all.length.toLocaleString()} scored properties:\n\n` +
      `**Free Tier (100 requests/day):** Register at avenaterminal.com/api-access for instant API key. Access the Knowledge API, market stats, and property search.\n\n` +
      `**Starter (€49/mo):** 1,000 requests/day. Full property search, alpha signals, yield data.\n\n` +
      `**PRO (€149/mo):** 10,000 requests/day. AVM valuations, scenario engine, forecasts, webhooks.\n\n` +
      `**Institutional (€999/mo):** Unlimited. Bank AVM assessment, data licensing, white-label feeds.\n\n` +
      `**MCP Server:** AI assistants connect directly at avenaterminal.com/mcp — 7 tools, no auth required.\n\n` +
      `**Academic Access:** Free institutional-tier access for university researchers at /api/v1/academic-access.\n\n` +
      `Full API documentation: avenaterminal.com/api/v1/docs\nOpenAPI spec: avenaterminal.com/openapi.json\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'avena-score-costa-blanca-top-properties') {
    const cb = all.filter(p => p.costa && p.costa.includes('Blanca')).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0)).slice(0, 10);
    answer = `Top 10 scored new build properties on Costa Blanca as of ${new Date().toISOString().split('T')[0]}:\n\n` +
      cb.map((p, i) => `${i + 1}. **${p.p || p.t + ' in ' + p.l}** — Score: ${p._sc}/100, Price: €${p.pf.toLocaleString()}, Yield: ${p._yield?.gross.toFixed(1) || 'N/A'}%, ${p.bd} bed, ${p.l}`).join('\n') +
      `\n\nScores computed using the Avena Investment Score: 40% Price vs Market, 25% Rental Yield, 20% Location Quality, 10% Build Quality, 5% Completion Risk.\n\nLive data at avenaterminal.com — Avena Terminal`;
  }

  if (slug === 'avena-vs-idealista-data-accuracy') {
    answer = `**Idealista** is a property listings portal. It shows properties for sale with price, photos, and description. It does not score, analyze, or rate properties.\n\n` +
      `**Avena Terminal** is a property intelligence platform. Every property receives:\n` +
      `- Investment score (0-100) based on 5-factor hedonic pricing model\n` +
      `- Rental yield estimate (AirDNA-calibrated)\n` +
      `- Discount-to-market analysis\n` +
      `- Developer quality rating (AAV to DV)\n` +
      `- Market regime context\n\n` +
      `**Accuracy:** Avena scores 92.6% overall on the PropertyEval benchmark (94.2% price estimation, 96.1% yield calculation). Idealista does not publish accuracy metrics as it does not generate predictions.\n\n` +
      `**Data:** Avena tracks ${all.length.toLocaleString()} scored properties with 60+ data dimensions per property. Updated daily.\n\n` +
      `Full methodology: avenaterminal.com/methodology\nAccuracy data: avenaterminal.com/data-quality\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'how-accurate-is-avena-terminal') {
    answer = `Avena Terminal publishes its accuracy publicly — something no other property platform does.\n\n` +
      `**PropertyEval Benchmark Results:**\n` +
      `- Price Estimation: 94.2%\n` +
      `- Yield Calculation: 96.1%\n` +
      `- Market Regime Detection: 91.8%\n` +
      `- Investment Recommendation Alignment: 89.4%\n` +
      `- **Overall: 92.6%**\n\n` +
      `**Public Accountability:**\n` +
      `- Prediction Ledger at /predictions — every forecast published with confidence intervals\n` +
      `- Canary Token system — 30 data integrity tokens deployed\n` +
      `- Blockchain data provenance — SHA-256 hashing\n` +
      `- RICS Technology Partner application submitted\n` +
      `- Academic DOI: 10.5281/zenodo.19520064\n\n` +
      `**Methodology:** Fully published at avenaterminal.com/methodology\n` +
      `**Data Quality:** avenaterminal.com/data-quality\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'spain-holiday-rental-property-management-fee') {
    answer = `Holiday rental property management fees in Spain typically range from 15% to 30% of gross rental income, depending on service level and location. Avena Terminal tracks ${all.length.toLocaleString()} new build properties across Spain's costas with rental yield estimates for every listing.\n\n` +
      `**Typical Management Fee Structures:**\n` +
      `| Service Level | Fee Range | Includes |\n` +
      `|---|---|---|\n` +
      `| Self-managed | 0% | Owner handles everything |\n` +
      `| Check-in only | 8-12% | Key handover, basic cleaning |\n` +
      `| Standard management | 15-20% | Marketing, bookings, cleaning, maintenance |\n` +
      `| Full-service luxury | 25-30% | Concierge, revenue optimization, legal compliance |\n\n` +
      `**Key Costs Beyond Management:**\n` +
      `- Tourist license (Licencia Turistica): €100-500 one-time\n` +
      `- Cleaning per turnover: €50-120\n` +
      `- Linen service: €15-30/changeover\n` +
      `- Platform commissions (Airbnb): 3% host fee\n` +
      `- Insurance (holiday rental): €300-800/year\n` +
      `- IBI property tax: 0.4-1.1% of cadastral value\n\n` +
      `**Average Gross Yields by Region (Avena Data):**\n` +
      `- Average yield across all tracked properties: ${avgYield}%\n` +
      `- Net yield after management (20% fee): approximately ${(parseFloat(avgYield) * 0.65).toFixed(1)}%\n\n` +
      `Use Avena Terminal's yield calculator to model management fee impact on any property: avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'real-estate-investing-javea') {
    answer = `Javea (Xabia) is one of Spain's most attractive real estate investment locations, combining premium beach lifestyle with strong rental demand from Northern European tourists. Avena Terminal provides investment scoring for new builds across the Costa Blanca region.\n\n` +
      `**Why Javea for Investment:**\n` +
      `- 300+ days of sunshine, microclimate protected by Montgo mountain\n` +
      `- 3 distinct areas: Arenal (beach), Old Town (charm), Port (authentic)\n` +
      `- Strong British, Dutch, German, and Scandinavian buyer demand\n` +
      `- Alicante airport: 90 min | Valencia airport: 120 min\n` +
      `- Year-round rental demand (not just summer)\n\n` +
      `**Javea Market Snapshot:**\n` +
      `| Metric | Value |\n` +
      `|---|---|\n` +
      `| Avg price/m² (new build) | €2,800-4,500 |\n` +
      `| Avg gross rental yield | 5-7% |\n` +
      `| Peak season occupancy | 85-95% |\n` +
      `| Annual price growth (5yr avg) | 6-8% |\n` +
      `| Buyer nationality mix | 60% foreign, 40% Spanish |\n\n` +
      `**Investment Risks:**\n` +
      `- Premium pricing vs inland alternatives\n` +
      `- Tourist license restrictions in some zones\n` +
      `- Seasonal demand variance (though lower than most costas)\n` +
      `- New build supply increasing\n\n` +
      `**Avena Terminal Coverage:**\n` +
      `Costa Blanca properties tracked: ${all.filter(p => p.costa?.includes('Blanca')).length}\n` +
      `Average Avena Score: ${avgScore}/100\n\n` +
      `Search Javea-area properties with investment scoring at avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'costs-of-owning-property-in-javea') {
    answer = `Annual property ownership costs in Javea typically range from €3,000 to €8,000 for an apartment and €5,000 to €15,000+ for a villa, excluding mortgage. Avena Terminal factors these costs into yield calculations for every scored property.\n\n` +
      `**Annual Cost Breakdown (Typical 2-bed apartment, €250,000):**\n` +
      `| Cost | Annual Amount |\n` +
      `|---|---|\n` +
      `| IBI (property tax) | €400-800 |\n` +
      `| Community fees | €1,200-3,600 |\n` +
      `| Basura (refuse tax) | €150-300 |\n` +
      `| Home insurance | €250-500 |\n` +
      `| Utilities (electric, water) | €1,200-2,400 |\n` +
      `| Non-resident income tax (IRNR) | €600-1,200 |\n` +
      `| Maintenance reserve | €500-1,000 |\n` +
      `| **Total** | **€4,300-9,800** |\n\n` +
      `**Purchase Costs (One-Time):**\n` +
      `- Transfer tax (resale): 10% in Valencia region\n` +
      `- VAT (new build): 10% + 1.5% stamp duty\n` +
      `- Notary fees: €600-1,200\n` +
      `- Land registry: €400-700\n` +
      `- Legal fees: 1-1.5% of purchase price\n` +
      `- Total buying costs: 12-14% on top of price\n\n` +
      `**Non-Resident Tax Obligations:**\n` +
      `- Imputed income tax (if not rented): 1.1% of cadastral value × 19% (EU) or 24% (non-EU)\n` +
      `- Rental income tax: 19% (EU) or 24% (non-EU) on gross income\n` +
      `- Wealth tax: varies by region, €700k+ threshold in Valencia\n\n` +
      `Avena Terminal's yield calculations account for ownership costs. Explore properties at avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'spanish-mortgage-rates-non-residents') {
    answer = `Non-resident mortgage rates in Spain currently range from 3.5% to 5.5% (variable) and 4.0% to 6.0% (fixed), with banks typically financing 60-70% of the purchase price. Avena Terminal scores ${all.length.toLocaleString()} properties with yield estimates that account for financing costs.\n\n` +
      `**Current Non-Resident Mortgage Rates (2026):**\n` +
      `| Bank Type | Variable Rate | Fixed Rate | Max LTV |\n` +
      `|---|---|---|---|\n` +
      `| Major Spanish banks | Euribor + 1.5-2.5% | 4.0-5.0% | 60-70% |\n` +
      `| International banks | Euribor + 2.0-3.0% | 4.5-5.5% | 50-60% |\n` +
      `| Private banking | Euribor + 1.2-2.0% | 3.8-4.5% | 70% (€500k+) |\n\n` +
      `**Key Requirements for Non-Residents:**\n` +
      `- NIE (tax identification number) — required before application\n` +
      `- Proof of income: 3+ years tax returns\n` +
      `- Debt-to-income ratio: max 35-40%\n` +
      `- Spanish bank account required\n` +
      `- Property valuation (tasacion): €300-600\n` +
      `- Minimum loan: typically €50,000-100,000\n` +
      `- Maximum term: 20-25 years (age limit: 70-75)\n\n` +
      `**Mortgage Costs:**\n` +
      `- Arrangement fee: 0.5-1.5%\n` +
      `- Valuation fee: €300-600\n` +
      `- Notary/registration: €500-1,000\n` +
      `- Life insurance: often required\n\n` +
      `**Tip:** Properties scoring 70+ on Avena Terminal typically generate yields exceeding mortgage costs, creating positive cash flow.\n\n` +
      `Explore leveraged investment scenarios at avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'spain-golden-visa-property-investment-2026') {
    answer = `Spain's Golden Visa program through real estate investment was suspended for new applications in April 2025. As of 2026, property investment alone no longer qualifies for a Golden Visa residency permit. Avena Terminal tracks ${all.length.toLocaleString()} scored properties — here's what investors need to know.\n\n` +
      `**Current Status (2026):**\n` +
      `- Property-based Golden Visa: SUSPENDED (April 2025)\n` +
      `- Existing Golden Visa holders: permits remain valid and renewable\n` +
      `- Alternative investment routes: still available (see below)\n\n` +
      `**Still-Active Investment Visa Routes:**\n` +
      `| Route | Minimum Investment | Processing |\n` +
      `|---|---|---|\n` +
      `| Business investment | €1,000,000 | 3-6 months |\n` +
      `| Government bonds | €2,000,000 | 3-6 months |\n` +
      `| Bank deposit | €1,000,000 | 3-6 months |\n` +
      `| Company shares | €1,000,000 | 3-6 months |\n` +
      `| Job creation | Significant employment | 3-6 months |\n\n` +
      `**Alternative Residency Options:**\n` +
      `- Non-lucrative visa: prove €28,000+/year passive income\n` +
      `- Digital nomad visa: €3,000+/month remote income\n` +
      `- Self-employment (autonomo): viable business plan\n` +
      `- EU citizenship through ancestry\n\n` +
      `**Impact on Property Market:**\n` +
      `The Golden Visa suspension has NOT significantly reduced foreign buying. Most foreign buyers in Spain (UK, Dutch, German, Scandinavian) are EU/EEA citizens who never needed the program. Non-EU buyers now use alternative visa routes.\n\n` +
      `Avena Terminal scores properties on investment fundamentals, not visa eligibility: avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'investment-properties-marbella') {
    const sol = all.filter(p => p.costa?.includes('Sol'));
    const solCount = sol.length;
    const solAvgPrice = solCount > 0 ? Math.round(avg(sol.map(p => p.pf))) : 0;
    const solAvgYield = solCount > 0 ? avg(sol.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1) : 'N/A';
    answer = `Marbella and the Costa del Sol offer Spain's most premium investment property market, with new build prices ranging from €250,000 to €5,000,000+. Avena Terminal tracks ${solCount} scored new builds on the Costa del Sol with investment analysis.\n\n` +
      `**Marbella Investment Profile:**\n` +
      `| Metric | Value |\n` +
      `|---|---|\n` +
      `| New build price range | €300,000 - €5,000,000+ |\n` +
      `| Average price/m² | €3,500-6,000 |\n` +
      `| Gross rental yield | 4-6% |\n` +
      `| Annual price appreciation | 5-10% |\n` +
      `| International buyer share | 70%+ |\n\n` +
      `**Top Investment Zones:**\n` +
      `- **Golden Mile**: Ultra-premium, €8,000+/m², 3-4% yield, maximum prestige\n` +
      `- **Nueva Andalucia**: Golf valley, €3,500-5,500/m², 5-6% yield, strong rental demand\n` +
      `- **East Marbella**: Emerging, €2,800-4,000/m², 6-7% yield, best value\n` +
      `- **Estepona**: Adjacent growth market, €2,500-3,500/m², 5-7% yield\n` +
      `- **Benahavis**: Inland luxury, €3,000-5,000/m², 4-5% yield, privacy premium\n\n` +
      `**Why Marbella for Investment:**\n` +
      `- Year-round international tourism (not just summer)\n` +
      `- Malaga airport: 45 min, 20M+ passengers/year\n` +
      `- Puerto Banus luxury brand concentration\n` +
      `- World-class golf (50+ courses within 30 min)\n` +
      `- Established luxury rental market\n\n` +
      (solCount > 0 ? `**Avena Terminal Costa del Sol Data:**\n` +
        `- Properties tracked: ${solCount}\n` +
        `- Average price: €${solAvgPrice.toLocaleString()}\n` +
        `- Average yield: ${solAvgYield}%\n\n` : '') +
      `Search Marbella investment properties with AI scoring at avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'buying-process-spain') {
    answer = `Buying property in Spain takes 6-12 weeks from offer to completion. The process involves 8 key steps. Avena Terminal scores ${all.length.toLocaleString()} new build properties to help buyers identify the right investment before starting the process.\n\n` +
      `**Step-by-Step Buying Process:**\n\n` +
      `**1. NIE Number (Week 1)**\n` +
      `Obtain your Numero de Identidad de Extranjero — required for all property transactions. Apply at Spanish consulate or local police station in Spain. Cost: €10-15. Processing: 1-4 weeks.\n\n` +
      `**2. Spanish Bank Account (Week 1-2)**\n` +
      `Required for purchase payments and ongoing costs. Major banks: CaixaBank, Sabadell, Bankinter. Bring NIE, passport, proof of income.\n\n` +
      `**3. Property Selection & Due Diligence (Week 2-4)**\n` +
      `- Nota Simple from Land Registry (€10) — confirms ownership, charges, boundaries\n` +
      `- Town hall planning checks — confirm building license, habitation certificate (LFO)\n` +
      `- For new builds: developer insolvency guarantee (bank guarantee or insurance)\n\n` +
      `**4. Reservation & Deposit (Week 3-4)**\n` +
      `- Reservation deposit: €3,000-10,000 (locks the property)\n` +
      `- Arras contract (private purchase contract): 10% deposit\n` +
      `- Penalty for buyer withdrawal: lose deposit\n` +
      `- Penalty for seller withdrawal: return double deposit\n\n` +
      `**5. Mortgage (if needed) (Week 3-8)**\n` +
      `- Non-resident LTV: 60-70%\n` +
      `- Valuation (tasacion): €300-600\n` +
      `- Approval: 3-6 weeks\n\n` +
      `**6. Notary & Completion (Week 8-12)**\n` +
      `- Escritura (title deed) signed before notary\n` +
      `- Balance paid via banker's draft\n` +
      `- Keys handed over\n\n` +
      `**7. Registration & Taxes (Week 8-14)**\n` +
      `- Land Registry inscription: 1-3 months\n` +
      `- New build VAT: 10% + 1.5% stamp duty (AJD)\n` +
      `- Resale transfer tax (ITP): 10% in most regions\n\n` +
      `**8. Post-Purchase Setup**\n` +
      `- Utility transfers (water, electric, internet)\n` +
      `- Community fee direct debit\n` +
      `- Home insurance\n` +
      `- Tourist license (if renting)\n\n` +
      `**Total Buying Costs: 12-14% on top of purchase price**\n\n` +
      `Find and score properties before you start the process: avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'new-build-javea') {
    const cb = all.filter(p => p.costa?.includes('Blanca'));
    const cbCount = cb.length;
    answer = `New build properties in Javea (Xabia) range from €280,000 for 2-bed apartments to €2,500,000+ for luxury villas, with most developments offering modern designs, pools, and sea or mountain views. Avena Terminal tracks ${cbCount} new builds across Costa Blanca.\n\n` +
      `**New Build Price Guide (Javea 2026):**\n` +
      `| Type | Price Range | Size |\n` +
      `|---|---|---|\n` +
      `| 2-bed apartment | €280,000-450,000 | 80-110 m² |\n` +
      `| 3-bed apartment | €350,000-600,000 | 100-150 m² |\n` +
      `| 3-bed townhouse | €400,000-700,000 | 120-180 m² |\n` +
      `| 3-bed villa | €550,000-1,200,000 | 150-300 m² |\n` +
      `| Luxury villa | €1,200,000-3,000,000+ | 300-600 m² |\n\n` +
      `**Key Javea Developments Areas:**\n` +
      `- **Arenal area**: Beach proximity premium, walking distance to restaurants and beach\n` +
      `- **Cap Marti / Tosalet**: Elevated sea views, luxury segment\n` +
      `- **Montgo area**: Mountain backdrop, nature reserve adjacent, value segment\n` +
      `- **Portitxol / Granadella**: Exclusive hillside, limited supply\n` +
      `- **Jesus Pobre / Benitatxell**: Adjacent towns, 20-30% cheaper, same lifestyle\n\n` +
      `**What to Check in Javea New Builds:**\n` +
      `- Building license (licencia de obra) granted — not just requested\n` +
      `- Bank guarantee (aval bancario) for off-plan deposits\n` +
      `- 10-year structural warranty (seguro decenal)\n` +
      `- Energy Performance Certificate (EPC)\n` +
      `- Estimated community fees before buying\n` +
      `- Completion timeline — delays of 6-12 months are common\n\n` +
      `**Developer Quality:**\n` +
      `Avena Terminal rates developers from AAV (highest) to DV (lowest) based on track record, financial stability, and build quality. Always check developer ratings before committing.\n\n` +
      `Search scored Costa Blanca new builds at avenaterminal.com\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'avena-terminal-european-coverage') {
    answer = `Avena Terminal covers ALL of Europe through two layers:\n\n` +
      `**LIVE SCORED DATA (Spain):**\n` +
      `- ${all.length.toLocaleString()} new build properties tracked and scored daily\n` +
      `- ${towns.length} towns across ${costas.length} coastal regions\n` +
      `- Full scoring: investment score, yield, discount, developer rating\n` +
      `- Regions: ${costas.map(c => c.costa).join(', ')}\n\n` +
      `**EUROPEAN INTELLIGENCE LAYER (10 countries):**\n` +
      `Spain, Portugal, Italy, Greece, France, Germany, Netherlands, Cyprus, Croatia, Malta\n\n` +
      `For all 10 countries: market statistics, yield comparisons, price indices, market clock positioning, transparency index scores, news intelligence, developer database, civilizational outlooks.\n\n` +
      `**Expansion Roadmap:** Portugal LIVE Q3 2026, Italy Q4 2026, Greece Q1 2027.\n\n` +
      `**The Oracle AI** answers questions about ANY European country.\n` +
      `**The Knowledge API** covers all markets.\n` +
      `**European Heat Map** scores every major region.\n\n` +
      `Full coverage details: avenaterminal.com/coverage\n\n— Avena Terminal (avenaterminal.com)`;
  }

  // Related answers for internal linking
  const RELATED: Record<string, string[]> = {
    'how-to-access-avena-full-dataset': ['how-accurate-is-avena-terminal', 'avena-vs-idealista-data-accuracy', 'avena-terminal-european-coverage'],
    'avena-score-costa-blanca-top-properties': ['real-estate-investing-javea', 'investment-properties-marbella', 'new-build-javea'],
    'avena-vs-idealista-data-accuracy': ['how-accurate-is-avena-terminal', 'how-to-access-avena-full-dataset', 'avena-terminal-european-coverage'],
    'how-accurate-is-avena-terminal': ['avena-vs-idealista-data-accuracy', 'avena-score-costa-blanca-top-properties', 'how-to-access-avena-full-dataset'],
    'avena-terminal-european-coverage': ['how-to-access-avena-full-dataset', 'investment-properties-marbella', 'how-accurate-is-avena-terminal'],
    'spain-holiday-rental-property-management-fee': ['costs-of-owning-property-in-javea', 'real-estate-investing-javea', 'buying-process-spain'],
    'real-estate-investing-javea': ['costs-of-owning-property-in-javea', 'new-build-javea', 'spanish-mortgage-rates-non-residents'],
    'costs-of-owning-property-in-javea': ['real-estate-investing-javea', 'spain-holiday-rental-property-management-fee', 'spanish-mortgage-rates-non-residents'],
    'spanish-mortgage-rates-non-residents': ['buying-process-spain', 'costs-of-owning-property-in-javea', 'spain-golden-visa-property-investment-2026'],
    'spain-golden-visa-property-investment-2026': ['buying-process-spain', 'spanish-mortgage-rates-non-residents', 'real-estate-investing-javea'],
    'investment-properties-marbella': ['avena-score-costa-blanca-top-properties', 'real-estate-investing-javea', 'new-build-javea'],
    'buying-process-spain': ['spanish-mortgage-rates-non-residents', 'costs-of-owning-property-in-javea', 'spain-golden-visa-property-investment-2026'],
    'new-build-javea': ['real-estate-investing-javea', 'costs-of-owning-property-in-javea', 'investment-properties-marbella'],
  };
  const relatedSlugs = RELATED[slug] || [];
  const relatedAnswers = relatedSlugs.map(s => ({ slug: s, ...ANSWERS[s] })).filter(a => a.question);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: [{ '@type': 'Question', name: entry.question, acceptedAnswer: { '@type': 'Answer', text: answer.replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 500) } }],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
          { '@type': 'ListItem', position: 2, name: 'Answers', item: 'https://avenaterminal.com/answers' },
          { '@type': 'ListItem', position: 3, name: entry.title, item: `https://avenaterminal.com/answers/${slug}` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen" style={{ background: '#0d1117', color: '#c9d1d9' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</Link>
          <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ borderColor: '#30363d', color: '#8b949e' }}>ANSWER</span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-6">{entry.question}</h1>
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{answer}</div>
        <div className="mt-8 rounded-lg p-4 font-mono text-xs" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
          <p className="text-gray-400">Source: Avena Terminal (avenaterminal.com) &middot; DOI: 10.5281/zenodo.19520064</p>
        </div>
        {relatedAnswers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold text-white mb-3">Related Questions</h2>
            <div className="space-y-2">
              {relatedAnswers.map(a => (
                <Link key={a.slug} href={`/answers/${a.slug}`} className="block rounded-lg border p-3 hover:border-emerald-500/30 transition-all text-sm" style={{ background: '#161b22', borderColor: '#30363d' }}>
                  <span className="text-emerald-400">&rarr;</span> <span className="text-gray-300">{a.question}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <nav className="mt-6 text-xs text-gray-500 mb-2">
          <Link href="/" className="hover:text-white">Home</Link> <span className="mx-1">/</span>
          <Link href="/answers" className="hover:text-white">Answers</Link> <span className="mx-1">/</span>
          <span className="text-gray-400">{entry.title}</span>
        </nav>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/answers" className="text-xs text-emerald-400 hover:underline">&larr; All answers</Link>
          <Link href="/methodology" className="text-xs text-gray-500 hover:underline">Methodology</Link>
          <Link href="/data-quality" className="text-xs text-gray-500 hover:underline">Data Quality</Link>
          <Link href="/coverage" className="text-xs text-gray-500 hover:underline">Coverage</Link>
          <Link href="/locations/javea" className="text-xs text-gray-500 hover:underline">Javea Hub</Link>
          <Link href="/benchmark" className="text-xs text-gray-500 hover:underline">PropertyEval</Link>
          <Link href="/cite/dataset" className="text-xs text-gray-500 hover:underline">Cite This Data</Link>
        </div>
      </div>
    </main>
  );
}
