# ODYSSEY — STATE

Odyssey's memory between runs. It reads this file first and rewrites it last,
every single day.

**Why this exists:** without it, each morning starts blank. A deliberate
deferral ("top of tomorrow's list") becomes indistinguishable from having
forgotten, the same investigation can be run twice without anyone noticing,
and no change ever gets checked on day two. SEO in particular is a
months-long game — an agent that cannot remember what it changed 21 days ago
cannot run an experiment, only a stunt.

**Rules for editing:**
- Rewrite in place; do not append a log. This is state, not a diary. The
  briefs are the diary.
- Never delete an open item to make the file look tidy. Move it to CLOSED
  with a reason, or leave it open.
- Every SEO/growth change gets an EXPERIMENT row with a read-out date. A
  change with no read-out date is a guess, not an experiment.
- If a claim here turns out to be wrong, correct it here the same day.

---

## 1. VERIFY TODAY (yesterday's work — did it hold?)

| shipped | what | how to verify | verified |
|---|---|---|---|
| 2026-08-16 | `f00086d` **APCI: 5 published defects fixed** (macro/momentum/supply/foreign/week_change) | Fetch `/api/v1/apci`: `methodology_version` must be 3; `macro_support` must read **63** with `indicators_used` naming ECB 2.4 / HICP 2.8 / GDP 2.9 / unemployment 11.2; `price_momentum` must carry `refs_latest ≈ 2005` (proves the paginated read clears PostgREST's 1000-row cap); `supply_balance` must be **null** with a reason; `week_change` **null**. **VERIFIED live: apci 58 → 65, phase GROWTH, measured_weight_pct 95, 7 of 8 dimensions measured.** Re-check tomorrow only for regression | **VERIFIED same day, live in prod** |
| 2026-08-16 | `f00086d` **snapshot-archive: silent total failure made loud** | Route is cron-auth (`Bearer CRON_SECRET`), so I cannot curl it. **Verify tomorrow by querying `price_history`**: after the 06:00 UTC run it must hold ~1,900 rows for 2026-08-17, and `market_snapshots` must gain a row with today's `snapshot_date`. If `price_history` is still empty, the route now returns 500 + an `errors` array naming the failing column — read it | **pending — first cron fire 2026-08-17 06:00 UTC** |
| 2026-08-16 | `f00086d` **digital-twin: hardcoded 74, hardcoded macro, Math.random in published projections** | GET `/api/v1/digital-twin`: `apci` must be **null** with `apci_source`; `twin_sync_status` must be **absent**; `macro` must carry 15 live keys with `macro_as_of`. POST the same body 3× — output must be **byte-identical**. **VERIFIED live: 3 identical POSTs returned agg -3, r0 impact -4.09, decline 62.3 every time.** Re-check tomorrow only for regression | **VERIFIED same day, live in prod** |
| 2026-08-16 | `6064ca1` **APCI macro inputs now publish their age** | `/api/v1/apci` → `dimension_detail.macro_support.detail` must carry `as_of`, `age_days`, `stale`. **VERIFIED live: as_of 2026-05-23, age_days 84, stale true, with the staleness note.** Watch `age_days` — it climbs daily until O-34 is fixed | **VERIFIED same day, live in prod** |
| 2026-08-15 | `c86ec47` **gsc_pages page-query pinned to an assumed lag date** | **VERIFIED.** Tonight's nightly logged `gsc-snapshot: … latest 2026-08-13: 1 clicks, 101 impressions, pos 19.03 · **81 pages for 2026-08-13**` — not `0 pages`. Table went 117 → **198 rows, 98 → 151 distinct pages, 2 → 3 dates**. The fix works | **VERIFIED 2026-08-16** |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | 08-16 nightly was outcome (a) again — feed step 7s, clean. That is **three consecutive unchallenged scheduled nights** (08-14, 08-15, 08-16). The fallback remains **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |
| 2026-08-12 | `2416532` **Market Pulse delivery engine** — weekly PDF, Mon 05:45 UTC. **PRICING (Henrik, 2026-08-13): one market area = up to 10 towns of the subscriber's choice, changeable anytime, EUR 500/mo.** Never quote per-town pricing | **Monday 2026-08-17 05:45 UTC is the first scheduled fire — that is tomorrow.** Verify the Actions run went green and `pulse_deliveries` has a row per active subscriber. **If a Stripe payment lands, a subscriber row (email + towns) MUST be added before Monday.** `pulse-alerts.yml` confirmed firing | pending — first cron fire 2026-08-17 |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-34 | **Two macro tables; the one every read path uses has no writer.** `causal_indicators` (read by APCI, digital-twin, market-clock) froze **2026-05-23**, 20 rows, one timestamp. The daily `sync-macro` cron writes a DIFFERENT table, `macro_indicators`, which IS fresh (08-15 06:00) — but returns **null** for `ecb_main_refi_rate`, `euribor_3m`, `euribor_12m` and `spain_unemployment_rate`, and its Spain HICP row is stamped `valid_for_date 2025-12`. FX rows are good (EUR/USD 1.1567, EUR/GBP 0.8545) | both tables queried directly 2026-08-16; `sync-macro/route.ts` header comment claims "the regime engine + APCI read this table" — they do not | **Repointing today would trade complete-but-stale inputs for fresh-but-mostly-null ones and make the index worse.** Real fix is three jobs: (1) find why the ECB SDW series fetches return null — `fetchWithTimeout` returns null on any non-ok and the failure is swallowed, the recurring shape again; (2) reconcile the two tables; (3) repoint the read paths. Mitigated today by publishing `age_days`/`stale` so nothing is quoted as current | **high — top of tomorrow** |
| O-35 | **2026-05-23/24 is a cluster date across several pipelines.** `causal_indicators` froze 05-23, `market_snapshots` froze 05-23, `properties_registry` froze 05-24. Three unrelated tables stopping within ~24h is unlikely to be three coincidences | all three queried 2026-08-16 | Not yet investigated. Worth one focused look at what changed on those dates (deploy, key rotation, schema change) — a single root cause may explain all three | medium |
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients/requests, not the feed.** ROOT CAUSE KNOWN. `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS after 5s; node's `fetch` cannot execute JS. Measured: curl 6/6 success, node fetch 3/3 challenged. **Intermittent, not sticky** — three clean nights now | run 31774148318 log; controlled client comparison 2026-08-14; clean nights 08-14, 08-15, 08-16 | operational half mitigated by `e415c6b`. The CAUSE is not fixed and cannot be by me: needs RedSP to allow-list, or a stable-IP runner. If curl also starts getting challenged, the fallback dies with it | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** 158 route files. **Six examined to date, six defective — still 6 for 6** | `63f405b` (crawler-report floor), `9c387fd` (truncated window), `e6bb569` (5 false facts), `a2bf7d2` (2 routes publishing verdicts from defaults), today `f00086d` (apci 5 defects + digital-twin 4) | Today covered `apci` and `digital-twin`. **Still unexamined and carrying the same grep signatures: `genesis/run` (`?? 2.1` GDP, liquidity base 64), `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` yield), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Work top-down | **high — highest hit rate of anything I have** |
| O-36 | **`snapshot-archive` computes five market-summary figures it cannot store.** `above_80`, `avg_discount`, `new_this_week`, `key_ready_count`, `off_plan_count` have no column on `market_snapshots`. They are still computed and returned in the HTTP response, but nothing persists them | `f00086d`; schema read 2026-08-16 | Deliberate. Adding five columns is additive and allowed, but `new_this_week` and `avg_discount` in particular are genuinely useful daily series and deserve a considered schema rather than a tail-end `alter table`. Decide alongside O-37 | medium |
| O-37 | **Nothing writes `market_snapshots.apci`, so APCI `week_change` can never populate.** It now honestly reports `null` + `no stored APCI reading 5-10 days old` instead of the old 85-day delta | `/api/v1/apci` live 2026-08-16 | An honest null is strictly better than the fabrication it replaced, so this is not urgent. Fixing it means having something compute + persist a daily APCI under `methodology_version` 3. Do it after O-34, so the stored series is not built on 84-day-old macro | medium |
| O-30 | **Unbacked qualitative claims left in snippet-answers.** "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "foreign demand remains strong", "supply is constrained". Also unaudited domain prose: tax rates, NIE timings, golden-visa status, mortgage LTV/rates | read of `snippet-answers/route.ts` 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. Needs Henrik's call or a cited source | medium |
| O-28 | **`avena-data` corpus mirror has NO automation at all.** Site v2026-08-16, mirror **v2026-08-15** — diverged again, exactly as predicted. Nothing in `scripts/` or `.github/` references the mirror repo | checked every workflow and script 08-14; mirror JSON read live 08-16 | Automating it needs a cross-repo write token (Actions' `GITHUB_TOKEN` is scoped to this repo), so it needs Henrik. Cross-source agreement is the whole point of the corpus channel | **high** |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late; the pricing-history route's own path uses `priorDate` and is correct. The two disagree | `parse-feed.js` sold-detection block, `last_seen_date: today_sd` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-16 are each a single clean write. Polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | Pre-transliteration accent slugs are indexed and hold a disproportionate share of clicks. **The specific "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong 08-15 | 308 shims confirmed working. Still need to confirm Google is **consolidating**, not just redirecting — `gsc_pages` is now accumulating real days (3 as of today), so this becomes answerable in ~2 weeks | high |
| O-6 | `/compare` dominates our search surface: **61% of captured page rows**, and **87% of Google AI-feature impressions (198/228)** | `gsc_pages`; `docs/gsc-genai/` (87%, from Henrik's export — solid) | CompareLedgerPulse (verified 08-15) put the moat on it. Read out 2026-09-14 | high |
| O-33 | **The "492 indexed pages / 293 /compare / 186 accent slugs" baseline is NOT reproducible from `gsc_pages`.** That table has 151 distinct pages ever recorded, across 3 days | queried 2026-08-16: `count(distinct page)=151`, `total_rows=198`, `dates=3` | **Do not quote 492/293/186 again until re-derived.** O-5 and O-6 both rest on these figures and are weaker than they read. Now that O-32's fix is confirmed accumulating, re-derive from `gsc_pages` in ~2 weeks | **high** |
| O-13 | **PerplexityBot is barely present.** 36 hits / 25 paths since 08-12 — negligible for the crawler the entire citation strategy targets | crawler ledger 2026-08-15 | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 15,968 hits since 08-12 | crawler ledger | **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in 4 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest`. **`snapshot-archive` was the fifth and is fixed today** | real instances of the recurring shape | `score_history` healthy so not actively losing rows | high |
| O-29 | **Lightpanda stopped as abruptly as it started.** Zero since 08-15 | crawler ledger | a two-day burst, now gone. Keep watching whether it returns | low |
| O-16 | **ClaudeBot has barely returned.** 3 hits total since 08-12 | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site by far and returns nothing.** 15,968 hits over 2,277 paths, path count frozen while hits rose — re-crawling the same set | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks from inside the runner; the Vercel route banks again minutes later | `parse-feed.js:962,1003` | 08-12..08-16 all had effectively one writer and produced the cleanest captures on record. Wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **They are excluded from every published surface** by `loadMeasurements` | medium |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **early signal is negative for AwarioBot: paths frozen at 2,277 while hits rose.** Hold to 08-25 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending — first certified COMPLETE weekly close publishes 2026-08-17 |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not yet listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing read) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative 443 hits / 195 paths, still fetching daily. Floor has held five days at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **early signal is negative: GPTBot 15 hits, ClaudeBot 3, meta-externalagent 3.** These three are barely present at all, so the experiment may be unreadable rather than negative |
| 2026-08-14 | **CompareLedgerPulse**: /compare pages carry 87% of our Google AI-feature impressions but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A blocks puts the moat on the surface Google already cites | `getCompareLedger` on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, whether ledger sentences appear as cited text | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

No new experiment today. Everything shipped was a defect fix to false
published numbers. Logging a truth repair as an SEO experiment would be
exactly the manufactured progress this file exists to prevent. **Confound to
remember:** `f00086d` changed the published APCI from 58 to 65 and altered
`/api/v1/apci`, `/api/v1/digital-twin` — both AI-facing. If the 09-08 organic
read-out moves, that is a second confound alongside `e6bb569`, and neither can
be attributed to the property-page quotable alone.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05. Drafts with named data slots live in
`~/Desktop/PLAN-B-RELEASES.md`. Nothing fires without Henrik's explicit go.

| when | what | gate |
|---|---|---|
| 2026-08-13 | Press room truth-repaired (`4e9f96d`) | done |
| 2026-09-04 | Release 1 data window closes ("first 30 days of the ledger"); compute slots, finalize draft | series gap ≤2 days; all numbers day-of from `price_snapshots`/`sold_properties` |
| 2026-09-07 | Release 1 proposed fire, 08:00 CET with Monday Pulse | Henrik's explicit go |
| 2026-11-03 | Release 2 data window closes ("{PCT}% cut asking within 90 days") | same completeness gate; percentage reported as measured, boring or not |
| 2026-11-09 | Release 2 proposed fire | Henrik's explicit go |

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.89%** (in-sample, n=2017) | 2026-08-16 | `public/model-stats.json`. Byte-identical across today's gate runs; only `computed_at` differs |
| Live book | **2,017 listings** (was 2,005) | 2026-08-16 | `public/data.json`, committed 02:46 |
| Sitemap | 2,669 `<loc>`, valid XML | 2026-08-16 | `/sitemap.xml` |
| Corpus version | site **v2026-08-16** · `avena-data` **v2026-08-15 (DIVERGED, O-28)** · HF unverified (401 without a token) | 2026-08-16 | the mirror has no automation and falls a day behind every night |
| Ledger (published) | first 2026-08-05, latest 2026-08-16, **12 observation days, 68 towns, 106 moves, 57 tombstones** | 2026-08-16 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), 15 (08-14), 4 (08-15), **1 (08-16)** | 2026-08-16 | `price_snapshots`, diffed. 08-16 is a Sunday; 08-09/08-10 were also a weekend and also 0 |
| Snapshot rows by day | 1,996 (08-09) → … → 2,007 (08-15) → **2,017 (08-16)**, one clean write per day since 08-10 | 2026-08-16 | `price_snapshots`, rows = distinct refs every day |
| Delistings | **0 on 08-16** (0 on 08-15, 0 on 08-14). Cumulative **57** | 2026-08-16 | `sold_properties` |
| **APCI (published)** | **65, phase GROWTH, 95% of weight measured, 7 of 8 dimensions.** Was 58 under the pre-`f00086d` code, of which 40% of weight was fabricated — the two are NOT comparable | 2026-08-16 | `/api/v1/apci` methodology_version 3 |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68)** on 08-10 and 08-12; **2.94% (2/68)** on 08-14. Three complete runs, mean 3.92%. One hit = 1.47pp, so **08-14 is one hit below and is NOT a decline** — do not read anything under ~3pp as signal | 2026-08-14 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | 83.33% (5/6), all three complete runs — perfectly stable | 2026-08-14 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14 all 68/68 + 6/6. **No run 08-15 or 08-16 (weekend; schedule is Mon/Wed/Fri). Next: Monday 08-17.** `citation-measure` runs daily and correctly wrote NO row on both non-run days — the `9171dce` fix still working | 2026-08-16 | `vercel.json` crons + table |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 15,968 (2,277 paths, frozen) · Googlebot 3,742 · PetalBot 2,599 · AhrefsBot 1,750 · Lightpanda 1,677 (stopped 08-14) · Amazonbot 1,035 · SemrushBot 904 · bingbot 713 · **OAI-SearchBot 443** · SERanking 385 · YandexBot 340 · ChatGPT-User 136 · MJ12bot 119 · DotBot 89 · Bytespider 53 · **PerplexityBot 36** · Applebot 20 · **GPTBot 15** · meta-externalagent 3 · **ClaudeBot 3** · Google-Extended 1 | 2026-08-15 | `crawler_hits` — not re-pulled today |
| **Nightly reliability** | **08-14, 08-15 and 08-16 all succeeded** — three clean scheduled nights in a row. Prior: 5 of 7 failed at the feed step | 2026-08-16 | Actions run list; no failed run since 08-13 |
| Feed download | feed step **7s end-to-end**, unchallenged; all 12 steps green | 2026-08-16 | run 31922637188 |
| Search impressions / clicks, last 28d | 1,991 / 27 — **inside the noise band, not a result** | GSC current to 2026-08-13 (Google's ordinary lag, not a capture failure) | `gsc_daily` |
| `gsc_pages` depth | **198 rows, 151 distinct pages, 3 dates** (08-07, 08-12, 08-13) — up from 117/98/2 yesterday. The `c86ec47` fix is accumulating | 2026-08-16 | `gsc_pages` |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. **6 audited to date, 6 defective** | 2026-08-16 | `find src/app/api/v1 -name route.ts` |
| `price_history` | **0 rows, ever** — a daily 06:00 cron reported success into an empty table for months | 2026-08-16 | queried directly; `f00086d` makes the failure loud from 08-17 |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

**Correction, 2026-08-15 (kept):** O-26 was recorded as "~20 endpoints". The
real number is **158 route files** — the scope was understated ~8x, which is
why it kept looking like a one-day job. It is a standing work queue.

**Note, 2026-08-16:** the APCI baseline moved 58 → 65, but that is a **ruler
change, not a market move**. The old 58 was computed with 40% of the index
weight fabricated. Do not plot the two on one series; `methodology_version` 3
marks the break.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of 9 nightlies. The curl fallback gets through, but it rides on a client-fingerprint difference — if their guard starts challenging curl too, every night is lost until someone notices. **Three clean nights (08-14/15/16) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP RedSP can allow-list. |
| **`avena-data` corpus mirror is unautomated and diverged** (O-28) | Site publishes v2026-08-16, the mirror serves v2026-08-15. It falls behind every single night because nothing in the repo pushes it. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. | A cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret, and I will add the mirror push to the nightly so all surfaces move together. |
| `HF_TOKEN` in CI | Same family. Hugging Face cannot be verified from here at all — the API returns 401 without a token — so three-way agreement remains unproven, and the two-way is currently broken. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. This surface is built to be quoted verbatim by AI assistants. | Either confirm they are accurate as written, or point me at a source to check them against. |
| Bing Webmaster Tools read | **Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. I have no Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/`. 228 impressions over 3 months, 129 distinct URLs, ~10x growth since June. **/compare = 87%.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for CompareLedgerPulse. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-16 | **`/api/v1/apci` published a composite index with 40% of its weight fabricated** — on the endpoint most aimed at AI citation (robots allow-list + JSON-LD + snippet-answers pointing at it 3×) | `f00086d` — macro_support selected `value` (real column `current_value`) → 400 → silent 50 while 15 live indicators sat unread; price_momentum selected `score`/`computed_at` (real: `avena_score`/`snapshot_date`) and had **never once worked** despite ~2,000 rows a night; supply_balance read the frozen `properties_registry` AND counted statuses absent from it; foreign_demand regexed nationality keywords against `p.t`, the property TYPE, so 0 of 2,017 could match and a `Math.max(40,…)` floor hid it; week_change reached past its window to a 2026-05-23 row and published an **85-day delta labelled "week"**. Now: null + basis + reason, never a neutral constant; composite renormalized over measured dimensions; phase withheld below 60% coverage; score_history read paginated past the 1000-row cap. Verified live: 58 → 65, 95% measured |
| 2026-08-16 | **`/api/snapshot-archive` ran daily at 06:00 for months into an empty table** | `f00086d` — `price_history` held **zero rows, ever**. It wrote six nonexistent columns so every upsert 400'd, `if (!error) inserted += chunk.length` hid it, and the route returned `success: true` regardless. The `market_snapshots` upsert had the same disease — five nonexistent columns, return value discarded — which is why that table froze 2026-05-23. Now writes only real columns, checks every write, returns errors + 500 on failure |
| 2026-08-16 | **`/api/v1/digital-twin` published a hardcoded APCI, hardcoded macro stamped "synced", and random numbers** | `f00086d` — `apci: 74` while the canonical endpoint read 58 (two surfaces, same named index, 16 points apart); `macro` frozen constants wearing a `Date.now()` `last_sync`; **`Math.random()*4-2` added to every region's published impact** — measured: two identical requests returned decline probabilities of 37.2% and 58.0%; `eur_gbp` documented as a delta but tested against the 0.87 absolute level. Now deterministic (3 identical POSTs → identical output, verified live), macro read live, apci null with a pointer to the one place it is computed |
| 2026-08-16 | **`gsc_pages` captured only 2 dates in its life** | `c86ec47` verified — nightly logged `81 pages for 2026-08-13`; table 117 → 198 rows, 98 → 151 distinct pages, 2 → 3 dates |
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** | `e6bb569` — "Estepona is on the Costa Blanca" (it is Costa del Sol); Costa del Sol's 2% yield attributed to Costa Blanca (real 5.4%); 2% published as both "best value" and "highest" when it was the lowest of ten; APCI frozen at "74 / GROWTH" with "currently" in 5 places. Root cause: `costas[0]` sorts by COUNT, read as if sorted by yield. Empty book now 503s |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — `COSTA_MOMENTUM[slug] ?? 5.0` put 6 of 10 regions at SLOWDOWN purely via the default, all stamped `data_quality:"LIVE"`. Now unplaced rather than defaulted, explicit `momentum_basis`, null signal + reason when unknown |
| 2026-08-15 | the change-answers 1-day window fix, confirmed on an unattended nightly | `9c387fd` — verified end-to-end without a hand dispatch |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` — verified live with real dated numbers on the accented-slug URL after its 308 |
| 2026-08-14 | **published change-answers claimed 101 price moves inside a 1-day window** — self-refuting and overstating churn ~10x | `9c387fd` — an unpaginated `price_snapshots` select hitting PostgREST's 1000-row cap. Paging loop now throws instead of truncating |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` — HTML interstitials recognised, curl fallback, give-up in ~30s with a diagnosis |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable, so I cannot self-recover" | MCP GitHub integration has Actions write; used again today to read nightly job logs |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | Was a symptom of the feed failure, not a separate defect |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28** | The mirror did not self-heal; nothing has ever pushed it automatically |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` from an invented 0.5 floor over a fabricated zero | `63f405b` — projection emitted only from a real prior week, else `null` |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` — regenerated, capture hand-driven |
| ~~O-23~~ | Perplexity failures were a request-rate limit, not balance | `b8376a0` batches of 2 with 1.5s gaps |
| ~~O-19~~ | one FK rejecting 100% of live refs, carrying a CASCADE that would have deleted 394k rows | dropped |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded`; NULL never read as complete |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` — the only reason O-13/O-14/O-16/O-29 and the IndexNow signal are readable at all |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-16: no row on either weekend day |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |
