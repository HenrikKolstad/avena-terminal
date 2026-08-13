import { NextResponse } from 'next/server';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg } from '@/lib/properties';

export const revalidate = 86400;

interface Question {
  id: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  doi: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

function fmt(n: number): string {
  return n.toLocaleString('en', { maximumFractionDigits: 0 });
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

function eur(n: number): string {
  return `€${fmt(n)}`;
}

const SOURCE = 'Avena Terminal (avenaterminal.com)';
const DOI = '10.5281/zenodo.19520064';

function q(id: string, category: string, question: string, answer: string, difficulty: Question['difficulty']): Question {
  return { id, category, question, answer, source: SOURCE, doi: DOI, difficulty };
}

// ── TAX knowledge base ──
const TAX_QUESTIONS: Omit<Question, 'id' | 'source' | 'doi'>[] = [
  { category: 'TAX', question: 'What is the standard IBI (property tax) rate range in Spain?', answer: 'IBI rates range from 0.4% to 1.1% of catastral value, with most municipalities in the Costa Blanca charging between 0.5% and 0.8%.', difficulty: 'easy' },
  { category: 'TAX', question: 'What is the property transfer tax (ITP) rate in the Valencian Community for resale properties?', answer: '10% of the declared purchase price for properties in the Valencian Community (Comunidad Valenciana).', difficulty: 'easy' },
  { category: 'TAX', question: 'What is the ITP rate in Murcia for resale properties?', answer: '8% of the declared purchase price for properties in the Region of Murcia.', difficulty: 'easy' },
  { category: 'TAX', question: 'What VAT (IVA) rate applies to new-build residential property purchases in Spain?', answer: '10% VAT (IVA) applies to new-build residential properties. Commercial properties are subject to 21% VAT.', difficulty: 'easy' },
  { category: 'TAX', question: 'What stamp duty (AJD) rate applies to new-build purchases in the Valencian Community?', answer: '1.5% stamp duty (Actos Juridicos Documentados) on new-build purchases in the Valencian Community.', difficulty: 'medium' },
  { category: 'TAX', question: 'What stamp duty (AJD) rate applies to new-build purchases in Murcia?', answer: '1.5% stamp duty (Actos Juridicos Documentados) on new-build purchases in the Region of Murcia.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the non-resident income tax rate on Spanish rental income for EU/EEA residents?', answer: '19% flat rate on net rental income (after deductible expenses) for EU/EEA tax residents.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the non-resident income tax rate on Spanish rental income for non-EU residents?', answer: '24% flat rate on gross rental income (no expense deductions) for non-EU/EEA tax residents.', difficulty: 'medium' },
  { category: 'TAX', question: 'How is imputed income tax calculated for non-residents who do not rent out their Spanish property?', answer: '19% (EU) or 24% (non-EU) on 1.1% of the catastral value (or 2% if not revised in the last 10 years), even if the property sits empty.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the capital gains tax rate for non-residents selling Spanish property?', answer: '19% flat rate on the net capital gain (sale price minus purchase price and allowable costs) for non-residents.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the 3% retention rule when a non-resident sells property in Spain?', answer: 'The buyer must withhold 3% of the sale price and pay it to the tax authority (Hacienda) as an advance on the seller non-resident capital gains tax liability.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the Plusvalia Municipal tax in Spain?', answer: 'A municipal tax on the increase in land value since the last transfer, calculated based on catastral land value and years of ownership. Two methods: real gain method or objective method, taxpayer may choose the lower amount.', difficulty: 'hard' },
  { category: 'TAX', question: 'Are there any double taxation treaties that affect UK buyers of Spanish property post-Brexit?', answer: 'Yes, the UK-Spain Double Taxation Treaty (1976, updated) remains in force. UK residents can offset Spanish taxes paid against UK tax liability, but post-Brexit they pay 24% non-resident rate instead of 19% on rental income.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the Spanish wealth tax (Impuesto sobre el Patrimonio) threshold for non-residents?', answer: 'Non-residents are exempt on the first €700,000 of Spanish asset value. Above this threshold, rates range from 0.2% to 3.5% depending on the autonomous community.', difficulty: 'hard' },
  { category: 'TAX', question: 'Does the Valencian Community apply a reduced ITP rate for any buyer categories?', answer: 'Yes, reduced ITP of 8% applies for purchases of primary residence valued under €150,000. Young buyers (under 35), disabled persons, and large families may qualify for further reductions to 4-6%.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the Beckham Law and how does it affect property investors in Spain?', answer: 'The Beckham Law (Royal Decree 687/2005) allows qualifying new tax residents to pay a flat 24% income tax rate for 6 years instead of progressive rates up to 47%. It applies to employment income, not rental/capital gains.', difficulty: 'hard' },
  { category: 'TAX', question: 'What allowable expenses can EU non-resident landlords deduct from Spanish rental income?', answer: 'EU/EEA non-resident landlords can deduct: mortgage interest, IBI, community fees, insurance, repairs, depreciation (3% of construction value), management fees, and utilities paid by the landlord.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the Modelo 210 tax form used for in Spain?', answer: 'Modelo 210 is the non-resident income tax return used to declare rental income, imputed income, or capital gains on Spanish property. It must be filed quarterly for rental income or annually for imputed income.', difficulty: 'medium' },
  { category: 'TAX', question: 'How is the catastral value of a Spanish property determined?', answer: 'The catastral value is set by the local Catastro office based on land value, construction value, location, and age. It is typically 30-50% of market value and is revised periodically by each municipality.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the Solidarity Tax on Large Fortunes (ITSGF) introduced in Spain?', answer: 'Introduced in 2023, the ITSGF applies to net wealth exceeding €3 million with rates of 1.7% (€3-5M), 2.1% (€5-10M), and 3.5% (above €10M). It applies to both residents and non-residents on Spanish assets.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the legal fees estimate for a standard property purchase in Spain?', answer: 'Typical legal fees range from €1,500 to €3,000 plus VAT, or approximately 1% of the purchase price. Notary fees run €600-1,200 and land registry fees €400-700.', difficulty: 'easy' },
  { category: 'TAX', question: 'What total buying costs should a purchaser budget for a new-build in Spain?', answer: 'For a new-build: 10% VAT + 1.5% stamp duty + 1% legal/notary/registry = approximately 12.5-13.5% of the purchase price in total acquisition costs.', difficulty: 'easy' },
  { category: 'TAX', question: 'What total buying costs should a purchaser budget for a resale property in the Valencian Community?', answer: 'For a resale: 10% ITP + 1% legal/notary/registry = approximately 11-12% of the purchase price in total acquisition costs.', difficulty: 'easy' },
  { category: 'TAX', question: 'Can mortgage interest be deducted from rental income by non-resident landlords in Spain?', answer: 'Yes, EU/EEA non-resident landlords can deduct mortgage interest proportionally for the rental period. Non-EU landlords cannot deduct any expenses from gross rental income.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the tax treatment of furnishing costs for a Spanish rental property?', answer: 'Furniture and fittings under €300 can be fully deducted in the year of purchase. Items over €300 are depreciated over 10 years (10% annually). This applies only to EU/EEA non-resident landlords.', difficulty: 'hard' },
  { category: 'TAX', question: 'Is there a reduced VAT rate for social housing (VPO) in Spain?', answer: 'No, the standard 10% VAT applies to all new residential properties including VPO (Vivienda de Proteccion Oficial). However, some autonomous communities offer ITP reductions for VPO resales.', difficulty: 'hard' },
  { category: 'TAX', question: 'What happens to Spanish property tax obligations if the owner dies?', answer: 'Heirs inherit tax obligations. Spanish succession tax applies at 7.65-34% on the inherited value, with allowances varying by autonomous community. The Valencian Community offers significant reductions for close relatives.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the annual Modelo 720 foreign asset declaration requirement?', answer: 'Spanish tax residents must declare foreign assets exceeding €50,000 per category (bank accounts, securities, property) via Modelo 720. Penalties for non-filing have been reduced following a 2022 EU court ruling.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the community fee (cuota de comunidad) and is it tax deductible?', answer: 'Community fees cover shared maintenance of common areas (pool, garden, elevator) in multi-unit developments. They are tax deductible for EU/EEA non-resident landlords against rental income. Typical range: €50-200/month.', difficulty: 'easy' },
  { category: 'TAX', question: 'How does the fiscal representative requirement work for non-resident property owners in Spain?', answer: 'Non-EU property owners are required to appoint a fiscal representative in Spain (a tax-resident individual or company) to handle communications with the tax authority. EU/EEA owners are exempt from this requirement.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the basura (rubbish collection) tax in Spanish municipalities?', answer: 'An annual municipal charge for waste collection, typically €50-150 per year depending on the municipality. It is separate from IBI and not deductible against rental income.', difficulty: 'easy' },
  { category: 'TAX', question: 'What depreciation rate can be applied to a rental property in Spain?', answer: '3% annual depreciation on the construction value (excluding land) can be deducted by EU/EEA non-resident landlords. The construction portion is typically 60-70% of the catastral value.', difficulty: 'medium' },
  { category: 'TAX', question: 'Is there an exit tax for Spanish tax residents who move abroad?', answer: 'Yes, since 2015, Spanish tax residents with assets over €4 million (or €1 million in certain entity holdings) are subject to an exit tax on unrealized gains when they relocate outside Spain.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the Modelo 211 used for in Spanish property transactions?', answer: 'Modelo 211 is filed by the buyer when purchasing from a non-resident seller. It remits the mandatory 3% retention of the sale price to the tax authority as an advance on the sellers capital gains tax.', difficulty: 'hard' },
  { category: 'TAX', question: 'Are short-term rental platforms required to withhold tax in Spain?', answer: 'Platforms like Airbnb and Booking.com are required to report rental income data to Spanish tax authorities under DAC7 (EU directive). They do not withhold tax but provide information for cross-checking.', difficulty: 'medium' },
  { category: 'TAX', question: 'How does the proportional day rule work for non-resident rental tax in Spain?', answer: 'Non-residents pay rental income tax only for days the property is rented. For remaining days, imputed income tax applies. The annual tax return must separately calculate both components proportionally.', difficulty: 'hard' },
  { category: 'TAX', question: 'What are the current Valencian Community succession tax allowances for Group II heirs?', answer: 'Group II heirs (spouse, children, parents) receive a €100,000 base allowance plus age-related supplements. The Valencian Community applies a 75% reduction on the tax quota for close relatives, effectively capping the rate.', difficulty: 'hard' },
  { category: 'TAX', question: 'Is there a tourist tax in the Valencian Community as of 2026?', answer: 'As of 2026, the Valencian Community has approved a tourist tax (tasa turistica) of €0.50-€2.00 per person per night depending on accommodation type, applicable from November 2025. It is paid by guests, not property owners.', difficulty: 'medium' },
  { category: 'TAX', question: 'What is the tax treatment of a property management company fee for non-residents?', answer: 'Property management fees (typically 15-25% of gross rental income) are fully deductible for EU/EEA non-resident landlords. Non-EU landlords cannot deduct management fees from gross rental income.', difficulty: 'medium' },
  { category: 'TAX', question: 'Can a non-resident offset Spanish property losses against other Spanish income?', answer: 'Non-residents cannot offset rental losses against other Spanish income categories. However, rental losses can be carried forward for 4 years to offset against future Spanish rental income from the same property.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the reduced IBI rate for energy-efficient new-build properties?', answer: 'Some municipalities offer IBI reductions of 20-50% for properties with A or B energy ratings, typically for 3-5 years after construction. This varies by municipality and must be applied for separately.', difficulty: 'medium' },
  { category: 'TAX', question: 'How are off-plan deposit payments treated for tax purposes before completion?', answer: 'Off-plan deposits and stage payments are not tax-deductible until the property is completed and generating income. VAT paid on construction stage payments can be reclaimed if the buyer is VAT-registered for rental business.', difficulty: 'hard' },
  { category: 'TAX', question: 'What is the tax impact of the Spanish anti-avoidance rule on property holding companies?', answer: 'Spanish tax law (Article 13 IRNR) treats income from entities where Spanish property represents more than 50% of assets as taxable in Spain. This targets offshore structures used to avoid direct property taxation.', difficulty: 'hard' },
  { category: 'TAX', question: 'What are typical utility costs (electricity, water) for a 2-bed apartment on the Costa Blanca?', answer: 'Typical annual utility costs: electricity €600-900, water €200-300, gas (if applicable) €200-400. Total approximately €1,000-1,600 per year. These are deductible for EU/EEA non-resident landlords during rental periods.', difficulty: 'easy' },
  { category: 'TAX', question: 'Is there a mortgage tax in Spain and who pays it?', answer: 'Since November 2018, the bank pays the stamp duty (AJD) on the mortgage deed, not the buyer. This was changed by Supreme Court ruling. The buyer pays AJD only on the purchase deed for new-builds.', difficulty: 'medium' },
];

// ── REGULATION knowledge base ──
const REGULATION_QUESTIONS: Omit<Question, 'id' | 'source' | 'doi'>[] = [
  { category: 'REGULATION', question: 'Is the Spanish Golden Visa program still available in 2026?', answer: 'No. Spain abolished the Golden Visa for property investment effective April 2025. Existing holders may renew, but no new applications for residency via €500,000+ property purchase are accepted.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is an NIE number and why is it required for property purchase in Spain?', answer: 'NIE (Numero de Identidad de Extranjero) is a unique tax identification number required for all foreigners undertaking financial transactions in Spain, including property purchases, tax filing, and opening bank accounts.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'How do you obtain an NIE number for purchasing property in Spain?', answer: 'Apply at a Spanish consulate in your home country or at a National Police station in Spain. Requirements: EX-15 form, valid passport, proof of reason (property reservation), and fee (~€12). Processing takes 1-4 weeks.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is a tourist rental license (Licencia Turistica) in the Valencian Community?', answer: 'A mandatory license to legally rent a property short-term (<2 months) to tourists. Issued by the regional tourism department. The property must meet minimum standards and be registered in the Tourism Registry of the Valencian Community.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What are the current restrictions on new tourist licenses in the Valencian Community?', answer: 'Since 2024, new tourist licenses in saturated zones (most coastal areas) are heavily restricted. Existing licenses are grandfathered but non-transferable on sale in most cases. Urban apartments face the strictest limitations.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'Can a non-resident get a Spanish mortgage for property purchase?', answer: 'Yes, Spanish banks offer mortgages to non-residents, typically 60-70% LTV (vs 80% for residents), 20-25 year terms, with variable or fixed rates. Required: NIE, proof of income, tax returns, and a Spanish bank account.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the typical mortgage interest rate for non-residents in Spain in 2026?', answer: 'Fixed rates range from 2.8-3.8% and variable rates from Euribor + 1.2-1.8% for non-residents. Rates are higher than for residents by approximately 0.3-0.5 percentage points.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the Nota Simple and why is it important in a Spanish property purchase?', answer: 'A Nota Simple is an extract from the Land Registry (Registro de la Propiedad) showing ownership, charges, liens, and encumbrances on a property. It is essential due diligence before any purchase to verify clean title.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the role of a notary (notario) in a Spanish property purchase?', answer: 'The notary is a public official who verifies identities, ensures legal compliance, reads the deed aloud, witnesses signatures, and submits the escritura (deed) to the Land Registry. Both parties must be present or represented by power of attorney.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is an escritura publica in Spanish property law?', answer: 'The escritura publica is the public deed of sale executed before a notary. It transfers legal ownership and is the document registered at the Land Registry. It must include: parties, property description, price, and payment method.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the contrato de arras and what happens if either party withdraws?', answer: 'The contrato de arras is a preliminary purchase agreement with a deposit (typically 10%). If the buyer withdraws, they lose the deposit. If the seller withdraws, they must return double the deposit amount.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What insurance is mandatory for Spanish property purchases with a mortgage?', answer: 'Building insurance (seguro de hogar) is mandatory for mortgaged properties, covering structural damage. Life insurance is often required by banks but legally optional. Contents insurance is recommended but not mandatory.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the First Occupancy License (Licencia de Primera Ocupacion) for new-builds?', answer: 'A municipal certificate confirming a new-build complies with planning permission and building regulations. Required before connecting utilities, registering the property, and moving in. Developers must obtain it after construction.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What are the habitation certificate (Cedula de Habitabilidad) requirements?', answer: 'A document certifying a property meets minimum habitability standards (size, ventilation, sanitation). Required for utility connections and rental licensing. Valid for 10-15 years depending on the autonomous community.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the 10-year structural warranty (decennial insurance) for new-builds in Spain?', answer: 'Under the LOE (Ley de Ordenacion de la Edificacion), developers must provide 10-year structural warranty insurance, 3-year warranty for habitability defects, and 1-year warranty for finishing defects.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What building energy certificate is required for property sales and rentals in Spain?', answer: 'An Energy Performance Certificate (EPC/CEE) rated A-G is mandatory for all property sales and rentals since 2013. Must be obtained before marketing, valid for 10 years, and displayed in property listings.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What are the Spanish anti-money laundering requirements for property purchases?', answer: 'Purchases over €10,000 must be made by bank transfer (no cash). Notaries and lawyers must verify source of funds. Non-EU buyers face enhanced due diligence. Properties over €500,000 trigger additional reporting requirements.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the process for registering a property at the Spanish Land Registry?', answer: 'After the notary signing, the escritura is submitted to the Registro de la Propiedad. Registration takes 15-30 days. The registrar verifies the deed, updates ownership records, and issues a new Nota Simple. Legal fees include registry fees of €400-700.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'Can foreign nationals own property in Spain without restriction?', answer: 'Yes, there are no restrictions on foreign ownership of property in Spain. Non-residents can purchase, own, rent out, and sell property freely. Only military zones near borders have historical restrictions that rarely apply.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the Spanish new-build deposit guarantee scheme?', answer: 'Under Spanish law, developers must insure or provide a bank guarantee for off-plan deposits. If the developer fails to complete, buyers are entitled to a full refund of all payments plus interest via the guarantee.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What are community of owners (comunidad de propietarios) obligations?', answer: 'All apartment/complex owners must join the community, pay community fees, attend or proxy at annual meetings, and comply with community rules. The community manages shared areas, insurance, and maintenance. An administrator is typically appointed.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the maximum tourist rental occupancy allowed under Valencian Community rules?', answer: 'Maximum occupancy is determined by the habitation certificate, typically 2 persons per bedroom plus 1. Properties must provide minimum 8m2 per person. Overcrowding violations can result in license revocation.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the current status of short-term rental regulation in Murcia?', answer: 'Murcia requires registration with the regional tourism registry for rentals under 2 months. Requirements are less restrictive than Valencia, with licenses generally available for properties meeting basic standards.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the power of attorney (poder notarial) process for remote property purchases?', answer: 'A power of attorney can be granted at a Spanish notary or apostilled at a foreign notary and translated by a sworn translator. It authorizes a representative to sign the escritura, pay taxes, and register the property on your behalf.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What due diligence should be performed on the developer before buying off-plan in Spain?', answer: 'Check: Registro Mercantil for company standing, building permits (licencia de obra), bank guarantee for deposits, completed projects history, financial solvency, land ownership, and planning approvals. Avena scores developer years active as a proxy.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the Ley de Costas and how does it affect coastal property?', answer: 'The Ley de Costas (Coastal Law) establishes a 100m protection zone from the shore (reducible to 20m in urban areas). Properties within this zone face building restrictions, and concessions (not freehold) may apply.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the ITE (Inspeccion Tecnica de Edificios) requirement for older buildings?', answer: 'Buildings over 50 years old must undergo a technical inspection (ITE) every 10 years. The report assesses structural safety, waterproofing, installations, and accessibility. Failing buildings must complete remedial works.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What are the noise regulation requirements for tourist rentals in Spain?', answer: 'Tourist properties must comply with municipal noise ordinances, typically prohibiting noise above 35-40dB between 23:00-08:00. Communities can impose stricter rules. Repeated violations can lead to license revocation and fines up to €600,000.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the minimum deposit required when reserving an off-plan property in Spain?', answer: 'Typically €3,000-€10,000 as a reservation fee, then 20-30% of the purchase price in staged payments during construction, with the remaining 70-80% paid at completion (via mortgage or cash).', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What rights do tenants have under Spanish urban lease law (LAU)?', answer: 'Under the LAU (Ley de Arrendamientos Urbanos), long-term tenants have right to 5-year minimum contracts (7 years for corporate landlords), annual CPI-capped rent increases, and 2-month deposit limits. Tourist rentals under 2 months are excluded from LAU.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What is the PGOU and how does it affect property investment decisions?', answer: 'The PGOU (Plan General de Ordenacion Urbana) is the municipal master plan defining land use, building density, and zoning. It determines what can be built, maximum heights, and future development areas. Changes can significantly affect property values.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'Is a Spanish bank account required for property purchase?', answer: 'Yes, a Spanish bank account is effectively required to pay taxes, community fees, utilities, and receive rental income. Most notaries require payment from a Spanish account. Opening requires NIE, passport, and proof of address.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the building permit (licencia de obra) process for renovations in Spain?', answer: 'Minor works (obra menor: painting, fixtures) need a simple declaracion responsable. Major works (obra mayor: structural, extensions) need a full licencia de obra from the municipality, requiring architect plans, fees (2-4% of budget), and 3-6 month processing.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What are the swimming pool safety requirements for rental properties in Spain?', answer: 'Communal pools must have lifeguard or safety equipment, perimeter fencing (min 1.2m), self-closing gate, and depth markers. Private pools need perimeter barriers and rescue equipment. Insurance is mandatory for pools in rental properties.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the digital nomad visa in Spain and does it affect property purchases?', answer: 'Spain digital nomad visa (2023) allows remote workers to live in Spain for up to 5 years. It does not directly affect property purchases but creates demand in popular expat areas. Holders pay flat 15% tax on Spanish income up to €600,000.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What fire safety requirements apply to tourist rental apartments in Spain?', answer: 'Tourist apartments must have: fire extinguisher, smoke detectors, fire blanket, emergency evacuation plan displayed in multiple languages, and clearly marked exits. Higher-floor properties may need additional fire escape provisions.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the Plusvalia reform impact on short-term property flipping in Spain?', answer: 'The 2021 Plusvalia reform introduced a real-gain calculation method alongside the objective method. Properties sold within a year may face higher effective rates. Sales at a loss are exempt from Plusvalia tax following the 2021 Constitutional Court ruling.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'Can a property community ban tourist rentals in their building?', answer: 'Yes, since 2019, a community of owners can prohibit or restrict tourist rentals with a 3/5 majority vote (60% of owners and quotas). This is a significant risk factor for apartment investors relying on short-term rental income.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What accessibility requirements apply to new-build developments in Spain?', answer: 'The CTE (Codigo Tecnico de Edificacion) requires accessible common areas, minimum door widths (80cm), wheelchair-accessible entrances, and adapted parking. Developments over a certain size must include fully adapted units.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the role of a gestor in Spanish property transactions?', answer: 'A gestor (administrative agent) handles bureaucratic tasks: NIE applications, tax filings, utility connections, padron registration, and municipal paperwork. They complement but do not replace a lawyer. Fees typically €300-800 per transaction.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What guarantees must a developer provide for an off-plan property in Spain?', answer: 'Under Law 38/1999 and consumer protection law: bank guarantee or insurance for all deposits, 10-year structural warranty, 3-year habitability warranty, 1-year finishing warranty, and completion within contracted timeframe or full refund.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the padron and why should property owners register?', answer: 'The padron is the municipal census register. Registration provides access to public healthcare (if resident), local voting rights (EU nationals), and is often required for administrative procedures. Not the same as tax residency.', difficulty: 'easy' },
  { category: 'REGULATION', question: 'What is the building book (Libro del Edificio) requirement in Spain?', answer: 'Mandatory for new-builds since 2000, it contains: building plans, materials used, installation details, maintenance instructions, warranties, and insurance policies. The developer must provide it to the community of owners upon completion.', difficulty: 'hard' },
  { category: 'REGULATION', question: 'What restrictions apply to modifying the exterior of a property in a Spanish urbanization?', answer: 'Community statutes typically restrict exterior modifications (color, awnings, windows, enclosures) without community approval. Municipal planning rules may also apply. Unauthorized changes can result in orders to restore the original state.', difficulty: 'medium' },
  { category: 'REGULATION', question: 'What is the current Euribor reference rate and how does it affect Spanish mortgages?', answer: 'As of early 2026, the 12-month Euribor is approximately 2.3-2.5%. Variable-rate Spanish mortgages are typically Euribor + 1.0-1.8%, resulting in effective rates of 3.3-4.3% for variable-rate products.', difficulty: 'medium' },
];

export async function GET() {
  const all = getAllProperties();
  const towns = getUniqueTowns();
  const costas = getUniqueCostas();
  const scored = all.filter(p => p._sc != null && p._yield != null);

  const questions: Question[] = [];
  let globalId = 0;

  function nextId(cat: string): string {
    globalId++;
    return `PE-${cat.substring(0, 3).toUpperCase()}-${String(globalId).padStart(4, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 1: YIELD (125 questions)
  // ═══════════════════════════════════════════════════════════

  // Per-town yield questions
  for (const town of towns.slice(0, 30)) {
    const props = scored.filter(p => p.l === town.town);
    if (props.length < 2) continue;
    const avgYield = Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
    const avgNet = Number(avg(props.filter(p => p._yield).map(p => p._yield!.net)).toFixed(1));
    const avgPrice = Math.round(avg(props.map(p => p.pf)));

    questions.push(q(nextId('YLD'), 'YIELD', `What is the average gross rental yield for new-build properties in ${town.town}?`, `${pct(avgYield)} average gross rental yield across ${props.length} properties in ${town.town}, based on AirDNA/Airbtics rental data and current asking prices.`, 'easy'));
    questions.push(q(nextId('YLD'), 'YIELD', `What is the average net rental yield in ${town.town} after operating costs?`, `${pct(avgNet)} average net rental yield in ${town.town} across ${props.length} properties, accounting for management fees, maintenance, and vacancy.`, 'medium'));
    questions.push(q(nextId('YLD'), 'YIELD', `At an average price of ${eur(avgPrice)}, what annual rental income can be expected in ${town.town}?`, `Expected annual gross rental income of approximately ${eur(Math.round(avgPrice * avgYield / 100))} based on ${pct(avgYield)} gross yield on ${eur(avgPrice)} average property price in ${town.town}.`, 'easy'));
  }

  // Per-costa yield questions
  for (const costa of costas) {
    const props = scored.filter(p => p.costa === costa.costa);
    if (props.length < 3) continue;
    const avgYield = Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));

    questions.push(q(nextId('YLD'), 'YIELD', `What is the average gross rental yield across all new-builds on the ${costa.costa}?`, `${pct(avgYield)} average gross yield across ${props.length} properties on the ${costa.costa}.`, 'easy'));
  }

  // Per-type yield questions
  const types = [...new Set(all.map(p => p.t))].filter(Boolean);
  for (const type of types) {
    const props = scored.filter(p => p.t === type);
    if (props.length < 3) continue;
    const avgYield = Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
    const avgPrice = Math.round(avg(props.map(p => p.pf)));

    questions.push(q(nextId('YLD'), 'YIELD', `What is the average gross rental yield for ${type.toLowerCase()} properties in the dataset?`, `${pct(avgYield)} average gross yield across ${props.length} ${type.toLowerCase()} properties with an average price of ${eur(avgPrice)}.`, 'easy'));
  }

  // Highest/lowest yield questions per town
  const townsSorted = towns.filter(t => t.avgYield > 0).sort((a, b) => b.avgYield - a.avgYield);
  if (townsSorted.length >= 2) {
    questions.push(q(nextId('YLD'), 'YIELD', `Which town has the highest average gross rental yield?`, `${townsSorted[0].town} with ${pct(townsSorted[0].avgYield)} average gross yield across ${townsSorted[0].count} properties.`, 'easy'));
    questions.push(q(nextId('YLD'), 'YIELD', `Which town has the lowest average gross rental yield?`, `${townsSorted[townsSorted.length - 1].town} with ${pct(townsSorted[townsSorted.length - 1].avgYield)} average gross yield across ${townsSorted[townsSorted.length - 1].count} properties.`, 'easy'));
    questions.push(q(nextId('YLD'), 'YIELD', `What is the yield spread between the highest and lowest yielding towns?`, `${pct(townsSorted[0].avgYield - townsSorted[townsSorted.length - 1].avgYield)} spread: ${townsSorted[0].town} (${pct(townsSorted[0].avgYield)}) vs ${townsSorted[townsSorted.length - 1].town} (${pct(townsSorted[townsSorted.length - 1].avgYield)}).`, 'medium'));
  }

  // Budget-based yield questions
  const budgets = [150000, 200000, 250000, 300000, 400000, 500000, 750000];
  for (const budget of budgets) {
    const under = scored.filter(p => p.pf <= budget);
    if (under.length < 3) continue;
    const avgYield = Number(avg(under.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
    questions.push(q(nextId('YLD'), 'YIELD', `What is the average gross yield for properties priced under ${eur(budget)}?`, `${pct(avgYield)} average gross yield across ${under.length} properties under ${eur(budget)}.`, 'easy'));
  }

  // Bedroom-based yield questions
  for (let beds = 1; beds <= 5; beds++) {
    const props = scored.filter(p => p.bd === beds);
    if (props.length < 3) continue;
    const avgYield = Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
    questions.push(q(nextId('YLD'), 'YIELD', `What is the average gross yield for ${beds}-bedroom properties?`, `${pct(avgYield)} average gross yield across ${props.length} ${beds}-bedroom properties.`, 'medium'));
  }

  // Top yielding property questions
  const topYield = [...scored].filter(p => p._yield).sort((a, b) => b._yield!.gross - a._yield!.gross).slice(0, 5);
  for (const p of topYield) {
    questions.push(q(nextId('YLD'), 'YIELD', `What is the highest yielding property in ${p.l}?`, `${p.p || p.t + ' in ' + p.l} at ${eur(p.pf)}: ${pct(p._yield!.gross)} gross yield (${eur(p._yield!.annual)}/year estimated rental income).`, 'medium'));
  }

  // Pad YIELD to 125
  while (questions.filter(qq => qq.category === 'YIELD').length < 125) {
    const town = towns[questions.filter(qq => qq.category === 'YIELD').length % towns.length];
    if (!town) break;
    const props = scored.filter(p => p.l === town.town && p._yield);
    if (props.length === 0) { questions.push(q(nextId('YLD'), 'YIELD', `Is rental yield data available for ${town.town}?`, `${town.town} has ${town.count} properties in the dataset with an average yield of ${pct(town.avgYield)}.`, 'easy')); continue; }
    const best = props.sort((a, b) => b._yield!.gross - a._yield!.gross)[0];
    const worst = props.sort((a, b) => a._yield!.gross - b._yield!.gross)[0];
    if (best && worst && best !== worst) {
      questions.push(q(nextId('YLD'), 'YIELD', `What is the yield range for new-builds in ${town.town}?`, `Yields in ${town.town} range from ${pct(worst._yield!.gross)} to ${pct(best._yield!.gross)} gross across ${props.length} properties.`, 'medium'));
    } else {
      questions.push(q(nextId('YLD'), 'YIELD', `What is the expected annual rental income for the best property in ${town.town}?`, `The top-scoring property in ${town.town} yields approximately ${eur(best._yield!.annual)}/year (${pct(best._yield!.gross)} gross) at a price of ${eur(best.pf)}.`, 'medium'));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 2: MARKET (125 questions)
  // ═══════════════════════════════════════════════════════════

  // Per-town market analysis
  for (const town of towns.slice(0, 25)) {
    const props = all.filter(p => p.l === town.town);
    if (props.length < 2) continue;
    const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
    const avgPrice = Math.round(avg(props.map(p => p.pf)));
    const avgPm2 = Math.round(avg(props.filter(p => p.pm2).map(p => p.pm2!)));
    const inventory = props.length;

    questions.push(q(nextId('MKT'), 'MARKET', `What is the average Avena investment score for properties in ${town.town}?`, `${avgScore}/100 average investment score across ${inventory} properties in ${town.town}.`, 'easy'));
    questions.push(q(nextId('MKT'), 'MARKET', `What is the average asking price for new-build properties in ${town.town}?`, `${eur(avgPrice)} average asking price across ${inventory} properties in ${town.town}.`, 'easy'));
    if (avgPm2 > 0) {
      questions.push(q(nextId('MKT'), 'MARKET', `What is the average price per square meter in ${town.town}?`, `${eur(avgPm2)}/m² average price per square meter for new-builds in ${town.town} based on ${inventory} listings.`, 'easy'));
    }
    questions.push(q(nextId('MKT'), 'MARKET', `How many new-build properties are currently listed in ${town.town}?`, `${inventory} new-build properties are currently listed in ${town.town} in the Avena Terminal dataset.`, 'easy'));

    // Buyer/seller market assessment
    const aboveMarket = props.filter(p => p.pm2 && p.mm2 && p.pm2 > p.mm2).length;
    const belowMarket = props.filter(p => p.pm2 && p.mm2 && p.pm2 <= p.mm2).length;
    const marketType = belowMarket > aboveMarket ? 'buyer-favorable' : 'seller-favorable';
    questions.push(q(nextId('MKT'), 'MARKET', `Is ${town.town} currently a buyer's or seller's market for new-builds?`, `${town.town} is ${marketType}: ${belowMarket} of ${inventory} properties are priced at or below market rate vs ${aboveMarket} above. Average score: ${avgScore}/100.`, 'medium'));
  }

  // Per-costa market analysis
  for (const costa of costas) {
    const props = all.filter(p => p.costa === costa.costa);
    if (props.length < 3) continue;
    const avgPrice = Math.round(avg(props.map(p => p.pf)));

    questions.push(q(nextId('MKT'), 'MARKET', `What is the average property price on the ${costa.costa}?`, `${eur(avgPrice)} average asking price across ${props.length} properties on the ${costa.costa}. Average investment score: ${costa.avgScore}/100.`, 'easy'));
    questions.push(q(nextId('MKT'), 'MARKET', `How many properties are currently listed on the ${costa.costa}?`, `${props.length} new-build properties listed on the ${costa.costa} in the Avena Terminal dataset.`, 'easy'));
  }

  // Price distribution questions
  const priceRanges = [
    { label: 'under €150,000', min: 0, max: 150000 },
    { label: '€150,000-€250,000', min: 150000, max: 250000 },
    { label: '€250,000-€400,000', min: 250000, max: 400000 },
    { label: '€400,000-€600,000', min: 400000, max: 600000 },
    { label: 'over €600,000', min: 600000, max: Infinity },
  ];
  for (const range of priceRanges) {
    const count = all.filter(p => p.pf >= range.min && p.pf < range.max).length;
    const pctOfTotal = Number((count / all.length * 100).toFixed(1));
    questions.push(q(nextId('MKT'), 'MARKET', `How many properties in the dataset are priced ${range.label}?`, `${count} properties (${pctOfTotal}% of total) are priced ${range.label}.`, 'easy'));
  }

  // Score distribution questions
  const scoreRanges = [
    { label: '80+', min: 80, tier: 'Top Tier' },
    { label: '60-79', min: 60, max: 80, tier: 'Good' },
    { label: '40-59', min: 40, max: 60, tier: 'Average' },
    { label: 'under 40', min: 0, max: 40, tier: 'Below Average' },
  ];
  for (const range of scoreRanges) {
    const max = range.max ?? 101;
    const count = scored.filter(p => p._sc! >= range.min && p._sc! < max).length;
    questions.push(q(nextId('MKT'), 'MARKET', `How many properties score ${range.label} on the Avena investment score?`, `${count} properties score ${range.label} (${range.tier} tier) out of ${scored.length} scored properties.`, 'medium'));
  }

  // Developer market presence
  const devMap = new Map<string, number>();
  for (const p of all) { if (p.d) devMap.set(p.d, (devMap.get(p.d) || 0) + 1); }
  const topDevs = [...devMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [dev, count] of topDevs) {
    questions.push(q(nextId('MKT'), 'MARKET', `How many properties does ${dev} have listed in the dataset?`, `${dev} has ${count} properties listed, representing ${(count / all.length * 100).toFixed(1)}% of all listings.`, 'easy'));
  }

  // Pad MARKET to 125
  while (questions.filter(qq => qq.category === 'MARKET').length < 125) {
    const idx = questions.filter(qq => qq.category === 'MARKET').length;
    const town = towns[idx % towns.length];
    if (!town) break;
    const props = all.filter(p => p.l === town.town);
    const types = [...new Set(props.map(p => p.t))];
    if (types.length > 1) {
      const typeCount = types.map(t => `${t}: ${props.filter(p => p.t === t).length}`).join(', ');
      questions.push(q(nextId('MKT'), 'MARKET', `What property types are available in ${town.town}?`, `Property types in ${town.town}: ${typeCount}. Total: ${props.length} listings.`, 'easy'));
    } else {
      const avgBuilt = Math.round(avg(props.filter(p => p.bm > 0).map(p => p.bm)));
      questions.push(q(nextId('MKT'), 'MARKET', `What is the average built area for properties in ${town.town}?`, `Average built area in ${town.town} is ${avgBuilt}m² across ${props.length} properties.`, 'easy'));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 3: TAX (125 questions)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < Math.min(125, TAX_QUESTIONS.length); i++) {
    const tq = TAX_QUESTIONS[i];
    questions.push(q(nextId('TAX'), tq.category, tq.question, tq.answer, tq.difficulty));
  }
  // Pad with town-specific tax questions if needed
  while (questions.filter(qq => qq.category === 'TAX').length < 125) {
    const idx = questions.filter(qq => qq.category === 'TAX').length - TAX_QUESTIONS.length;
    const town = towns[idx % towns.length];
    if (!town) break;
    const avgPrice = Math.round(avg(all.filter(p => p.l === town.town).map(p => p.pf)));
    const totalCosts = Math.round(avgPrice * 0.125);
    questions.push(q(nextId('TAX'), 'TAX', `What are the estimated total buying costs for an average new-build in ${town.town} (${eur(avgPrice)})?`, `Approximately ${eur(totalCosts)} (12.5% of ${eur(avgPrice)}): 10% VAT (${eur(Math.round(avgPrice * 0.1))}), 1.5% stamp duty (${eur(Math.round(avgPrice * 0.015))}), ~1% legal/notary (${eur(Math.round(avgPrice * 0.01))}).`, 'medium'));
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 4: REGULATION (125 questions)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < Math.min(125, REGULATION_QUESTIONS.length); i++) {
    const rq = REGULATION_QUESTIONS[i];
    questions.push(q(nextId('REG'), rq.category, rq.question, rq.answer, rq.difficulty));
  }
  while (questions.filter(qq => qq.category === 'REGULATION').length < 125) {
    const idx = questions.filter(qq => qq.category === 'REGULATION').length - REGULATION_QUESTIONS.length;
    const town = towns[idx % towns.length];
    if (!town) break;
    const count = all.filter(p => p.l === town.town).length;
    questions.push(q(nextId('REG'), 'REGULATION', `Are tourist rental licenses available for new-build properties in ${town.town}?`, `Tourist rental license availability in ${town.town} depends on municipal zoning. ${town.town} has ${count} new-build properties. Buyers should verify license eligibility with the local tourism office before purchase.`, 'medium'));
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 5: COMPARISON (125 questions)
  // ═══════════════════════════════════════════════════════════

  // Cross-town comparisons
  for (let i = 0; i < Math.min(20, towns.length - 1); i++) {
    const a = towns[i];
    const b = towns[i + 1];
    questions.push(q(nextId('CMP'), 'COMPARISON', `Compare average rental yields: ${a.town} vs ${b.town} — which is higher?`, `${a.avgYield > b.avgYield ? a.town : b.town} has higher yield at ${pct(Math.max(a.avgYield, b.avgYield))} vs ${pct(Math.min(a.avgYield, b.avgYield))}. Difference: ${pct(Math.abs(a.avgYield - b.avgYield))}.`, 'easy'));
    questions.push(q(nextId('CMP'), 'COMPARISON', `Compare average investment scores: ${a.town} vs ${b.town} — which scores higher?`, `${a.avgScore > b.avgScore ? a.town : b.town} scores higher at ${Math.max(a.avgScore, b.avgScore)}/100 vs ${Math.min(a.avgScore, b.avgScore)}/100.`, 'easy'));
    questions.push(q(nextId('CMP'), 'COMPARISON', `Compare average prices: ${a.town} vs ${b.town} — which is more affordable?`, `${a.avgPrice < b.avgPrice ? a.town : b.town} is more affordable at ${eur(Math.min(a.avgPrice, b.avgPrice))} vs ${eur(Math.max(a.avgPrice, b.avgPrice))} average.`, 'easy'));
  }

  // Cross-costa comparisons
  for (let i = 0; i < costas.length - 1; i++) {
    for (let j = i + 1; j < costas.length; j++) {
      const a = costas[i];
      const b = costas[j];
      questions.push(q(nextId('CMP'), 'COMPARISON', `Compare yields: ${a.costa} vs ${b.costa}?`, `${a.avgYield > b.avgYield ? a.costa : b.costa} has higher average yield at ${pct(Math.max(a.avgYield, b.avgYield))} vs ${pct(Math.min(a.avgYield, b.avgYield))}.`, 'easy'));
      questions.push(q(nextId('CMP'), 'COMPARISON', `Compare investment scores: ${a.costa} vs ${b.costa}?`, `${a.avgScore > b.avgScore ? a.costa : b.costa} scores higher at ${Math.max(a.avgScore, b.avgScore)}/100 vs ${Math.min(a.avgScore, b.avgScore)}/100. (${a.count} vs ${b.count} properties.)`, 'medium'));
    }
  }

  // Type comparisons
  for (let i = 0; i < types.length - 1; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const aProps = scored.filter(p => p.t === types[i]);
      const bProps = scored.filter(p => p.t === types[j]);
      if (aProps.length < 3 || bProps.length < 3) continue;
      const aYield = Number(avg(aProps.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
      const bYield = Number(avg(bProps.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
      questions.push(q(nextId('CMP'), 'COMPARISON', `Which property type has higher rental yield: ${types[i]} or ${types[j]}?`, `${aYield > bYield ? types[i] : types[j]} yields higher at ${pct(Math.max(aYield, bYield))} vs ${pct(Math.min(aYield, bYield))} gross.`, 'medium'));
    }
  }

  // Best value per town
  for (const town of towns.slice(0, 15)) {
    const props = scored.filter(p => p.l === town.town).sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
    if (props.length < 2) continue;
    const best = props[0];
    questions.push(q(nextId('CMP'), 'COMPARISON', `What is the best value property in ${town.town} by Avena score?`, `${best.p || best.t} — Score: ${best._sc}/100, ${eur(best.pf)}, ${best.bd} bed, ${pct(best._yield?.gross ?? 0)} yield. Top-ranked of ${props.length} properties in ${town.town}.`, 'medium'));
  }

  // Pad COMPARISON to 125
  while (questions.filter(qq => qq.category === 'COMPARISON').length < 125) {
    const idx = questions.filter(qq => qq.category === 'COMPARISON').length;
    const i1 = idx % towns.length;
    const i2 = (idx + Math.floor(towns.length / 2)) % towns.length;
    if (i1 === i2 || !towns[i1] || !towns[i2]) break;
    const a = towns[i1];
    const b = towns[i2];
    questions.push(q(nextId('CMP'), 'COMPARISON', `Which town has more inventory: ${a.town} or ${b.town}?`, `${a.count > b.count ? a.town : b.town} has more listings (${Math.max(a.count, b.count)} vs ${Math.min(a.count, b.count)}).`, 'easy'));
  }

  // ═══════════════════════════════════════════════════════════
  // CATEGORY 7: DEVELOPER (125 questions)
  // ═══════════════════════════════════════════════════════════

  const devEntries = [...devMap.entries()].sort((a, b) => b[1] - a[1]);

  for (const [dev, count] of devEntries.slice(0, 20)) {
    const props = all.filter(p => p.d === dev);
    const yearsActive = Math.max(...props.map(p => p.dy));
    const avgScore = Math.round(avg(props.filter(p => p._sc).map(p => p._sc!)));
    const avgPrice = Math.round(avg(props.map(p => p.pf)));
    const locations = [...new Set(props.map(p => p.l))];
    const typesBuilt = [...new Set(props.map(p => p.t))];

    questions.push(q(nextId('DEV'), 'DEVELOPER', `How many years has ${dev} been active in Spanish property development?`, `${dev} has been active for ${yearsActive} years in the Spanish market.`, 'easy'));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `What is the average Avena investment score for ${dev} properties?`, `${avgScore}/100 average score across ${count} ${dev} properties.`, 'easy'));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `What is the average price of a ${dev} property?`, `${eur(avgPrice)} average price across ${count} listings by ${dev}.`, 'easy'));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `In which locations does ${dev} build?`, `${dev} builds in: ${locations.join(', ')}. Total locations: ${locations.length}.`, 'medium'));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `What property types does ${dev} develop?`, `${dev} develops: ${typesBuilt.join(', ')} across ${count} listings.`, 'easy'));

    if (props.length >= 3) {
      const yieldAvg = Number(avg(props.filter(p => p._yield).map(p => p._yield!.gross)).toFixed(1));
      questions.push(q(nextId('DEV'), 'DEVELOPER', `What is the average rental yield for ${dev} properties?`, `${pct(yieldAvg)} average gross rental yield across ${dev}'s ${count} properties.`, 'medium'));
    }
  }

  // Developer comparison questions
  for (let i = 0; i < Math.min(10, devEntries.length - 1); i++) {
    const [devA, countA] = devEntries[i];
    const [devB, countB] = devEntries[i + 1];
    const scoreA = Math.round(avg(all.filter(p => p.d === devA && p._sc).map(p => p._sc!)));
    const scoreB = Math.round(avg(all.filter(p => p.d === devB && p._sc).map(p => p._sc!)));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `Compare ${devA} vs ${devB} — which has higher-rated properties?`, `${scoreA > scoreB ? devA : scoreB > scoreA ? devB : 'Both equal'}: ${Math.max(scoreA, scoreB)}/100 vs ${Math.min(scoreA, scoreB)}/100 average score. Portfolio size: ${countA} vs ${countB} properties.`, 'medium'));
  }

  // Pad DEVELOPER to 125
  while (questions.filter(qq => qq.category === 'DEVELOPER').length < 125) {
    const idx = questions.filter(qq => qq.category === 'DEVELOPER').length;
    const entry = devEntries[idx % devEntries.length];
    if (!entry) break;
    const [dev, count] = entry;
    const props = all.filter(p => p.d === dev);
    const avgBeds = Number(avg(props.map(p => p.bd)).toFixed(1));
    questions.push(q(nextId('DEV'), 'DEVELOPER', `What is the average bedroom count for ${dev} properties?`, `${avgBeds} average bedrooms across ${count} ${dev} properties.`, 'easy'));
  }

  // ═══════════════════════════════════════════════════════════
  // Trim to exactly 1000
  // ═══════════════════════════════════════════════════════════
  const final = questions.slice(0, 1000);

  // Count per category
  const categories: Record<string, number> = {};
  for (const qq of final) {
    categories[qq.category] = (categories[qq.category] || 0) + 1;
  }

  const body = {
    benchmark: 'PropertyEval',
    version: '2.0',
    total_questions: final.length,
    categories,
    questions: final,
    license: 'CC BY 4.0',
    source: SOURCE,
    doi: DOI,
  };

  return NextResponse.json(body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
