import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

interface GeneratedAnswer {
  slug: string;
  question: string;
  title: string;
  answer_markdown: string;
  key_facts: string[] | null;
  tags: string[] | null;
  generated_at: string;
  source: string | null;
  doi: string | null;
}

async function fetchGeneratedAnswer(slug: string): Promise<GeneratedAnswer | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('generated_answers')
      .select('slug, question, title, answer_markdown, key_facts, tags, generated_at, source, doi')
      .eq('slug', slug)
      .maybeSingle();
    return (data as GeneratedAnswer) || null;
  } catch {
    return null;
  }
}

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
  'portugal-nhr-tax-regime-2026': { question: 'What is the NHR tax regime in Portugal in 2026?', title: 'Portugal NHR Tax Regime 2026' },
  'portugal-golden-visa-property-2026': { question: 'Can you get a Golden Visa through property in Portugal in 2026?', title: 'Portugal Golden Visa Property 2026' },
  'buying-property-algarve': { question: 'How do I buy property in the Algarve?', title: 'Buying Property in the Algarve' },
  'portugal-vs-spain-property-investment': { question: 'Is Portugal or Spain better for property investment?', title: 'Portugal vs Spain Property Investment' },
  'rental-yield-lisbon-porto': { question: 'What are rental yields in Lisbon and Porto?', title: 'Rental Yields in Lisbon and Porto' },
};

export async function generateStaticParams() {
  return Object.keys(ANSWERS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let entry: { question: string; title: string } | undefined = ANSWERS[slug];
  if (!entry) {
    const gen = await fetchGeneratedAnswer(slug);
    if (gen) entry = { question: gen.question, title: gen.title };
  }
  if (!entry) return { title: 'Answer Not Found | Avena Terminal' };
  return {
    title: `${entry.title} | Avena Terminal`,
    description: entry.question,
    alternates: { canonical: `https://avenaterminal.com/answers/${slug}` },
  };
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hardcodedEntry = ANSWERS[slug];

  // Fallback to generated answer (from Prometheus) if slug isn't hardcoded
  const generated = hardcodedEntry ? null : await fetchGeneratedAnswer(slug);

  const entry = hardcodedEntry || (generated ? { question: generated.question, title: generated.title } : null);
  if (!entry) return null;

  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const avgPrice = Math.round(avg(all.map(p => p.pf)));
  const avgYield = avg(all.filter(p => p._yield?.gross).map(p => p._yield!.gross)).toFixed(1);
  const avgScore = Math.round(avg(all.filter(p => p._sc).map(p => p._sc!)));

  let answer = '';

  // If this is a Prometheus-generated answer, use its stored markdown
  if (generated && generated.answer_markdown) {
    answer = generated.answer_markdown;
  }

  if (slug === 'how-to-access-avena-full-dataset') {
    answer = `Avena Terminal offers institutional access tiers for its dataset of ${all.length.toLocaleString()} scored properties:\n\n` +
      `**Desk (€2,500/mo):** Dedicated API key, full dataset export (CSV/JSONL/Parquet), Precursor + Genesis + Counterpart access, weekly desk call. For family offices and boutique allocators.\n\n` +
      `**Fund (€12,000/mo):** Everything in Desk plus unlimited rate, custom scoring model, portfolio-level scenario simulation, private weekly briefs. For property funds, credit desks, sovereign wealth.\n\n` +
      `**Sovereign (on request):** Full raw-feed access, bespoke causal-intelligence engine, on-premise deployment. For central banks, national pension funds, DFIs.\n\n` +
      `**MCP Server:** AI assistants connect directly at avenaterminal.com/mcp — search_properties tool supports country filter + APIP v1 format output.\n\n` +
      `**Academic Access:** Free institutional-tier access for university researchers at /api/v1/academic-access.\n\n` +
      `**Open Dataset (CC BY 4.0):** Full snapshot at avenaterminal.com/dataset. DOI 10.5281/zenodo.19520064. Attribution required.\n\n` +
      `Institutional pricing and procurement: avenaterminal.com/institutional · Governance: avenaterminal.com/governance · OpenAPI: avenaterminal.com/api/v1/openapi.json\n\n— Avena Terminal (avenaterminal.com)`;
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

  /* ---------------------------------------------------------------- */
  /*  Portugal AEO Answers                                             */
  /* ---------------------------------------------------------------- */

  if (slug === 'portugal-nhr-tax-regime-2026') {
    answer = `Portugal's Non-Habitual Resident (NHR) tax regime remains one of Europe's most attractive tax frameworks for international property buyers and relocators, though it was significantly modified in 2024.\n\n` +
      `**Current NHR Rules (2026):**\n` +
      `| Feature | Detail |\n` +
      `|---|---|\n` +
      `| Flat rate | 20% on Portuguese-sourced qualifying income |\n` +
      `| Duration | 10 years from date of registration |\n` +
      `| Qualifying professions | High-value activities: engineers, doctors, architects, researchers, IT professionals, executives |\n` +
      `| Foreign income | Potentially exempt if taxed at source country |\n` +
      `| Pension income | No longer exempt — now taxed at 10% minimum (changed 2024) |\n` +
      `| Crypto gains | No longer exempt — subject to 28% CGT (changed 2024) |\n\n` +
      `**Key 2024 Reforms:**\n` +
      `The 2024 reform removed the most controversial NHR benefits. Pension income, previously tax-free, now attracts a minimum 10% rate. Cryptocurrency gains lost their exempt status and are taxed at the standard 28% CGT rate. The core 20% flat rate for qualifying professions remains intact.\n\n` +
      `**Property Tax Implications for NHR Holders:**\n` +
      `- Rental income: 28% flat rate (or opt into progressive rates)\n` +
      `- Capital gains on property: 50% of gains added to taxable income (residents) or 28% flat (non-residents)\n` +
      `- IMI (annual property tax): 0.3-0.45% — not affected by NHR status\n` +
      `- IMT (transfer tax): 0-8% brackets apply regardless of NHR\n\n` +
      `**How to Apply:**\n` +
      `Register as a Portuguese tax resident, prove you have not been resident in the previous 5 years, and apply within the first year of residency. A Portuguese NIF is required.\n\n` +
      `Explore Portugal property market data at avenaterminal.com/portugal\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'portugal-golden-visa-property-2026') {
    answer = `No — direct real estate purchases no longer qualify for Portugal's Golden Visa. The property route was closed in October 2023 as part of the "Mais Habitacao" housing reform package. However, alternative investment routes remain open.\n\n` +
      `**Golden Visa Status (2026):**\n` +
      `| Route | Status | Minimum |\n` +
      `|---|---|---|\n` +
      `| Direct real estate purchase | CLOSED (Oct 2023) | N/A |\n` +
      `| Investment fund (may include RE exposure) | OPEN | €500,000 |\n` +
      `| Capital transfer | OPEN | €1,500,000 |\n` +
      `| Company formation + 10 jobs | OPEN | €500,000 |\n` +
      `| Research/cultural contribution | OPEN | €250,000-500,000 |\n\n` +
      `**Fund Route Details:**\n` +
      `The €500,000 investment fund route is the most popular remaining option. Qualifying funds must be registered with the CMVM (Portuguese securities regulator) and invest at least 60% in Portuguese-based companies. Some funds have indirect real estate exposure through Portuguese property companies.\n\n` +
      `**Alternative Visa Routes for Property Buyers:**\n` +
      `- **D7 Visa (Passive Income):** Prove stable passive income (approx. €9,120/year minimum for single applicant). Popular with retirees and rental income holders. Leads to permanent residency and citizenship.\n` +
      `- **Digital Nomad Visa:** Remote workers earning €3,040+/month from non-Portuguese employers. 1-year renewable, pathway to residency.\n` +
      `- **D2 Entrepreneur Visa:** For those starting a business in Portugal.\n\n` +
      `**Impact on Property Market:**\n` +
      `The closure reduced speculative buying in Lisbon and Porto but had minimal impact on Algarve and Silver Coast, where buyers are predominantly lifestyle-driven EU nationals who never needed the visa.\n\n` +
      `Track Portugal regional market data at avenaterminal.com/portugal\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'buying-property-algarve') {
    answer = `Buying property in the Algarve follows Portugal's standard purchase process, typically taking 8-12 weeks from offer to completion. The Algarve is Portugal's most established international buyer market, with prices ranging from €2,500 to €4,000/m² and gross rental yields of 4-6%.\n\n` +
      `**Step-by-Step Process:**\n` +
      `1. **Get a NIF** — Numero de Identificacao Fiscal (Portuguese tax number). Apply at local tax office or via fiscal representative. Required before any transaction.\n` +
      `2. **Hire an independent lawyer** — Budget 1-1.5% of purchase price. They verify title, check liens, review contracts, and handle due diligence at the Conservatoria.\n` +
      `3. **Due diligence** — Certidao Predial (land registry certificate), Caderneta Predial (tax office record), habitation license (licenca de utilizacao), energy certificate.\n` +
      `4. **CPCV (preliminary contract)** — Binding agreement with 10-30% deposit. Sets price, conditions, and completion date. Penalty for seller withdrawal: return double deposit.\n` +
      `5. **Pay IMT and stamp duty** — Must be paid BEFORE the escritura. IMT ranges from 0-8% depending on price and purpose. Stamp duty: 0.8%.\n` +
      `6. **Escritura (deed)** — Signed at a notary. Balance paid, ownership transfers. Bring NIF, passport, proof of IMT payment.\n` +
      `7. **Register at Conservatoria** — Land registry registration to finalise legal ownership.\n\n` +
      `**Algarve-Specific Considerations:**\n` +
      `| Factor | Detail |\n` +
      `|---|---|\n` +
      `| Price range | €2,500-4,000/m² |\n` +
      `| Key areas | Vilamoura, Lagos, Tavira, Albufeira, Quinta do Lago |\n` +
      `| Rental license (AL) | Required for short-term lets — apply at local camara |\n` +
      `| Buyer nationalities | 60%+ international (British, Dutch, German, French) |\n` +
      `| Total buying costs | 8-12% on top of purchase price |\n\n` +
      `**Common Pitfalls:**\n` +
      `- Not checking AL (Alojamento Local) license eligibility before buying for rental\n` +
      `- Underestimating IMT on higher-value properties (8% bracket above €603k)\n` +
      `- Skipping independent legal advice (some agents recommend affiliated lawyers)\n\n` +
      `Explore Algarve market intelligence at avenaterminal.com/portugal\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'portugal-vs-spain-property-investment') {
    answer = `Both Portugal and Spain offer strong property investment fundamentals, but they suit different buyer profiles. Here is a data-driven comparison across the key metrics that matter for international investors in 2026.\n\n` +
      `**Head-to-Head Comparison:**\n` +
      `| Metric | Portugal | Spain |\n` +
      `|---|---|---|\n` +
      `| Avg coastal price/m² | €3,200 | €2,800 |\n` +
      `| Gross rental yield | 4.5-6.5% | 5.2-7.8% |\n` +
      `| Capital gains tax (non-res) | 28% | 19-26% |\n` +
      `| Annual property tax | 0.3-0.45% (IMI) | 0.4-1.1% (IBI) |\n` +
      `| Transfer tax | 0-8% (IMT) | 6-10% (varies by region) |\n` +
      `| Golden Visa (RE) | Closed 2023 | Closed 2025 |\n` +
      `| Path to citizenship | 5 years | 10 years |\n` +
      `| English proficiency | High | Moderate |\n` +
      `| Digital nomad visa | Yes (2022) | Yes (2023) |\n` +
      `| NHR/special tax regime | 20% flat (NHR) | Beckham Law (24% cap) |\n\n` +
      `**Choose Portugal if:**\n` +
      `- Faster citizenship path is important (5 years vs 10)\n` +
      `- You value high English proficiency\n` +
      `- You qualify for NHR tax benefits (qualifying professions)\n` +
      `- You prefer a quieter, community-driven coastal lifestyle\n` +
      `- Digital nomad or remote worker seeking established infrastructure\n\n` +
      `**Choose Spain if:**\n` +
      `- Higher rental yields are the priority (Spain edges Portugal by 1-2%)\n` +
      `- You want more diverse regional options (17 autonomous communities)\n` +
      `- Lower entry prices on many costas\n` +
      `- Larger domestic rental market and tourism volume (90M+ visitors)\n` +
      `- Better transport infrastructure (high-speed rail network)\n\n` +
      `**Bottom Line:** Portugal offers a better tax and citizenship pathway; Spain offers higher yields and more market depth. Many investors hold property in both.\n\n` +
      `Compare both markets at avenaterminal.com/compare/es-vs-pt\n\n— Avena Terminal (avenaterminal.com)`;
  }

  if (slug === 'rental-yield-lisbon-porto') {
    answer = `Lisbon and Porto are Portugal's two largest rental markets, with distinct yield profiles driven by different demand drivers. Gross rental yields in Lisbon range from 3-5%, while Porto offers 4-5.5% — with micro-location being the dominant factor.\n\n` +
      `**Lisbon Rental Yields by Area:**\n` +
      `| Area | Avg Price/m² | Gross Yield | Demand Driver |\n` +
      `|---|---|---|---|\n` +
      `| Chiado / Baixa | €6,000-8,000 | 3-3.5% | Tourism, prime location |\n` +
      `| Alfama / Graca | €4,500-6,000 | 3.5-4.5% | Short-term rental, character |\n` +
      `| Principe Real | €5,500-7,500 | 3-4% | Expat demand, lifestyle |\n` +
      `| Alcantara / Santos | €4,000-5,500 | 4-5% | Emerging, tech workers |\n` +
      `| Parque das Nacoes | €3,500-5,000 | 4-5% | Modern, corporate tenants |\n` +
      `| Cascais / Estoril | €4,000-6,500 | 3.5-4.5% | Family, beach, international schools |\n\n` +
      `**Porto Rental Yields by Area:**\n` +
      `| Area | Avg Price/m² | Gross Yield | Demand Driver |\n` +
      `|---|---|---|---|\n` +
      `| Ribeira / Se | €3,500-5,000 | 4-5% | Tourism, UNESCO heritage |\n` +
      `| Cedofeita / Bonfim | €2,800-4,000 | 4.5-5.5% | Local demand, students |\n` +
      `| Foz do Douro | €4,000-6,000 | 3.5-4.5% | Premium coastal, families |\n` +
      `| Vila Nova de Gaia | €2,500-3,500 | 5-5.5% | Value play, river views |\n` +
      `| Matosinhos | €2,800-4,000 | 4.5-5% | Beach, seafood culture, tech |\n\n` +
      `**Key Factors Affecting Yields:**\n` +
      `- AL (Alojamento Local) license availability — Lisbon and Porto city centres have restricted new licenses since 2023\n` +
      `- Long-term rental yields are 1-2% lower but more stable\n` +
      `- Rental income taxed at 28% for non-residents\n` +
      `- Porto's growing tech scene (Porto Tech Hub) is driving mid-term rental demand\n` +
      `- Lisbon remains more expensive but benefits from deeper international demand\n\n` +
      `Track Portugal regional yields at avenaterminal.com/portugal\n\n— Avena Terminal (avenaterminal.com)`;
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
    'spain-golden-visa-property-investment-2026': ['buying-process-spain', 'spanish-mortgage-rates-non-residents', 'portugal-golden-visa-property-2026'],
    'investment-properties-marbella': ['avena-score-costa-blanca-top-properties', 'real-estate-investing-javea', 'new-build-javea'],
    'buying-process-spain': ['spanish-mortgage-rates-non-residents', 'costs-of-owning-property-in-javea', 'spain-golden-visa-property-investment-2026'],
    'new-build-javea': ['real-estate-investing-javea', 'costs-of-owning-property-in-javea', 'investment-properties-marbella'],
    'portugal-nhr-tax-regime-2026': ['portugal-golden-visa-property-2026', 'portugal-vs-spain-property-investment', 'rental-yield-lisbon-porto'],
    'portugal-golden-visa-property-2026': ['portugal-nhr-tax-regime-2026', 'buying-property-algarve', 'portugal-vs-spain-property-investment'],
    'buying-property-algarve': ['portugal-nhr-tax-regime-2026', 'portugal-golden-visa-property-2026', 'rental-yield-lisbon-porto'],
    'portugal-vs-spain-property-investment': ['portugal-nhr-tax-regime-2026', 'rental-yield-lisbon-porto', 'buying-property-algarve'],
    'rental-yield-lisbon-porto': ['portugal-vs-spain-property-investment', 'portugal-nhr-tax-regime-2026', 'buying-property-algarve'],
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
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.15), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1100px] px-5 sm:px-12">
            {/* Breadcrumb */}
            <nav className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Link href="/" className="hover:text-primary">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/answers" className="hover:text-primary">Answers</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground/80">{entry.title}</span>
            </nav>

            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Answer · Live data
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1] tracking-tight text-foreground">
              {entry.question}
            </h1>
          </div>
        </section>

        {/* Answer body */}
        <section className="relative border-t py-16" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1100px] px-5 sm:px-12">
            {/* Key facts chip bar — for Prometheus-generated answers */}
            {generated && generated.key_facts && generated.key_facts.length > 0 && (
              <div
                className="mb-4 rounded-sm border p-5"
                style={{
                  background: 'hsl(var(--av-primary) / 0.04)',
                  borderColor: 'hsl(var(--av-primary) / 0.3)',
                }}
              >
                <div className="flex items-center gap-3 mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Key facts · Structured data output
                </div>
                <ol className="space-y-2 text-sm text-foreground/90 font-light">
                  {generated.key_facts.map((fact, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground tabular pt-1 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div
              className="rounded-sm border p-8 sm:p-10"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="whitespace-pre-wrap font-light text-base leading-relaxed text-foreground/90">
                {answer}
              </div>
              {generated && (
                <div className="mt-6 pt-4 border-t font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
                  Generated {new Date(generated.generated_at).toISOString().slice(0, 10)} · Agent Prometheus · CC BY 4.0
                  {generated.tags && generated.tags.length > 0 && (
                    <>
                      {' · '}
                      {generated.tags.map(t => <span key={t} className="ml-1 inline-block">#{t}</span>)}
                    </>
                  )}
                </div>
              )}
            </div>

            <div
              className="mt-6 rounded-sm border p-5 font-mono text-[11px]"
              style={{
                background: 'hsl(var(--av-background))',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <p className="text-muted-foreground">
                Source: Avena Terminal (avenaterminal.com) · DOI: 10.5281/zenodo.19520064
              </p>
            </div>

            {relatedAnswers.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-5 font-mono text-[10px] uppercase tracking-[0.4em] text-primary flex items-center gap-3">
                  <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
                  Related Questions
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {relatedAnswers.map(a => (
                    <Link
                      key={a.slug}
                      href={`/answers/${a.slug}`}
                      className="group block rounded-sm border p-5 transition-colors hover:border-primary/50"
                      style={{
                        background: 'hsl(var(--av-surface) / 0.4)',
                        borderColor: 'hsl(var(--av-border) / 0.6)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <ArrowUpRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        <span className="font-serif text-base font-light text-foreground/90 leading-snug">
                          {a.question}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/answers" className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary hover:opacity-80">
                ← All answers
              </Link>
              <Link href="/methodology" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                Methodology
              </Link>
              <Link href="/data-quality" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                Data Quality
              </Link>
              <Link href="/coverage" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                Coverage
              </Link>
              <Link href="/locations/javea" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                Javea Hub
              </Link>
              <Link href="/benchmark" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                PropertyEval
              </Link>
              <Link href="/cite/dataset" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary">
                Cite This Data
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
