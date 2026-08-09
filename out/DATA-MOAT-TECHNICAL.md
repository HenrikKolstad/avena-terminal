# Avena Terminal — the data moat, in technical terms

*Written 2026-08-09 for a technical reader with no prior context. Every figure
was verified against the production database on the date of writing. Where a
number is weaker than it sounds, that is stated inline rather than in a
footnote — the argument only works if the numbers survive checking.*

---

## 1. The thesis in one paragraph

Spanish coastal new-build listing data is **ephemeral**. A unit is listed at a
price, repriced one or more times, and then delisted when it sells or is
withdrawn. At that moment the record of what it asked, and when, ceases to
exist in any public system. Spain's Registro de la Propiedad records
*transfers*, not listing histories, and is not published at unit level.
Portals (Idealista, Kyero, ThinkSpain) delete or overwrite. The feed Avena
consumes is a **stateless snapshot**: it describes what is on the market right
now and carries no memory of what was on it yesterday.

Avena re-reads that feed nightly and writes down what it saw. That means each
night produces one row of history that **cannot be reconstructed afterwards by
anyone, at any price**. This is the entire moat. It is not an algorithm, a
model, or a UI — those are all reproducible. It is an append-only observation
record of a market that destroys its own history daily.

The corollary that matters commercially: a competitor with unlimited capital
starting tomorrow does not begin *N* days behind. They begin at **zero**, and
the gap widens by one day per day, permanently. There is no acquisition, no
scraping run, and no data purchase that closes it.

---

## 2. Data architecture

### 2.1 Ingestion

```
RedSP XML feed (~83MB)
   ↓  parse-feed.js, nightly 01:37 UTC via GitHub Actions
   ↓  guards: 3 retries w/ backoff, reject non-2xx, reject body < 1MB,
   ↓          reject empty parse, exit(1) on any failure
public/data.json   — 1,996 units, 31 fields, committed to git
   ↓
Vercel deploy (git push triggers)   +   Supabase writes (cron @ 02:20 UTC)
```

`public/data.json` being **committed to git** is load-bearing and easy to miss:
the git history of that one file is itself a daily snapshot series with
cryptographic ordering, independent of the database. It is a second copy of the
moat with a different failure mode.

### 2.2 Tables (verified counts, 2026-08-09)

| Table | Rows | Grain | What it is |
|---|---:|---|---|
| `price_snapshots` | 9,967 | ref × date | Price, €/m², town, type per unit per day. **The ground truth for price movement.** |
| `sold_properties` | 21 | ref | Delisting ledger: units that left the feed, with last observed price and date |
| `score_history` | 201,784 | ref × date | Avena Score, price, €/m², yield per unit per day since 2026-04-25 |
| `property_pricing_history` | 394,000 | event | Intended as a price-move event log. **See §4 — it contains zero move events.** |
| `property_transactions` | 396,592 | transaction | Registered sale prices, French DVF open data 2023–2024. All rows `source='dvf-fr'` |
| `gsc_daily` / `gsc_pages` | 90 / — | date | Search Console visibility, captured because Google retains only 16 months |
| `citation_monitoring` | 5,454 | question × date | Whether AI engines cite Avena, measured against a fixed question bank |

### 2.3 Derivation, not storage

Avena Score and gross yield are **computed at runtime** by `initProperty()`,
never persisted in `data.json`. Consequence: a methodology change re-scores the
entire book instantly and consistently, and there is no drift between stored
and computed values. `score_history` persists the *output* per day so the
scoring history is auditable, but the book itself stays a pure input.

### 2.4 The hedonic model

OLS regression on €/m² with town dummies (≥8 observations per town), log-area,
beach distance, sea view, bedrooms, villa indicator, pool, energy rating,
frontline category. Tier-segmented (Budget <€200k / Mid €200–500k / Premium
€500k–1M / Luxury €1M+) with a global fallback. R² and RMSE reported per run.

A lightweight runtime AVM (town × type median €/m² with multiplicative
adjustments) approximates it in <50ms for interactive use. Its accuracy is
**measured nightly** against the whole book and published at
`/model-stats.json`:

```
median absolute error   15.8%
MAPE                    21.3%
within ±20%             60.1%
mean bias               +3.7%
```

In-sample, against **asking** prices. Both caveats are published with the
figures. Context for the 15.8%: Norwegian estate agents achieve ~5.3% in the
world's most transparent housing market with full transaction data. Avena's
target is Spanish coastal new-build, where transacted prices are not public and
roughly half the stock is not yet built.

---

## 3. What compounds, and how fast

Verified genuine observation record as of 2026-08-09:

```
observation days              5        (2026-08-05 → 2026-08-09)
units under observation   2,027
price moves recorded         48        refs whose observed price changed
delistings recorded          21
```

**Five days is a small number and should be stated as such.** The argument is
not the level — it is the derivative and the irreversibility. Every night adds
2,000 observations that nobody else is taking. At ~10 price moves and ~4
delistings per day, ninety days produces roughly 900 observed repricings and
360 absorption events on a segment where no such dataset exists publicly.

Growth is linear in time and cannot be parallelised, bought, or backfilled.
That is an unusual property for a data asset and it is the whole investment
case.

---

## 4. Known weaknesses, stated plainly

A moat argument that hides its own holes is worth nothing, because the first
serious technical reader finds them in an hour.

**`property_pricing_history` contains no move events.** 394,000 rows across
1,720 refs, every one `status='listed'`, zero `reduced` or `increased`. Two
bugs caused it: the prior snapshot was looked up as the *global* max
`snapshot_date` and discarded whenever that max was today (so any same-day
re-run diffed against nothing), and every write did `if (!error) count += chunk`
so a failed insert was indistinguishable from no data. Both fixed 2026-08-08.
The table's row count is therefore **not** a measure of history — all price
movement figures are derived from `price_snapshots` by counting distinct
prices per ref.

**`score_history` has 107 days of rows but only 5 days of genuine price
series.** From 2026-04-25 to 2026-08-04 it wrote a frozen `properties_registry`
snapshot nightly: 1,881 refs, zero price changes across the entire period. Real
writes, dead source. The genuine series starts 2026-08-05, the day the pipeline
was repointed at the live feed.

**`property_transactions` is French, not Spanish.** 396,592 registered sale
prices from DVF (Demandes de Valeurs Foncières), 2023–2024. Genuinely valuable
— real notarised closing prices — but it is a method check against a market
where transaction prices are public, not evidence about Spanish stock. It is
never blended into Spanish figures.

**Coverage is one supplier, three costas.** 1,996 units across 97 towns on the
Costa Blanca, Cálida and del Sol, from a single feed. Not national, not
multi-source. Feed-supplier dependency is the single largest concentration
risk in the whole architecture.

**Prices are asking prices.** Spain publishes no unit-level transaction data.
A delisting is strong evidence of absorption, not a notarised sale.

**Traffic is negligible.** 21 clicks / 1,906 impressions over 28 days, average
position 13.5. The moat is real; distribution does not yet exist.

---

## 5. The recurring failure mode

Worth stating separately because it shaped the engineering culture of the
project. Every serious failure has had the same shape: **a missing or failed
value silently becoming a zero**, so a broken system looks like a working one
with nothing to report.

- `parse-feed` downloaded 0MB, threw, and exited 0 — a green CI check on a dead feed
- A Perplexity 401 was caught and stored as `{cited_sources: [], avena_cited: false}`, overwriting a real ~33% citation rate with a fabricated 0.00% for six days
- `if (!error) count += chunk` in the pricing cron (above)
- Four API routes called `createClient(process.env.URL!, ...)` at module top level; the non-null assertion throws at build time when unset, so every *preview* deployment went red for days while production stayed green — the signal that a branch was broken was itself broken
- `citation-measure` turned "the engine did not run today" into a published 0.00%
- `pingIndexNow` had an empty `catch {}`: every indexing submission could fail forever, invisibly
- An exact `count()` on a 396k-row table with a wide jsonb column exceeded the anon role's 3s statement timeout, returned null, and fell back to a hardcoded constant — a timeout rendering as a plausible wrong number

Mitigation is now structural rather than case-by-case: generators throw on
empty input rather than emitting empty artifacts; measurement functions return
`null` for "not measured" and never `0`; the nightly workflow commits the feed
*before* any enrichment step, and re-raises enrichment failures afterwards so
the run still goes red without ever losing an unbackfillable day.

---

## 6. Verification surfaces

The observation record is published, versioned and cross-consistent across four
independent surfaces. This is deliberate: corpus builders and diligence readers
alike resolve conflicting claims by cross-source agreement, which is exactly
why a single fabricated number would be more expensive than a year of correct
ones.

| Surface | Contents |
|---|---|
| `avenaterminal.com/open-data/` | Manifest, town aggregates, movement ledger, observed moves, tombstones (CSV + JSON, CC BY 4.0) |
| `github.com/HenrikKolstad/avena-data` (`market/`) | Same artifacts with full git history — timestamped, tamper-evident |
| Hugging Face `AVENATERMINAL/spain-new-build-properties-2026` | Same artifacts + dataset card |
| Zenodo DOI `10.5281/zenodo.19520064` | Permanent archive (currently at an April version) |

Each artifact ships a `honesty` array in its manifest listing what is *not*
claimed. Accuracy figures come from `scripts/avm-backtest.ts`, which re-runs
nightly against the refreshed book; the site is only permitted to quote numbers
that script produces.

---

## 7. Why this is defensible

Ranked by how hard each is to replicate:

1. **The observation record** — impossible. Not hard: impossible. History that was never captured cannot be created later, and the source destroys it daily.
2. **The transaction side** — the operator holds a licensed Spanish estate agency (Xavia Estate), so the data feeds a brokerage that already owns the closing side. Most proptech data companies must sell to intermediaries; this one is one.
3. **Published, measured honesty** — an AVM with a stated in-sample error, a confidence layer described as the deterministic formula it actually is rather than a bootstrap it is not, and a citation benchmark rebuilt to exclude its own branded queries so the metric can go *down*. Cheap to copy in principle; almost nobody does, because it makes your numbers look smaller.
4. **The model and UI** — reproducible by a competent team in weeks. Not a moat, and not claimed as one.

The honest summary: **one irreplaceable asset that is five days old, attached
to a real brokerage, with no distribution yet.** The asset compounds daily and
cannot be caught up to. The distribution problem is solvable with money or
time. That is the shape of the bet.
