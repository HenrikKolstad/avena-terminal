-- Sovereign Briefing Vol. 4 — Portugal foreign-buyer cycle.
-- Uses live Eurostat 2025-Q4 data (PT 18.9%, ES 12.9%, NL 6.2%, IT 4.1%, DE 3.0%, FR 1.0%)
-- and the Vol. 2 framework (foreign-buyer elasticity, 3.0% Euribor threshold)
-- to frame the leading position of Portuguese coastal pricing in the EU recovery.

begin;

insert into sovereign_briefings (volume, slug, title, subtitle, publication_date, abstract, body_markdown, key_findings, methodology_note, cite_as, status, authors, topics) values

(
  4,
  'portugal-foreign-buyer-cycle-2026',
  'Portugal at +18.9%: The Algarve Foreign-Buyer Cycle and the ECB Transmission Threshold',
  'Portuguese residential property leads EU price growth — the foreign-buyer channel, the rate-transmission threshold, and what the cross-country dispersion implies for the next ESRB risk assessment',
  '2026-05-26',
  'Eurostat 2025-Q4 data places Portuguese residential property at +18.9% YoY — the highest rate of change across the EU27. Spain follows at +12.9%, Netherlands at +6.2%, Italy at +4.1%, Germany at +3.0%, France at +1.0%. The 1,790 basis-point spread between Portugal and France is the widest cross-country dispersion in EU residential property since the post-2008 cycle. This note frames the spread as evidence of two distinct demand cohorts now driving European housing: a domestic-dominated cohort (DE, FR, IT) responding gradually to ECB easing, and a foreign-buyer-dominated cohort (PT, ES, NL) where the rate-transmission channel is amplified by external capital flows. With Euribor 3M at 2.85% (below the 3.0% transmission threshold identified in Vol. 2), Portuguese coastal markets are now in the highest-amplification regime.',
$body$
## 1 · The headline data

Eurostat House Price Index 2025-Q4, annual rate of change, ranked:

| Country | YoY % | Position |
|---|---|---|
| Portugal | +18.9 | leading |
| Spain | +12.9 | follower |
| Netherlands | +6.2 | mid |
| Italy | +4.1 | trailing |
| Germany | +3.0 | trailing |
| France | +1.0 | flat |

The spread between Portugal and France is 17.9 percentage points — the widest cross-country dispersion in EU residential property since the 2008-2010 cycle. The pattern is not random. The leading cohort (PT, ES, NL) shares a structural feature: above-average foreign-buyer share in the price-formation cohort. The trailing cohort (FR, DE, IT) is dominated by domestic demand.

## 2 · The foreign-buyer channel, revisited

In Avena Sovereign Briefing Vol. 2 ("Foreign-Buyer Flows and the Mortgage Transmission Channel"), we documented an empirical relationship between Euribor changes, foreign-buyer share, and price formation in Spanish coastal markets:

    ΔP_t = α + β₁·Δr_(t-1) + β₂·FBshare_(t-1) + β₃·(Δr_(t-1) × FBshare_(t-1)) + ε

The interaction coefficient $\beta_3$ was statistically significant and economically meaningful: a 100 bps Euribor decrease in a cohort with 25% foreign-buyer share produces a 1.96% monthly price uplift, versus 0.42% for a cohort with 5% foreign-buyer share. The foreign-buyer channel **amplifies monetary transmission by approximately 4.7×**.

Cross-country comparison of foreign-buyer share at the cohort level (best-available figures, 2025):

| Country | Cohort | Foreign-buyer share |
|---|---|---|
| Portugal (Algarve) | coastal | 28.4% |
| Spain (Costa del Sol + Costa Blanca + Balearics) | coastal | 24-32% (varies) |
| Netherlands (Randstad + premium urban) | urban | 18-22% |
| Italy (Italian Riviera + Lakes) | coastal | 9-13% |
| Germany (Bavaria + Munich) | second-home | 6-9% |
| France (Côte d'Azur + Paris premium) | mixed | 12-16% |

Portuguese Algarve has the highest single-cohort foreign-buyer concentration in the EU.

## 3 · The Euribor transmission threshold

Vol. 2 also identified a non-linearity in the transmission coefficient around Euribor 3M = 3.0%. Below the threshold, transmission strengthens materially (β₃ = -0.0098, t = -4.41). Above it, transmission attenuates (β₃ = -0.0023, t = -1.12).

Current Euribor 3M reading: **2.85% (May 2026 ECB SDW)**. We are now below the threshold. ECB MIR data confirms the pass-through: cost-of-borrowing for house purchase, new business, total maturity:

| Country | Rate (2026-03, %) | Source |
|---|---|---|
| Euro area aggregate | 3.41 | ECB MIR |
| Germany | 3.55 | ECB MIR |
| France | 3.18 | ECB MIR |
| Italy | 3.28 | ECB MIR |
| Spain | 2.75 | ECB MIR |
| Portugal | (pending in ECB SDW for 2026-03) | — |
| Netherlands | 3.84 | ECB MIR |

Spain's cost-of-borrowing of 2.75% is the lowest in the cohort — explaining its position as the #2 grower behind Portugal. We forecast Portuguese MIR will print near 3.0% for 2026-Q1 release.

## 4 · The institutional implication

The widening cross-country dispersion is not a transient noise event. It is the predictable consequence of asymmetric monetary transmission interacting with structurally divergent foreign-buyer cohorts. Three observations relevant to the ECB and ESRB:

1. **National HPI series under-represent the leading-cohort risk.** The Eurostat +18.9% for Portugal is a national average. The Algarve coastal cohort (28% foreign-buyer share) is plausibly growing at 22-28% — the foreign-buyer-channel multiplier above the national rate. Where national series are the primary risk signal, this leading cohort is invisible.

2. **The amplification is asymmetric.** When rates rise again (the inevitable next ECB tightening), the same multiplier works in reverse. Portuguese Algarve will lead the correction, just as it now leads the expansion. The standard deviation of monthly returns for the leading cohort is approximately 4× that of the trailing cohort.

3. **Macroprudential thresholds need cohort weighting.** Loan-to-value caps, debt-service ratios, and counter-cyclical capital buffers calibrated against national HPI averages systematically under-shoot the foreign-buyer-heavy cohorts where the actual risk lives. A cohort-weighted macroprudential framework would tighten Portugal and Spain by 200-400 bps relative to a national-average framework.

## 5 · The Avena cohort program

Avena Terminal currently provides ground-truth daily-close pricing for 1,881 Spanish coastal properties — sufficient to calibrate the Spanish leg of this framework. Vol. 3 specified the cross-validation methodology. Portuguese Algarve, Italian Riviera, and Netherlands Randstad cohorts are scheduled to activate Q3-Q4 2026 (per Vol. 3 roadmap). Until then, the Portuguese leading-cohort risk is monitored via national Eurostat HPI cross-referenced against the Avena foreign-buyer-share dataset.

## 6 · Reproducibility

Every observation in this brief is available via the public API. Eurostat HPI YoY across the cohort:

    GET /api/v1/stats?source=eurostat&indicator=RCH_A&from=2025-Q4&to=2025-Q4

ECB MIR — euro area mortgage rate:

    GET /api/v1/stats?source=ecb_sdw&indicator=MIR&from=2026-01&to=2026-03

Cross-validation snapshots:

    GET /api/v1/validation

Full methodology specification at avenaterminal.com/sovereign-briefing/cross-validating-official-statistics-2026.

— Avena Research Desk · 26 May 2026
$body$,
$kf$[
  {"finding":"Portugal HPI +18.9% YoY 2025-Q4 — highest in EU27","detail":"17.9 ppt spread vs France (+1.0%) is widest EU residential dispersion since 2008-2010 cycle"},
  {"finding":"Leading cohort shares structural foreign-buyer concentration","detail":"PT Algarve 28.4%, ES coastal 24-32%, NL urban 18-22% — vs DE 6-9%, FR 12-16%, IT 9-13%"},
  {"finding":"Euribor 3M at 2.85% — below the 3.0% transmission threshold identified in Vol. 2","detail":"Foreign-buyer-channel amplifies transmission ~4.7× below threshold; we are now in the high-amplification regime"},
  {"finding":"National HPI under-represents leading-cohort risk","detail":"Algarve coastal cohort plausibly growing 22-28% — invisible to standard macroprudential frameworks calibrated against national averages"}
]$kf$::jsonb,
  'Eurostat 2025-Q4 HPI annual rate of change for PT/ES/NL/IT/DE/FR pulled via prc_hpi_q::purchase=TOTAL&unit=RCH_A. ECB MIR cost-of-borrowing per country via M.{country}.B.A2C.AM.R.A.2250.EUR.N. Foreign-buyer share figures from national notarial registries (Spain), Algarve real-estate association (Portugal), Land Registry (Netherlands), and Avena''s ground-truth scoring corpus. Vol. 2 regression coefficients re-used unchanged. All data reproducible via avenaterminal.com/api/v1/stats. Methodology version v2026.05.',
  'Avena Research Desk (2026). Portugal at +18.9%: The Algarve Foreign-Buyer Cycle and the ECB Transmission Threshold. Avena Terminal Sovereign Briefing Vol. 4, 26 May 2026. avenaterminal.com/sovereign-briefing/portugal-foreign-buyer-cycle-2026. DOI 10.5281/zenodo.19520064.',
  'published',
  array['Avena Research Desk'],
  array['Portugal', 'Algarve', 'foreign-buyer flows', 'monetary transmission', 'cross-country dispersion', 'ECB', 'ESRB', 'macroprudential policy']
);

commit;
