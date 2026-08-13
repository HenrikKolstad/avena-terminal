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
| 2026-08-13 | `f7dbc83` **per-attempt `AbortSignal.timeout` on the feed download** + `timeout-minutes: 150` on the step | **THE read of tomorrow.** The nightly must complete step 1 without me. Three legible outcomes: (a) clean success on attempt 1; (b) `Feed attempt N failed: feed attempt hung — no complete response in 10min` followed by a later success — that means the hang recurred AND the retry loop rode it out, which is the whole point; (c) the run dies at ~150min having logged ≥12 attempts, which says the endpoint is refusing this runner specifically and the problem is network-path, not timing. Record which | pending — first live test 2026-08-14 |
| 2026-08-13 | `63f405b` citation forecast + trend honesty (`estimated_weeks_to_dominance`, `trend7d`, day-over-day across complete runs only) | already verified live post-deploy: `/api/v1/crawler-report` returns `estimated_weeks_to_dominance: null`, `rolling_7d_trend_pct_pts: null`, `estimate_basis: "only one week of measurement exists…"` (was `152` and `0`). `/api/v1/citation-score` now carries `complete:true, bank_organic:68` on both rows; `/citation-moat` renders "no prior 7d measured" | **VERIFIED same day** |
| 2026-08-13 | `355def7` recovered book (2,000 listings, generated_date 2026-08-13) | already verified: capture ran against it — `snapshotted:2000, price_moves:5, moves_baseline_refs:1998, trusted_prior:true, prior_date:2026-08-12, overlap:0.997, delisted:6, errors:null`. `price_snapshots` holds 2,000 rows / 2,000 distinct refs for 08-13, one clean write | **VERIFIED same day** |
| 2026-08-12 | `2416532` **Market Pulse delivery engine** — `scripts/pulse/generate_editions.py` + `.github/workflows/pulse-weekly.yml` (cron Mon 05:45 UTC). Henrik sent 30 cold outreach emails selling a €500/mo weekly PDF ("first edition arrives Monday 08:00 CET"). Subscribers in `pulse_subscribers`; deliveries in `pulse_deliveries` with UNIQUE(subscriber, edition_date) so re-runs fill gaps, never double-send. Sends via Resend from pulse@avenaterminal.com. Gotcha: api.resend.com sits behind Cloudflare and 403s (error 1010) any default `Python-urllib` UA — the script sends `avena-pulse/1.0` | Monday 2026-08-17 05:45 UTC is the first scheduled fire. Verify the Actions run went green and `pulse_deliveries` has a row per active subscriber for 2026-08-17. End-to-end already verified manually 08-12 (subscriber #1, resend 18bd97c7). **If a Stripe payment lands, a subscriber row (email + towns) MUST be added before Monday.** Same-day reprice alerts are promised in the outreach; `pulse-alerts.yml` exists (`ba1fd94`) but has never been observed firing — check it Monday too | pending — first cron fire 2026-08-17 |
| 2026-08-12 | `24db855` `bank_organic`/`bank_branded` + `isCompleteRun()` | **VERIFIED.** Both live rows read 68/68 + 6/6. And as of today the function finally has a caller (`63f405b`), which was the missing half — see closed O-22 | **VERIFIED 2026-08-13** |

**Yesterday's headline fix did NOT hold — state it plainly.** `78a493b` (wait up
to 120min for the feed instead of 3 tries in 15s) was necessary and is still
right, but it did not save tonight. The nightly (run 31665196372, 03:51 UTC)
wedged on step 1 for 107 minutes and was still wedged when I found it. The
budget could not fire: node's `fetch` has no default timeout and the deadline
is only consulted inside the `catch`, so a socket that never completes never
throws and the loop never reaches attempt 2. The premise of `78a493b` was also
wrong tonight — the feed was not mid-regeneration. It served 94,113,951 bytes,
well-formed, closing `</root>`, 2,168 `<property>` elements, in 5.05s to this
container at 05:38 while the runner hung on it. I could not cancel the run (see
BLOCKED: the PAT is gone), so it sat until GitHub killed it. Today's book and
capture were recovered by hand, as on 08-12. **Two consecutive nights the
nightly has failed at step 1 for two DIFFERENT reasons. Treat step 1 as the
least trustworthy thing in the system until it survives a week unattended.**

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-25 | **The GitHub PAT is not durable, so I cannot self-recover.** Henrik + Fable provisioned a fine-grained PAT on 08-12 and stored it at `~/.config/odyssey/github-token`. That path is inside an ephemeral container that no longer exists. Today I could not cancel the wedged run or re-dispatch the workflow; the MCP GitHub integration 403s on `actions:write` (`cancel_workflow_run` → "Resource not accessible by integration") | today, live | needs Henrik to choose a durable home for it. Everything else about today's recovery worked without it, but "wait ~6h for GitHub to kill a hung job" is not a recovery strategy | high |
| O-24 | **Every enrichment step is downstream of the one step that keeps breaking.** corpus rebuild, GSC capture and the move capture are all `continue-on-error`, which protects the feed commit from them — but not them from the feed. Step 1 wedges and all four are simply never reached. That is why the corpus has lagged the book two days running | 08-12 and 08-13 nightlies both died at step 1; corpus stuck at v2026-08-12 | the root cause (the hang) is fixed today, so this may stop mattering. If the corpus lags again after a green nightly, split it into its own scheduled workflow that reads Supabase directly and does not depend on the feed run at all | high |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** `crawler-report`'s `Math.max(0.5, trend)` was found by reading one file. There are ~20 v1 endpoints, all carrying the same `cite_as` DOI line, and none has been read with this specific question in mind: which published numbers are computed from a constant chosen in the file rather than from a measurement? | `63f405b` found one; the class is unaudited | it is a reading job, not a fix job, and today's budget went to the pipeline. But this is priority-2 work by the ranking — a published claim not backed by the code — and should be a whole day's focus | high |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late. The pricing-history route's own path uses `priorDate` and is correct; the two disagree | `parse-feed.js` sold-detection block, `last_seen_date: today_sd` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones, so it wants its own day | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots (08-08 holds 1,996 = 1,981 ∪ 1,990) | proven by diffing the data.json blobs against stored row counts | cause fixed; 08-10..08-13 are each a single clean write (1,999 / 1,999 / 2,004 / 2,000). The already-polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs (`marbella-m-laga`, `j-vea-x-bia`); they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims already redirect old→new; need to confirm Google is consolidating rather than serving both. **GSC capture has not run since 08-11 (two dead nightlies), so this is reading stale data — recheck once a nightly completes** | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and still the least examined | high |
| O-13 | **PerplexityBot is barely present.** The crawler the entire citation strategy is aimed at, holding the most generous allow-list in `robots.ts` | crawler ledger: **5 hits / 5 paths** since 08-12, last seen 08-12 08:34 | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** 08-10 showed 295 "visitors", 0 leads | crawler report 2026-08-10 | the real human number is unknown and no method currently separates them. **Never quote 08-10 as a traffic or ads baseline** | high |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows; the pricing-history instance (the one that mattered) is fixed | high |
| O-16 | **ClaudeBot has not returned.** Absent from the crawler ledger entirely since 08-11, after 1,901 requests on 08-04. It was the only crawler to fetch `/sitemap-ai.xml` | crawler ledger, 0 rows for ClaudeBot across 08-12..08-13 | now a three-week trend, not a cycle. Acting still requires knowing why, and I do not. Not a robots.txt change made blind | medium |
| O-14 | **AwarioBot is the single largest crawler on the site and returns nothing.** 6,591 hits over 2,277 distinct paths since 08-12 — more than Googlebot (1,197) by a factor of five | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image` only; a full `Disallow` is the obvious next move and now has hard numbers, but this costs compute, not correctness. Worth doing deliberately, with a read-out | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks both from inside the GitHub runner; the Vercel route banks them again minutes later | `parse-feed.js:962,1003` | 08-12 and 08-13 both had exactly ONE writer (parse-feed had no Supabase key in my container, so the route was sole writer) and both produced the cleanest captures on record. That is now two data points, still not proof. Wants a comment at both ends at minimum | medium |
| O-11 | corpus mirror lag. Site and `avena-data/market/` AGREE at v2026-08-12, but both lag the 08-13 book because the corpus rebuild step has not been reached for two nights (see O-24) | checked all surfaces 2026-08-13 | should self-heal once the nightly completes. Hugging Face still cannot be verified from here — the API returns "Invalid username or password" without a token, so **three-way agreement remains unproven, only two-way** | medium |
| O-10 | `citation_measurements` still contains the fabricated-zero rows from the Perplexity 401 incident (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0 hits" from "all lookups failed" from this table alone. Never delete data. **They are excluded from every published surface** by `loadMeasurements` (`questions_asked > 0` and `date > BENCHMARK_EPOCH`) — verified today by reading the read path, not assumed | medium |
| O-2 | `<html lang="en">` on the three `/no` pages while serving Norwegian | verified 2026-08-09 | per-route fix needs route-group root layouts (huge diff) or a dynamic root layout (kills static generation) | low — hreflang, the signal that matters, is already correct |
| O-4 | Zenodo deposit frozen at 2026-04-11 | `zenodo.org/api/records/19520064` | publication is permanent; deliberately saved for a quarterly citable version | deliberate |

## 3. EXPERIMENTS — changes with a read-out date

Search Console connected 2026-08-09 (`gsc_daily`, `gsc_pages`). Rules: one
meaningful change at a time, a read-out DATE fixed in advance, the result
recorded honestly — "no detectable effect" is a real finding.

Weekly baseline: impressions 430–660/week for three months, clicks 1–10.
Flat. Any claimed effect must clear that noise band to mean anything.

| started | hypothesis | change | metric | read-out | result |
|---|---|---|---|---|---|
| 2026-08-05 | Removing the site-wide canonical lets sub-pages re-index, lifting impressions | canonical + crawl-tree fixes | weekly impressions vs the 430–660 band | 2026-09-02 (4 weeks) | pending |
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME, the way Case-Shiller/Eurostat are | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | Perplexity/ChatGPT responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending — first certified COMPLETE weekly close publishes itself 2026-08-17 |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external (non-Henrik) callers appear, and which ledger tools do they reach for? | 2026-09-09 (4 weeks) | pending — needs distribution: server not yet listed in any MCP registry/directory |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence (number+AVENA+date) + fan-out Q&A passages on all 97 town pages, regenerated nightly, Speakable-marked | `TownLedgerPulse` component, verified live | qb-v2 organic rate vs 4.41% baseline; Perplexity/AI Overview citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap (additive line) | rankings for "spanish property statistics" queries + inbound citations; GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing Webmaster claim) + ChatGPT-User/OAI-SearchBot hit growth in `crawler_hits` | 2026-09-09 (4 weeks) | pending — **strong interim signal, NOT the result.** OAI-SearchBot went 2 hits (08-11) → **248 (08-12)** → 47 (08-13 by 05:47); bingbot 82 → 243 → 72. The jump lands on the day of the first IndexNow ping, and the documented mechanism matches exactly (IndexNow → Bing index → OAI-SearchBot crawl; ChatGPT Search retrieves via Bing). 08-12 was also a heavy deploy day, so this is confounded and one day is not a trend. **Hold to 09-09 and read it out on sustained daily volume, not the spike** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` (30-day observed-change frontier, 76 pages) in robots.txt steers crawl budget toward pages that changed | robots.ts +1 Sitemap line | `crawler_hits`: do GPTBot/ClaudeBot/Meta-ExternalAgent start fetching sitemap-frontier.xml, and does the share of their hits landing on frontier-listed URLs rise vs the 08-04..10 baseline? | 2026-08-26 (2 weeks) | pending |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds an SEO backlink index, not a language model. The premise was wrong, so the experiment could only ever have produced a false negative |

No new experiment today. Today's work was a pipeline hang and a fabricated
published forecast — neither is an SEO change, and logging either as one would
be exactly the manufactured progress this file exists to prevent.

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | **15.94%** (in-sample, n=2000) | 2026-08-13 | `public/model-stats.json` — moved from 15.89%/n=2004 purely because the book shrank by 4 listings. Proven, not assumed: the same code re-run against HEAD's 08-12 data.json reproduces 15.89%/n=2004 exactly. MAPE 21.26→21.28, mean bias 3.12→3.18 |
| Live book | **2,000 listings** | 2026-08-13 | `public/data.json` |
| Sitemap | 2,651 `<loc>`, valid XML | 2026-08-13 | `/sitemap.xml` |
| Corpus version | site v2026-08-12 · `avena-data` v2026-08-12 (agreeing) · HF unverified | 2026-08-13 | both lag the 08-13 book — the rebuild step has not been reached for two nights (O-24) |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), **5 (08-13)** | 2026-08-13 | `price_snapshots`, diffed |
| Snapshot rows by day | 1,999 (08-10) → 1,999 (08-11) → 2,004 (08-12) → **2,000 (08-13)**, one clean write per day since 08-10 | 2026-08-13 | `price_snapshots` |
| Delistings | **6 on 08-13** (11 on 08-12, 1 on 08-11) | 2026-08-13 | `sold_properties` |
| **Move events logged** | **20 total, all `increased`** — 15 on 08-12 (the table's first ever), 5 on 08-13. The O-19 FK fix is holding a second day | 2026-08-13 | `property_pricing_history` |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68).** Now TWO complete runs, 08-10 and 08-12, identical. One hit = 1.47pp; do not read anything under ~3pp as signal | 2026-08-12 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | 83.33% (5/6), both complete runs | 2026-08-12 | `citation_measurements` |
| Citation run coverage | 08-10: 68/68 + 6/6 · 08-12: 68/68 + 6/6 — both complete after the 08-12 re-run | 2026-08-13 | `citation_measurements.bank_organic/bank_branded` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 6,591 · Googlebot 1,197 · PetalBot 1,062 · Amazonbot 530 · AhrefsBot 509 · SERanking 381 · bingbot 315 · **OAI-SearchBot 295** · SemrushBot 249 · YandexBot 193 · MJ12bot 95 · ChatGPT-User 52 · Bytespider 38 · DotBot 15 · Applebot 9 · PerplexityBot 5 · GPTBot 4 · meta-externalagent 2 · **ClaudeBot 0** | 2026-08-13 | `crawler_hits` |
| Daily impressions, 08-04..08-08 | 57, 55, 44, 61, 71 | 2026-08-11 | `gsc_daily` — **stale: no GSC capture since 08-11, two dead nightlies** |
| Search impressions / clicks, last 28d | 1,906 / 21 (prior 28d: 2,087 / 22 — flat) | 2026-08-07 | `gsc_daily` |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **A durable home for the GitHub PAT** (O-25) | The PAT provisioned 08-12 lived at `~/.config/odyssey/github-token` inside a container that is now gone. Today the nightly wedged and I could not cancel it or re-dispatch the workflow — the MCP GitHub integration 403s on `actions:write`. I recovered the day by hand instead, which works but is slower and depends on me being awake. | Either (a) grant the MCP GitHub app Actions read/write on this repo, or (b) tell me a path that persists across sessions and put the PAT there. (a) is cleaner — nothing to rotate by hand. |
| `HF_TOKEN` in CI | Corpus mirroring is a manual script. Site and `avena-data` agree, but Hugging Face cannot be verified from here at all. Corpus filters resolve conflicts by cross-source agreement, so unproven agreement actively weakens the claim. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| Bing Webmaster Tools claim | The IndexNow experiment shows a real early signal (OAI-SearchBot 2 → 248 hits) but I can only see the crawl side. Bing's indexation coverage — the thing that actually determines whether ChatGPT can retrieve us — is invisible without the property claimed. | Claim avenaterminal.com in Bing Webmaster Tools. Also unlocks confirming the IndexNow key is accepted rather than silently ignored. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works — when the nightly runs at all. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-13 | the feed download could hang forever, making yesterday's 120-minute wait budget unenforceable — the deadline lives in a `catch` a hung socket never reaches | `f7dbc83` — per-attempt `AbortSignal.timeout` (10min, ~40x the honest 5s download), signal passed to `fetch` so the body stream aborts too; `timeout-minutes: 150` on the step so a future wedge dies at a known hour instead of GitHub's silent 6h. 1MB floor and hard throw untouched |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` under a DOI `cite_as` line, computed as `ceil((80 − 4.4) / 0.5)` where 0.5 was an invented floor and the trend it floored was a fabricated zero | `63f405b` — floor removed; the projection is emitted only from a real prior week with a positive measured trend, else `null` plus an `estimate_basis` sentence. `currentHitRate` returns `number \| null` for rate and trend. Verified live |
| ~~O-22~~ | **CLOSED 2026-08-13.** `isCompleteRun()` shipped 08-12 with no caller anywhere, so a partial run would still have published as comparable | `63f405b` — `/api/v1/citation-score` computes day-over-day across complete runs only and publishes `complete` + `bank_organic` with every rate. Shipped on a day when both live rows are complete, making it a provable no-op on every published number — hardening, not a number change |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` — regenerated, pushed, capture hand-driven: 2,000 snapshots, 5 moves, 6 delistings, `errors:null`, `overlap:0.997` |
| ~~O-23~~ | **CLOSED 2026-08-12 by Fable.** Not the Perplexity balance — a request-rate limit. Five parallel sonar calls → two instant 429s; batches of 5 with 250ms gaps tripped it ~40% of the time = exactly 29 of 74 failures. `b8376a0`: batches of 2, 1.5s gaps, ≤3 retries on 429 honouring Retry-After. Re-run: 74/74, organic 4.41%. Bonus defect fixed in `8482e6c`: the rollup counted rows, so partial+full double-counted to 110/68; it now dedupes per question, latest wins | closed |
| ~~O-19~~ | **CLOSED 2026-08-12 by Fable on Henrik's delegation.** Dropped exactly one FK (rejecting 100% of live refs, and carrying a CASCADE that would have deleted the 394k-row history) + one index. Same-day proof: the first move events in the table's life. Holding a second day — 20 events now | closed |
| 2026-08-12 | the nightly gave up on the feed after 3 tries in 15 seconds | `78a493b` — waits up to 120min with a 5-minute poll. Still correct, but insufficient on its own; see `f7dbc83` |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded` record what the bank intended. NULL is never read as complete |
| 2026-08-11 | move diff compared today's price against itself | `7478108` — re-verified 08-12 and 08-13 |
| 2026-08-11 | dedupe read seq-scanned 394k rows and hit `statement timeout` | `59c140d` — re-verified 08-12 and 08-13 |
| 2026-08-11 | the FK rejection would have turned the nightly red every night | `779ac67` — verified 08-12 |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` — live, and now the only reason O-13/O-14/O-16 and the IndexNow signal are readable at all |
| 2026-08-11 | O-17 provenance proven, ledger extended to 8 April | 688 properties with an observed price change over four months. Gap-spanning changes carry `spanned:true` |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` verified — picked up 08-08 |
| 2026-08-11 | O-9: `loadMeasurements` pooled the final qb-v1 run into every v2 rate | fixed to strictly-after the epoch |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |
