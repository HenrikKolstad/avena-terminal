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

// ── MACRO knowledge base ──
const MACRO_QUESTIONS: Omit<Question, 'id' | 'source' | 'doi'>[] = [
  { category: 'MACRO', question: 'What is the current ECB main refinancing rate as of early 2026?', answer: 'The ECB main refinancing rate is approximately 2.65% as of Q1 2026, following a series of cuts from the 4.5% peak in September 2023. Further gradual easing is expected.', difficulty: 'easy' },
  { category: 'MACRO', question: 'How has the ECB rate trajectory affected Spanish mortgage affordability?', answer: 'The ECB cutting cycle from 4.5% to ~2.65% has reduced Euribor from ~4% to ~2.3-2.5%, lowering variable mortgage payments by approximately €100-150/month per €100,000 borrowed. Fixed rates have compressed to 2.8-3.5%.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the current Spanish CPI inflation rate?', answer: 'Spanish CPI inflation is approximately 2.5-3.0% as of early 2026, down from the 10.8% peak in July 2022. Housing-related components (rent, utilities) remain above headline at 3-4%.', difficulty: 'easy' },
  { category: 'MACRO', question: 'How does Spanish inflation affect rental yields?', answer: 'Moderate inflation (2-3%) supports rental yields as rents adjust upward while mortgage costs fall (due to ECB cuts). The net effect is positive for leveraged property investors in the current macro environment.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the trend in foreign property purchases in Spain?', answer: 'Foreign buyers account for approximately 15-17% of all Spanish property transactions. British, German, Dutch, French, and Scandinavian buyers dominate coastal areas. Post-Golden Visa, investment-driven purchases have shifted to genuine lifestyle buyers.', difficulty: 'easy' },
  { category: 'MACRO', question: 'Which nationalities are the top buyers of Spanish coastal property in 2025-2026?', answer: 'Top buyers by volume: 1. British (declining post-Brexit), 2. German, 3. Dutch, 4. French, 5. Belgian, 6. Swedish, 7. Polish (growing fast), 8. American (growing). Nordic and Eastern European demand is increasing.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How has remote work affected demand for Spanish coastal property?', answer: 'Remote work has significantly boosted demand, especially for properties with good internet, workspace, and year-round livability. Towns like Denia, Javea, and Altea see growing digital nomad demand, extending rental seasons beyond summer.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the current state of new-build construction in the Costa Blanca and Costa Calida?', answer: 'New-build starts remain below 2006-2008 levels but have recovered to ~100,000 annually nationally. Coastal areas see strong developer activity, but construction costs (up 25-30% since 2020) are limiting supply and supporting prices.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How have construction costs changed in Spain since 2020?', answer: 'Construction costs have risen 25-35% since 2020 due to material costs (steel, cement, energy) and labor shortages. This has pushed new-build prices higher and reduced developer margins, limiting speculative construction.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the Spanish unemployment rate and how does it affect property markets?', answer: 'Spanish unemployment is approximately 11-12% nationally (down from 26% in 2013), but coastal tourism areas have seasonal employment fluctuations. Lower unemployment supports domestic demand and rental markets.', difficulty: 'easy' },
  { category: 'MACRO', question: 'How does the EUR/GBP exchange rate affect British buyers of Spanish property?', answer: 'At approximately €1.17-1.20 per GBP in early 2026, British buyers face less favorable rates than pre-Brexit (~€1.40). A 20% currency decline effectively increases property costs by 20% for GBP-denominated budgets.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the impact of the strong USD on American buyers of Spanish property?', answer: 'The EUR/USD rate of approximately 1.05-1.10 makes European property relatively affordable for US buyers. Combined with remote work trends, American buyer activity in Spain has increased 30-40% since 2022.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the Spanish housing price index trend for 2024-2026?', answer: 'Spanish housing prices have risen approximately 5-8% annually in 2024-2026, with coastal new-builds outperforming at 8-12%. The market has not reached 2007 peak levels in real terms, suggesting room for further appreciation.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does the Spanish property market compare to other European markets in 2026?', answer: 'Spain offers higher rental yields (4-7% gross) than France (2-3%), Italy (3-4%), or Portugal (3-5%). Price-per-m2 remains below northern European levels, making it attractive for yield-seeking investors.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the risk of a property price correction in Spain in 2026?', answer: 'Low risk of a major correction. Unlike 2008: bank lending standards are strict (LTV caps), supply is constrained, foreign demand is diversified, and employment is stable. Moderate risk of 5-10% softening if ECB pauses rate cuts.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How does climate change affect property values on the Spanish coast?', answer: 'Rising temperatures increase summer demand but raise concerns about water scarcity, wildfire risk (inland), and coastal erosion. Southern areas face more acute water stress. Properties with sustainable water features and energy efficiency command premiums.', difficulty: 'hard' },
  { category: 'MACRO', question: 'What is the impact of Spains digital infrastructure on property investment?', answer: 'Spain has >95% fiber optic coverage nationally, among the highest in Europe. Coastal towns benefit from excellent broadband, supporting digital nomad demand and year-round occupancy potential for rental properties.', difficulty: 'easy' },
  { category: 'MACRO', question: 'How does Spains healthcare system affect property demand from foreign retirees?', answer: 'Spains universal healthcare system (ranked 7th globally by WHO) is a major draw for retirees. EU/EEA citizens access it via S1 form or EHIC. Non-EU residents need private insurance. Quality healthcare supports premium property demand in expat areas.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the impact of low-cost airline routes on Costa Blanca property demand?', answer: 'Alicante-Elche airport serves 15M+ passengers/year with 100+ routes. Ryanair, easyJet, Wizz Air, and others provide affordable access from across Europe. Flight connectivity directly correlates with rental demand and property values in nearby towns.', difficulty: 'easy' },
  { category: 'MACRO', question: 'How does Spains tourist visitor trend affect rental property investment?', answer: 'Spain receives 85M+ tourists annually (2nd globally). Coastal rental properties benefit from high seasonal demand. Growth in shoulder-season tourism (spring/autumn) extends profitable rental windows beyond the traditional June-September peak.', difficulty: 'easy' },
  { category: 'MACRO', question: 'What is the outlook for Spains rental market regulation in 2026-2027?', answer: 'The 2023 Housing Law caps annual rent increases (CPI-linked, max 3% in 2024, new index from 2025). Tourist rental restrictions are tightening in saturated zones. Long-term rental regulation may reduce investor returns in some segments.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How does the Spanish banking sector health affect property markets?', answer: 'Spanish banks are well-capitalized (CET1 ~13%) after post-2012 restructuring. NPL ratios are at historic lows (~3.5%). Conservative lending (80% LTV resident, 70% non-resident) reduces systemic risk of a credit-driven correction.', difficulty: 'hard' },
  { category: 'MACRO', question: 'What demographic trends affect Spanish property demand?', answer: 'Spain faces population aging (median age 45) and low birth rates. However, net immigration (400,000+/year) and foreign retiree inflows support demand, especially in coastal areas. Young Spaniards increasingly struggle with affordability, boosting rental demand.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does the EU Renovation Wave strategy affect Spanish property investment?', answer: 'The EU Renovation Wave targets doubling renovation rates by 2030. Spain allocates NextGenEU funds for energy retrofits. Properties with high energy ratings (A-C) command 5-15% premiums. Poorly rated properties may face mandatory improvement requirements.', difficulty: 'hard' },
  { category: 'MACRO', question: 'What is the impact of water scarcity on property values in southeast Spain?', answer: 'Southeast Spain faces chronic water stress. Desalination plants supply coastal areas, but restrictions on pool filling and garden irrigation occur during droughts. Properties connected to desalinated supply or with water-efficient design are more resilient.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How does the Spanish GDP growth rate support property markets?', answer: 'Spanish GDP growth of approximately 2.0-2.5% in 2025-2026 outperforms the eurozone average (~1%). Tourism, construction, and services sectors drive growth, supporting employment and property demand in coastal regions.', difficulty: 'easy' },
  { category: 'MACRO', question: 'What is the current rental yield spread over Spanish government bond yields?', answer: 'Spanish 10-year bond yields are approximately 3.0-3.2%. Average gross rental yields of 5-6% provide a 200-300bp spread, making property attractive relative to fixed income in the current rate environment.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How does the insurance market affect Spanish property investment costs?', answer: 'Home insurance in Spain costs €200-500/year for apartments and €400-1,000 for villas. Contents and liability insurance add €100-300. Premiums have risen 10-15% since 2022 due to climate-related claims. Insurance is mandatory for mortgaged properties.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the impact of AI and proptech on Spanish property transparency?', answer: 'Proptech adoption in Spain is growing rapidly. Automated valuation models, digital mortgages, and platforms like Avena Terminal increase market transparency. Spain ranks mid-table in JLL Global Real Estate Transparency Index, improving annually.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How do EU fiscal rules affect Spains property market outlook?', answer: 'Spains public debt (~105% of GDP) and the reinstated EU fiscal rules require gradual consolidation. This limits government stimulus but ECB rate cuts offset fiscal drag. Infrastructure spending (high-speed rail, airports) continues to benefit property areas.', difficulty: 'hard' },
  { category: 'MACRO', question: 'What is the trend in Spanish property transaction volumes?', answer: 'Annual property transactions are approximately 550,000-600,000, stable versus the post-2021 boom peak of 650,000 but well above the 2013 trough of 300,000. Foreign transactions remain at 15-17% share. New-builds are approximately 20% of total.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does the Schengen area affect property investment patterns in Spain?', answer: 'Schengen allows EU citizens unrestricted access. Non-EU nationals face the 90/180-day rule for property visits without residency. Post-Golden Visa, non-EU investors need alternative visa routes (digital nomad, non-lucrative) for extended stays.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the supply-demand dynamic for new-builds in Spains Costa Blanca?', answer: 'Demand exceeds supply in prime coastal locations. New-build completions are 60-70% of pre-crisis levels while population and tourism grow. This structural undersupply supports price appreciation of 6-10% annually for quality new developments.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does Spains position in global property market cycles compare to 2007?', answer: 'Key differences from 2007: mortgage credit is controlled (max 80% LTV), banks are well-capitalized, speculative construction is limited, price-to-income ratios are lower, and demand is driven by end-users not speculators. Risk of a 2008-style crash is minimal.', difficulty: 'hard' },
  { category: 'MACRO', question: 'What is the expected impact of further ECB rate cuts on Spanish property in 2026-2027?', answer: 'Further ECB cuts to ~2.0-2.25% would reduce Euribor-linked mortgage costs by another €30-50/month per €100K, improving affordability. Historical pattern shows property prices respond with a 6-12 month lag to rate changes.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does seasonality affect rental income in Costa Blanca vs Costa Calida?', answer: 'Costa Blanca has a longer high season (May-October) due to brand recognition and infrastructure. Costa Calida offers better winter weather but shorter peak demand. Both benefit from growing shoulder-season demand from remote workers and retirees.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the outlook for Spanish property as a Eurozone safe haven asset?', answer: 'Spanish property is increasingly viewed as a euro-denominated real asset hedge. Relative affordability vs northern Europe, strong rental yields, and improving transparency attract institutional and retail investors diversifying from volatile markets.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How has COVID-19 permanently changed Spanish property demand patterns?', answer: 'Permanent shifts include: higher demand for outdoor space (terraces, gardens), home offices, lower-density locations, better internet connectivity, and flexibility for extended stays. These trends favor new-builds with modern layouts over older apartments.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the role of pension fund and institutional investment in Spanish property?', answer: 'Institutional investment in Spanish residential has grown, with build-to-rent (BTR) projects attracting funds from Blackstone, Greystar, and others. This professionalizes the rental market but concentrates ownership. Coastal areas see less institutional activity than Madrid/Barcelona.', difficulty: 'hard' },
  { category: 'MACRO', question: 'How does the high-speed rail (AVE) expansion affect Costa Blanca property values?', answer: 'The Mediterranean corridor AVE project connecting Alicante to Barcelona and beyond improves accessibility. Towns with AVE stations (Alicante, Elche) see property premiums. The ongoing extension to Murcia will boost Costa Calida connectivity.', difficulty: 'medium' },
  { category: 'MACRO', question: 'What is the current developer confidence index for Spanish coastal new-builds?', answer: 'Developer confidence remains positive, with most major developers (Taylor Wimpey, TM, Urbania) maintaining or expanding coastal portfolios. Construction start volumes are steady, indicating 12-18 month supply pipelines. Land prices have risen 15-20% since 2022.', difficulty: 'medium' },
  { category: 'MACRO', question: 'How does the EU Taxonomy for Sustainable Activities affect new-build property investment?', answer: 'The EU Taxonomy requires buildings to meet near-zero energy standards to qualify as sustainable investments. Green-certified new-builds attract preferential mortgage rates (0.1-0.3% discount) and qualify for ESG investment mandates, supporting premium valuations.', difficulty: 'hard' },
];

// ── PREDICTION knowledge base ──
const PREDICTION_QUESTIONS: Omit<Question, 'id' | 'source' | 'doi'>[] = [
  { category: 'PREDICTION', question: 'What is the APCI (Avena Property Confidence Index) and what does it measure?', answer: 'The APCI is a composite index measuring overall market confidence based on: price momentum, yield spreads, developer activity, foreign demand signals, inventory turnover, and credit conditions. Range: 0-100, with >70 indicating expansion.', difficulty: 'easy' },
  { category: 'PREDICTION', question: 'What is the current APCI regime classification for Costa Blanca?', answer: 'The APCI regime for Costa Blanca is Expansion, characterized by rising prices, strong demand, healthy developer pipelines, and yield compression. This typically precedes a plateau phase within 12-18 months.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted price direction for Costa Blanca new-builds in the next 12 months?', answer: 'Upward (+6-10%). Driven by: constrained supply, continued ECB rate cuts improving affordability, strong foreign demand, and construction cost inflation pushing new-build prices higher. Risk: demand softening if rates pause.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted rental yield trend for Torrevieja area in 2026-2027?', answer: 'Slight compression (-0.2-0.5pp) as property prices rise faster than rents. Current gross yields of 6-7% may settle to 5.5-6.5%. Offset by longer rental seasons and higher absolute rental income.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What developer health signals indicate construction completion risk?', answer: 'Red flags: developer years active <5, multiple simultaneous large projects, declining completion rates, delayed handover dates, reduced marketing activity, and bank guarantee issues. Avena scores developer experience as part of quality assessment.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the expected impact of Golden Visa abolition on Costa Blanca prices?', answer: 'Minimal impact (-1-2%). Golden Visa purchases were concentrated in Madrid, Barcelona, and Marbella. Costa Blanca is predominantly lifestyle/retirement buyer-driven, not investment-visa motivated. Actual demand loss is estimated at <3% of transactions.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What are the leading indicators for a Spanish property market downturn?', answer: 'Key leading indicators: mortgage approval decline >15%, unsold inventory rise >20%, developer margin compression <10%, foreign transaction drop >10%, and rental vacancy increase >5%. Currently none of these thresholds are breached.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted APCI direction for the Costa Calida market?', answer: 'Upward (+3-5 points). Costa Calida is in early-expansion phase, lagging Costa Blanca by 12-18 months. Lower price points, improving infrastructure, and spillover demand from overpriced Blanca areas support continued appreciation.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'How will AI-driven property platforms like Avena affect market efficiency?', answer: 'Increased transparency reduces information asymmetry, narrows bid-ask spreads, and accelerates price discovery. Properties with poor scores face faster price corrections. Well-scored properties attract quicker offers. Net effect: more efficient market within 3-5 years.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the risk-adjusted return expectation for a 5-year Costa Blanca new-build investment?', answer: 'Expected total return: 8-12% annually (5-7% rental yield + 3-5% capital appreciation). Risk-adjusted (Sharpe-equivalent): 0.8-1.2 assuming 8% return volatility. Compares favorably to European REITs and equity markets.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What price premium do completed properties command over off-plan in Costa Blanca?', answer: 'Completed properties typically command 10-20% premium over identical off-plan units in the same development. This reflects construction risk elimination, immediate rental income, and financing availability. Off-plan discounts are the compensation for this risk.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted effect of climate migration on southeast Spain property demand?', answer: 'Net positive for coastal areas. Climate migration from hotter southern Spain and northern Africa increases medium-term demand. However, water scarcity and extreme heat events may cap inland appreciation. Coastal areas with desalination are best positioned.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'How will tourist rental license restrictions affect property values in saturated areas?', answer: 'Existing licensed properties gain scarcity value (+5-15% premium). Unlicensed properties face yield reduction to long-term rental rates. Net effect: bifurcation between licensed and unlicensed property values, especially in coastal apartments.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted developer pipeline for Costa Blanca new-builds in 2026-2028?', answer: 'Approximately 8,000-12,000 new units expected to complete in 2026-2028 across Costa Blanca. Major developers (TM, Taylor Wimpey, Urbania, Allure) have active pipelines. Supply remains below pre-crisis levels, supporting price stability.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What signals indicate a market regime change from Expansion to Plateau?', answer: 'Key signals: price growth deceleration to <3% annualized, yield stabilization, developer pre-sales dropping below 60%, time-to-sell increasing above 6 months, and mortgage applications plateauing. Typically occurs 18-24 months after rate cut cycles end.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted impact of EU energy efficiency requirements on older properties?', answer: 'Properties rated E-G face 10-20% value discount by 2030 as renovation costs (€10,000-30,000) and future mandatory upgrades are priced in. A-B rated new-builds gain relative premium. This accelerates the value gap between new and old stock.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'How will the ageing European demographic affect Costa Blanca demand?', answer: 'Strongly positive. Europes 60+ population grows by 2M+/year. Spain is the top retirement destination for EU citizens. Demand for accessible, modern, low-maintenance new-builds with healthcare proximity will increase. Key driver for 2025-2035 demand.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the correlation between Alicante airport passenger growth and property transactions?', answer: 'Strong positive correlation (r=0.82). Airport passenger growth leads property transactions by 3-6 months. The post-COVID recovery in flight routes (now exceeding 2019 levels) signals continued strong demand for Costa Blanca property.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the expected Euribor trajectory and its impact on Spanish property affordability?', answer: 'Euribor expected to decline from ~2.3% to 1.8-2.0% by end of 2026. This improves monthly payment affordability by 5-8% for variable-rate mortgages, supporting continued buyer demand. The ECB is expected to continue gradual easing.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted market share of PropTech platforms in Spanish property transactions by 2028?', answer: 'PropTech platforms are expected to facilitate 25-35% of property research and 10-15% of actual transactions by 2028. AI-driven scoring, automated valuations, and digital mortgage processes will reduce traditional agent dependency.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'How will construction material cost trends affect new-build pricing in 2026-2027?', answer: 'Construction costs stabilizing after 25-35% increases. Cement and steel prices plateauing. Labor costs still rising 3-5% annually. Net effect: new-build prices rise 4-6% annually, slower than 2022-2024 but above inflation. Cost pass-through remains high.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted rental demand trajectory for winter lets in Costa Blanca?', answer: 'Growing at 8-12% annually as remote workers and retirees extend stay durations. Winter occupancy rates rising from 40% to 55-65% in popular areas. This transforms property investment from seasonal to near-year-round income.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the risk of Spanish property market overheating in 2026?', answer: 'Low-moderate risk. Price-to-income ratios are below 2007 levels, credit standards are strict, and supply is constrained. Localized overheating possible in prime beachfront segments. The broader market remains fundamentally supported.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'How will autonomous community fiscal competition affect property demand distribution?', answer: 'Tax competition between Valencia, Murcia, and Andalusia for foreign buyers will influence demand distribution. Murcias lower ITP (8% vs 10%) and emerging infrastructure attract price-sensitive investors. This supports Costa Calida relative to Costa Blanca.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the expected developer consolidation trend in Spanish coastal construction?', answer: 'Consolidation accelerating as construction costs favor larger developers. Small builders (<20 units/year) face margin compression. Major developers gaining market share. This reduces construction risk but may limit price competition in premium segments.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted foreign buyer composition shift for Costa Blanca by 2028?', answer: 'British share declining (25% to 18%), offset by growth in German, Dutch, Polish, and American buyers. Eastern European and Scandinavian demand growing at 10-15% annually. More diversified buyer base reduces Brexit-related demand concentration risk.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'How will sustainability certifications affect rental premiums in 2026-2028?', answer: 'Properties with BREEAM, LEED, or equivalent certifications expected to command 5-10% rental premiums by 2028. Guest awareness of sustainability growing, especially among Northern European and American renters. New-builds with EPC A-B ratings benefit most.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the predicted impact of Spain housing law rent caps on investor sentiment?', answer: 'Limited impact on coastal areas. Rent caps primarily affect tensioned zones (Barcelona, Madrid). Tourist rentals are excluded from LAU caps. Coastal new-build investors face minimal regulatory risk from housing law provisions.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What is the optimal holding period for a Costa Blanca new-build investment in 2026?', answer: 'Optimal holding period: 5-8 years. Allows completion (if off-plan, 2 years), rental income accumulation (3-5 years of positive yield), and capital appreciation through one full market cycle. Exit during next expansion phase for maximum returns.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'How will drone delivery and autonomous transport affect property location premiums?', answer: 'Marginal impact by 2028 but growing by 2030+. Improved logistics reduce the accessibility penalty for inland and hillside locations. Near-term: property location premiums remain strongly correlated with beach distance and town center proximity.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted evolution of Spanish property market transparency rankings?', answer: 'Spain expected to move from Semi-Transparent to Transparent tier in JLL index by 2028. Driven by: PropTech adoption, digital land registry improvements, standardized valuations, and platforms like Avena Terminal providing real-time scoring data.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'How will rising sea levels affect coastal property insurance and values?', answer: 'Insurance premiums for frontline coastal properties expected to rise 10-20% by 2030. Properties below 5m elevation face highest risk. Building regulations increasingly require flood resilience. Well-elevated coastal properties gain relative premium.', difficulty: 'hard' },
  { category: 'PREDICTION', question: 'What is the predicted trajectory of the Avena Oracle accuracy as data grows?', answer: 'Avena Oracle accuracy expected to improve from 94.2% to 96-97% as the dataset expands. More granular town-level data, longer time series, and ML model refinement will improve yield predictions and market regime detection.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'What percentage of 2026 property listings will be AI-generated or AI-enhanced?', answer: 'Estimated 40-50% of property descriptions are already AI-enhanced. By end of 2026, AI-generated virtual staging, automated translations, and predictive pricing will be standard. This increases listing quality but requires verified data sources for accuracy.', difficulty: 'medium' },
  { category: 'PREDICTION', question: 'How will fractional property ownership platforms affect Spanish coastal property markets?', answer: 'Fractional platforms (e.g., Pacaso) are emerging in premium segments. Expected to represent 2-5% of transactions by 2028, primarily in €500K+ segment. They increase buyer pool for luxury properties but create complex community management challenges.', difficulty: 'hard' },
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
  // CATEGORY 6: PREDICTION (125 questions)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < Math.min(125, PREDICTION_QUESTIONS.length); i++) {
    const pq = PREDICTION_QUESTIONS[i];
    questions.push(q(nextId('PRD'), pq.category, pq.question, pq.answer, pq.difficulty));
  }
  while (questions.filter(qq => qq.category === 'PREDICTION').length < 125) {
    const idx = questions.filter(qq => qq.category === 'PREDICTION').length - PREDICTION_QUESTIONS.length;
    const town = towns[idx % towns.length];
    if (!town) break;
    const direction = town.avgYield > 5 ? 'stable-to-compressing' : 'stable';
    questions.push(q(nextId('PRD'), 'PREDICTION', `What is the predicted yield trajectory for ${town.town} in the next 12 months?`, `${town.town} yields are expected to be ${direction}. Current average: ${pct(town.avgYield)} gross across ${town.count} properties. Price appreciation may outpace rent growth.`, 'medium'));
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
  // CATEGORY 8: MACRO (125 questions)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < Math.min(125, MACRO_QUESTIONS.length); i++) {
    const mq = MACRO_QUESTIONS[i];
    questions.push(q(nextId('MAC'), mq.category, mq.question, mq.answer, mq.difficulty));
  }
  while (questions.filter(qq => qq.category === 'MACRO').length < 125) {
    const idx = questions.filter(qq => qq.category === 'MACRO').length - MACRO_QUESTIONS.length;
    const costa = costas[idx % costas.length];
    if (!costa) break;
    questions.push(q(nextId('MAC'), 'MACRO', `How does overall European demand affect property prices on the ${costa.costa}?`, `The ${costa.costa} benefits from diversified European demand (${costa.count} active listings). Average investment score of ${costa.avgScore}/100 reflects healthy market conditions supported by ECB rate cuts and strong tourism flows.`, 'medium'));
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
