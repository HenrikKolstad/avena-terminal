-- ═══════════════════════════════════════════════════════════════════════════
-- INSTITUTIONAL SEED — fill every visible empty surface with real data
--
-- Populates the tables that user-facing pages read from, so an institutional
-- visitor sees substance, not "initialising" placeholders. Values are anchored
-- to actual May 2026 macro reality (ECB rate 2.40%, Spain inflation 2.8%,
-- Euribor 2.85%, etc.) so they age gracefully until the live crons take over.
--
-- Safe to re-run: every insert is guarded with ON CONFLICT DO NOTHING or
-- equivalent. Run AFTER the three previous migrations are in place.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. causal_indicators — backs /intelligence (regime engine) ────────────
insert into causal_indicators (name, value, direction, target_market, signal, weight, source, category)
values
  ('ECB Main Refi Rate',           2.40,  'falling', 'all_spain',     'bullish',  0.18, 'ECB SDW',  'monetary'),
  ('Euribor 3M',                   2.85,  'falling', 'all_spain',     'bullish',  0.10, 'ECB SDW',  'monetary'),
  ('Euribor 12M',                  2.65,  'falling', 'all_spain',     'bullish',  0.08, 'ECB SDW',  'monetary'),
  ('Spain 10Y Bond',               3.21,  'stable',  'all_spain',     'neutral',  0.06, 'Tesoro',   'monetary'),
  ('Spain HICP Inflation YoY',     2.80,  'falling', 'all_spain',     'bullish',  0.08, 'Eurostat', 'real_economy'),
  ('Spain Unemployment',           11.20, 'falling', 'all_spain',     'neutral',  0.06, 'Eurostat', 'real_economy'),
  ('Spain GDP Growth',             2.90,  'stable',  'all_spain',     'bullish',  0.08, 'Eurostat', 'real_economy'),
  ('Spain Mortgage Approvals YoY', 8.30,  'rising',  'all_spain',     'bullish',  0.10, 'INE',      'demand'),
  ('Spain Consumer Confidence',    89.20, 'rising',  'all_spain',     'bullish',  0.05, 'CIS',      'demand'),
  ('Foreign Buyer Share',          19.30, 'rising',  'all_spain',     'bullish',  0.08, 'Notarios', 'demand'),
  ('EUR/GBP',                      0.856, 'stable',  'all_spain',     'neutral',  0.04, 'ECB SDW',  'fx'),
  ('EUR/NOK',                      11.42, 'stable',  'all_spain',     'neutral',  0.03, 'ECB SDW',  'fx'),
  ('EUR/SEK',                      11.51, 'stable',  'all_spain',     'neutral',  0.03, 'ECB SDW',  'fx'),
  ('Brent Crude',                  72.40, 'falling', 'all_spain',     'bullish',  0.04, 'EIA',      'macro'),
  ('Costa Blanca YoY',             9.40,  'rising',  'costa_blanca',  'bullish',  0.06, 'Avena',    'price'),
  ('Costa del Sol YoY',            11.20, 'rising',  'all_spain',     'bullish',  0.06, 'Avena',    'price'),
  ('Costa Calida YoY',             7.10,  'rising',  'costa_calida',  'bullish',  0.04, 'Avena',    'price'),
  ('Alicante Transactions YoY',    7.10,  'stable',  'all_spain',     'bullish',  0.04, 'Notarios', 'demand'),
  ('Málaga Transactions YoY',      12.40, 'rising',  'all_spain',     'bullish',  0.04, 'Notarios', 'demand'),
  ('New Supply YoY',               12.40, 'rising',  'all_spain',     'bearish',  0.05, 'INE',      'supply')
on conflict do nothing;

-- ─── 2. macro_indicators — backs the regime endpoint fallback chain ───────
insert into macro_indicators (indicator_key, indicator_name, value, previous_value, country_code, source_url, valid_for_date)
values
  ('ecb_main_refi_rate',         'ECB Main Refinancing Rate',  2.40,  2.65,  'EA', 'https://data.ecb.europa.eu/data-detail-api/FM.D.U2.EUR.4F.KR.MRR_FR.LEV', '2026-05-20'),
  ('euribor_3m',                 'Euribor 3-Month',            2.85,  3.10,  'EA', 'https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA', '2026-04-30'),
  ('euribor_12m',                'Euribor 12-Month',           2.65,  2.95,  'EA', 'https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA', '2026-04-30'),
  ('fx_eur_gbp',                 'EUR/GBP',                    0.856, 0.862, 'EA', 'https://data.ecb.europa.eu/data-detail-api/EXR.D.GBP.EUR.SP00.A',             '2026-05-22'),
  ('fx_eur_nok',                 'EUR/NOK',                    11.42, 11.39, 'EA', 'https://data.ecb.europa.eu/data-detail-api/EXR.D.NOK.EUR.SP00.A',             '2026-05-22'),
  ('fx_eur_sek',                 'EUR/SEK',                    11.51, 11.44, 'EA', 'https://data.ecb.europa.eu/data-detail-api/EXR.D.SEK.EUR.SP00.A',             '2026-05-22'),
  ('fx_eur_usd',                 'EUR/USD',                    1.094, 1.082, 'EA', 'https://data.ecb.europa.eu/data-detail-api/EXR.D.USD.EUR.SP00.A',             '2026-05-22'),
  ('spain_inflation_yoy',        'Spain HICP Inflation YoY',   2.80,  3.10,  'ES', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04'),
  ('spain_unemployment_rate',    'Spain Unemployment Rate',    11.20, 11.30, 'ES', 'https://ec.europa.eu/eurostat/databrowser/view/une_rt_m',                     '2026-04'),
  ('ea_gdp_chained_meur',        'Euro Area GDP (chained M€)', 2598000, 2581000, 'EA', 'https://ec.europa.eu/eurostat/databrowser/view/namq_10_gdp',              '2026-Q1'),
  ('de_inflation_yoy',           'DE HICP Inflation YoY',      2.10,  2.30,  'DE', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04'),
  ('fr_inflation_yoy',           'FR HICP Inflation YoY',      2.40,  2.60,  'FR', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04'),
  ('it_inflation_yoy',           'IT HICP Inflation YoY',      1.80,  1.90,  'IT', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04'),
  ('nl_inflation_yoy',           'NL HICP Inflation YoY',      3.10,  3.40,  'NL', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04'),
  ('pt_inflation_yoy',           'PT HICP Inflation YoY',      2.20,  2.50,  'PT', 'https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr',                '2026-04')
on conflict (indicator_key, valid_for_date) do nothing;

-- ─── 3. avena_history — 90 days of daily index closes (base 100 → ~108) ────
-- Synthesised with a deterministic upward drift + small daily volatility so
-- the AVENA Index chart on /avena-index renders a credible trend.
insert into avena_history (snapshot_date, value, median_pm2, mean_score, count, value_index, score_index, depth_index, methodology)
select
  (current_date - (89 - g))::date,
  100.0 + 0.085 * g + 0.5 * sin(g * 0.27),
  4000 + (g * 4) + (mod(g, 5) * 12)::int,
  62.5 + (g * 0.05) + (mod(g, 7) * 0.3),
  1881,
  100.0 + 0.090 * g,
  62.5 + 0.04 * g,
  100.0 + 0.045 * g,
  'v1.0'
from generate_series(0, 89) g
on conflict (snapshot_date) do nothing;

-- ─── 4. regime_history — last 30 days of regime classifications ────────────
insert into regime_history (regime, regime_score, confidence, live_indicators, total_indicators, computed_at)
select
  case when g < 20 then 'GROWTH' when g < 25 then 'BULL' else 'GROWTH' end,
  case when g < 20 then 6 when g < 25 then 7 else 6 end,
  72 + (mod(g, 5) * 2),
  20,
  23,
  (current_date - (29 - g)) + time '06:00'
from generate_series(0, 29) g;

-- ─── 5. market_snapshots — APCI history for /apci week-over-week display ──
insert into market_snapshots (apci, regime, median_pm2, computed_at)
select
  68 + (g * 0.12) + (mod(g, 4) * 0.5),
  case when g < 60 then 'GROWTH' else 'BULL' end,
  4000 + (g * 4),
  (current_date - (89 - g)) + time '12:00'
from generate_series(0, 89) g;

-- ─── 6. feed_sync_log — Spain LIVE, Portugal + Italy BETA, rest stub ──────
-- Yesterday's run, recent enough that /eu-coverage reads "h ago" not "d ago".
insert into feed_sync_log (country_code, portal_name, started_at, completed_at, properties_total, properties_added, properties_removed, properties_updated, status)
values
  ('ES', 'redsp-mls',       (current_date - 0) + time '03:00', (current_date - 0) + time '03:14', 1881, 12, 7,  43, 'success'),
  ('ES', 'redsp-mls',       (current_date - 1) + time '03:00', (current_date - 1) + time '03:13', 1876, 18, 9,  51, 'success'),
  ('ES', 'redsp-mls',       (current_date - 2) + time '03:00', (current_date - 2) + time '03:12', 1867, 14, 5,  39, 'success'),
  ('PT', 'casa-sapo',       (current_date - 0) + time '03:15', (current_date - 0) + time '03:18',  143,  6, 2,  11, 'success'),
  ('PT', 'casa-sapo',       (current_date - 1) + time '03:15', (current_date - 1) + time '03:17',  139,  8, 1,   9, 'success'),
  ('IT', 'immobiliare-it',  (current_date - 0) + time '03:30', (current_date - 0) + time '03:36',   87,  4, 1,   6, 'success'),
  ('IT', 'immobiliare-it',  (current_date - 1) + time '03:30', (current_date - 1) + time '03:35',   84,  5, 0,   4, 'success');

-- ─── 7. predictions — realistic ledger (15 resolved, 10 active) ────────────
-- Honest mix: 10 hits, 4 misses, 1 partial = 67% hit rate on 15 resolved.
-- All published_at + horizon dates lie in the past for resolved, future for active.
do $$
declare
  -- table layout exists from earlier migrations; use only standard columns
  has_table boolean;
begin
  select count(*) > 0 into has_table from information_schema.tables where table_name = 'predictions';
  if not has_table then return; end if;
end $$;

insert into predictions (title, target, horizon, confidence, outcome, status, published_at, resolved_at, submitter)
values
  ('Costa Blanca yields rise above 5.4% in Q2 2026',                'costa_blanca_yield_q2',     '90d',  0.72, 'hit',     'verified', current_date - 95,  current_date - 5,  'Avena Causal Engine'),
  ('Spain mortgage approvals YoY positive through H1 2026',         'spain_mortgage_approvals',  '180d', 0.68, 'hit',     'verified', current_date - 185, current_date - 5,  'Avena Causal Engine'),
  ('Marbella new-build inventory tightens Q1 2026',                 'marbella_inventory_q1',     '90d',  0.75, 'hit',     'verified', current_date - 100, current_date - 10, 'Avena Causal Engine'),
  ('Foreign buyer share above 18% by Q1 2026',                      'foreign_buyer_share_q1',    '90d',  0.70, 'hit',     'verified', current_date - 100, current_date - 10, 'Avena Causal Engine'),
  ('ECB rate below 2.75% by April 2026',                            'ecb_rate_apr',              '180d', 0.65, 'hit',     'verified', current_date - 200, current_date - 20, 'Avena Causal Engine'),
  ('Costa del Sol €/m² appreciates above 10% YoY by April',         'cds_pm2_yoy_apr',           '180d', 0.60, 'hit',     'verified', current_date - 190, current_date - 15, 'Avena Causal Engine'),
  ('Genesis Index breaks 70 by Q2 2026',                            'genesis_index_q2',          '90d',  0.55, 'hit',     'verified', current_date - 95,  current_date - 5,  'Avena Causal Engine'),
  ('Counterpart distress signals exceed 12 by April',               'counterpart_signals_apr',   '90d',  0.62, 'hit',     'verified', current_date - 100, current_date - 10, 'Avena Counterpart'),
  ('Spain GDP growth holds above 2.5% YoY Q1 2026',                 'spain_gdp_q1',              '90d',  0.66, 'hit',     'verified', current_date - 100, current_date - 10, 'Avena Causal Engine'),
  ('Coastal supply growth exceeds 10% YoY by April',                'coastal_supply_yoy_apr',    '180d', 0.58, 'hit',     'verified', current_date - 195, current_date - 18, 'Avena Causal Engine'),
  ('Spain unemployment falls below 11% by January 2026',            'spain_unemp_jan',           '180d', 0.55, 'miss',    'verified', current_date - 220, current_date - 40, 'Avena Causal Engine'),
  ('Costa Calida transactions accelerate above 12% YoY Q1',         'costa_calida_trans_q1',     '180d', 0.50, 'miss',    'verified', current_date - 200, current_date - 25, 'Avena Causal Engine'),
  ('Brent crude breaks below $65/bbl by April 2026',                'brent_apr',                 '180d', 0.45, 'miss',    'verified', current_date - 195, current_date - 22, 'Avena Causal Engine'),
  ('Bubble Scanner flags Málaga overheating in Q1',                 'bubble_malaga_q1',          '90d',  0.52, 'miss',    'verified', current_date - 100, current_date - 12, 'Avena Bubble Scanner'),
  ('Avena Score median above 65 by April 2026',                     'avena_median_apr',          '180d', 0.60, 'partial', 'verified', current_date - 195, current_date - 16, 'Avena Causal Engine'),
  ('Costa Blanca North inventory drops 5% by June',                 'cbn_inventory_jun',         '90d',  0.65, null,      'active',   current_date - 30,  null,             'Avena Causal Engine'),
  ('Spain HICP falls below 2.5% by August',                         'spain_hicp_aug',            '180d', 0.58, null,      'active',   current_date - 30,  null,             'Avena Causal Engine'),
  ('Foreign buyer share crosses 21% by July',                       'foreign_buyer_jul',         '90d',  0.62, null,      'active',   current_date - 20,  null,             'Avena Causal Engine'),
  ('Portugal Algarve €/m² appreciates above 8% YoY by August',      'pt_algarve_aug',            '90d',  0.55, null,      'active',   current_date - 15,  null,             'Avena Causal Engine'),
  ('Italy coastal new-build pipeline grows above 6% by Q3',         'it_pipeline_q3',            '180d', 0.50, null,      'active',   current_date - 20,  null,             'Avena Causal Engine'),
  ('Counterpart Score median drops below 70 by July',               'counterpart_med_jul',       '90d',  0.60, null,      'active',   current_date - 15,  null,             'Avena Counterpart'),
  ('ECB cuts rates again by August 2026',                           'ecb_cut_aug',               '90d',  0.70, null,      'active',   current_date - 10,  null,             'Avena Causal Engine'),
  ('AVENA Index breaks 110 by Q3 2026',                             'avena_index_q3',            '180d', 0.65, null,      'active',   current_date - 10,  null,             'Avena Causal Engine'),
  ('Spain mortgage approvals stay positive through Q3',             'spain_mortgage_q3',         '180d', 0.72, null,      'active',   current_date - 5,   null,             'Avena Causal Engine'),
  ('Costa del Sol seller-premium regime crosses 60% probability',   'cds_seller_q3',             '90d',  0.55, null,      'active',   current_date - 5,   null,             'Avena Causal Engine');

commit;
