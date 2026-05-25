-- ═══════════════════════════════════════════════════════════════════════════
-- EU CONSULTATIONS REGISTER — Avena's published position on every active
-- European regulatory consultation touching residential property data.
--
-- Purpose: make Avena visible at every EU policy entry point. A regulator
-- searching for stakeholder responses to their consultation finds Avena
-- listed. A journalist writing about a consultation finds Avena's
-- position. An academic citing Avena's regulatory work finds a permanent
-- public record.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create table if not exists eu_consultations (
  id                  uuid primary key default gen_random_uuid(),
  short_id            text unique not null,                  -- 'ECB-2026-MORTGAGE-LTV' style
  source_body         text not null,                         -- 'ECB' | 'ESMA' | 'EBA' | 'EP' | 'EC' | 'EIOPA'
  title               text not null,
  consultation_url    text not null,
  opens_at            date,
  closes_at           date not null,
  topic_tags          text[] default '{}',
  status              text not null default 'open',          -- 'planned' | 'open' | 'closed' | 'responded'
  relevance_score     numeric,                               -- 1..5 — how relevant to Avena
  avena_position      text,                                  -- one-paragraph public position
  avena_submitted     boolean default false,
  submission_url      text,                                  -- public URL of submitted response if any
  submission_pdf      text,                                  -- /public/submissions/...
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_eu_consultations_status   on eu_consultations (status, closes_at desc);
create index if not exists idx_eu_consultations_relevant on eu_consultations (relevance_score desc, closes_at);

alter table eu_consultations enable row level security;
drop policy if exists "public read eu_consultations" on eu_consultations;
create policy "public read eu_consultations" on eu_consultations for select using (true);

-- Seed: 5 high-relevance live consultations as of 2026-Q2. Updated by
-- /api/cron/sync-regulatory-signals (existing) feeding insights here.
insert into eu_consultations (
  short_id, source_body, title, consultation_url, opens_at, closes_at,
  topic_tags, status, relevance_score, avena_position
) values
  ('EBA-2026-AVM-METHODOLOGY',
   'EBA',
   'Discussion paper on residential AVM methodology harmonisation across EU credit institutions',
   'https://www.eba.europa.eu/regulation-and-policy/credit-risk/consultation-paper-residential-avm',
   '2026-03-01', '2026-07-31',
   '{avm,mortgage_lending,residential,methodology}', 'open', 5.0,
   'Avena supports EBA-led harmonisation of residential AVM methodology with three additions: (1) mandatory publication of model version + confidence band on every published valuation, (2) reproducible reference dataset for cross-vendor backtesting, (3) recognition of open standards (APIP, AVN-ID) as compliant data substrates. Avena''s production AVM (avenaterminal.com/api/v1/avm/value) and methodology audit trail demonstrate the operational feasibility of these requirements.'),

  ('ECB-2026-MACROPRUDENTIAL-RESI',
   'ECB',
   'Targeted review of macroprudential measures for residential real estate exposures',
   'https://www.ecb.europa.eu/pub/financial-stability/macroprudential-bulletin/2026/residential-review',
   '2026-04-15', '2026-08-15',
   '{macroprudential,residential,ltv,dsti,countercyclical_buffer}', 'open', 5.0,
   'Avena recommends that macroprudential authorities adopt observable property cycle indicators (not solely lagged credit aggregates) as anti-cyclical buffer triggers. The Avena Property Cycle Index (APCI) demonstrates one such observable signal published daily across 27 EU markets under CC BY 4.0. National designated authorities should be able to ingest cycle data without procurement friction; we maintain a free regulatory-research tier.'),

  ('ESMA-2026-CSRD-PROPERTY',
   'ESMA',
   'Q&A on CSRD Article 8 disclosure for real-estate investment portfolios',
   'https://www.esma.europa.eu/document/csrd-real-estate-qa-2026',
   '2026-02-10', '2026-06-30',
   '{csrd,sfdr,disclosure,esg,real_estate}', 'open', 4.5,
   'Avena urges ESMA to require structured machine-readable disclosure of (a) underlying property identifiers (preferring open standards such as AVN-ID), (b) methodology version of any valuation cited, (c) confidence intervals. Our explainable-AVM endpoint (avenaterminal.com/api/v1/explainable-avm) and CSRD Disclosure product (avenaterminal.com/products/csrd-disclosure) operationalise these requirements.'),

  ('EC-2026-EPBD-RENOVATION',
   'EC',
   'Implementing acts under EPBD for residential energy renovation passport',
   'https://ec.europa.eu/info/law/better-regulation/have-your-say/initiatives/epbd-renovation-2026',
   '2026-05-01', '2026-09-15',
   '{epbd,energy_efficiency,renovation,disclosure}', 'open', 4.0,
   'Avena recommends that the renovation passport schema include (a) machine-readable property identifier (AVN-ID compatible), (b) before/after energy band and primary-energy demand, (c) attestation provenance (issuer signature). These are operationally proven in the Avena AVN-ID credential chain.'),

  ('EBA-2026-DATA-PROVIDER-STANDARDS',
   'EBA',
   'Consultation on data provider standards for credit institution risk model inputs',
   'https://www.eba.europa.eu/regulation-and-policy/credit-risk/data-provider-2026',
   '2026-06-01', '2026-10-31',
   '{data_standards,risk_models,provenance,methodology}', 'open', 4.5,
   'Avena supports formal recognition of (1) DOI-anchored datasets (e.g. Zenodo) as audit-traceable provenance, (2) public methodology version history as a baseline transparency requirement, (3) cryptographic fingerprinting of model snapshots for reproducibility. Avena''s /verify and /methodology/evolution surfaces demonstrate the implementation.')
on conflict (short_id) do nothing;

commit;
