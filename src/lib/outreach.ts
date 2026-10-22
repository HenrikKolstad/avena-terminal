/**
 * Institutional Outreach — pre-written personalised cold emails.
 *
 * Each template references the recipient's actual public work and links
 * to a live Avena page (the engine, the open dataset, the methodology or
 * an experimental Policy Engine scenario) relevant to their interest.
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

/*
 * COPY RULE (2026-10-22): every claim in these templates must be true and
 * checkable today against the repo, the live site or public/data.json.
 * No superlatives we can't back, no unpublished findings, no bodies or
 * networks that don't exist, no links to removed or redirected pages.
 * If a number would go stale, round it ("about 2,000") or leave it out.
 */

/** What Avena is today, in one sentence. Re-check against public/data.json before changing. */
const COVERAGE = `We track the Spanish new-build market listing by listing: about 2,000 live new-build homes across roughly 750 developments in nearly 100 towns on the Costa Blanca, Costa Cálida, Costa del Sol and Costa Tropical, with asking prices captured daily since August 2026.`;

/** The open-data claim. Repo + Hugging Face are public; the Zenodo DOI is an April 2026 dataset snapshot. */
const OPEN_DATA = `The observations are published as an open dataset under CC BY 4.0 (${BASE}/open-data/dataset.json, mirrored at github.com/HenrikKolstad/avena-data and on Hugging Face), with a citable April 2026 snapshot on Zenodo (DOI 10.5281/zenodo.19520064).`;

/** How the Policy Engine should be described: experimental, Spain-first, literature priors, illustrative outputs. */
const ENGINE_CAVEAT = `To be clear about where it stands: it is an experimental v1. Spain is the only country wired to our own listing data, coefficients are literature priors plus our own preliminary estimates (not yet published), the foreign-buyer share is a proxy, and the bank-level outputs are illustrative. Every run is deterministic and HMAC-signed, so any result can be replayed exactly.`;

const HAND_CRAFTED_TARGETS: OutreachTarget[] = [
  {
    id: 'luc-laeven', category: 'multilateral',
    name: 'Luc Laeven',
    email: 'luc.laeven@ecb.europa.eu',
    organisation: 'European Central Bank',
    role: 'Director General, Research',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18`,
    subject: 'Your 2017 macroprudential paper as a prior in a Spanish coastal scenario tool — 5 minutes of skepticism?',
    body: `Dear Dr. Laeven,

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

On top of that data we have built an experimental scenario tool, the Avena Policy Engine, and its LTV-cap coefficients take Cerutti, Claessens and Laeven (2017), IMF WP/17/19, as a primary prior. The link below pre-loads one scenario: a 5 ppt tighter LTV cap for Spanish coastal postcodes with a high foreign-buyer share, projected 18 months forward.

${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18

${ENGINE_CAVEAT}

Before we take this any further, five minutes of your skepticism on how we have used your estimates would be worth a great deal to us. The methodology is public at ${BASE}/methodology.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
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
    subject: 'Foreign-buyer demand in Spanish coastal new-builds — daily data and a levy scenario',
    body: `Brad,

Your work on cross-border capital flows is the lens I keep coming back to for the Spanish coast, where much of the new-build demand is foreign.

${COVERAGE} ${OPEN_DATA}

We have also built an experimental scenario tool that applies policy levers to that data. The link below pre-loads a Spanish foreign-buyer levy of +500 bps for coastal postcodes, 18 months forward:

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

${ENGINE_CAVEAT}

If you have 20 minutes in the next few weeks, I'd value your read on whether the foreign-buyer channel is modelled sensibly.

Best,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
  {
    id: 'jorge-galan', category: 'multilateral',
    name: 'Jorge Galán',
    email: 'jorge.galan@bde.es',
    organisation: 'Banco de España',
    role: 'Senior Economist, Financial Stability and Macroprudential Policy',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=sectoral_rw&country=ES&r=coastal&m=200&fb=0.25&t=18`,
    subject: 'Daily new-build price data for the Spanish costas — and a sectoral risk-weight scenario',
    body: `Estimado Dr. Galán,

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE} Because we capture every listing every day, we see price cuts, delistings and sales pace at the level of individual developments in near real time, while official statistics arrive months later.

We have also built an experimental scenario tool on that data. The link below pre-loads a +200 bps sectoral risk weight for Spanish coastal postcodes with a high foreign-buyer share, 18 months forward:

${BASE}/policy-engine?lever=sectoral_rw&country=ES&r=coastal&m=200&fb=0.25&t=18

${ENGINE_CAVEAT}

${OPEN_DATA}

Would 30 minutes work to show you the underlying data and hear where it could be useful, or where the scenario logic falls short? Happy to come to Madrid.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
  {
    id: 'tuomas-peltonen', category: 'regulator',
    name: 'Tuomas Peltonen',
    email: 'Tuomas.Peltonen@esrb.europa.eu',
    organisation: 'European Systemic Risk Board',
    role: 'Deputy Head of Secretariat',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18`,
    subject: 'Listing-level new-build data for Spanish coastal residential risk monitoring',
    body: `Dear Mr. Peltonen,

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

For residential real estate monitoring, the useful part is the timing: we see asking-price cuts, delistings and slowing sales in new-build projects as they happen, at the level of individual developments.

We have also built an experimental scenario tool on that data, with six levers (LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight and foreign-buyer levy). The link below pre-loads a +100 bps CCyB scenario for Spanish coastal postcodes, 18 months forward:

${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18

${ENGINE_CAVEAT}

${OPEN_DATA} If 30 minutes in the next few weeks works, I'd value the Secretariat's view on whether data like this is useful for the residential real estate assessment.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
  {
    id: 'moritz-schularick', category: 'academic',
    name: 'Moritz Schularick',
    email: 'moritz.schularick@ifw-kiel.de',
    organisation: 'Kiel Institute for the World Economy',
    role: 'President',
    channel: 'email',
    scenarioUrl: `${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18`,
    subject: 'A new daily series on Spanish coastal new-build prices — would value your read',
    body: `Dear Prof. Schularick,

The Jordà-Schularick-Taylor macrohistory database has been a reference point for the housing research I'm building on.

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE} ${OPEN_DATA}

The series is young, but it is listing-level and daily, which is rare for this market. We have also built an experimental scenario tool on top of it. The link below pre-loads a 5 ppt tighter Spanish LTV cap for coastal postcodes, 18 months forward:

${BASE}/policy-engine?lever=ltv_cap&country=ES&r=coastal&m=-5&fb=0.25&t=18

${ENGINE_CAVEAT} Every methodology change is logged publicly at ${BASE}/methodology/evolution.

If you have 20 minutes at some point, I'd value your skepticism on how a short, high-frequency series like this should and shouldn't be used.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
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
    subject: 'Open daily data on Spanish coastal new-builds — a foreign-buyer levy scenario',
    body: `Dear Prof. Gabor,

Your work on housing financialisation has shaped how I think about the market I'm tracking.

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE} ${OPEN_DATA}

We have also built an experimental scenario tool that treats a foreign-buyer levy as a policy lever. The link below pre-loads a +500 bps levy for Spanish coastal postcodes, 18 months forward:

${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18

${ENGINE_CAVEAT}

If 20 minutes works at some point, I'd value your read on whether the framing holds up against the financialisation literature.

Best regards,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
  {
    id: 'robin-wigglesworth', category: 'journalist',
    name: 'Robin Wigglesworth',
    email: 'robin.wigglesworth@ft.com',
    organisation: 'Financial Times — Alphaville',
    role: 'Global Finance Correspondent',
    channel: 'email',
    twitter: '@RobinWigg',
    scenarioUrl: `${BASE}/statistics`,
    subject: 'Every Spanish coastal new-build, priced daily — open data, possible Alphaville angle?',
    body: `Robin,

There might be an Alphaville post in this.

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

Spanish new-build listings disappear when they sell, so unless someone records them every day, the price history is simply lost. We record it, including every price cut and every delisting, and publish it openly under CC BY 4.0. Nightly statistics from that record are here:

${BASE}/statistics

The data already shows sharp differences in sales pace between coasts and towns, and which developments are cutting prices. Happy to pull numbers for any angle you're interested in, and to be clear about what a series that started in August can and can't tell you.

Best,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
  {
    id: 'martin-sandbu', category: 'journalist',
    name: 'Martin Sandbu',
    email: 'martin.sandbu@ft.com',
    organisation: 'Financial Times',
    role: 'European Economics Commentator',
    channel: 'email',
    scenarioUrl: `${BASE}/statistics`,
    subject: 'Daily, listing-level data on Spain\'s coastal new-build market',
    body: `Martin,

Official house-price statistics for Southern Europe arrive months after the fact. I've built something that sees one important corner of the market every day.

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE} We record every price cut and every delisting, which gives an early read on sales pace before it reaches official numbers. Nightly statistics from that record:

${BASE}/statistics

${OPEN_DATA}

If you're writing about the European housing cycle, I'd be glad to pull specific numbers or walk you through the data, including its limits.

Best,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
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
    subject: '[Twitter DM] Daily Spanish new-build data + an experimental macroprudential scenario tool',
    body: `Frederik, I track every new-build listing on the Spanish costas daily (about 2,000 homes, open data, CC BY 4.0) and built an experimental scenario tool on top. This link pre-loads a Spanish CCyB +100bps coastal scenario, 18m forward: ${BASE}/policy-engine?lever=ccyb&country=ES&r=coastal&m=100&fb=0.25&t=18. It's v1, literature priors, outputs illustrative. Curious whether it matches your priors. Henrik (avenaterminal.com)`,
  },
  {
    id: 'tracy-alloway', category: 'journalist',
    name: 'Tracy Alloway',
    email: '',  // No public Bloomberg email — her preferred channel is Twitter DM (verified at tracy-alloway.com)
    organisation: 'Bloomberg / Odd Lots',
    role: 'Senior Editor and Odd Lots Co-host',
    channel: 'twitter-only',
    twitter: '@tracyalloway',
    scenarioUrl: `${BASE}/statistics`,
    subject: '[Twitter DM] Odd Lots-shaped story: the price history of Spanish new-builds disappears unless someone records it',
    body: `Tracy,

This might be an Odd Lots-shaped story.

When a new-build home on the Spanish coast sells, its listing vanishes, and with it the record of what it was offered at and how often the price was cut. Official statistics only catch the transaction, months later.

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE} We keep every price cut and every delisting, and publish it all as open data (CC BY 4.0). Nightly statistics: ${BASE}/statistics

The story could be how much you can learn about a property market by simply refusing to let its listings disappear: which coasts are selling and which are stuck, and who is cutting prices. Happy to come on or just chat.

Best,
Henrik Kolstad
Founder, Avena Terminal
${BASE}`,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * TEMPLATED TARGETS — 90 additional recipients across 9 categories.
 * Body and subject generated from category templates with light per-
 * recipient personalisation (name, organisation, optional hook line).
 * ═══════════════════════════════════════════════════════════════════════════
 */

const SIGN = `\n\nBest,\nHenrik Kolstad\nFounder, Avena Terminal\n${BASE}`;

/**
 * Three pitch variants rotated across recipients so emails don't read
 * template-stamped. All three say only what is true today.
 */
const PITCH_A = `${COVERAGE} ${OPEN_DATA} Avena is an official RICS Tech Partner (2026).`;

const PITCH_B = `Avena Terminal records the Spanish coastal new-build market every day: about 2,000 live listings across roughly 750 developments, every asking-price change and every delisting, since August 2026. Each day's dataset batch is fingerprinted with SHA-256 into a daily Merkle root, and every methodology change is logged at ${BASE}/methodology/evolution. The data is open under CC BY 4.0.`;

const PITCH_C = `Avena Terminal is a data terminal for the Spanish new-build market: live listings across nearly 100 coastal towns, scored on value, yield, location, quality and risk (methodology at ${BASE}/methodology), with daily price capture since August 2026 and an open CC BY 4.0 dataset. It is also available to AI assistants through an MCP server (${BASE}/api#mcp).`;

/* eslint-disable @typescript-eslint/no-unused-vars */
// Vestigial template type kept so the templated build() pipeline compiles
// while the consolidation work ships. Per-recipient personalised bodies
// are tracked separately for follow-up.
interface TemplateSpec {
  subject: (org: string, hook?: string) => string;
  scenarioUrl: string;
  body: (name: string, org: string, hook?: string) => string;
}

const TEMPLATES: Record<OutreachCategory, TemplateSpec> = {
  academic: {
    subject: (org, hook) => hook
      ? `Open daily data on Spanish coastal new-builds — for research on ${hook}`
      : `Open daily data on Spanish coastal new-builds — for researchers at ${org}`,
    scenarioUrl: `${BASE}/dataset`,
    body: (name, org, hook) => `Dear ${name.split(' ').slice(-1)[0] ? 'Dr. ' + name.split(' ').slice(-1)[0] : name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Your work on ${hook} is why I'm writing. ` : ''}Listing-level, daily data on this market is rare: Spanish new-build listings disappear when they sell, and with them the record of what was asked and how often the price was cut. We keep that record.

${OPEN_DATA} It is free to use with attribution. Dataset overview: ${BASE}/dataset

If a bulk export or a specific cut of the data would help a project at ${org}, reply here and I'll set it up.${SIGN}`,
  },

  multilateral: {
    subject: (org, hook) => hook
      ? `Daily Spanish new-build data and an experimental scenario tool — relevant to ${hook}?`
      : `Daily Spanish new-build data and an experimental macroprudential scenario tool`,
    scenarioUrl: `${BASE}/policy-engine`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given ${org}'s work on ${hook}, two things may be of interest. ` : 'Two things may be of interest. '}First, the data itself: an early, listing-level read on price cuts and sales pace in a market that official statistics report months after the fact. Second, an experimental scenario tool built on it, with six levers (LTV cap, DSTI cap, capital requirement, CCyB, sectoral risk weight and foreign-buyer levy).

Scenario tool: ${BASE}/policy-engine
Methodology change log: ${BASE}/methodology/evolution

${ENGINE_CAVEAT}

${OPEN_DATA} If 20 minutes of your skepticism on the approach would be possible, we'd value it.${SIGN}`,
  },

  regulator: {
    subject: (org, hook) => hook
      ? `Listing-level Spanish new-build data — relevant to ${hook}`
      : `Listing-level Spanish new-build data for ${org}`,
    scenarioUrl: `${BASE}/methodology`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `I'm writing because of ${hook}. ` : ''}What we can offer ${org}'s technical teams today:
• Daily, listing-level asking prices, price cuts and delistings for Spanish coastal new-builds, as open data under CC BY 4.0
• A public methodology (${BASE}/methodology) with every change logged (${BASE}/methodology/evolution)
• A daily SHA-256 Merkle root over each day's dataset batch, so published data can be checked for later changes

${OPEN_DATA}

If a 20-minute call with the right colleague would be useful, reply here or point me to them.${SIGN}`,
  },

  insurer: {
    subject: (org, _hook) => `Daily price and sales-pace data on Spanish coastal new-builds — for ${org}`,
    scenarioUrl: `${BASE}/institutional`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given ${org}'s ${hook}, this may be relevant. ` : ''}For anyone underwriting exposure to Spanish coastal residential property or to the developers building it, the useful signals are early ones: which projects are cutting prices, how fast units are selling, and how much stock is still unsold close to delivery. We track those every day at the level of individual developments.

Institutional access: ${BASE}/institutional
Methodology: ${BASE}/methodology

Avena is an official RICS Tech Partner (2026). If a 30-minute call to look at the data against part of ${org}'s exposure would be useful, reply here.${SIGN}`,
  },

  notarial: {
    subject: (org, _hook) => `Data partnership on Spanish residential prices — invitation to ${org}`,
    scenarioUrl: `${BASE}/methodology`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${org} holds ${hook || 'closed-transaction property data that is among the most valuable in European residential finance'}. Our data covers the other side of the market: what developers ask, how often they cut, and when listings disappear. Asking prices and closed prices together say far more than either alone.

${OPEN_DATA} Any data partner would keep ownership of its data, set its own licensing terms and be credited by name wherever the data is used.

If a 30-minute call to explore what a collaboration could look like would be useful, reply here.${SIGN}`,
  },

  bank: {
    subject: (org, _hook) => `Independent daily price and sales-pace data for ${org}'s Spanish coastal exposure`,
    scenarioUrl: `${BASE}/institutional`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given ${org}'s ${hook}, this may be timely. ` : ''}What we can offer ${org}'s credit and model-risk teams today:
• An independent, daily read on asking prices, price cuts and delistings for each development, useful for monitoring collateral and developer loans between valuations
• A public methodology with every change logged (${BASE}/methodology/evolution)
• Open data under CC BY 4.0, so your validation team can reproduce anything we publish
• A daily SHA-256 Merkle root over each day's dataset batch

Avena is an official RICS Tech Partner (2026). Institutional access: ${BASE}/institutional

Would a 20-minute conversation be useful? Reply here.${SIGN}`,
  },

  sovereign: {
    subject: (org, _hook) => `Daily data on Spain's coastal new-build market — for ${org}`,
    scenarioUrl: `${BASE}/institutional`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given ${org}'s ${hook}, this may be relevant. ` : ''}Spanish coastal new-build is opaque: there is no central record of asking prices, and listings disappear when units sell. We keep that record every day, scored on value, yield, location, quality and risk, which gives an investor a daily view of pricing and sales pace by town and by development.

Institutional access: ${BASE}/institutional
Methodology: ${BASE}/methodology

${OPEN_DATA} If a 30-minute call would be useful, reply here.${SIGN}`,
  },

  ai_lab: {
    subject: (org, _hook) => `Live Spanish new-build property data for ${org}'s assistants, via MCP`,
    scenarioUrl: `${BASE}/api#mcp`,
    body: (name, org, hook) => `Dear ${name},

I'm Henrik Kolstad, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given ${org}'s ${hook}, this may be relevant. ` : ''}When an assistant is asked what a new-build flat costs per square metre in Torrevieja or Estepona, it usually answers from stale training data. Avena serves the current answer, from listings captured daily, through an MCP server and a REST API, including tools for price history, recent price moves and delistings (get_price_history, get_recent_price_moves, get_delistings).

MCP and API details: ${BASE}/api#mcp
Methodology: ${BASE}/methodology

${OPEN_DATA} If a 20-minute call to discuss an integration would be useful, reply here.${SIGN}`,
  },

  journalist: {
    subject: (org, _hook) => `Daily data on Spain's coastal new-build market — for ${org}'s coverage`,
    scenarioUrl: `${BASE}/statistics`,
    body: (name, org, hook) => `${name.split(' ')[0]},

Henrik here, founder of Avena Terminal. ${COVERAGE}

${hook ? `Given your coverage of ${hook}, a few things may be useful:` : 'A few things that may be useful to you:'}

1. **Spanish coastal property statistics.** Computed nightly from our record of asking-price changes and delistings, free to cite with attribution. ${BASE}/statistics

2. **Methodology.** How every listing is scored, with every change logged publicly. ${BASE}/methodology/evolution

3. **Open data.** Every observed price move and delisting, CC BY 4.0, free to use with attribution. ${BASE}/open-data/dataset.json

If any of this is useful for upcoming coverage, I'm glad to pull specific numbers or give commentary.${SIGN}`,
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
  build({ id: 'jose-manuel-campa', name: 'José Manuel Campa', email: '', organisation: 'European Banking Authority', role: 'Chair', category: 'regulator', hook: 'the EBA\'s work on automated valuation models for residential collateral', lookup_query: 'Jose Manuel Campa EBA email chair' }),
  build({ id: 'philippe-tibi', name: 'Philippe Tibi', email: '', organisation: 'European Banking Authority', role: 'Head of Credit, Market and Operational Risk Policy', category: 'regulator', hook: 'EBA credit-risk policy on residential collateral valuation', lookup_query: 'Philippe Tibi EBA credit risk email' }),
  build({ id: 'francesco-mazzaferro', name: 'Francesco Mazzaferro', email: '', organisation: 'European Systemic Risk Board (ESRB)', role: 'Head of Secretariat', category: 'regulator', hook: 'ESRB residential real estate warnings and recommendations', lookup_query: 'Francesco Mazzaferro ESRB email' }),
  build({ id: 'verena-ross', name: 'Verena Ross', email: '', organisation: 'European Securities and Markets Authority (ESMA)', role: 'Chair', category: 'regulator', hook: 'ESMA\'s work on real estate disclosures', lookup_query: 'Verena Ross ESMA chair email' }),
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
  build({ id: 'santander-credit-risk', name: 'Head of Credit Risk Modelling — Santander', email: '', organisation: 'Banco Santander', role: 'Head of Credit Risk Modelling, Spain', category: 'bank', hook: 'Spanish coastal mortgage and developer-loan exposure', lookup_query: 'Santander Spain Head Credit Risk Modelling LinkedIn' }),
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
  build({ id: 'nbim-real-estate', name: 'Head of European Real Estate — NBIM', email: '', organisation: 'Norges Bank Investment Management', role: 'Head of European Real Estate', category: 'sovereign', hook: 'European real estate portfolio', lookup_query: 'NBIM Head European Real Estate LinkedIn' }),
  build({ id: 'gic-europe', name: 'Head of European Real Estate — GIC', email: '', organisation: 'GIC Singapore', role: 'Head of European Real Estate', category: 'sovereign', hook: 'GIC European residential property allocation strategy', lookup_query: 'GIC Head European Real Estate LinkedIn' }),
  build({ id: 'adia-europe', name: 'Director European Real Estate — ADIA', email: '', organisation: 'Abu Dhabi Investment Authority', role: 'Director, European Real Estate', category: 'sovereign', hook: 'ADIA European real estate portfolio direction', lookup_query: 'ADIA Director European Real Estate LinkedIn' }),
  build({ id: 'apg-real-estate', name: 'Head of Residential Real Estate — APG', email: '', organisation: 'APG (Dutch pension)', role: 'Head of Residential Real Estate', category: 'sovereign', hook: 'residential real estate allocation', lookup_query: 'APG Head Residential Real Estate LinkedIn' }),
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
