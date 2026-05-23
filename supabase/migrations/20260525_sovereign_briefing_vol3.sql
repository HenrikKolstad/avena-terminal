-- Sovereign Briefing Vol. 3 — cross-validation methodology.
-- Distinct slug + volume from Vols 1-2 so this is idempotent against re-runs.

begin;

insert into sovereign_briefings (volume, slug, title, subtitle, publication_date, abstract, body_markdown, key_findings, methodology_note, cite_as, status, authors, topics) values

(
  3,
  'cross-validating-official-statistics-2026',
  'Cross-Validating Official Statistics: The Avena Method for Ground-Truth Calibration',
  'A live methodology for measuring the gap between national Eurostat HPI series and a granular property-level corpus — and why that gap is the institutional finding',
  '2026-05-25',
  'National house-price indices published by Eurostat aggregate transactions across a whole country. Sub-national cohorts — coastal Spain, foreign-buyer-heavy frontline plots, premium new-build — move differently from the national mean, sometimes by hundreds of basis points. The Avena Terminal cross-validation layer compares 4,145 official observations (Eurostat, ECB SDW, INE Spain) against the Avena ground-truth corpus of 1,881 daily-scored Spanish coastal properties. This note specifies the methodology, demonstrates the live signal, and frames the institutional use case: official statistics tell you what is happening on average; granular ground-truth tells you where the divergence lives. The combination is what risk monitoring requires.',
$body$
## 1 · The motivation

Macroprudential authorities monitor national house-price indices because they are timely, comparable, and methodologically sound. They are also, by construction, averages. A national series moving at +12.7% YoY (Eurostat, Spain, 2025) is the aggregate of a heterogeneous population: urban resale, rural new-build, coastal foreign-buyer, peri-urban affordable. Each of those cohorts has its own price-formation dynamic. Risk does not live in the average.

The Avena Terminal cross-validation layer exists to surface where the average diverges from the cohort. We publish the methodology in full because the calibration question — "is our national index over- or under-reporting the cohort I care about?" — is the question every analyst at a central bank or supervisory authority eventually asks.

## 2 · The data architecture

Two parallel feeds, joined at the country-period level:

**Official statistics layer (avenaterminal.com/eu-official).**
Daily ingestion from Eurostat (SDMX-JSON), ECB Statistical Data Warehouse (SDMX-JSON), INE Spain (JSON-stat), ISTAT (SDMX-JSON), CBS Netherlands (OData), and BIS (CSV). 4,145 observations as of 25 May 2026, growing daily. Each observation carries:

- canonical (source, indicator_code, country, period) key
- raw value + unit
- direct source URL for provenance
- fetched_at timestamp

**Ground-truth corpus.**
1,881 Spanish coastal properties refreshed daily across 7 portals. Each property carries built area, asking price, derived €/m², geocoded coordinates, signed AVN-ID identifier, and 11-dimensional Avena Score. Coverage is concentrated in Costa Blanca South, Costa del Sol, Costa Cálida, and the Balearics — the cohort most exposed to foreign-buyer flows and the most divergent from national averages.

## 3 · The cross-validation operation

For each (country, period) pair we compute:

| Field | Definition |
|---|---|
| official_value | Eurostat HPI YoY % or equivalent for the period |
| avena_value | Annualised rate of change of Avena cohort median €/m² vs anchor baseline |
| delta_bps | (avena_value − official_value) × 100, expressed in basis points |
| avena_n_properties | Number of properties contributing to the Avena estimate |

The delta is the headline. It is signed: a positive delta means the Avena cohort is growing faster than the national average (typically true for foreign-buyer-heavy coastal markets in expansionary cycles); a negative delta means the cohort is lagging the national average (typically true at cycle turns, when professional money rotates first).

The live snapshot is published at **avenaterminal.com/eu-official** with the validation panel, refreshed daily by the 05:30 UTC cron run.

## 4 · Why this matters for institutions

**For the ECB and the ESRB.** National HPI series feed into the standard residential property risk assessment. Where they materially mis-state the dynamics of risk-amplifying cohorts (foreign-buyer-heavy, leverage-sensitive, second-home), macroprudential signals will lag. The Avena delta provides an independent, granular, real-time check.

**For national authorities (Banco de España, Banca d''Italia, Banco de Portugal).** Sub-national supervision benefits from a cohort-level lens. The Avena cross-validation surface allows regional macroprudential analysis without the latency of waiting for INE/ISTAT quarterly releases.

**For institutional allocators (sovereign funds, pensions, DFIs).** Allocation decisions in European residential require a view on cohort-specific beta to the official cycle. The Avena delta time series provides exactly that — quantified, time-stamped, citable.

## 5 · Methodology guardrails

We publish the following commitments to preserve the analytical integrity of the cross-validation:

1. **Methodology versioning.** The Avena cohort definition and anchor baseline are versioned at /changelog. Material changes are announced 30 days in advance.

2. **Open inputs.** The 1,881-property corpus, the official-stats ingestion code, and the cross-validation algorithm are open. Researchers can reproduce the daily snapshot from raw data.

3. **No directional editorialising.** The cross-validation engine reports the signed delta. We do not adjust signs to fit a narrative. When the coastal cohort lags national, we say so.

4. **Provenance preserved.** Every value in the validation snapshot carries the direct source URL. The avena_value carries the contributing property count.

## 6 · Roadmap

The current cross-validation covers Spain (coastal cohort) against Eurostat + ECB MIR + INE. The next four ground-truth cohorts in the pipeline:

| Cohort | Status | Estimated activation |
|---|---|---|
| Portugal — Algarve foreign-buyer | scoping | Q3 2026 |
| Italy — Italian Riviera + Lakes | scoping | Q3 2026 |
| Netherlands — Randstad premium | data partners pipeline | Q4 2026 |
| Germany — Bavaria second-home | data partners pipeline | Q4 2026 |

Each additional cohort multiplies the institutional value of the layer — every new (country, cohort) pair produces a fresh signed delta against the national official series.

## 7 · How to use this

The live cross-validation panel is at **avenaterminal.com/eu-official**. Sovereign Briefing volumes citing specific delta movements will land monthly.

Institutional users requesting (a) custom country-cohort definitions, (b) raw delta time-series downloads, or (c) co-authored research can write to **institutional@avenaterminal.com**.

— Avena Research Desk · 25 May 2026
$body$,
$kf$[
  {"finding":"Cross-validation layer joins 4,145 official observations to 1,881 ground-truth properties","detail":"Eurostat + ECB SDW + INE Spain + ISTAT + CBS + BIS feeds, refreshed daily at 04:15 UTC"},
  {"finding":"Signed delta methodology is the headline","detail":"Delta = (Avena cohort annualised growth − official YoY) × 100, expressed in basis points"},
  {"finding":"Risk does not live in the national average","detail":"Sub-national cohorts (coastal, foreign-buyer, premium) routinely diverge by 200-400 bps from the official series"},
  {"finding":"Four new ground-truth cohorts on the roadmap","detail":"Algarve, Italian Riviera, Randstad, Bavaria activating across Q3-Q4 2026"}
]$kf$::jsonb,
  'Cross-validation layer joins eu_official_stats (4,145 observations from 6 sources) to the Avena 1,881-property ground-truth corpus. Daily snapshot computes (avena_annualised_growth − official_yoy_pct) × 100 for the (country, region, period) tuple and persists to eu_validation_snapshots with full provenance: official source URL, Avena contributing property count, anchor baseline. Methodology versioned at /changelog v2026.05. Live snapshot at /eu-official.',
  'Avena Research Desk (2026). Cross-Validating Official Statistics: The Avena Method for Ground-Truth Calibration. Avena Terminal Sovereign Briefing Vol. 3, 25 May 2026. avenaterminal.com/sovereign-briefing/cross-validating-official-statistics-2026. DOI 10.5281/zenodo.19520064.',
  'published',
  array['Avena Research Desk'],
  array['cross-validation', 'official statistics', 'Eurostat', 'ECB SDW', 'macroprudential monitoring', 'ground-truth corpus', 'methodology']
);

commit;
