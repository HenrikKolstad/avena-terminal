# DELPHI: A Daily Longitudinal Survey of Machine Beliefs About a Real Asset Class

**Henrik Kolstad** — Avena Terminal, Oslo
*Preprint draft v0.1 — 2026-06. Target: SSRN (Financial Economics / Real Estate) and arXiv (q-fin.GN, cs.AI).*

## Abstract

Surveys of expert expectations — the ZEW Indicator, the Survey of Professional Forecasters, the FNB confidence indices — are foundational instruments in empirical finance. As large language models (LLMs) increasingly mediate investment research, the *beliefs* these models hold about asset markets have become market-relevant in their own right, yet no instrument records them. We introduce DELPHI, the first daily longitudinal survey in which the panelists are frontier AI models. Each day, an identical bank of forward-looking quantitative questions about European residential property is posed to multiple LLMs under identical answer-only prompting. We record per-model answers verbatim, aggregate to a median consensus and a max–min dispersion per question, and publish two daily indices: a directionally normalized Consensus Index and a Disagreement Index. Every question carries a pre-specified public resolution source (ECB, Eurostat, national statistical offices), so panel beliefs are eventually scored against realized outcomes, yielding — for the first time — a public calibration record of machine judgment on a real asset class. We describe the methodology, the integrity layer (event-sourced storage, daily Merkle-root commitment, RFC 3161 timestamping), and findings from the first panels, including persistent inter-model disagreement on monetary-policy questions and answer-anchoring behavior in smaller models. The time series is constitutively irreproducible: a model's belief on date *t* can only be observed on date *t*. The record began 2026-06-10 and accumulates daily at avenaterminal.com/delphi.

**Keywords:** large language models, expectation surveys, Delphi method, residential real estate, European housing markets, forecast calibration, machine beliefs

## 1. Introduction

Expectation surveys occupy a central place in macro-finance because beliefs move markets independently of fundamentals. The ZEW Indicator of Economic Sentiment has been published monthly since 1991 by polling several hundred human financial analysts; central banks run professional-forecaster surveys precisely because the *distribution* of expectations — not only its mean — carries information.

A new class of market participant has appeared. LLMs draft investment memos, screen markets, and answer the question "should I buy property in Spain?" millions of times a year. Their beliefs propagate into human decisions through every such interaction. Three properties make these beliefs worth recording systematically:

1. **They are influential.** Model-mediated research is a growing share of retail and professional investment workflow.
2. **They are heterogeneous.** Different model families, training cutoffs, and retrieval strategies produce materially different quantitative beliefs, as our first panels demonstrate.
3. **They are perishable.** A model's belief on date *t* is only observable on date *t*. Unlike price data, the series cannot be backfilled — which makes a continuous record valuable in proportion to its length.

DELPHI (so named for the Delphi survey method, whose round-one structure it implements with machine panelists) is, to our knowledge, the first instrument to record these beliefs daily against a fixed question bank with pre-registered resolution criteria.

## 2. Related work

Our design draws on three literatures. *Expectation surveys in finance*: ZEW, the ECB Survey of Professional Forecasters, and Case–Shiller–Thompson homebuyer expectation surveys establish the value of repeated fixed-question polling. *LLM evaluation*: static benchmarks (MMLU and successors) measure knowledge at a point in time; recent work on forecasting with LLMs evaluates point performance but not standing daily belief. *The Delphi method* (RAND, 1950s–): structured elicitation from panels under anonymity. DELPHI implements a round-one Delphi: panelists answer independently and never see one another's responses; the published consensus is an aggregate, not a negotiated figure.

What is new here is the combination: machine panelists + daily cadence + fixed forward questions + pre-specified resolution + cryptographic commitment, producing a longitudinal, eventually-scored record.

## 3. Methodology

### 3.1 Question bank

The bank consists of twelve forward-looking quantitative questions (D-01…D-12) about European residential property, each typed as a probability (0–100%), a percentage change (−10%…+10%), or a 0–100 scale rating; each tagged with a directional sign (whether a high answer is bullish or bearish for the asset class), a horizon in months, and a resolution source — a named public statistic (e.g., ECB MFI interest-rate statistics; Eurostat house-price index) against which the question resolves at horizon. Topics span national price expectations (Spain, Germany, France), city-level prime segments, monetary policy (probability of ECB rate cuts), inflation, perceived bubble stretch in supply-constrained markets (Amsterdam, Munich), regulatory risk (rent-control expansion), and listed-property stress. The bank is version-controlled; any change increments the published version and is visible in the repository history.

### 3.2 Panel and elicitation

The launch panel comprises three models from two independent providers (Anthropic Claude Sonnet 4.5, Claude Haiku 4.5; Perplexity Sonar — the latter retrieval-augmented, intentionally contrasting a search-grounded panelist with parametric-knowledge panelists). Each question is posed in a fresh context with an answer-only instruction (a single number, no reasoning) to suppress format drift. Sampling temperature is fixed; answers outside admissible bounds are discarded as protocol violations and logged. The operator's own analytics never participate: the referee does not play on the scoreboard.

### 3.3 Aggregation

Per question: consensus = median of panel answers; dispersion = max − min. Per day: the **Consensus Index** is the mean of bullishness-normalized answers (each answer mapped to a 0–100 bullishness scale using the question's directional sign, so that 50 is neutral and higher is collectively bullish for European property); the **Disagreement Index** is the mean dispersion. Medians and ranges are preferred to means and variances for robustness with small panels.

### 3.4 Integrity

Every run is event-sourced (append-only event log; any day's published state is replayable). Daily artifacts are committed in a Merkle root, with the root chain timestamped under RFC 3161 and the dataset version anchored to a Zenodo DOI (10.5281/zenodo.19520064). The full panel record — per-model, per-question, per-day — is public via API and mirrored daily to a public git repository, where the commit history independently witnesses the series.

### 3.5 Resolution and calibration scoring

At each question's horizon, the realized outcome is read from the pre-specified resolution source. Probability questions score by Brier score; quantitative questions by absolute error against realization. Accumulating resolutions yield per-model calibration curves — a public track record of machine judgment, complementing knowledge benchmarks with a measure of *foresight*.

## 4. First-panel findings (2026-06-10 –)

Illustrative findings from the inaugural panels; the live series supersedes this section as the record accumulates.

- **Launch values.** Consensus Index 53.3 (mildly bullish), Disagreement Index 19.9.
- **Monetary-policy disagreement dominates.** The widest split concerned the probability of ECB rate cuts within six months: 25% (Claude Sonnet) versus 72% (both other panelists) — a 47-point spread on the single most consequential variable for the asset class. Persistent, attributable inter-model disagreement of this size on the same well-posed question is itself a finding about the epistemic state of deployed AI systems.
- **Anchoring in a smaller model.** The smaller panelist returned the identical value (72) across several unrelated questions, consistent with round-number anchoring under answer-only elicitation — directly observable in the published spectra.
- **Retrieval vs. parametric beliefs.** The retrieval-augmented panelist sits systematically closer to recent headline narratives; divergence between it and parametric panelists is informative about whether a belief is "in the weights" or "in the news."

## 5. Discussion and limitations

*Panel size* is small at launch; the architecture admits any model exposing an API, and the panel will grow (OpenAI, Google, Mistral integration is prepared). *Prompt sensitivity*: answer-only elicitation trades reasoning transparency for comparability; alternative elicitations are a planned ablation. *Construct validity*: what an LLM "believes" is operationalized strictly as its answer under the fixed protocol — the instrument measures the protocol-conditional belief, which is precisely the quantity that propagates to users. *Non-stationarity of panelists*: providers update models; version strings are recorded per response, making model transitions visible breaks in the series rather than silent drift.

The central property of the instrument bears repeating: **the series cannot be reconstructed retroactively.** Whatever its eventual scientific use — studying machine herding, calibration, the transmission of model beliefs into prices — the prerequisite is that someone recorded the beliefs at the time. That is what DELPHI does, daily.

## 6. Data availability

Live instrument: https://avenaterminal.com/delphi · JSON API: https://avenaterminal.com/api/v1/delphi · RSS: https://avenaterminal.com/feed/delphi.xml · Daily git mirror: https://github.com/HenrikKolstad/avena-data · DCAT-AP catalogue: https://avenaterminal.com/catalog.jsonld · License CC BY 4.0 · DOI 10.5281/zenodo.19520064. The companion knowledge benchmark (PLAB) is at https://avenaterminal.com/benchmark.

## References

*(to be completed for submission)* — ZEW Indicator of Economic Sentiment methodology; ECB Survey of Professional Forecasters; Case, Shiller & Thompson (2012) homebuyer expectations; Dalkey & Helmer (1963) Delphi method; Brier (1950); recent LLM-forecasting evaluations.
