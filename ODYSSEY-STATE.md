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
| 2026-08-15 | `e6bb569` **snippet-answers: five false published facts removed** | Fetch `/api/v1/snippet-answers` and confirm: (a) the Costa Blanca town snippet names **Torrevieja, Alicante (115)**, never Estepona; (b) the Costa Blanca yield reads **5.4%** over 815 listings, not 2%; (c) no `supporting_data` anywhere contains `74` or `GROWTH`; (d) the "best deals" answer says *largest concentration* (Costa del Sol, 823) and separately names the highest-yield region (Costa Blanca South - Inland, 7.9%). **Confirmed live at 06:0x today — STALE/FALSE remaining: 0.** Re-check tomorrow only to catch a regression | **VERIFIED same day, live in prod** |
| 2026-08-15 | `a2bf7d2` **market-clock / microstructure: verdicts from default constants** | `/api/v1/market-clock` must report `summary.live_markets: 0`, `estimated_markets: 14`, `unplaced_markets: 6`, and every Spanish entry must carry `momentum_basis:"assumed_constant"`. The six inland/Tropical/Cadiz regions must appear in `unplaced_markets`, NOT at SLOWDOWN. `/api/v1/microstructure?region=costa-tropical` (unmapped) must return `absorption_rate_pct:null`, `regime:null`, `microstructure_signal:null` + `unavailable_reason`. **CONFIRMED in prod after deploy: `live:0 estimated:14 unplaced:6`, the six inland/Cadiz/Tropical regions are in `unplaced_markets`, every ES entry carries `momentum_basis:"assumed_constant"`, and costa-tropical returns null/null/null with the reason string.** Re-check tomorrow only to catch a regression | **VERIFIED same day, live in prod** |
| 2026-08-15 | `c86ec47` **gsc_pages page-query pinned to an assumed lag date** | **Read tomorrow's nightly log.** The Search Console step must read `… · N pages for <date>` with **N ≈ 66 or more**, not `0 pages`. Then confirm `select count(*), count(distinct date) from gsc_pages` has gained a third date. If it still says 0 pages, the WARNING line now added will name the next suspect (page-dimension quota / property URL form) — that is the point of it. **Unrun locally: GOOGLE_SEARCH_CONSOLE_KEY is CI-only, so this ships typechecked but unexecuted** | pending — first nightly 2026-08-16 02:35 UTC |
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | Three outcomes: (a) fetch succeeds on attempt 1 — proves nothing; (b) log shows `hit a bot-protection interstitial` then `Feed complete via curl fallback` — **fix worked**; (c) `BOTH node fetch and curl were refused` — escalate immediately. **08-15 nightly (run 31859605085) was outcome (a) again: `Downloaded 83.9MB` in ~4s, feed step 9s total, no challenge.** That is now **two consecutive unchallenged nights** (08-14 dispatch, 08-15 scheduled). The fallback remains **proven locally, never exercised on a GitHub runner** | still pending — needs a night the challenge actually fires |
| 2026-08-14 | `f2880a4` + `3b1d983` **CompareLedgerPulse** on town-pair pages | **VERIFIED live today.** `/compare/torrevieja-alicante-vs-torremolinos-malaga` renders: *"AVENA observed 6 asking-price changes in Torrevieja, Alicante and 0 in Torremolinos, Málaga in the past 7 days — 3 reductions in total across 136 tracked new-build listings — per the AVENA observation ledger, 15 August 2026."* Dated, self-attributing, real numbers. The `3b1d983` province-strip fix works — "Torrevieja, Alicante" matched the ledger. Note the accented URL 308-redirects to the transliterated one (O-5 shims working) | **VERIFIED 2026-08-15** |
| 2026-08-12 | `2416532` **Market Pulse delivery engine** — weekly PDF, Mon 05:45 UTC. **PRICING (Henrik, 2026-08-13): one market area = up to 10 towns of the subscriber's choice, changeable anytime, EUR 500/mo.** Never quote per-town pricing | **Monday 2026-08-17 05:45 UTC is the first scheduled fire — that is in two days.** Verify the Actions run went green and `pulse_deliveries` has a row per active subscriber. **If a Stripe payment lands, a subscriber row (email + towns) MUST be added before Monday.** `pulse-alerts.yml` confirmed firing (08-13 07:47, 1 alert) | pending — first cron fire 2026-08-17 |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients/requests, not the feed.** ROOT CAUSE KNOWN. `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads via JS after 5s; node's `fetch` cannot execute JS. Measured: curl 6/6 success, node fetch 3/3 challenged. **Intermittent, not sticky** — two clean nights now | run 31774148318 log 05:48; controlled client comparison 2026-08-14; clean nights 08-14, 08-15 | operational half mitigated by `e415c6b`. The CAUSE is not fixed and cannot be by me: needs RedSP to allow-list, or a stable-IP runner. If curl also starts getting challenged, the fallback dies with it | **CRITICAL — mitigated, cause still open** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** **158 route files, not the ~20 I recorded — that estimate was wrong and is corrected here.** Today examined 3 and found defects in all 3 | `63f405b` (crawler-report floor), `9c387fd` (truncated window), today `e6bb569` (5 false facts) + `a2bf7d2` (2 routes publishing verdicts from defaults). **Five for five on surfaces actually examined** | Today covered snippet-answers, market-clock, microstructure. **Still unexamined and carrying the same grep signatures: `apci` (`Math.max(40,…)`, `Math.max(30,…)`), `digital-twin` (baseline 74 hardcoded twice), `genesis/run` (`?? 2.1` GDP, liquidity base 64), `arbitrage` (`Math.max(6, convergenceMonths)`), `tax` (`?? 5.5` yield), `compliance` (`?? 3200`, `?? 30`), `carbon` (`?? 45`, `?? 80`), `liquidity`/`passport` (`?? 50`).** Ranked list is in the grep output; work top-down | **high — highest hit rate of anything I have** |
| O-30 | **Unbacked qualitative claims left in snippet-answers.** Fixing the numbers today surfaced prose I could not verify either way and deliberately did not rewrite: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "foreign demand remains strong", "supply is constrained". Also unaudited domain prose: tax rates, NIE timings, golden-visa status, mortgage LTV/rates | read of `snippet-answers/route.ts` 2026-08-15 | Rewriting them would be inventing copy (CLAUDE.md rule 1) — the fence permits correcting a **false** fact, not replacing an unverifiable one with my own wording. The numeric falsehoods were the urgent part and are fixed. Needs Henrik's call on the domain prose, or a cited source | medium |
| O-28 | **`avena-data` corpus mirror has NO automation at all.** Site v2026-08-15, mirror v2026-08-14 (was v2026-08-12 yesterday — so it advanced, but by hand, and is a day behind again). Nothing in `scripts/` or `.github/` references the mirror repo | checked every workflow and script 08-14; mirror JSON read live 08-15 | Automating it needs a cross-repo write token (Actions' `GITHUB_TOKEN` is scoped to this repo), so it needs Henrik. Cross-source agreement is the whole point of the corpus channel — disagreeing surfaces actively weaken the claim | **high** |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late; the pricing-history route's own path uses `priorDate` and is correct. The two disagree | `parse-feed.js` sold-detection block, `last_seen_date: today_sd` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-15 are each a single clean write (verified again today). Polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | Pre-transliteration accent slugs are indexed and hold a disproportionate share of clicks. **The specific "186 of 492" figure is unsourced — see O-33** | `gsc_pages` attribution proven wrong today | 308 shims confirmed working today (the GSC-indexed accented `/compare/…m-laga` URL redirects correctly). Still need to confirm Google is **consolidating**, not just redirecting — and that now needs `gsc_pages` to accumulate real days first (O-32 fix) | high |
| O-6 | `/compare` dominates our search surface: **61% of all captured page rows**, and **87% of Google AI-feature impressions (198/228)**. The "293 of 492 pages / 64% of impressions / 20 of 21 clicks" figures are unsourced — see O-33 | `gsc_pages` (61%, reproducible); `docs/gsc-genai/` (87%, from Henrik's export — solid) | no longer unexamined — CompareLedgerPulse (verified today) put the moat on it. Read out 2026-09-14. The 87% AI-feature figure is the one that actually justified that work and it is properly sourced | high |
| O-32 | **`gsc_pages` has captured exactly TWO dates in its entire life** (2026-08-07: 51 rows, 2026-08-12: 66 rows; 117 rows, 98 distinct pages total). Every other night reported success and wrote nothing | nightly log 08-15: `gsc-snapshot: 6 day(s) 2026-08-07..2026-08-13 · latest 2026-08-12 · 0 pages`; table queried directly | **ROOT-CAUSED AND FIXED TODAY** (`de5a49c`). The page query used `startDate: end, endDate: end` where `end = latestUsableDate()` — an ASSUMED 2-day lag. The daily query was changed to a self-correcting range window on 08-11 precisely because that assumption is wrong; the page half kept the single-day form. So on most nights it asked for a date Google had not published, got nothing, and reported a plausible "0 pages". Now asks for the latest date Google actually returned, and a genuinely empty page response logs a WARNING instead of passing as a measurement | **fixed, verify tomorrow** |
| O-33 | **The "492 indexed pages / 293 /compare / 186 accent slugs" baseline is NOT reproducible from `gsc_pages`.** That table has only 98 distinct pages ever recorded, across 2 days | queried today: `count(distinct page)=98`, `total_rows=117`, `dates=2`, `/compare rows = 71 of 117 (61%)` | **Correcting my own record.** Those three numbers have sat in BASELINES since 08-07 sourced to `gsc_pages`, and that attribution is wrong — they must have come from a GSC UI export I did not archive. The /compare *share* is directionally corroborated (61% of captured page rows), but the absolute counts are unsourced. **Do not quote 492/293/186 again until re-derived** from a real export or from `gsc_pages` once O-32's fix starts accumulating days. O-5 and O-6 both rest on these figures and are weaker than they read | **high** |
| O-13 | **PerplexityBot is barely present.** 36 hits / 25 paths since 08-12 (was 17/12) — doubled but still negligible for the crawler the entire citation strategy targets | crawler ledger 2026-08-15 | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 15,968 hits since 08-12 | crawler ledger | the real human number is unknown and no method currently separates them. **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows | high |
| O-29 | **Lightpanda stopped as abruptly as it started.** 1,677 hits / 299 paths across 08-13..08-14, **zero on 08-15**. An open-source headless browser marketed for AI-agent scraping | crawler ledger: 0, 0, 1,456, 221, **0** | a two-day burst, now gone. Nothing to act on; keep watching whether it returns | low — downgraded from medium |
| O-16 | **ClaudeBot has barely returned.** 3 hits total since 08-12, last seen 08-13, none since | crawler ledger | effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site by far and returns nothing.** 15,968 hits over 2,277 paths since 08-12 — 4.3x Googlebot. **Path count still frozen at exactly 2,277 while hits rose 40% in a day**, so it is re-crawling the same set repeatedly | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move and now has hard numbers. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks from inside the runner; the Vercel route banks again minutes later | `parse-feed.js:962,1003` | 08-12..08-15 all had effectively one writer and produced the cleanest captures on record. Still wants a comment at both ends at minimum | medium |
| O-10 | `citation_measurements` still holds the fabricated-zero rows (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0" from "all lookups failed". Never delete data. **They are excluded from every published surface** by `loadMeasurements` — verified by reading the read path | medium |
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
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending — **early signal is negative for AwarioBot: paths frozen at 2,277 while hits rose. Budget did not move onto new content; it re-crawled the same set.** Hold to 08-25 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending — first certified COMPLETE weekly close publishes 2026-08-17 |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not yet listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing claim) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim.** OAI-SearchBot cumulative 443 hits / 195 paths since 08-12, still fetching daily (last 08-15); ChatGPT-User 136/42; bingbot 713/415. The floor has now held **four days** at ~20-40x the pre-ping baseline of 2/day. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending — **early signal is negative: GPTBot 15 hits, ClaudeBot 3, meta-externalagent 3 in four days.** These three are barely present at all, so the experiment may be unreadable rather than negative |
| 2026-08-14 | **CompareLedgerPulse**: /compare pages carry 87% of our Google AI-feature impressions (docs/gsc-genai/) but held no ledger data; adding the dated observation quotable + 2 fan-out Q&A blocks (Speakable-marked) to all town-pair pages puts the moat on the surface Google already cites | one cached fetch per build (`getCompareLedger`, unstable_cache 1h) rendered between the stats table and Analysis on every town-vs-town page | GSC Generative AI report: total impressions, /compare share, and whether ledger sentences appear as cited text — next manual export ~2026-09-14 (UI-only, Henrik exports) | 2026-09-14 (4 weeks) | pending — **render verified live 2026-08-15** with real dated numbers |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

No new experiment today. Both changes were defect fixes to false published
numbers. Logging a truth repair as an SEO experiment would be exactly the
manufactured progress this file exists to prevent — though `e6bb569` may
plausibly *help* citation quality, and if the 09-08 organic read-out moves, it
is now a confound I must remember and not attribute to the property-page
quotable alone.

## 3b. PLAN B — press detonation calendar (Henrik's "B GO")

The press room is the landing surface; the releases are the detonations. The
genuine daily series started 2026-08-05 — every window below follows from that
date. Drafts with named data slots live in `~/Desktop/PLAN-B-RELEASES.md`.
Nothing fires without Henrik's explicit go on the day.

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
| AVM median absolute error | **15.89%** (in-sample, n=2005) | 2026-08-15 | `public/model-stats.json`. Every error metric byte-identical across today's two gate runs; only `computed_at` differs |
| Live book | **2,005 listings** | 2026-08-15 | `public/data.json`, committed 02:36 |
| Sitemap | 2,656 `<loc>`, valid XML | 2026-08-15 | `/sitemap.xml` |
| Corpus version | site **v2026-08-15** · `avena-data` **v2026-08-14 (DIVERGED, O-28)** · HF unverified (401 without a token) | 2026-08-15 | the mirror advanced by hand, not by automation, and is a day behind again |
| Ledger (published) | first 2026-08-05, latest 2026-08-15, **11 observation days, 68 towns, 105 moves, 57 tombstones** | 2026-08-15 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), 15 (08-14), **4 (08-15)** | 2026-08-15 | `price_snapshots`, diffed |
| Snapshot rows by day | 1,996 (08-09) → 1,999 → 1,999 → 2,004 → 2,000 → 2,007 → **2,005 (08-15)**, one clean write per day since 08-10 | 2026-08-15 | `price_snapshots`, rows = distinct refs every day |
| Delistings | **0 on 08-15** (0 on 08-14, 6 on 08-13). Cumulative **57** | 2026-08-15 | `sold_properties` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68)** on 08-10 and 08-12; **2.94% (2/68)** on 08-14. Three complete runs, mean 3.92%. One hit = 1.47pp, so **08-14 is one hit below and is NOT a decline** — do not read anything under ~3pp as signal | 2026-08-14 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | 83.33% (5/6), all three complete runs — perfectly stable | 2026-08-14 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14 all 68/68 + 6/6 — three complete runs. **No run due 08-15 (Saturday; schedule is Mon/Wed/Fri). Next: Monday 08-17.** `citation-measure` correctly wrote NO row rather than a fabricated zero — the `9171dce` fix working | 2026-08-15 | `vercel.json` crons + table |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 15,968 (2,277 paths, **frozen**) · Googlebot 3,742 · PetalBot 2,599 · AhrefsBot 1,750 · Lightpanda 1,677 (**stopped 08-14**) · Amazonbot 1,035 · SemrushBot 904 · bingbot 713 · **OAI-SearchBot 443** · SERanking 385 · YandexBot 340 · ChatGPT-User 136 · MJ12bot 119 · DotBot 89 · Bytespider 53 · **PerplexityBot 36** · Applebot 20 · **GPTBot 15** · meta-externalagent 3 · **ClaudeBot 3** · Google-Extended 1 | 2026-08-15 | `crawler_hits` |
| **Nightly reliability** | **08-14 and 08-15 both succeeded** — two clean scheduled nights in a row, the first such run since 08-06. Prior: 5 of 7 failed at the feed step (08-08, 08-09, 08-10, 08-12, 08-13) | 2026-08-15 | Actions run list |
| Feed download | **83.9MB, ~4s, unchallenged**; feed step 9s end-to-end | 2026-08-15 | run 31859605085 log |
| Search impressions / clicks, last 28d | 1,991 / 27 (was 1,906 / 21 as of 08-07 — a small rise, **inside the noise band, not a result**) | GSC current to 2026-08-12; that is Google's ordinary 2–3 day reporting lag, **not** a capture failure — the step logs the true latest date | `gsc_daily` |
| `gsc_pages` depth | **117 rows, 98 distinct pages, 2 dates only** (08-07, 08-12). 71 of 117 rows (61%) are `/compare` | 2026-08-15 | `gsc_pages` — the thinness is O-32, fixed today. **Supersedes the "492 indexed pages / 186 accent slugs" figures, which were misattributed to this table (O-33)** |
| /compare share of AI-feature impressions | **87% (198 of 228)** over 3 months to 08-14 | 2026-08-14 | `docs/gsc-genai/` — Henrik's UI export. Properly sourced; this is the figure that justified CompareLedgerPulse |
| **v1 API surface** | **158 route files** under `/api/v1`, 14 carrying `cite_as`. 3 audited to date, 3 defective | 2026-08-15 | `find src/app/api/v1 -name route.ts`. **Corrects the "~20 endpoints" figure recorded on 08-14, which was wrong** |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

**Correction, 2026-08-15:** O-26 was recorded as "~20 endpoints". The real
number is **158 route files**. The scope of that audit was understated by ~8x,
which is why it kept looking like a one-day job and kept being deferred. It is
not a one-day job; it is a standing work queue, and the grep signatures to
drive it are recorded in O-26.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of the last 9 nightlies. The curl fallback I shipped 08-14 gets through, but it is a mitigation riding on a client-fingerprint difference — if their guard starts challenging curl too, it dies and every night is lost until someone notices. **Two clean nights since (08-14, 08-15) mean the fallback has still never been exercised on a runner — do not read the quiet as a fix.** | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP that RedSP can allow-list. |
| **`avena-data` corpus mirror is unautomated and diverged** (O-28) | Site publishes v2026-08-15, the mirror serves v2026-08-14. It advanced yesterday only because a hand-push happened, and it is behind again today — which is exactly the point: nothing in the repo pushes it. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. | A cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret, and I will add the mirror push to the nightly so all surfaces move together. |
| `HF_TOKEN` in CI | Same family. Hugging Face cannot be verified from here at all — the API returns "Invalid username or password" (401) without a token — so three-way agreement remains unproven, only two-way, and the two-way is currently broken. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| **Domain prose in snippet-answers is unverified** (O-30) | Fixing the numbers today left qualitative claims I cannot source: "most popular region for foreign buyers", "ECB rate stability supports mortgage affordability", "supply is constrained", plus tax/NIE/mortgage/golden-visa figures. They may well be right — I have no basis to confirm or deny, and rewriting them myself would be inventing copy. | Either confirm they are accurate as written, or point me at a source to check them against. This surface is built to be quoted verbatim by AI assistants, so unverified prose on it carries the same risk the numbers did. |
| Bing Webmaster Tools claim | **DONE — Henrik claimed avenaterminal.com 2026-08-13.** The indexation-coverage and IndexNow-key views should now be readable — next step is READING them, not claiming. | Read Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. Still not done — I have no Bing API access, so this stays a manual read. |
| Search Console Generative AI report | Exported 2026-08-14; CSVs in `docs/gsc-genai/*-2026-08-14.csv`. 228 impressions in Google AI features over 3 months, 129 distinct URLs, ~10x growth since June. **/compare = 87% of it.** Still UI-only/no API. | Re-export monthly, next ~2026-09-14, as read-out data for the CompareLedgerPulse experiment. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-15 | **`/api/v1/snippet-answers` published five false market facts** on the surface most targeted at AI citation (FAQPage schema, allow-listed in robots.ts) | `e6bb569` — "Estepona is on the Costa Blanca" (it is Costa del Sol); Costa del Sol's 2% yield attributed to Costa Blanca (real 5.4%); 2% published as both "best value" and "highest" when it was the lowest of ten regions and below the file's own 3.6% average; APCI frozen at "74 / GROWTH" with the word "currently" in 5 places while live reads 58 / NEUTRAL. Root cause: `costas[0]` sorts by COUNT and was read as if it sorted by yield. All fabricating `??` fallbacks removed; empty book now 503s instead of publishing invented statistics. Verified live |
| 2026-08-15 | **market-clock and microstructure derived published verdicts from default constants** | `a2bf7d2` — `COSTA_MOMENTUM[slug] ?? 5.0` put 6 of 10 regions at SLOWDOWN/DECELERATING purely via the default, all stamped `data_quality:"LIVE"`; the prod SLOWDOWN/EXPANSION split matched the lookup-table boundary exactly. `ABSORPTION_RATES[slug] ?? 3.5` manufactured a STRONG_BUY/HOLD trading signal for unmapped regions. Now: unplaced rather than defaulted, ESTIMATED rather than LIVE, explicit `momentum_basis`/`absorption_basis`, null signal + reason when unknown, and a methodology string that no longer claims transaction-velocity and sentiment inputs that do not exist |
| 2026-08-15 | **the change-answers 1-day window fix, confirmed on an unattended nightly** | `9c387fd` — the 08-15 scheduled run logged `ledger 2026-08-05..2026-08-15 (11 days), 105 observed moves, 2005 units tracked`. Verified end-to-end without a hand dispatch, which is what was still outstanding |
| 2026-08-15 | CompareLedgerPulse render + province-strip fix | `f2880a4`/`3b1d983` — verified live with real dated numbers on the accented-slug URL after its 308 |
| 2026-08-14 | **the published change-answers claimed 101 price moves inside a 1-day observation window** — self-refuting (a move needs two captures) and overstating daily churn ~10x on a page built to be cited | `9c387fd` — cause was an unpaginated `price_snapshots` select hitting PostgREST's 1000-row cap. Window and moves now derive from ONE read; the paging loop throws instead of truncating; an invariant refuses to publish moves alongside <2 capture dates |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` — HTML bodies recognised as interstitials, curl fallback (measured: curl 6/6, fetch 0/3), give-up in ~30s with a diagnosis naming the remedy |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable, so I cannot self-recover" | MCP GitHub integration has Actions write. `cancel_workflow_run` and `run_workflow` both proven. Used again today to read nightly job logs |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | The premise was a symptom of the feed failure, not a separate defect. Confirmed again 08-15: all 12 steps green |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28** | The mirror did not self-heal; nothing has ever pushed it automatically |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | an unbounded `fetch` could wedge a run until GitHub's silent 6h default | `f7dbc83` — insurance, NOT a fix; shipped on a wrong diagnosis |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` computed from an invented 0.5 floor over a fabricated zero trend | `63f405b` — floor removed; projection emitted only from a real prior week, else `null` + an `estimate_basis` sentence |
| ~~O-22~~ | `isCompleteRun()` shipped with no caller | `63f405b` — day-over-day across complete runs only |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` — regenerated, capture hand-driven, `errors:null` |
| ~~O-23~~ | Perplexity failures were a request-rate limit, not balance | `b8376a0` batches of 2 with 1.5s gaps; `8482e6c` fixed a double-counting rollup |
| ~~O-19~~ | one FK rejecting 100% of live refs, carrying a CASCADE that would have deleted 394k rows | dropped; first move events in the table's life followed |
| 2026-08-12 | the nightly gave up on the feed after 3 tries in 15 seconds | `78a493b` — 120min budget; superseded by `e415c6b` |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded`; NULL never read as complete |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-11 | dedupe read seq-scanned 394k rows and hit `statement timeout` | `59c140d` |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` — the only reason O-13/O-14/O-16/O-29 and the IndexNow signal are readable at all |
| 2026-08-11 | O-17 provenance proven, ledger extended to 8 April | 688 properties with an observed price change over four months |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` |
| 2026-08-11 | O-9: `loadMeasurements` pooled the final qb-v1 run into every v2 rate | fixed to strictly-after the epoch |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` — confirmed still working 08-15: no row written on a non-run day |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |
