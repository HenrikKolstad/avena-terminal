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
}

const BASE = 'https://avenaterminal.com';

export const OUTREACH_TARGETS: OutreachTarget[] = [
  {
    id: 'luc-laeven',
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
    id: 'brad-setser',
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
    id: 'jorge-galan',
    name: 'Jorge Galán',
    email: 'j.galan@bde.es',
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
    id: 'tuomas-peltonen',
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
    id: 'moritz-schularick',
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
    id: 'daniela-gabor',
    name: 'Daniela Gabor',
    email: '',  // No public email — Twitter DM only
    organisation: 'UWE Bristol',
    role: 'Professor of Economics and Macro-Finance',
    channel: 'twitter-only',
    twitter: '@DanielaGabor',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: '[Twitter DM] Foreign-buyer levy scenario for the financialisation lens',
    body: `Daniela — built a macroprudential simulator that operationalises foreign-buyer housing financialisation as a tightenable policy lever. Vol. 2 of our methodology shows foreign-buyer cohorts amplify monetary transmission ~4.7× in Spanish coastal markets. Engine + methodology fully open (CC BY 4.0): ${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18 — Henrik`,
  },
  {
    id: 'robin-wigglesworth',
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
    id: 'martin-sandbu',
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
    id: 'frederik-ducrozet',
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
    id: 'tracy-alloway',
    name: 'Tracy Alloway',
    email: 'talloway1@bloomberg.net',
    organisation: 'Bloomberg / Odd Lots',
    role: 'Senior Editor and Odd Lots Co-host',
    channel: 'email',
    twitter: '@tracyalloway',
    scenarioUrl: `${BASE}/policy-engine?lever=fb_levy&country=ES&r=coastal&m=500&fb=0.25&t=18`,
    subject: 'Odd Lots-shaped story: solo Norwegian built a macroprudential simulator for EU housing',
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
