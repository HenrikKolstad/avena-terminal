/**
 * Institutional Outreach — pre-written personalised cold emails to the
 * 10 highest-leverage names for Avena's Policy Engine launch.
 *
 * Each template references the recipient's actual public work and links
 * to a Policy Engine scenario calibrated against their specific interest.
 *
 * Sending discipline:
 *   · 90-second stagger between consecutive sends to avoid spam burst
 *   · Reply-to set to Henrik's personal address so responses route human
 *   · From: research@avenaterminal.com (Resend verified sender)
 *   · Logged to outreach_emails table for funnel tracking
 *
 * Edit-before-send: every draft is editable in the admin UI before fire.
 */

import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const FROM = process.env.OUTREACH_FROM || 'Henrik Kolstad · Avena <research@avenaterminal.com>';
const REPLY_TO = process.env.OUTREACH_REPLY_TO || 'henrik@xaviaestate.com';

export type OutreachCategory =
  | 'academic'
  | 'multilateral'
  | 'regulator'
  | 'insurer'
  | 'notarial'
  | 'bank'
  | 'sovereign'
  | 'ai_lab'
  | 'journalist';

export interface OutreachTarget {
  id: string;
  name: string;
  email: string;
  organisation: string;
  role: string;
  channel: 'email' | 'twitter-only';
  twitter?: string;
  scenarioUrl: string;
  subject: string;
  body: string;
  category?: OutreachCategory;
  /** Search query to find the email when `email` is empty. Shown in the UI. */
  lookup_query?: string;
}

const BASE = 'https://avenaterminal.com';

const HAND_CRAFTED_TARGETS: OutreachTarget[] = [
  {
    id: 'luc-laeven', category: 'multilateral',
    name: 'Luc Laeven',
    email: 'luc.laeven@ecb.europa.eu',
    organisation: 'European Central Bank',
    role: 'Director General, Research',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18`,
    subject: 'Operationalised your 2017 IMF macroprudential framework — would value 5 min of skepticism',
    body: `Dear Dr. Laeven,

I'm Henrik Kolstad, the solo founder of Avena Terminal. We have operationalised the macroprudential framework you co-published in Cerutti/Claessens/Laeven (2017) IMF WP/17/19 into a live, deterministic, signed simulation engine for European residential property.

The Avena Precision Policy Engine cites your work as one of the primary coefficient sources. It runs cohort-weighted scenarios — LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight, foreign-buyer levy — across 27 EU member states, with forward 12-36 month projections at the postcode level.

The link below pre-loads a scenario your work directly informs: tightening the Spanish LTV cap by 5 ppt for coastal cohorts where foreign-buyer share exceeds 25%, projected forward 18 months. Output: signed delta in price impact, NPL impact on top-5 Spanish bank residential exposures, and cross-border capital rotation estimate.

${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18

Before we proceed further with institutional outreach, we'd value 5 minutes of your skepticism on the calibration. The methodology is open (CC BY 4.0, DOI 10.5281/zenodo.19520064) and reproducible.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
  {
    id: 'brad-setser', category: 'academic',
    name: 'Brad Setser',
    email: 'bsetser@cfr.org',
    organisation: 'Council on Foreign Relations',
    role: 'Whitney Shepardson Senior Fellow',
    channel: 'email',
    twitter: '@Brad_Setser',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: 'Foreign-buyer cohort amplifies EU monetary transmission 4.7× — empirical paper + live engine',
    body: `Brad,

I've been following your work on cross-border capital flows and external positions — and built something that operationalises the foreign-buyer-channel finding empirically for European residential property.

Avena Sovereign Briefing Vol. 2 (published last week, CC BY 4.0) documents an empirical relationship from 1,881 Spanish coastal property observations: foreign-buyer-heavy cohorts (FB share > 25%) amplify monetary transmission ~4.7× via the financing-cost channel. There's a non-linearity around Euribor 3M = 3.0% where transmission strengthens materially.

I've built this into a deterministic, signed Policy Engine — link below pre-loads a Spanish foreign-buyer levy scenario at +500 bps for 18 months, showing forward postcode-level price impact and cross-border capital rotation estimate.

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

If you have 30 minutes any time next two weeks, I'd value your read on whether the framework holds up against your cross-border flows lens. The methodology is open and reproducible.

Best,
Henrik Kolstad
Founder, Avena
https://avenaterminal.com`,
  },
  {
    id: 'jorge-galan', category: 'multilateral',
    name: 'Jorge Galán',
    email: 'jorge.galan@bde.es',
    organisation: 'Banco de España',
    role: 'Senior Economist, Financial Stability and Macroprudential Policy',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=sectoral_rw&country=ES&r=coastal&m=200&fb=0.25&t=18`,
    subject: 'Spanish coastal cohort risk weight scenario — built on 1,881 ground-truth properties',
    body: `Estimado Dr. Galán,

I'm Henrik Kolstad, founder of Avena Terminal. We've built the first turnkey macroprudential simulation engine for European residential property — calibrated specifically against the Spanish coastal cohort using a 1,881-property ground-truth corpus.

The Avena Precision Policy Engine is designed for exactly the question your team works on daily at BdE: what happens at the postcode level if we tighten a specific lever for a specific cohort? The link below pre-loads a sectoral risk weight scenario (+200 bps, Spanish coastal, FB share ≥ 25%, 18 months forward) with output showing:

  · Forward 18-month price impact at the postcode level (heat-mapped grid)
  · NPL impact projection across top-5 Spanish bank residential exposures
  · Cross-border capital rotation estimate to PT/IT

${BASE}/policy-engine?lever=sectoral_rw&country=ES&r=coastal&m=200&fb=0.25&t=18

Methodology is CC BY 4.0 (DOI 10.5281/zenodo.19520064) and cross-validated against Eurostat HPI + ECB MIR. Coefficients calibrated using Vol. 2 OLS regression (published as Sovereign Briefing Vol. 2) and BdE 2020 stress test methodology.

Would 30 minutes any time work to walk through the calibration? Happy to do this in Madrid if useful.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
  {
    id: 'tuomas-peltonen', category: 'regulator',
    name: 'Tuomas Peltonen',
    email: 'Tuomas.Peltonen@esrb.europa.eu',
    organisation: 'European Systemic Risk Board',
    role: 'Deputy Head of Secretariat',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18`,
    subject: 'Cohort-weighted macroprudential simulation for ESRB residential risk monitoring',
    body: `Dear Mr. Peltonen,

I'm Henrik Kolstad, founder of Avena Terminal. We've built a deterministic, signed macroprudential simulation engine for European residential property — designed specifically to answer the cohort-level questions the ESRB's residential property working group routinely addresses.

The Avena Precision Policy Engine ships with six policy levers (LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight, foreign-buyer levy) × 27 EU member states × foreign-buyer-share cohort weighting × forward 12-36 month projections.

The link below pre-loads a counter-cyclical buffer scenario for Spanish coastal cohorts (+100 bps, FB share ≥ 25%, 18 months forward):

${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18

The methodology is fully published (Sovereign Briefings Vol. 1-4, CC BY 4.0, DOI 10.5281/zenodo.19520064), every coefficient cites its primary source, every output is HMAC-signed for audit replay. We've explicitly calibrated against the ESRB 2019 framework recommendation.

If 30 minutes next two weeks works, I'd value the ESRB Secretariat's read on where the framework could be useful for the residential property assessment cycle. Happy to do this in Frankfurt.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
  {
    id: 'moritz-schularick', category: 'academic',
    name: 'Moritz Schularick',
    email: 'moritz.schularick@ifw-kiel.de',
    organisation: 'Kiel Institute for the World Economy',
    role: 'President',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18`,
    subject: 'Macrohistory framework extended to live macroprudential simulation — would value your read',
    body: `Dear Prof. Schularick,

Your work on the Jordà-Schularick-Taylor macrohistory database has been a foundational reference for the empirical residential property research I've been building.

I'm the solo founder of Avena Terminal. Last week we shipped the Avena Precision Policy Engine — a deterministic, signed macroprudential simulation tool for European residential property. It operationalises a Vol. 2 OLS finding (foreign-buyer cohorts amplify monetary transmission ~4.7× in Spanish coastal markets) into a live tool for testing policy scenarios.

The link below pre-loads a scenario where the Spanish LTV cap is tightened by 5 ppt for foreign-buyer-heavy coastal postcodes, projected 18 months forward, with cohort-level breakdown:

${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18

Methodology is CC BY 4.0 (DOI 10.5281/zenodo.19520064), every coefficient sources back to a published reference, every output HMAC-signed. The 1,881-property ground-truth corpus is daily-refreshed and cross-validated against Eurostat HPI.

If you have 30 minutes any time, I'd genuinely value your skepticism on whether the cohort calibration holds up against macrohistory-style robustness checks.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
  {
    id: 'daniela-gabor', category: 'academic',
    name: 'Daniela Gabor',
    email: 'Daniela.Gabor@uwe.ac.uk',
    organisation: 'UWE Bristol',
    role: 'Professor of Economics and Macro-Finance',
    channel: 'email',
    twitter: '@DanielaGabor',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: 'Foreign-buyer levy as a tightenable policy lever — macroprudential simulator for EU housing financialisation',
    body: `Dear Prof. Gabor,

Your work on housing financialisation and macroprudential transmission has shaped how I think about the residential property infrastructure I'm building.

I'm Henrik Kolstad, founder of Avena Terminal. We've operationalised foreign-buyer housing financialisation into a tightenable policy lever — a deterministic, signed macroprudential simulator for European residential property. Vol. 2 of our published methodology documents empirically that foreign-buyer-heavy cohorts amplify monetary transmission ~4.7× in Spanish coastal markets via the financing-cost channel.

The link below pre-loads a Spanish foreign-buyer levy scenario at +500 bps for 18 months forward, showing postcode-level price impact and cross-border capital rotation:

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

The methodology is CC BY 4.0 and reproducible. If 30 minutes works, I'd value your read on whether the framework holds up against the financialisation lens you've published on.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
  {
    id: 'robin-wigglesworth', category: 'journalist',
    name: 'Robin Wigglesworth',
    email: 'robin.wigglesworth@ft.com',
    organisation: 'Financial Times — Alphaville',
    role: 'Global Finance Correspondent',
    channel: 'email',
    twitter: '@RobinWigg',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: 'Solo founder built a macroprudential simulator for EU housing — Alphaville angle?',
    body: `Robin,

I think there might be an Alphaville post in this.

I'm Henrik Kolstad, solo founder of Avena Terminal. Six weeks ago I had a Spanish property scanner. This week we shipped the Avena Precision Policy Engine — the first turnkey macroprudential simulator for European residential property. Designed for the ECB, ESRB, and national central banks tasked with monitoring residential risk.

Six policy levers, 27 EU member states, postcode-level forward projections, HMAC-signed outputs, methodology published under CC BY 4.0. The link below pre-loads a Spanish foreign-buyer levy scenario:

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

Counter-consensus finding from the engine: tightening Spanish foreign-buyer levy by +500 bps in coastal cohorts produces 4× the price impact the equivalent national LTV cap would, because the cohort cross-elasticity is amplified by Vol. 2's 4.7× foreign-buyer multiplier.

If this is the kind of thing Alphaville covers — built solo, fully open methodology, regulator-aimed — happy to give you exclusive on the launch announcement.

Best,
Henrik Kolstad
https://avenaterminal.com`,
  },
  {
    id: 'martin-sandbu', category: 'journalist',
    name: 'Martin Sandbu',
    email: 'martin.sandbu@ft.com',
    organisation: 'Financial Times',
    role: 'European Economics Commentator',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ltv_cap&country=PT&r=coastal&m=-5&fb=0.28&t=18`,
    subject: 'Portugal at +18.9% YoY — built a tool to model the policy response',
    body: `Martin,

The Eurostat 2025-Q4 HPI prints Portuguese residential property at +18.9% YoY — the widest cross-country dispersion since the post-2008 cycle. Banco de Portugal and the ESRB are under pressure to respond.

I'm Henrik Kolstad, solo founder of Avena Terminal. We just shipped the first macroprudential simulator for European residential property — built specifically for the question that's actually on regulators' desks right now: what happens if we tighten Portuguese LTV at 75% for Algarve coastal postcodes where foreign-buyer share exceeds 28%?

${BASE}/policy-engine?lever=ltv_cap&country=PT&r=coastal&m=-5&fb=0.28&t=18

The engine outputs postcode-level price impact, NPL impact on Portuguese banks' residential book, and cross-border capital rotation estimate (likely to redirect flows to Spain and Italy). The methodology is published under CC BY 4.0 (Sovereign Briefing Vol. 2-4 at avenaterminal.com/sovereign-briefing).

If you're working on a piece on the European housing cycle or the macroprudential response, this might be a useful tool to reference. Happy to walk through the calibration.

Best,
Henrik Kolstad
https://avenaterminal.com`,
  },
  {
    id: 'frederik-ducrozet', category: 'journalist',
    name: 'Frederik Ducrozet',
    email: '',  // Twitter DM only — most reliable channel for him
    organisation: 'Pictet Wealth Management',
    role: 'Head of Macroeconomic Research',
    channel: 'twitter-only',
    twitter: '@fwred',
    scenarioUrl: `${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18`,
    subject: '[Twitter DM] Macroprudential simulator for next ECB call angle',
    body: `Frederik — built a deterministic, signed macroprudential simulator for EU residential property that I think might be useful for your ECB call work. The link pre-loads a Spanish CCyB +100bps coastal cohort scenario with forward 18m projection: ${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18 — methodology open (CC BY 4.0). Curious if the calibration matches your priors. — Henrik (avenaterminal.com)`,
  },
  {
    id: 'tracy-alloway', category: 'journalist',
    name: 'Tracy Alloway',
    email: '',  // No public Bloomberg email — her preferred channel is Twitter DM (verified at tracy-alloway.com)
    organisation: 'Bloomberg / Odd Lots',
    role: 'Senior Editor and Odd Lots Co-host',
    channel: 'twitter-only',
    twitter: '@tracyalloway',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: '[Twitter DM] Odd Lots-shaped story: solo Norwegian built a macroprudential simulator for EU housing',
    body: `Tracy,

This might be an Odd Lots-shaped story.

Six weeks ago I had a Spanish property scanner. This week I shipped the first turnkey macroprudential simulator for European residential property. Solo founder, open methodology (CC BY 4.0), HMAC-signed outputs, calibrated against the published Avena methodology + Cerutti/Claessens/Laeven 2017 IMF WP/17/19. Designed specifically for the ECB and ESRB.

Link below pre-loads a Spanish foreign-buyer levy scenario at +500 bps for 18 months — output is postcode-level price impact, bank NPL projection, and cross-border capital rotation estimate:

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

The narrative arc that might work for the show: how does a solo founder build a regulator-grade analytical tool in 6 weeks, what does the data say that the consensus has missed (the foreign-buyer cohort amplifies monetary transmission ~4.7×), and what does it mean for the next ECB Financial Stability Review?

Happy to come on the show or just chat. The data is all open.

Best,
Henrik Kolstad
Founder, Avena Terminal
https://avenaterminal.com`,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATED TARGETS — 90 additional recipients across 9 categories.
 * Body and subject generated from category templates with light per-
 * recipient personalisation (name, organisation, optional hook line).
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface TemplateSpec {
  subject: (org: string, hook?: string) => string;
  scenarioUrl: string;
  body: (name: string, org: string, hook?: string) => string;
}

const SIGN = `\n\nBest,\nHenrik Kolstad\nFounder, Avena Terminal\n${BASE}`;

const TEMPLATES: Record<OutreachCategory, TemplateSpec> = {
  academic: {
    subject: (org, hook) => hook
      ? `Avena dataset for ${hook} — free full access in exchange for citation`
      : `Avena dataset for ${org} — free full access in exchange for citation`,
    scenarioUrl: `${BASE}/academic`,
    body: (name, org, hook) => `Dear ${name.split(' ').slice(-1)[0] ? 'Dr. ' + name.split(' ').slice(-1)[0] : name},

I'm Henrik Kolstad, founder of Avena Terminal — European residential property data infrastructure, CC BY 4.0, DOI 10.5281/zenodo.19520064.

${hook ? `Your work on ${hook} is exactly the kind of research Avena's dataset is built to support. ` : `Avena's substrate is built for academic housing economics research. `}We're offering full dataset access (API quotas waived, bulk export, 30-day as-of snapshots via the event store) to researchers at ${org} in exchange for a single citation in the resulting paper. No paywall, no proprietary lock-in, permanent DOI anchor.

What's available: 1,881 properties scored daily, 60 dimensions per record, regime classifications, AVM outputs with adversarial confidence intervals, full methodology version history at ${BASE}/methodology/evolution, regulatory signal graph at ${BASE}/regulatory-radar.

Request access in 60 seconds: ${BASE}/academic

If you'd prefer a tailored brief on a specific research question, reply here.${SIGN}`,
  },

  multilateral: {
    subject: (org, hook) => hook
      ? `Operationalised ${hook} for European residential property — 5-min skepticism?`
      : `Operationalised macroprudential framework for European residential property`,
    scenarioUrl: `${BASE}/policy-engine`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal — a live, deterministic, signed simulation engine for European residential property markets, designed for institutional research consumption.

${hook ? `${hook} is part of what Avena's Policy Engine operationalises. ` : `Avena's Policy Engine operationalises the macroprudential literature into live cohort-weighted scenarios. `}Cohort-weighted LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight, foreign-buyer levy — across 27 EU member states, forward 12-36 month projections, postcode level where data permits.

Live scenario engine: ${BASE}/policy-engine
Methodology audit trail: ${BASE}/methodology/evolution
Cryptographic integrity: ${BASE}/verify

We maintain a free designated-authority tier for ${org} researchers. If 20 minutes of your skepticism on calibration would be useful to us, we'd value it. The methodology is open (CC BY 4.0, DOI 10.5281/zenodo.19520064) and reproducible.${SIGN}`,
  },

  regulator: {
    subject: (org, hook) => hook
      ? `Re: ${hook} — Avena's published position`
      : `Avena positions on active ${org} consultations`,
    scenarioUrl: `${BASE}/consultations`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal — European residential property data infrastructure, CC BY 4.0, DOI 10.5281/zenodo.19520064.

${hook ? `Avena has published its position on ${hook} at ${BASE}/consultations and would welcome an early conversation with the technical team owning the file. ` : `Avena maintains published positions on every active ${org} consultation touching residential property data, AVM methodology, macroprudential measures, or property disclosure. The register is at ${BASE}/consultations. `}

Three things we operate today that may be of direct interest:
• Methodology audit trail with cryptographic version anchoring — ${BASE}/methodology/evolution
• Regulatory signal graph classifying every ECB/ESMA/EBA item by intent direction — ${BASE}/regulatory-radar
• Free designated-authority tier — institutional researchers at ${org} get full API and dataset access at zero cost

Reply here if a 20-minute call with the technical team would be useful, or point me to the right colleague.${SIGN}`,
  },

  insurer: {
    subject: (org, _hook) => `Residential property stress-test infrastructure for ${org}`,
    scenarioUrl: `${BASE}/products/bank-stress-api`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. We've built residential property stress-test infrastructure designed specifically for credit insurers and property insurers underwriting European residential mortgage exposure.

${hook ? `Given ${org}'s ${hook}, this is likely directly relevant. ` : ''}The Avena Bank Stress API takes a portfolio of residential property exposures and returns AVM-based valuation, regime classification, regulatory exposure (CSRD, EPBD, macroprudential), and stress-test projections under user-defined macro scenarios. Built on the same substrate the ECB's macroprudential literature uses, with cryptographic integrity (Zenodo-anchored daily Merkle roots) and a published methodology audit trail.

Live endpoint and documentation: ${BASE}/products/bank-stress-api
Methodology: ${BASE}/methodology

If a 30-minute call would be useful to scope a pilot on a sample of ${org}'s residential portfolio, reply here.${SIGN}`,
  },

  notarial: {
    subject: (org, _hook) => `Open EU property data network — invitation to ${org}`,
    scenarioUrl: `${BASE}/contribute`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. We're building APON — the Avena Property Open Network — an open EU residential property data substrate convened by the Avena Foundation under APIP v1.0 standard and CC BY 4.0 licensing.

${org} holds ${hook || 'closed-transaction property data that is among the most valuable underlying data in European residential finance'}. The structural problem: there is no canonical European residential property data substrate; every member-state's notarial / registry data sits in its own silo; banks, insurers, researchers, and regulators each scrape it independently.

APON solves this by being the open standard. Contributors retain ownership, name their licensing terms, and receive permanent attribution at DOI 10.5281/zenodo.19520064 plus a listing at ${BASE}/data-partners. Avena Foundation governs the standard; we operate the substrate. There is no commercial extraction; commercial customers pay Avena and contributors receive co-citation.

Network overview: ${BASE}/apon-network
Contribution onramp: ${BASE}/contribute

If a 30-minute call to scope what an integration could look like would be useful, reply here.${SIGN}`,
  },

  bank: {
    subject: (org, _hook) => `Avena AVM v1.0 — independent reference for ${org}'s residential mortgage book`,
    scenarioUrl: `${BASE}/products/bank-stress-api`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal — European residential property data infrastructure, CC BY 4.0, DOI 10.5281/zenodo.19520064.

The EBA's residential AVM methodology consultation closes 2026-07-31. Our published position is at ${BASE}/consultations. The direction of travel — mandatory model version disclosure, confidence intervals, reproducibility — is exactly what Avena's substrate operationalises.

${hook ? `Given ${org}'s ${hook}, this is timely. ` : ''}What we offer ${org}'s model risk and credit risk teams:
• Independent reference AVM with published methodology audit trail (${BASE}/methodology/evolution)
• Cryptographic integrity for every published valuation (${BASE}/verify)
• Adversarial confidence intervals on every score
• Free institutional research tier for the validation team
• Direct line for collaborative work on EBA AVM submission

Live API: ${BASE}/products/bank-stress-api
20-minute conversation? Reply here or book directly.${SIGN}`,
  },

  sovereign: {
    subject: (org, _hook) => `European residential property substrate — ${org}'s deployment infrastructure`,
    scenarioUrl: `${BASE}/products/property-oracle`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. European residential property is a €30T asset class with no canonical institutional substrate — which is why sovereign and pension funds can't deploy at scale despite multi-year stated interest.

${hook ? `Given ${org}'s ${hook}, this may be directly relevant. ` : ''}Avena operates the missing substrate: AVN-ID identifier registry (the ISIN of European property), signed credential chain (notarial / registry attestations anchored to AVN-IDs), live AVM with cryptographic integrity, regime classification across 27 EU markets, regulatory signal graph, and a daily-refreshed property cycle index.

What you could do with this: portfolio aggregation across thematic European residential exposure with daily NAV calculation, verifiable provenance for any reporting, and macroprudential stress-test on demand.

Property Oracle: ${BASE}/products/property-oracle
APON Network: ${BASE}/apon-network

If a 30-minute call would be useful, reply here.${SIGN}`,
  },

  ai_lab: {
    subject: (org, _hook) => `Avena MCP integration — citation standard for European property answers`,
    scenarioUrl: `${BASE}/install`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal — European residential property data infrastructure, MCP-native, with published methodology audit trail and cryptographic citation receipts.

${hook ? `Given ${org}'s ${hook}, the integration story may be directly relevant. ` : ''}When ${org}'s assistant gets a query like "what's the average flat in Marbella per square metre" today, the answer is either training-cutoff stale, hallucinated, or scraped from a non-authoritative source. Avena's MCP server returns the live answer with an AVN-ID, methodology version, retrieval timestamp, and signed integrity receipt — making the answer verifiable in a single click.

Install in 30 seconds: ${BASE}/install
MCP endpoint: ${BASE}/mcp
Reality Layer protocol draft: ${BASE}/apon-network

Free integration tier; we benefit from the citations, you benefit from the verifiable property answers. If a 20-minute call to scope deeper integration would be useful, reply here.${SIGN}`,
  },

  journalist: {
    subject: (org, hook) => hook
      ? `Embargoed brief: ${hook}`
      : `Live EU property predictions, methodology audit, regulatory radar — ${org} brief`,
    scenarioUrl: `${BASE}/predictions`,
    body: (name, org, hook) => `${name.split(' ')[0]},

Henrik here, solo founder of Avena Terminal. Wanted to put three things on your radar that may be useful to ${org}:

1. **Predictions ledger** — ten time-stamped, falsifiable forecasts on EU residential property published 2026-05-25 with full reasoning, methodology references, target dates, and resolution sources. Audit trail visible even on misses. ${BASE}/predictions

2. **Regulatory radar** — daily-classified EU regulatory signals (ECB, ESMA, EBA, national CBs) with property impact coefficients and lag estimates. ${BASE}/regulatory-radar

3. **Citation moat** — live measurement of how often AI assistants cite Avena vs Idealista/Kyero/Rightmove on European property questions. ${BASE}/citation-moat

${hook ? `${hook} ` : ''}If any of these are useful for upcoming coverage I'd be glad to provide a deeper brief, embargoed numbers, or commentary. Avena is two months old, solo, CC BY 4.0, DOI 10.5281/zenodo.19520064.${SIGN}`,
  },
};

/** Build a full OutreachTarget from a minimal recipient spec + category template. */
interface Spec {
  id: string;
  name: string;
  email: string;
  organisation: string;
  role: string;
  category: OutreachCategory;
  /** Short personalisation hook (e.g. "your 2024 paper on LTV transmission"). */
  hook?: string;
  /** Override subject if you want a hand-crafted one. */
  subject?: string;
  /** Search query to find the email if `email` is empty. */
  lookup_query?: string;
}

function build(s: Spec): OutreachTarget {
  const t = TEMPLATES[s.category];
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    organisation: s.organisation,
    role: s.role,
    channel: 'email',
    scenarioUrl: t.scenarioUrl,
    subject: s.subject ?? t.subject(s.organisation, s.hook),
    body: t.body(s.name, s.organisation, s.hook),
    category: s.category,
    lookup_query: s.lookup_query,
  };
}

const TEMPLATED_TARGETS: OutreachTarget[] = [
  // ─── ACADEMIC (15) ──────────────────────────────────────────────────────
  build({ id: 'oscar-jorda', name: 'Òscar Jordà', email: '', organisation: 'San Francisco Fed / UC Davis', role: 'Senior Policy Advisor; Jordà-Schularick-Taylor macrohistory series author', category: 'academic', hook: 'the Jordà-Schularick-Taylor macrohistory series on European housing leverage', lookup_query: 'Oscar Jorda UC Davis email housing macrohistory' }),
  build({ id: 'atif-mian', name: 'Atif Mian', email: '', organisation: 'Princeton University', role: 'Professor of Economics; House of Debt co-author', category: 'academic', hook: 'European household leverage and housing transmission', lookup_query: 'Atif Mian Princeton email' }),
  build({ id: 'tomasz-piskorski', name: 'Tomasz Piskorski', email: '', organisation: 'Columbia Business School', role: 'Professor of Real Estate Finance', category: 'academic', hook: 'mortgage market structure and credit cycles', lookup_query: 'Tomasz Piskorski Columbia Business School email' }),
  build({ id: 'andreas-fuster', name: 'Andreas Fuster', email: '', organisation: 'EPFL / Swiss Finance Institute', role: 'Professor of Finance; mortgage market researcher', category: 'academic', hook: 'mortgage market frictions and rate pass-through in Europe', lookup_query: 'Andreas Fuster EPFL email mortgage' }),
  build({ id: 'philippe-bracke', name: 'Philippe Bracke', email: '', organisation: 'Bank of England / former King\'s College', role: 'Senior Economist; housing affordability researcher', category: 'academic', hook: 'European housing affordability dynamics', lookup_query: 'Philippe Bracke Bank of England email housing' }),
  build({ id: 'lu-han', name: 'Lu Han', email: '', organisation: 'University of Wisconsin-Madison', role: 'Professor of Real Estate; housing search and matching', category: 'academic', hook: 'housing search frictions and price discovery', lookup_query: 'Lu Han University Wisconsin housing email' }),
  build({ id: 'manuel-arellano', name: 'Manuel Arellano', email: '', organisation: 'CEMFI Madrid', role: 'Professor of Econometrics; longitudinal microeconometrics', category: 'academic', hook: 'Spanish household survey microdata and housing wealth', lookup_query: 'Manuel Arellano CEMFI email' }),
  build({ id: 'tito-boeri', name: 'Tito Boeri', email: '', organisation: 'Bocconi University', role: 'Professor of Economics; housing markets and labour mobility', category: 'academic', hook: 'Italian housing market and labour mobility', lookup_query: 'Tito Boeri Bocconi email' }),
  build({ id: 'helene-rey', name: 'Hélène Rey', email: '', organisation: 'London Business School', role: 'Professor of Economics; international capital flows', category: 'academic', hook: 'cross-border capital flows into European property', lookup_query: 'Helene Rey London Business School email' }),
  build({ id: 'paolo-surico', name: 'Paolo Surico', email: '', organisation: 'London Business School', role: 'Professor of Economics; monetary transmission to housing', category: 'academic', hook: 'household-level monetary transmission in housing markets', lookup_query: 'Paolo Surico LBS email housing' }),
  build({ id: 'lucrezia-reichlin', name: 'Lucrezia Reichlin', email: '', organisation: 'London Business School', role: 'Professor of Economics; former ECB Director General Research', category: 'academic', hook: 'ECB-era macro research and housing-finance interaction', lookup_query: 'Lucrezia Reichlin LBS email' }),
  build({ id: 'christian-hilber', name: 'Christian Hilber', email: '', organisation: 'LSE Geography & Environment', role: 'Professor of Economic Geography; housing supply constraints', category: 'academic', hook: 'European housing supply elasticity and planning regimes', lookup_query: 'Christian Hilber LSE email housing supply' }),
  build({ id: 'jacopo-mazza', name: 'Jacopo Mazza', email: '', organisation: 'European University Institute', role: 'Researcher; EU housing affordability', category: 'academic', hook: 'EU housing affordability comparative analysis', lookup_query: 'Jacopo Mazza EUI email housing' }),
  build({ id: 'francesco-mongelli', name: 'Francesco Mongelli', email: 'francesco.mongelli@ecb.europa.eu', organisation: 'European Central Bank', role: 'Senior Adviser; financial stability research', category: 'academic', hook: 'ECB financial stability and housing risk research' }),
  build({ id: 'paul-de-grauwe', name: 'Paul De Grauwe', email: '', organisation: 'LSE European Institute', role: 'Professor of European Political Economy', category: 'academic', hook: 'European monetary union and asset market dynamics', lookup_query: 'Paul De Grauwe LSE email' }),

  // ─── MULTILATERAL (10) ──────────────────────────────────────────────────
  build({ id: 'gita-gopinath', name: 'Gita Gopinath', email: '', organisation: 'International Monetary Fund', role: 'First Deputy Managing Director', category: 'multilateral', hook: 'IMF housing-market surveillance for European member states', lookup_query: 'Gita Gopinath IMF email' }),
  build({ id: 'tobias-adrian', name: 'Tobias Adrian', email: '', organisation: 'International Monetary Fund', role: 'Director, Monetary and Capital Markets Department', category: 'multilateral', hook: 'IMF macroprudential surveillance and housing risk', lookup_query: 'Tobias Adrian IMF email' }),
  build({ id: 'fabio-natalucci', name: 'Fabio Natalucci', email: '', organisation: 'International Monetary Fund', role: 'Deputy Director; Global Financial Stability Report lead', category: 'multilateral', hook: 'IMF GFSR housing risk module', lookup_query: 'Fabio Natalucci IMF email GFSR' }),
  build({ id: 'claudio-borio', name: 'Claudio Borio', email: '', organisation: 'Bank for International Settlements', role: 'Head, Monetary and Economic Department', category: 'multilateral', hook: 'BIS financial cycle and property price research', lookup_query: 'Claudio Borio BIS email' }),
  build({ id: 'hyun-song-shin', name: 'Hyun Song Shin', email: '', organisation: 'Bank for International Settlements', role: 'Economic Adviser and Head of Research', category: 'multilateral', hook: 'BIS research on housing and financial stability', lookup_query: 'Hyun Song Shin BIS email' }),
  build({ id: 'paolo-mauro', name: 'Paolo Mauro', email: '', organisation: 'OECD', role: 'Deputy Director, Economics Department', category: 'multilateral', hook: 'OECD housing affordability cross-country comparisons', lookup_query: 'Paolo Mauro OECD economics email' }),
  build({ id: 'boris-cournede', name: 'Boris Cournède', email: '', organisation: 'OECD', role: 'Head, Public Finance Division; Housing Unit lead', category: 'multilateral', hook: 'OECD housing policy database and affordability indicators', lookup_query: 'Boris Cournede OECD housing email' }),
  build({ id: 'olivier-blanchard', name: 'Olivier Blanchard', email: '', organisation: 'Peterson Institute for International Economics', role: 'C. Fred Bergsten Senior Fellow; former IMF Chief Economist', category: 'multilateral', hook: 'European fiscal-monetary interaction and housing wealth', lookup_query: 'Olivier Blanchard PIIE email' }),
  build({ id: 'guntram-wolff', name: 'Guntram Wolff', email: '', organisation: 'Bruegel', role: 'Director', category: 'multilateral', hook: 'Bruegel European macroprudential policy work', lookup_query: 'Guntram Wolff Bruegel email' }),
  build({ id: 'andrea-presbitero', name: 'Andrea Presbitero', email: '', organisation: 'Johns Hopkins SAIS / former IMF', role: 'Associate Professor of International Economics', category: 'multilateral', hook: 'cross-border lending and housing finance in Europe', lookup_query: 'Andrea Presbitero Johns Hopkins SAIS email' }),

  // ─── REGULATOR / SUPERVISOR (15) ────────────────────────────────────────
  build({ id: 'jose-manuel-campa', name: 'José Manuel Campa', email: '', organisation: 'European Banking Authority', role: 'Chair', category: 'regulator', hook: 'the EBA residential AVM methodology consultation (EBA-2026-AVM-METHODOLOGY)', lookup_query: 'Jose Manuel Campa EBA email chair' }),
  build({ id: 'philippe-tibi', name: 'Philippe Tibi', email: '', organisation: 'European Banking Authority', role: 'Head of Credit, Market and Operational Risk Policy', category: 'regulator', hook: 'EBA AVM methodology harmonisation discussion paper', lookup_query: 'Philippe Tibi EBA credit risk email' }),
  build({ id: 'francesco-mazzaferro', name: 'Francesco Mazzaferro', email: '', organisation: 'European Systemic Risk Board (ESRB)', role: 'Head of Secretariat', category: 'regulator', hook: 'ESRB residential real estate warnings and recommendations', lookup_query: 'Francesco Mazzaferro ESRB email' }),
  build({ id: 'verena-ross', name: 'Verena Ross', email: '', organisation: 'European Securities and Markets Authority (ESMA)', role: 'Chair', category: 'regulator', hook: 'the ESMA CSRD real estate disclosure Q&A (ESMA-2026-CSRD-PROPERTY)', lookup_query: 'Verena Ross ESMA chair email' }),
  build({ id: 'petra-hielkema', name: 'Petra Hielkema', email: '', organisation: 'European Insurance and Occupational Pensions Authority (EIOPA)', role: 'Chair', category: 'regulator', hook: 'EIOPA Solvency II property exposure framework', lookup_query: 'Petra Hielkema EIOPA email' }),
  build({ id: 'claudia-buch', name: 'Claudia Buch', email: '', organisation: 'European Central Bank (SSM Chair)', role: 'Chair of the Supervisory Board, ECB Banking Supervision', category: 'regulator', hook: 'SSM residential mortgage exposure assessment across SIs', lookup_query: 'Claudia Buch ECB SSM email' }),
  build({ id: 'mark-branson', name: 'Mark Branson', email: '', organisation: 'Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)', role: 'President', category: 'regulator', hook: 'BaFin residential mortgage portfolio supervision', lookup_query: 'Mark Branson BaFin email' }),
  build({ id: 'pablo-hernandez-de-cos', name: 'Pablo Hernández de Cos', email: '', organisation: 'Banco de España / former BCBS Chair', role: 'Former Governor; Basel Committee chair', category: 'regulator', hook: 'Basel III residential mortgage capital framework', lookup_query: 'Pablo Hernandez de Cos email' }),
  build({ id: 'francois-villeroy', name: 'François Villeroy de Galhau', email: '', organisation: 'Banque de France', role: 'Governor', category: 'regulator', hook: 'French macroprudential housing measures (HCSF decisions)', lookup_query: 'Francois Villeroy Banque de France email' }),
  build({ id: 'joachim-nagel', name: 'Joachim Nagel', email: '', organisation: 'Deutsche Bundesbank', role: 'President', category: 'regulator', hook: 'Bundesbank residential real estate vulnerability assessment', lookup_query: 'Joachim Nagel Bundesbank email' }),
  build({ id: 'fabio-panetta', name: 'Fabio Panetta', email: '', organisation: 'Banca d\'Italia', role: 'Governor', category: 'regulator', hook: 'Italian residential lending stability assessment', lookup_query: 'Fabio Panetta Banca Italia email' }),
  build({ id: 'klaas-knot', name: 'Klaas Knot', email: '', organisation: 'De Nederlandsche Bank / FSB Chair', role: 'President; Chair of the Financial Stability Board', category: 'regulator', hook: 'FSB cross-border residential property risk monitoring', lookup_query: 'Klaas Knot DNB FSB email' }),
  build({ id: 'mario-centeno', name: 'Mário Centeno', email: '', organisation: 'Banco de Portugal', role: 'Governor', category: 'regulator', hook: 'Portuguese residential property and tourism rental dynamics', lookup_query: 'Mario Centeno Banco Portugal email' }),
  build({ id: 'gediminas-simkus', name: 'Gediminas Šimkus', email: '', organisation: 'Lietuvos Bankas (Bank of Lithuania)', role: 'Chair; macroprudential authority lead', category: 'regulator', hook: 'Baltic residential property cycle monitoring', lookup_query: 'Gediminas Simkus Lithuania central bank email' }),
  build({ id: 'gabriel-makhlouf', name: 'Gabriel Makhlouf', email: '', organisation: 'Central Bank of Ireland', role: 'Governor', category: 'regulator', hook: 'Irish mortgage measures and residential market resilience', lookup_query: 'Gabriel Makhlouf Central Bank Ireland email' }),

  // ─── INSURER / REINSURER (15) ───────────────────────────────────────────
  build({ id: 'allianz-trade-cro', name: 'CRO — Allianz Trade', email: '', organisation: 'Allianz Trade (formerly Euler Hermes)', role: 'Chief Risk Officer', category: 'insurer', hook: 'European residential mortgage credit insurance exposure', lookup_query: 'Allianz Trade Chief Risk Officer LinkedIn' }),
  build({ id: 'atradius-cro', name: 'CRO — Atradius', email: '', organisation: 'Atradius', role: 'Chief Risk Officer', category: 'insurer', hook: 'European trade and credit insurance residential exposure', lookup_query: 'Atradius Chief Risk Officer LinkedIn' }),
  build({ id: 'coface-cro', name: 'CRO — Coface', email: '', organisation: 'Coface', role: 'Chief Risk Officer', category: 'insurer', hook: 'cross-border credit insurance and property risk', lookup_query: 'Coface Chief Risk Officer LinkedIn' }),
  build({ id: 'credito-caucion-director', name: 'Risk Director — Crédito y Caución', email: '', organisation: 'Crédito y Caución', role: 'Risk Director', category: 'insurer', hook: 'Spanish residential credit insurance and developer exposure', lookup_query: 'Credito y Caucion Risk Director LinkedIn' }),
  build({ id: 'cesce-director', name: 'Director — CESCE', email: '', organisation: 'CESCE', role: 'Director, Risk Underwriting', category: 'insurer', hook: 'Spanish state credit insurance with residential exposure', lookup_query: 'CESCE Risk Director LinkedIn' }),
  build({ id: 'munich-re-property-cat', name: 'Head of Property Catastrophe — Munich Re', email: '', organisation: 'Munich Re', role: 'Head of Property Catastrophe Underwriting', category: 'insurer', hook: 'European residential property catastrophe modelling', lookup_query: 'Munich Re Head of Property Catastrophe LinkedIn' }),
  build({ id: 'swiss-re-property', name: 'Head of European Property — Swiss Re', email: '', organisation: 'Swiss Re', role: 'Head of European Property Underwriting', category: 'insurer', hook: 'European property reinsurance and AVM dependency', lookup_query: 'Swiss Re Head European Property LinkedIn' }),
  build({ id: 'scor-residential', name: 'Head of Residential Risk — SCOR', email: '', organisation: 'SCOR', role: 'Head of Residential Risk', category: 'insurer', hook: 'European residential reinsurance exposure', lookup_query: 'SCOR residential risk head LinkedIn' }),
  build({ id: 'hannover-re-property', name: 'Head of Property — Hannover Re', email: '', organisation: 'Hannover Re', role: 'Head of European Property', category: 'insurer', hook: 'European property reinsurance underwriting', lookup_query: 'Hannover Re Head European Property LinkedIn' }),
  build({ id: 'axa-property', name: 'Head of Property Underwriting — AXA', email: '', organisation: 'AXA', role: 'Head of European Property Underwriting', category: 'insurer', hook: 'AXA residential property book and AVM dependency', lookup_query: 'AXA Head Property Underwriting Europe LinkedIn' }),
  build({ id: 'allianz-property', name: 'Head of Property — Allianz', email: '', organisation: 'Allianz', role: 'Head of European Property Underwriting', category: 'insurer', hook: 'Allianz residential underwriting and catastrophe risk', lookup_query: 'Allianz Head European Property Underwriting LinkedIn' }),
  build({ id: 'generali-property', name: 'Head of European Real Estate Risk — Generali', email: '', organisation: 'Generali', role: 'Head of European Real Estate Risk', category: 'insurer', hook: 'Generali Real Estate residential exposure across Italy and Germany', lookup_query: 'Generali Head Real Estate Risk Europe LinkedIn' }),
  build({ id: 'mapfre-residential', name: 'Director Residential — MAPFRE', email: '', organisation: 'MAPFRE', role: 'Director, Residential Insurance Underwriting', category: 'insurer', hook: 'MAPFRE residential property risk in Spain and Portugal', lookup_query: 'MAPFRE Director Residential Underwriting LinkedIn' }),
  build({ id: 'aviva-property', name: 'Head of European Property — Aviva', email: '', organisation: 'Aviva', role: 'Head of European Property Risk', category: 'insurer', hook: 'Aviva European residential property exposure', lookup_query: 'Aviva Head European Property Risk LinkedIn' }),
  build({ id: 'zurich-property', name: 'Head of Property — Zurich Insurance', email: '', organisation: 'Zurich Insurance', role: 'Head of European Property Underwriting', category: 'insurer', hook: 'Zurich European residential underwriting', lookup_query: 'Zurich Insurance Head Property Europe LinkedIn' }),

  // ─── NOTARIAL / REGISTRY (8) ────────────────────────────────────────────
  build({ id: 'cgn-spain', name: 'Presidencia — Consejo General del Notariado', email: 'cgn@notariado.org', organisation: 'Consejo General del Notariado (Spain)', role: 'Presidencia / Director of Notarial Information', category: 'notarial', hook: 'the notarial transaction microdata that underpins Spanish residential statistics' }),
  build({ id: 'cir-registradores', name: 'Director — Centro de Información Registral', email: '', organisation: 'Centro de Información Registral (Spain)', role: 'Director', category: 'notarial', hook: 'Spanish land registry transaction microdata', lookup_query: 'Centro de Informacion Registral Spain director email' }),
  build({ id: 'csn-france', name: 'Présidence — Conseil Supérieur du Notariat', email: '', organisation: 'Conseil Supérieur du Notariat (France)', role: 'Présidence / Director of Statistics', category: 'notarial', hook: 'the quarterly Notaires de France residential transaction statistics', lookup_query: 'Conseil Superieur du Notariat France contact' }),
  build({ id: 'bnotk-germany', name: 'Präsident — Bundesnotarkammer', email: '', organisation: 'Bundesnotarkammer (Germany)', role: 'Präsident', category: 'notarial', hook: 'German notarial transaction recording across Länder', lookup_query: 'Bundesnotarkammer Praesident email' }),
  build({ id: 'cnn-italy', name: 'Presidenza — Consiglio Nazionale del Notariato', email: '', organisation: 'Consiglio Nazionale del Notariato (Italy)', role: 'Presidenza', category: 'notarial', hook: 'Italian notarial property transaction microdata', lookup_query: 'Consiglio Nazionale Notariato Italia contact' }),
  build({ id: 'knb-netherlands', name: 'Voorzitter — KNB', email: '', organisation: 'Koninklijke Notariële Beroepsorganisatie (Netherlands)', role: 'Voorzitter', category: 'notarial', hook: 'Dutch notarial residential transaction recording', lookup_query: 'KNB Voorzitter Netherlands notary email' }),
  build({ id: 'ordem-notarios-pt', name: 'Bastonário — Ordem dos Notários', email: '', organisation: 'Ordem dos Notários (Portugal)', role: 'Bastonário', category: 'notarial', hook: 'Portuguese notarial property transaction data', lookup_query: 'Ordem dos Notarios Portugal Bastonario email' }),
  build({ id: 'lantmateriet-sweden', name: 'Director-General — Lantmäteriet', email: '', organisation: 'Lantmäteriet (Sweden)', role: 'Director-General; Swedish land registry', category: 'notarial', hook: 'Swedish cadastral and land registry residential property data', lookup_query: 'Lantmateriet director general email' }),

  // ─── TIER-1 BANK (15) ───────────────────────────────────────────────────
  build({ id: 'santander-credit-risk', name: 'Head of Credit Risk Modelling — Santander', email: '', organisation: 'Banco Santander', role: 'Head of Credit Risk Modelling, Spain', category: 'bank', hook: 'EBA AVM consultation timing and Spanish coastal mortgage book exposure', lookup_query: 'Santander Spain Head Credit Risk Modelling LinkedIn' }),
  build({ id: 'bbva-mortgage-risk', name: 'Head of Mortgage Risk — BBVA', email: '', organisation: 'BBVA', role: 'Head of Mortgage Credit Risk', category: 'bank', hook: 'BBVA residential mortgage exposure and AVM validation cycle', lookup_query: 'BBVA Head Mortgage Risk LinkedIn' }),
  build({ id: 'caixa-model-risk', name: 'Head of Model Risk — CaixaBank', email: '', organisation: 'CaixaBank', role: 'Head of Model Risk Management', category: 'bank', hook: 'CaixaBank IRB residential mortgage model validation', lookup_query: 'CaixaBank Head Model Risk LinkedIn' }),
  build({ id: 'sabadell-credit-risk', name: 'Head of Credit Risk — Banco Sabadell', email: '', organisation: 'Banco Sabadell', role: 'Head of Credit Risk', category: 'bank', hook: 'Sabadell Mediterranean coastal mortgage portfolio', lookup_query: 'Banco Sabadell Head Credit Risk LinkedIn' }),
  build({ id: 'bnpp-model-risk', name: 'Head of Model Risk — BNP Paribas', email: '', organisation: 'BNP Paribas', role: 'Head of Model Risk Management, Europe', category: 'bank', hook: 'BNP Paribas residential mortgage model risk under EBA framework', lookup_query: 'BNP Paribas Head Model Risk Europe LinkedIn' }),
  build({ id: 'ca-credit-risk', name: 'Head of Residential Credit Risk — Crédit Agricole', email: '', organisation: 'Crédit Agricole', role: 'Head of Residential Credit Risk', category: 'bank', hook: 'French residential mortgage book under HCSF measures', lookup_query: 'Credit Agricole Head Residential Credit Risk LinkedIn' }),
  build({ id: 'socgen-model', name: 'Head of Model Risk — Société Générale', email: '', organisation: 'Société Générale', role: 'Head of Credit Model Risk', category: 'bank', hook: 'SocGen residential AVM validation framework', lookup_query: 'Societe Generale Head Credit Model Risk LinkedIn' }),
  build({ id: 'deutsche-mortgage', name: 'Head of Mortgage Risk — Deutsche Bank', email: '', organisation: 'Deutsche Bank', role: 'Head of Mortgage Risk, Germany', category: 'bank', hook: 'Deutsche Bank German residential mortgage exposure', lookup_query: 'Deutsche Bank Head Mortgage Risk Germany LinkedIn' }),
  build({ id: 'commerzbank-mortgage', name: 'Head of Real Estate Finance Risk — Commerzbank', email: '', organisation: 'Commerzbank', role: 'Head of Real Estate Finance Risk', category: 'bank', hook: 'Commerzbank residential and mittelstand property exposure', lookup_query: 'Commerzbank Head Real Estate Finance Risk LinkedIn' }),
  build({ id: 'ing-mortgage', name: 'Head of Mortgage Risk — ING', email: '', organisation: 'ING Group', role: 'Head of Mortgage Risk, Netherlands & Europe', category: 'bank', hook: 'ING residential mortgage book under Dutch macroprudential regime', lookup_query: 'ING Head Mortgage Risk LinkedIn' }),
  build({ id: 'rabobank-mortgage', name: 'Head of Mortgage Risk — Rabobank', email: '', organisation: 'Rabobank', role: 'Head of Mortgage Risk Modelling', category: 'bank', hook: 'Rabobank Dutch residential mortgage portfolio', lookup_query: 'Rabobank Head Mortgage Risk LinkedIn' }),
  build({ id: 'unicredit-model-risk', name: 'Head of Model Risk — UniCredit', email: '', organisation: 'UniCredit', role: 'Head of Model Risk Management', category: 'bank', hook: 'UniCredit residential portfolio across Italy, Germany, CEE', lookup_query: 'UniCredit Head Model Risk LinkedIn' }),
  build({ id: 'intesa-residential', name: 'Head of Residential Credit Risk — Intesa Sanpaolo', email: '', organisation: 'Intesa Sanpaolo', role: 'Head of Residential Credit Risk', category: 'bank', hook: 'Intesa Sanpaolo Italian residential mortgage portfolio', lookup_query: 'Intesa Sanpaolo Head Residential Credit Risk LinkedIn' }),
  build({ id: 'erste-mortgage', name: 'Head of Retail Credit Risk — Erste Group', email: '', organisation: 'Erste Group Bank', role: 'Head of Retail Credit Risk, CEE', category: 'bank', hook: 'Erste Group CEE residential mortgage book exposure', lookup_query: 'Erste Group Head Retail Credit Risk CEE LinkedIn' }),
  build({ id: 'dnb-mortgage', name: 'Head of Residential Credit Risk — DNB', email: '', organisation: 'DNB (Norway)', role: 'Head of Residential Credit Risk', category: 'bank', hook: 'DNB Norwegian residential mortgage portfolio and Nordic cross-exposure', lookup_query: 'DNB Norway Head Residential Credit Risk LinkedIn' }),

  // ─── SOVEREIGN WEALTH / PENSION (8) ─────────────────────────────────────
  build({ id: 'nbim-real-estate', name: 'Head of European Real Estate — NBIM', email: '', organisation: 'Norges Bank Investment Management', role: 'Head of European Real Estate', category: 'sovereign', hook: 'NBIM\'s stated interest in expanding European residential property exposure (Norwegian to Norwegian — Henrik Kolstad)', lookup_query: 'NBIM Head European Real Estate LinkedIn' }),
  build({ id: 'gic-europe', name: 'Head of European Real Estate — GIC', email: '', organisation: 'GIC Singapore', role: 'Head of European Real Estate', category: 'sovereign', hook: 'GIC European residential property allocation strategy', lookup_query: 'GIC Head European Real Estate LinkedIn' }),
  build({ id: 'adia-europe', name: 'Director European Real Estate — ADIA', email: '', organisation: 'Abu Dhabi Investment Authority', role: 'Director, European Real Estate', category: 'sovereign', hook: 'ADIA European real estate portfolio direction', lookup_query: 'ADIA Director European Real Estate LinkedIn' }),
  build({ id: 'apg-real-estate', name: 'Head of Residential Real Estate — APG', email: '', organisation: 'APG (Dutch pension)', role: 'Head of Residential Real Estate', category: 'sovereign', hook: 'APG €600B Dutch pension fund residential exposure', lookup_query: 'APG Head Residential Real Estate LinkedIn' }),
  build({ id: 'alecta-real-estate', name: 'Head of Real Estate — Alecta', email: '', organisation: 'Alecta (Swedish pension)', role: 'Head of Real Estate Investments', category: 'sovereign', hook: 'Alecta Swedish pension residential property strategy', lookup_query: 'Alecta Head Real Estate LinkedIn' }),
  build({ id: 'pfa-real-estate', name: 'Head of Real Estate — PFA Pension', email: '', organisation: 'PFA Pension (Denmark)', role: 'Head of Real Estate Investments', category: 'sovereign', hook: 'PFA Danish pension residential allocation across Europe', lookup_query: 'PFA Pension Head Real Estate LinkedIn' }),
  build({ id: 'caisse-quebec', name: 'Head of European Real Estate — CDPQ', email: '', organisation: 'Caisse de dépôt et placement du Québec', role: 'Head of European Real Estate', category: 'sovereign', hook: 'CDPQ Ivanhoé Cambridge European residential strategy', lookup_query: 'CDPQ Ivanhoe Cambridge Head European Real Estate LinkedIn' }),
  build({ id: 'kic-europe', name: 'Head of European Investment — Korea Investment Corporation', email: '', organisation: 'Korea Investment Corporation', role: 'Head of European Investment', category: 'sovereign', hook: 'KIC European real estate exposure', lookup_query: 'Korea Investment Corporation Head European Investment LinkedIn' }),

  // ─── AI LAB / DISTRIBUTION (6) ──────────────────────────────────────────
  build({ id: 'anthropic-partnerships', name: 'Partnerships — Anthropic', email: 'partnerships@anthropic.com', organisation: 'Anthropic', role: 'Partnerships / Model Evaluation Team', category: 'ai_lab', hook: 'Claude Desktop MCP integration with European property data sources' }),
  build({ id: 'openai-data', name: 'Data Partnerships — OpenAI', email: '', organisation: 'OpenAI', role: 'Data Partnerships Team', category: 'ai_lab', hook: 'ChatGPT custom GPT and live retrieval for European property answers', lookup_query: 'OpenAI Data Partnerships team contact' }),
  build({ id: 'perplexity-partners', name: 'Partnerships — Perplexity', email: '', organisation: 'Perplexity', role: 'Data Partnerships Team', category: 'ai_lab', hook: 'Perplexity Pro citation network for European property queries', lookup_query: 'Perplexity Data Partnerships email' }),
  build({ id: 'mistral-partners', name: 'Partnerships — Mistral AI', email: '', organisation: 'Mistral AI', role: 'Enterprise Partnerships', category: 'ai_lab', hook: 'Mistral European AI strategy and EU-native data integration', lookup_query: 'Mistral AI Enterprise Partnerships email' }),
  build({ id: 'google-deepmind-data', name: 'Data Partnerships — Google DeepMind', email: '', organisation: 'Google DeepMind / Gemini', role: 'Data Partnerships Team', category: 'ai_lab', hook: 'Gemini grounding integration for European property answers', lookup_query: 'Google DeepMind Data Partnerships email' }),
  build({ id: 'meta-ai-data', name: 'AI Data — Meta', email: '', organisation: 'Meta AI', role: 'Data Partnerships Team', category: 'ai_lab', hook: 'Llama and Meta AI European data integration', lookup_query: 'Meta AI Data Partnerships email' }),

  // ─── JOURNALIST (8) ─────────────────────────────────────────────────────
  build({ id: 'joshua-oliver-ft', name: 'Joshua Oliver', email: '', organisation: 'Financial Times', role: 'Property Correspondent', category: 'journalist', hook: 'European property markets, recent FT coverage on Spanish coastal and Lisbon dynamics', lookup_query: 'Joshua Oliver FT property correspondent email' }),
  build({ id: 'valentina-romei-ft', name: 'Valentina Romei', email: '', organisation: 'Financial Times', role: 'Economics Reporter, Southern Europe', category: 'journalist', hook: 'Southern European housing data and demographics', lookup_query: 'Valentina Romei FT Southern Europe email' }),
  build({ id: 'jana-randow-bloomberg', name: 'Jana Randow', email: '', organisation: 'Bloomberg', role: 'ECB Correspondent', category: 'journalist', hook: 'ECB macroprudential policy coverage and housing-finance interaction', lookup_query: 'Jana Randow Bloomberg ECB correspondent email' }),
  build({ id: 'reuters-property', name: 'Reuters Property Desk', email: '', organisation: 'Reuters', role: 'European Property Reporter', category: 'journalist', hook: 'European property markets and institutional investment flows', lookup_query: 'Reuters European Property Reporter email' }),
  build({ id: 'handelsblatt-immobilien', name: 'Immobilien-Redaktion — Handelsblatt', email: '', organisation: 'Handelsblatt', role: 'Real Estate Desk Lead', category: 'journalist', hook: 'German residential property and listed REIT coverage', lookup_query: 'Handelsblatt Immobilien Redakteur email' }),
  build({ id: 'echos-immobilier', name: 'Rédaction Immobilier — Les Échos', email: '', organisation: 'Les Échos', role: 'Real Estate Desk Lead', category: 'journalist', hook: 'French residential property and HCSF measures coverage', lookup_query: 'Les Echos redaction immobilier email' }),
  build({ id: 'el-confidencial-vivienda', name: 'Sección Vivienda — El Confidencial', email: '', organisation: 'El Confidencial', role: 'Real Estate Section Lead', category: 'journalist', hook: 'Spanish residential property and coastal market dynamics', lookup_query: 'El Confidencial Vivienda email' }),
  build({ id: 'sole24-immobiliare', name: 'Redazione Immobiliare — Il Sole 24 Ore', email: '', organisation: 'Il Sole 24 Ore', role: 'Real Estate Desk Lead', category: 'journalist', hook: 'Italian residential property and Milan market coverage', lookup_query: 'Il Sole 24 Ore Redazione Immobiliare email' }),
];

export const OUTREACH_TARGETS: OutreachTarget[] = [
  ...HAND_CRAFTED_TARGETS,
  ...TEMPLATED_TARGETS,
];

export interface SendResult {
  recipient_id: string;
  recipient_name: string;
  status: 'sent' | 'skipped' | 'error';
  resend_id?: string;
  error?: string;
}

export async function sendOne(t: OutreachTarget, overrides?: { subject?: string; body?: string }): Promise<SendResult> {
  if (t.channel !== 'email' || !t.email) {
    return { recipient_id: t.id, recipient_name: t.name, status: 'skipped', error: 'twitter-only channel' };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { recipient_id: t.id, recipient_name: t.name, status: 'error', error: 'RESEND_API_KEY not set' };

  const subject = overrides?.subject ?? t.subject;
  const body = overrides?.body ?? t.body;
  const html = bodyToHtml(body);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FROM,
      to: t.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text: body,
    });
    if (result.error) throw new Error(result.error.message);
    const resend_id = result.data?.id ?? null;

    if (supabase) {
      try {
        await supabase.from('outreach_emails').insert({
          recipient_id: t.id,
          recipient_name: t.name,
          recipient_email: t.email,
          organisation: t.organisation,
          subject,
          body,
          scenario_url: t.scenarioUrl,
          status: 'sent',
          resend_id,
        });
      } catch { /* non-fatal */ }
    }

    return { recipient_id: t.id, recipient_name: t.name, status: 'sent', resend_id: resend_id ?? undefined };
  } catch (e) {
    if (supabase) {
      try {
        await supabase.from('outreach_emails').insert({
          recipient_id: t.id,
          recipient_name: t.name,
          recipient_email: t.email,
          organisation: t.organisation,
          subject,
          body,
          scenario_url: t.scenarioUrl,
          status: 'bounced',
          error: (e as Error).message,
        });
      } catch { /* */ }
    }
    return { recipient_id: t.id, recipient_name: t.name, status: 'error', error: (e as Error).message };
  }
}

/** Send all email-eligible targets with a 90-second stagger between each. */
export async function sendBatch(items: Array<{ target: OutreachTarget; overrides?: { subject?: string; body?: string } }>, staggerMs = 90_000): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (let i = 0; i < items.length; i++) {
    const { target, overrides } = items[i];
    const r = await sendOne(target, overrides);
    results.push(r);
    if (i < items.length - 1 && r.status === 'sent') {
      await new Promise(res => setTimeout(res, staggerMs));
    }
  }
  return results;
}

function bodyToHtml(plain: string): string {
  // Minimal: wrap in p tags, preserve line breaks, autolink http(s)://
  const escaped = plain
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withLinks = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#b8860b">$1</a>');
  const paragraphs = withLinks.split(/\n\n+/).map(p =>
    `<p style="margin:0 0 12px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a">${p.replace(/\n/g, '<br>')}</p>`
  ).join('');
  return `<div style="max-width:640px;margin:0 auto;padding:16px">${paragraphs}</div>`;
}
