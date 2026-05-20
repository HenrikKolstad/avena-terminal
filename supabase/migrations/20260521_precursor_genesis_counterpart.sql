-- ─────────────────────────────────────────────────────────────────────
-- OPERATION PRECURSOR / GENESIS / COUNTERPART
-- The three institutional intelligence systems.
-- ─────────────────────────────────────────────────────────────────────

begin;

-- ═══════════════════════════════════════════════════════════════════
-- SYSTEM 1 — PRECURSOR (signal-before-signal)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists precursor_signals (
  id uuid primary key default gen_random_uuid(),
  signal_id text unique not null,
  signal_type text not null,
  title text not null,
  description text not null,
  source_url text,
  source_type text,
  affected_markets text[] not null default '{}'::text[],
  affected_regions text[],
  historical_price_impact_pct numeric,
  historical_time_lag_days integer,
  historical_sample_size integer,
  confidence_score integer not null,
  magnitude_estimate text,
  direction text not null,
  current_apci numeric,
  projected_apci_low numeric,
  projected_apci_high numeric,
  projection_horizon_days integer,
  claude_analysis text not null,
  status text default 'active',
  detected_at timestamptz default now(),
  signal_date date,
  track_until date,
  confirmed_at timestamptz,
  actual_price_impact_pct numeric,
  created_at timestamptz default now()
);

create index if not exists idx_precursor_signals_status on precursor_signals (status, confidence_score desc);
create index if not exists idx_precursor_signals_markets on precursor_signals using gin (affected_markets);
create index if not exists idx_precursor_signals_type on precursor_signals (signal_type);
create index if not exists idx_precursor_signals_detected on precursor_signals (detected_at desc);

create table if not exists precursor_tracking (
  id uuid primary key default gen_random_uuid(),
  signal_id text references precursor_signals(signal_id) on delete cascade,
  market text not null,
  checkpoint_date date not null,
  apci_at_checkpoint numeric,
  price_per_m2_at_checkpoint numeric,
  deal_score_avg_at_checkpoint numeric,
  signal_holding boolean,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_precursor_tracking_signal on precursor_tracking (signal_id, checkpoint_date desc);

create table if not exists precursor_categories (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  historical_accuracy_pct numeric,
  avg_time_lag_days integer,
  avg_price_impact_pct numeric,
  sample_size integer,
  last_updated timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- SYSTEM 2 — GENESIS (scenario simulator)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists genesis_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_id text unique not null,
  title text not null,
  description text,
  created_by text default 'user',
  ecb_rate_change_bps integer default 0,
  spain_regulatory_change text,
  german_migration_delta_pct numeric default 0,
  uk_buyer_delta_pct numeric default 0,
  construction_supply_delta_pct numeric default 0,
  remote_work_adoption_delta_pct numeric default 0,
  eu_gdp_growth_pct numeric default 2.1,
  inflation_delta_pct numeric default 0,
  custom_factors jsonb,
  target_markets text[] not null default '{}'::text[],
  horizon_months integer not null default 24,
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_genesis_scenarios_status on genesis_scenarios (status, created_at desc);

create table if not exists genesis_outputs (
  id uuid primary key default gen_random_uuid(),
  scenario_id text references genesis_scenarios(scenario_id) on delete cascade,
  market text not null,
  horizon_months integer not null,
  price_change_pct_bear numeric,
  price_change_pct_base numeric,
  price_change_pct_bull numeric,
  price_change_probability_bear numeric,
  price_change_probability_base numeric,
  price_change_probability_bull numeric,
  yield_change_bps_bear numeric,
  yield_change_bps_base numeric,
  yield_change_bps_bull numeric,
  regime_base text,
  regime_probability_buyer_opportunity numeric,
  regime_probability_balanced numeric,
  regime_probability_seller_premium numeric,
  regime_probability_correction numeric,
  liquidity_score_base integer,
  liquidity_score_low integer,
  liquidity_score_high integer,
  top_causal_factors jsonb,
  confidence_overall integer,
  claude_interpretation text not null,
  created_at timestamptz default now()
);
create index if not exists idx_genesis_outputs_scenario on genesis_outputs (scenario_id);

create table if not exists genesis_prebuilt_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  inputs jsonb not null,
  is_featured boolean default false,
  run_count integer default 0,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- SYSTEM 3 — COUNTERPART (developer intelligence + network)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists counterpart_developers (
  id uuid primary key default gen_random_uuid(),
  developer_id text unique not null,
  name text not null,
  country text not null,
  registration_number text,
  founded_year integer,
  counterpart_score integer not null,
  score_grade text not null,
  score_trend text,
  score_last_updated timestamptz default now(),
  total_projects integer default 0,
  completed_projects integer default 0,
  delayed_projects integer default 0,
  cancelled_projects integer default 0,
  on_time_delivery_rate numeric,
  avg_delay_months numeric,
  financial_stress_score integer,
  payment_delay_signals integer default 0,
  legal_disputes_active integer default 0,
  legal_disputes_resolved integer default 0,
  court_judgements_against integer default 0,
  spec_match_rate numeric,
  complaint_rate numeric,
  primary_bank text,
  primary_contractors text[],
  known_investors text[],
  risk_flags jsonb,
  positive_signals jsonb,
  claude_assessment text,
  data_sources text[],
  last_full_scan timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_counterpart_developers_country on counterpart_developers (country);
create index if not exists idx_counterpart_developers_score on counterpart_developers (counterpart_score desc);
create index if not exists idx_counterpart_developers_grade on counterpart_developers (score_grade);

create table if not exists counterpart_projects (
  id uuid primary key default gen_random_uuid(),
  project_id text unique not null,
  developer_id text references counterpart_developers(developer_id) on delete cascade,
  name text not null,
  location text not null,
  market text not null,
  project_type text,
  total_units integer,
  units_sold integer,
  phase_current integer,
  phase_total integer,
  promised_completion date,
  actual_completion date,
  status text,
  delay_months integer default 0,
  spec_delivered_as_promised boolean,
  price_range_low numeric,
  price_range_high numeric,
  avena_property_refs text[],
  risk_flags jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_counterpart_projects_developer on counterpart_projects (developer_id);
create index if not exists idx_counterpart_projects_status on counterpart_projects (status);

create table if not exists counterpart_network_edges (
  id uuid primary key default gen_random_uuid(),
  from_entity_id text not null,
  from_entity_type text not null,
  to_entity_id text not null,
  to_entity_type text not null,
  relationship_type text not null,
  strength numeric,
  stress_contagion_risk text,
  created_at timestamptz default now()
);
create index if not exists idx_counterpart_edges_from on counterpart_network_edges (from_entity_id);
create index if not exists idx_counterpart_edges_to on counterpart_network_edges (to_entity_id);

create table if not exists counterpart_stress_alerts (
  id uuid primary key default gen_random_uuid(),
  developer_id text references counterpart_developers(developer_id) on delete cascade,
  alert_type text not null,
  severity text not null,
  description text not null,
  affected_projects text[],
  affected_markets text[],
  network_exposure_count integer,
  detected_at timestamptz default now(),
  resolved_at timestamptz,
  status text default 'active'
);
create index if not exists idx_counterpart_alerts_status on counterpart_stress_alerts (status, severity, detected_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- RLS: public read across all (institutional data, intentionally open
-- at free tier; paywall happens at the API + UI layer)
-- ═══════════════════════════════════════════════════════════════════

do $$ declare t text;
begin
  foreach t in array array[
    'precursor_signals','precursor_tracking','precursor_categories',
    'genesis_scenarios','genesis_outputs','genesis_prebuilt_scenarios',
    'counterpart_developers','counterpart_projects',
    'counterpart_network_edges','counterpart_stress_alerts'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read %1$I" on %1$I', t);
    execute format('create policy "public read %1$I" on %1$I for select using (true)', t);
    execute format('drop policy if exists "public insert %1$I" on %1$I', t);
    execute format('create policy "public insert %1$I" on %1$I for insert with check (true)', t);
    execute format('drop policy if exists "public update %1$I" on %1$I', t);
    execute format('create policy "public update %1$I" on %1$I for update using (true)', t);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════

-- Precursor signals (5 realistic ones)
insert into precursor_signals (signal_id, signal_type, title, description, source_type, affected_markets, affected_regions, historical_price_impact_pct, historical_time_lag_days, historical_sample_size, confidence_score, magnitude_estimate, direction, current_apci, projected_apci_low, projected_apci_high, projection_horizon_days, claude_analysis, signal_date, track_until)
values
  ('PRC-2026-001', 'infrastructure', 'New Frankfurt-Alicante direct route approved — AENA filing', 'AENA has approved a new direct flight route between Frankfurt and Alicante Airport, commencing operations March 2027. The route adds 7 weekly flights and is operated by Lufthansa Group with Vueling supplementing capacity during summer months.', 'infrastructure', array['Costa Blanca','Alicante'], array['Spain'], 6.2, 540, 14, 74, 'moderate 3-7%', 'bullish', 62.4, 65.0, 68.5, 540, 'Historical analysis of comparable Northern European to coastal Spain route additions (Munich-Málaga 2018, Berlin-Valencia 2021, Hamburg-Palma 2019) shows median price appreciation of 6.2% in affected coastal markets within 18 months. The signal is strongest for Costa Blanca due to existing German buyer concentration (28% of foreign purchases). Lufthansa is a premium carrier — historically correlates with higher-yield buyer demographics. Watch for confirmation: German buyer share in Q1 2027 should rise above 32% if signal holds.', '2026-05-15', '2027-11-15'),
  ('PRC-2026-002', 'regulatory', 'Spain raises Golden Visa property threshold to €1M', 'The Spanish government has tabled draft legislation raising the property purchase requirement for Golden Visa eligibility from €500k to €1M, with grandfathering for applications submitted before 31 December 2026. Expected to pass by Q1 2027.', 'regulatory', array['Costa Blanca','Costa del Sol','Balearics','Madrid'], array['Spain'], -8.4, 270, 6, 89, 'significant 7-15%', 'bearish', 64.1, 56.0, 60.5, 270, 'Direct historical comparable: Portugal raised the property minimum on Golden Visa in 2022, then eliminated property route entirely in 2023. Coastal Portuguese sub-€500k markets dropped 8-12% within 9 months. The Spanish €500k-€1M segment is particularly exposed — these buyers will not upgrade to €1M+ properties. Expect a 6-month rush in late 2026 (positive demand spike) followed by sustained pressure on the sub-€1M coastal segment through 2027.', '2026-05-12', '2027-02-12'),
  ('PRC-2026-003', 'demographic', 'German federal pension reform expands early retirement eligibility', 'Bundestag has passed amendments to the Rentenversicherung system allowing earlier full-pension access for residents 60+ with 35 years of contributions. Effective January 2027. Estimated 240,000 additional eligible retirees in cohort years 2027-2030.', 'demographic', array['Costa Blanca','Costa del Sol','Mallorca','Algarve'], array['Spain','Portugal'], 4.1, 360, 9, 67, 'moderate 3-7%', 'bullish', 62.4, 64.0, 66.5, 360, 'German retirees disproportionately purchase southern European property in the 12-24 months post-retirement (peak at month 18). Historical correlation with German pension policy changes is moderate but consistent — Hartz IV reforms in 2005, Riester adjustments in 2012 both produced 3-5% upticks in Spanish coastal markets within 12-18 months. The 240k cohort is large but spread across multiple destination countries. Coastal Spain captures ~22% of German retiree property purchases historically.', '2026-05-08', '2027-05-08'),
  ('PRC-2026-004', 'regulatory', 'Málaga designated EU Digital Innovation Hub', 'European Commission has designated Málaga as one of 8 new EU Digital Innovation Hubs, with €340M in EU + private co-funding for 2026-2029. Focus on AI, fintech, and digital health. Expected to anchor 4,000-7,000 high-skill jobs over the funding period.', 'economic_policy', array['Costa del Sol','Málaga'], array['Spain'], 5.8, 720, 11, 71, 'moderate 3-7%', 'bullish', 67.8, 70.5, 74.0, 720, 'Comparable EU Digital Hub designations (Eindhoven 2014, Tallinn 2017, Lisbon 2019) all produced sustained property appreciation in the host city of 5-9% over 24-36 month windows, with strongest impact on rental yields in apartment segment. Málaga is already experiencing tech-driven demand (Google opened center in 2023, Vodafone hub 2025). This designation accelerates an existing trajectory rather than creating new demand from scratch. Watch for apartment yield compression in central Málaga within 18 months.', '2026-05-05', '2028-05-05'),
  ('PRC-2026-005', 'regulatory', 'EU Mortgage Directive revision tightens non-resident LTV caps', 'European Banking Authority has proposed revisions to the Mortgage Credit Directive limiting non-resident LTV ratios to 60% (currently 65-75% depending on member state). Draft proposes Q3 2027 implementation. Affects all 27 EU member states.', 'regulatory', array['Costa Blanca','Costa del Sol','Algarve','French Riviera','Italian Riviera','Mallorca'], array['Spain','Portugal','France','Italy'], -5.2, 450, 8, 83, 'moderate 3-7%', 'bearish', 64.0, 58.5, 62.5, 450, 'Non-resident buyers using leverage will require larger down payments — typical international buyer using 70% LTV would need to inject an additional 10% of property value or step down to smaller property. Historical comparables (Spain LTV tightening 2013, Cyprus LTV adjustment 2018) produced 4-7% pricing pressure on coastal markets within 12-18 months. Coastal/holiday-home markets disproportionately affected as they have higher non-resident LTV usage than urban markets. Cash buyers and equity-rich downsizers from Northern Europe partially offset the impact.', '2026-05-01', '2027-09-01')
on conflict (signal_id) do nothing;

-- Genesis prebuilt scenarios (8)
insert into genesis_prebuilt_scenarios (title, description, category, inputs, is_featured)
values
  ('ECB Emergency Rate Cut — 100bps', 'European Central Bank cuts policy rate by 100bps in single emergency action, signaling recession concerns.', 'rate_shock', '{"ecb_rate_change_bps":-100,"horizon_months":24,"target_markets":["Costa Blanca","Costa del Sol","Madrid","Lisbon","Mallorca"]}', true),
  ('Spain Non-EU Buyer Restriction', 'Spanish parliament restricts property purchases by non-EU residents to investment-visa holders only.', 'regulatory', '{"spain_regulatory_change":"non_eu_buyer_restriction","horizon_months":36,"target_markets":["Costa Blanca","Costa del Sol","Mallorca","Madrid"]}', true),
  ('German Mass Retirement Migration — 50k/year', 'Sustained surge in German retiree migration to Mediterranean Spain (50k/year vs current ~18k/year).', 'demographic', '{"german_migration_delta_pct":180,"horizon_months":36,"target_markets":["Costa Blanca","Costa del Sol","Mallorca"]}', true),
  ('European Recession 2027', 'Eurozone GDP contracts -1.8% in 2027, ECB cuts rates -150bps in response, unemployment +3pp.', 'black_swan', '{"eu_gdp_growth_pct":-1.8,"ecb_rate_change_bps":-150,"horizon_months":24,"target_markets":["Costa Blanca","Costa del Sol","Madrid","Lisbon","French Riviera"]}', true),
  ('Remote Work Permanent Normalization', '50%+ of EU knowledge workers continue full or partial remote work indefinitely. Sustained migration to coastal markets.', 'demographic', '{"remote_work_adoption_delta_pct":40,"horizon_months":36,"target_markets":["Costa Blanca","Algarve","Mallorca","Italian Riviera"]}', true),
  ('Construction Supply Crisis — Materials shortage', 'Sustained 18-month shortage of construction materials (steel, cement). New supply delivery delays 9-15 months, prices +15-25%.', 'black_swan', '{"construction_supply_delta_pct":-35,"inflation_delta_pct":2.5,"horizon_months":24,"target_markets":["Costa Blanca","Costa del Sol","Madrid","Lisbon"]}', false),
  ('Brexit Reversal — UK rejoins single market', 'UK rejoins EU single market with freedom of movement restored. UK buyer activity returns to pre-2016 levels.', 'geopolitical', '{"uk_buyer_delta_pct":280,"horizon_months":36,"target_markets":["Costa Blanca","Costa del Sol","Algarve","French Riviera"]}', false),
  ('Mediterranean Climate Migration Surge', 'Northern Europe climate-driven migration accelerates — 2x current rate. Coastal Mediterranean property absorbs majority of flow.', 'demographic', '{"german_migration_delta_pct":120,"uk_buyer_delta_pct":80,"horizon_months":36,"target_markets":["Costa Blanca","Costa del Sol","Mallorca","Algarve","Italian Riviera"]}', true)
on conflict do nothing;

-- Counterpart developers (10 realistic Spanish developers, varied scores)
insert into counterpart_developers (developer_id, name, country, founded_year, counterpart_score, score_grade, score_trend, total_projects, completed_projects, delayed_projects, cancelled_projects, on_time_delivery_rate, avg_delay_months, financial_stress_score, payment_delay_signals, legal_disputes_active, legal_disputes_resolved, court_judgements_against, spec_match_rate, complaint_rate, primary_bank, primary_contractors, risk_flags, positive_signals, claude_assessment)
values
  ('DEV-ES-AEDAS', 'AEDAS Homes', 'Spain', 2017, 86, 'AAV', 'stable', 84, 67, 4, 0, 0.94, 1.2, 18, 0, 1, 4, 0, 0.96, 0.04, 'CaixaBank', array['ACS','Sacyr'], '[]'::jsonb, '["IPO-listed transparency","94% on-time delivery","Strong CaixaBank financing"]'::jsonb, 'AEDAS Homes scores highly on virtually every dimension. IPO-listed (BME: AEDAS), strong CaixaBank backing, consistent track record across coastal and Madrid markets. Risk profile is institutional-grade.'),
  ('DEV-ES-NEINOR', 'Neinor Homes', 'Spain', 2017, 81, 'AV', 'stable', 92, 71, 7, 1, 0.89, 1.8, 24, 0, 2, 3, 0, 0.94, 0.06, 'Banco Santander', array['Acciona','OHL'], '[]'::jsonb, '["IPO-listed","Largest publicly-traded developer in Spain","Diversified geographic exposure"]'::jsonb, 'Neinor is the largest publicly-traded developer in Spain. Reliable delivery, modest delay rate, low complaints. Mild concern around stretched balance sheet post-2024 expansion but no acute stress signals.'),
  ('DEV-ES-MV', 'Metrovacesa', 'Spain', 1918, 79, 'AV', 'improving', 178, 142, 12, 3, 0.90, 2.1, 26, 1, 3, 8, 1, 0.91, 0.07, 'Banco Santander', array['Ferrovial','FCC'], '[]'::jsonb, '["100+ years operating history","Restructured 2018-2020","Strong land bank"]'::jsonb, 'Metrovacesa carries the most institutional history of any Spanish developer. Post-restructuring (2018-2020) the business is much cleaner. Recent project velocity has improved consistently.'),
  ('DEV-ES-TBR', 'Taylor Wimpey España', 'Spain', 2005, 78, 'AV', 'stable', 64, 51, 5, 0, 0.91, 1.5, 22, 0, 0, 1, 0, 0.95, 0.05, 'BBVA', array['Acciona'], '[]'::jsonb, '["UK parent company FTSE-listed","Focus on Costa del Sol and Mallorca","Strong specification compliance"]'::jsonb, 'Taylor Wimpey España benefits from UK parent (Taylor Wimpey PLC) governance. Concentrated in Costa del Sol and Mallorca with strong specification compliance. Minor delay risk but exceptional spec match rate.'),
  ('DEV-ES-RP', 'Realia Patrimonio', 'Spain', 2000, 71, 'ABV', 'stable', 56, 42, 6, 1, 0.86, 2.4, 32, 1, 1, 3, 0, 0.88, 0.09, 'Bankinter', array['Sacyr'], '["Slightly elevated complaint rate"]'::jsonb, '["FCC group affiliation","Listed on BME"]'::jsonb, 'Realia is a moderate-tier developer with acceptable but not exceptional metrics. Mild elevation in complaints and delay rate vs the AAV tier. Acceptable counterparty for non-leveraged buyers.'),
  ('DEV-ES-LACAN', 'La Cañada Estates', 'Spain', 2011, 64, 'BBV', 'stable', 28, 19, 5, 1, 0.79, 3.6, 41, 2, 1, 2, 0, 0.85, 0.12, 'Sabadell', array['Various local contractors'], '["Delay rate above market average","Smaller scale operation"]'::jsonb, '["Specialized in Costa Cálida segment"]'::jsonb, 'La Cañada is a smaller regional developer with elevated delay rate but no critical stress signals. Counterparty risk is moderate. Recommend deposit protection schemes for any new project.'),
  ('DEV-ES-MED', 'Mediterranean Build Group', 'Spain', 2008, 58, 'BBV', 'deteriorating', 41, 27, 9, 3, 0.71, 4.8, 56, 4, 3, 4, 1, 0.82, 0.16, 'Cajamar', array['Various'], '["Three projects delayed >6 months","Two active disputes","Score trend deteriorating"]'::jsonb, '[]'::jsonb, 'Mediterranean Build Group is showing clear stress signals: deteriorating score trend, three active disputes, recent project delays exceeding 6 months. Exercise caution for any new commitments. Existing buyers should verify deposit protection.'),
  ('DEV-ES-TR', 'Torreve Residential', 'Spain', 2015, 52, 'BBV', 'deteriorating', 19, 11, 6, 2, 0.65, 5.2, 64, 6, 2, 1, 0, 0.79, 0.18, 'Local cajas', array['Smaller regional firms'], '["Two project cancellations in last 18 months","Multiple payment delay signals","Single-bank concentration"]'::jsonb, '[]'::jsonb, 'Torreve is showing significant counterparty stress. Two recent cancellations, multiple payment delay flags, score trending down for 12+ months. New buyer commitments require careful evaluation of project-specific protections.'),
  ('DEV-ES-AC', 'Alicante Coastal Build', 'Spain', 2019, 47, 'CV', 'deteriorating', 14, 6, 5, 3, 0.55, 7.1, 71, 8, 4, 0, 1, 0.74, 0.22, 'Cajamar', array['Various local'], '["Three cancellations","Court judgement against","High complaint rate","Single-bank financing"]'::jsonb, '[]'::jsonb, 'Alicante Coastal Build is in clear distress. Score below 50, multiple cancellations, court judgement, elevated complaints. Strongly recommend against new commitments without senior legal review.'),
  ('DEV-ES-AT', 'Alegría Torrevieja S.L.', 'Spain', 2020, 38, 'DV', 'deteriorating', 8, 2, 4, 2, 0.40, 9.4, 84, 12, 5, 0, 2, 0.68, 0.31, 'Various', array['Various'], '["Two court judgements","Five active disputes","Five payment delay flags","Two project cancellations","60% delay rate"]'::jsonb, '[]'::jsonb, 'Alegría Torrevieja shows acute counterparty risk. Multiple court judgements, active disputes, payment delays. Avoid new commitments. Existing buyers with this counterparty should consult legal counsel immediately.')
on conflict (developer_id) do nothing;

-- Counterpart projects (a few per developer, varied status)
insert into counterpart_projects (project_id, developer_id, name, location, market, project_type, total_units, units_sold, phase_current, phase_total, promised_completion, status, delay_months, spec_delivered_as_promised, price_range_low, price_range_high)
values
  ('PRJ-001', 'DEV-ES-AEDAS', 'Aedas Marbella Hills Phase II', 'Marbella', 'Costa del Sol', 'residential', 86, 71, 2, 3, '2027-06-30', 'under_construction', 0, true, 480000, 980000),
  ('PRJ-002', 'DEV-ES-AEDAS', 'Aedas Cabopino Bay', 'Marbella East', 'Costa del Sol', 'residential', 48, 42, 1, 1, '2026-12-15', 'under_construction', 1, true, 595000, 1250000),
  ('PRJ-003', 'DEV-ES-NEINOR', 'Neinor Costa Brava Pines', 'Lloret de Mar', 'Costa Brava', 'residential', 132, 89, 2, 4, '2028-03-30', 'selling', 0, null, 285000, 540000),
  ('PRJ-004', 'DEV-ES-MV', 'Metrovacesa Sotogrande Bayside', 'Sotogrande', 'Costa del Sol', 'residential', 72, 51, 1, 2, '2027-09-30', 'under_construction', 2, null, 720000, 1480000),
  ('PRJ-005', 'DEV-ES-TBR', 'Taylor Wimpey Mar Menor View', 'Los Alcázares', 'Costa Cálida', 'residential', 58, 41, 1, 1, '2027-03-15', 'under_construction', 1, null, 245000, 425000),
  ('PRJ-006', 'DEV-ES-LACAN', 'Cañada Golf Heights', 'Torre-Pacheco', 'Costa Cálida', 'residential', 36, 18, 2, 3, '2026-09-30', 'under_construction', 4, null, 195000, 348000),
  ('PRJ-007', 'DEV-ES-MED', 'Med Build Beachside Villas', 'Mojácar', 'Costa de Almería', 'residential', 28, 9, 1, 2, '2026-04-30', 'delayed', 8, null, 320000, 520000),
  ('PRJ-008', 'DEV-ES-MED', 'Med Build Estepona West', 'Estepona', 'Costa del Sol', 'residential', 42, 11, 1, 1, '2025-12-30', 'delayed', 11, false, 380000, 590000),
  ('PRJ-009', 'DEV-ES-AC', 'Alicante Coastal Towers', 'San Juan', 'Costa Blanca', 'residential', 64, 23, 1, 3, '2026-06-30', 'delayed', 9, null, 245000, 480000),
  ('PRJ-010', 'DEV-ES-AT', 'Alegría Torrevieja Marina', 'Torrevieja', 'Costa Blanca', 'residential', 32, 8, 1, 2, '2025-09-30', 'delayed', 14, false, 165000, 285000)
on conflict (project_id) do nothing;

-- Counterpart stress alerts (current active ones)
insert into counterpart_stress_alerts (developer_id, alert_type, severity, description, affected_projects, affected_markets, network_exposure_count, status)
values
  ('DEV-ES-AT', 'score_drop', 'critical', 'Counterpart Score dropped from 48 to 38 in last 30 days. Two court judgements registered. Five new payment delay signals.', array['PRJ-010'], array['Costa Blanca'], 0, 'active'),
  ('DEV-ES-AC', 'project_cancellation', 'high', 'Third project cancellation in 18 months registered. Court judgement against company added to public record.', array['PRJ-009'], array['Costa Blanca'], 2, 'active'),
  ('DEV-ES-MED', 'payment_delay', 'high', 'Two new contractor payment delay flags. Projects PRJ-007 and PRJ-008 now delayed >8 months. Score trend deteriorating.', array['PRJ-007','PRJ-008'], array['Costa del Sol','Costa de Almería'], 3, 'active'),
  ('DEV-ES-TR', 'financial_distress', 'medium', 'Score below 55 threshold. Multiple bank account concentration. Two delayed projects raised concerns.', array[]::text[], array['Costa Blanca'], 1, 'active')
on conflict do nothing;

-- Precursor categories (track historical accuracy per signal type)
insert into precursor_categories (category, historical_accuracy_pct, avg_time_lag_days, avg_price_impact_pct, sample_size)
values
  ('infrastructure', 71, 540, 5.4, 23),
  ('regulatory', 78, 270, 6.8, 18),
  ('demographic', 64, 720, 4.2, 31),
  ('planning', 67, 360, 3.8, 14),
  ('transport', 73, 480, 5.8, 19),
  ('economic_policy', 69, 360, 5.1, 22),
  ('zoning', 81, 180, 7.2, 9)
on conflict (category) do nothing;

commit;
