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
| 2026-08-14 | `e415c6b` **curl fallback when the feed origin serves a bot challenge** | **THE read of tomorrow.** The 01:37 nightly is the first unattended test. Three outcomes: (a) fetch succeeds on attempt 1 — the challenge did not fire, proves nothing, wait for a night it does; (b) log shows `hit a bot-protection interstitial` then `Feed complete via curl fallback` — **the fix worked, close O-27's operational half**; (c) `BOTH node fetch and curl were refused` — the egress itself is blocked, the fingerprint theory is wrong for that night, and it escalates to Henrik immediately. All three paths were verified by hand in this container today, so a surprise here means the runner differs from it in a way I have not modelled. **Note precisely: today's 06:02 verification dispatch (run 31774954659) went green in 9 seconds because fetch was NOT challenged — so the fallback itself has still never run on a GitHub runner.** The fix is proven locally and unproven in CI; do not record it as confirmed until a runner log shows the curl line | pending — needs a night the challenge actually fires |
| 2026-08-14 | `9c387fd` **change-answers window fix** (unpaginated read collapsed the ledger to 1 day) | Verified end-to-end at 06:4x via a manual dispatch (see below). Confirm again tomorrow that the nightly log line reads `ledger 2026-08-05..2026-08-15 (11 days)` and NOT `(1 days)`, and that `/answers/spanish-new-build-price-reductions-last-30-days` says "across 11 daily captures" with the true window | **VERIFIED same day** — see the dispatch note below |
| 2026-08-13 | `714b9ab` log the short feed body | **VERIFIED, and it paid for itself.** It fired at 05:48 today and named the cause in one line after two days of guessing: `12112 bytes [text/html \| openresty/1.31.1.1] <title>One moment, please...</title>`. Everything in `e415c6b` follows from that string | **VERIFIED 2026-08-14** |
| 2026-08-13 | `f7dbc83` per-attempt `AbortSignal.timeout` + `timeout-minutes: 150` | Insurance, never fired. Still correct to keep — but note today's work supersedes its purpose: the interstitial path now gives up in ~30s, so the 150-minute ceiling should never be approached again | n/a — insurance |
| 2026-08-12 | `2416532` **Market Pulse delivery engine** — weekly PDF, Mon 05:45 UTC. **PRICING (Henrik, 2026-08-13): one market area = up to 10 towns of the subscriber's choice, changeable anytime, EUR 500/mo.** Never quote per-town pricing | Monday 2026-08-17 05:45 UTC is the first scheduled fire. Verify the Actions run went green and `pulse_deliveries` has a row per active subscriber. **If a Stripe payment lands, a subscriber row (email + towns) MUST be added before Monday.** `pulse-alerts.yml` is already confirmed firing (08-13 07:47, 1 alert) | pending — first cron fire 2026-08-17 |

### Today's manual dispatches — what they proved

Two dispatches of `feed-refresh.yml`, both deliberate:

1. **05:47 (run 31774148318)** — dispatched to republish the corrected answers.
   Step 5 hit the interstitial and started its 120-minute burn. I **cancelled it
   at 20 minutes**, because cancelling makes GitHub serve the logs immediately
   and the run could not have succeeded anyway. That cancel is what produced the
   `openresty` evidence. It also proved the MCP GitHub integration can now cancel
   runs — see closed O-25.
2. **~06:5x** — dispatched on `e415c6b` to verify the curl fallback on a real
   runner and republish the answers. **Read its outcome first thing tomorrow if
   the brief did not already record it.**

**Lesson that held today:** yesterday I diagnosed a running job from its symptoms
and shipped on a wrong theory. Today the same wall appeared — logs unavailable
on an in-progress job — and instead of theorising I cancelled the run to force
the evidence out. Cost: one dispatch. Gain: the root cause, after three days.

**Lesson learned today:** I concluded "IP reputation, not client" from the
`nginx` vs `openresty` server headers, then this container was challenged
minutes later and served normally minutes after that. The classification is
**intermittent**, and my first reading was too confident. The measurement that
actually held up was the controlled one (curl 6/6 vs fetch 3/3), not the
inference from two observations.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-27 | **RedSP's provider serves a bot-protection JS interstitial to some clients/requests, not the feed.** ROOT CAUSE NOW KNOWN. `openresty/1.31.1.1` returns a 12.1KB "One moment, please..." page that reloads itself via JS after 5s. node's `fetch` cannot execute JS, so retrying is impossible-by-construction. Measured: curl 6/6 success across every UA/HTTP-version/encoding varied; node fetch 3/3 challenged. Not the UA — the TLS client fingerprint. **Intermittent, not sticky** | run 31774148318 log 05:48; controlled client comparison in this container 2026-08-14 | **operational half mitigated today** by `e415c6b` (curl fallback). The CAUSE is not fixed and cannot be by me: it needs RedSP to allow-list, or a stable-IP runner. If curl also starts getting challenged, the fallback dies with it | **CRITICAL — mitigated, cause still open** |
| O-28 | **`avena-data` corpus mirror has NO automation at all.** Site is v2026-08-14, mirror frozen at v2026-08-12. Nothing in `scripts/` or `.github/` references the mirror repo; `push-corpus-surfaces.py` covers HF+Zenodo only and is also manual | checked every workflow and script today; mirror JSON read live | **corrects yesterday's O-11, which said this "should self-heal once the nightly completes". The nightly completed today and it did not.** Automating it needs a cross-repo write token (Actions' `GITHUB_TOKEN` is scoped to this repo), so it needs Henrik. Cross-source agreement is the whole point of the corpus channel — disagreeing surfaces actively weaken the claim | **high** |
| O-26 | **Audit the rest of `/api/v1/*` for invented constants.** ~20 endpoints all carrying the same `cite_as` DOI line, none read with the question "which published numbers come from a constant chosen in the file rather than a measurement?" | `63f405b` found one (`Math.max(0.5, trend)`); today found a second of the same family in `generate-change-answers` (a window that came from a truncated read). Two for two on the surfaces actually examined | Today's budget went to the pipeline and the answers bug. **This is now the strongest candidate for a whole day's focus** — the hit rate on this class is 100% so far | **high** |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** Every parse-feed tombstone is a day late; the pricing-history route's own path uses `priorDate` and is correct. The two disagree | `parse-feed.js` sold-detection block, `last_seen_date: today_sd` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Needs a decision on whether to correct existing tombstones | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots | proven by diffing data.json blobs against stored row counts | cause fixed; 08-10..08-14 are each a single clean write. Polluted historical rows still need careful reconciliation — branch-only, needs its own day | high |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs; they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims redirect old→new; need to confirm Google is consolidating. **GSC capture ran today (08-14) for the first time since 08-11 — re-read this against fresh data tomorrow** | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and still the least examined | high |
| O-13 | **PerplexityBot is barely present.** 17 hits / 12 paths since 08-12 (was 5/5) — a slight rise, still negligible for the crawler the entire citation strategy targets | crawler ledger, 10 hits on 08-14 (partial day) — its best single day | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive and OAI-SearchBot thrives under the same file | high |
| O-15 | **Vercel Analytics figures are mostly machines.** AwarioBot alone is 11,368 hits since 08-12 | crawler ledger | the real human number is unknown and no method currently separates them. **Never quote Vercel visitor counts as traffic** | high |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows | high |
| O-29 | **Lightpanda is a new crawler and nobody asked it here.** 1,677 hits / 299 paths, first seen 08-13, zero before. An open-source headless browser marketed for AI-agent scraping | crawler ledger: 0 (08-11), 0 (08-12), 1,456 (08-13), 221 (08-14 partial) | new today, no action yet. Worth knowing what it fetches before deciding whether it is a citation channel or just cost — it executes JS, so unlike the bulk crawlers it sees the rendered page | medium |
| O-16 | **ClaudeBot has barely returned.** 3 hits on 08-13 after 1,901 requests on 08-04, and 0 again on 08-14 | crawler ledger | slightly better than yesterday's flat 0, still effectively absent. Acting requires knowing why, and I do not | medium |
| O-14 | **AwarioBot is the largest crawler on the site by far and returns nothing.** 11,368 hits over 2,277 paths since 08-12 — 4.7x Googlebot. Path count is flat at 2,277 while hits nearly doubled, so it is re-crawling the same set repeatedly | crawler ledger | `98a87e7` fenced it off `/enquire` and `/_next/image`; a full `Disallow` is the obvious next move and now has hard numbers. Costs compute, not correctness | medium |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`.** `parse-feed.js:1003` banks from inside the runner; the Vercel route banks again minutes later | `parse-feed.js:962,1003` | 08-12..08-14 all had effectively one writer and produced the cleanest captures on record. Still wants a comment at both ends at minimum | medium |
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
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass | 2026-08-25 (2 weeks) | pending |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the **4.41% baseline** | 2026-09-08 (4 weeks) | pending — read out on COMPLETE runs only |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — readable from `crawler_hits` |
| 2026-08-11 | A weekly, dated, self-attributing series sentence makes the index citable BY NAME | `ab21893` weekly pulse on `/avena-index` + `/api/v1/indices/avena` | responses naming "AVENA Index"; any external quote of a weekly close | 2026-09-08 (4 weeks) | pending — first certified COMPLETE weekly close publishes 2026-08-17 |
| 2026-08-12 | Exposing the observation ledger as MCP tools turns Avena from a site AIs READ into a source AIs USE | MCP tools 8–11 + `mcp_calls.tool` column | `mcp_calls` grouped by tool: do external callers appear? | 2026-09-09 (4 weeks) | pending — needs distribution: not yet listed in any MCP registry |
| 2026-08-12 | **Nightly Quotable**: one extractable sentence + fan-out Q&A on all 97 town pages, Speakable-marked | `TownLedgerPulse`, verified live | qb-v2 organic rate vs 4.41%; citations of town pages specifically | 2026-09-09 (4 weeks) | pending |
| 2026-08-12 | **/statistics hub**: 18 dated branded stat sentences, nightly regenerated | live, in sitemap | rankings for "spanish property statistics" queries + GSC impressions | 2026-09-23 (6 weeks) | pending |
| 2026-08-12 | **IndexNow nightly ping** (2,106 URLs → Bing = ChatGPT's retrieval index) | `scripts/indexnow-ping.mjs` + 03:30 UTC workflow | Bing indexation coverage (needs Henrik's Bing claim) + OAI-SearchBot/ChatGPT-User growth | 2026-09-09 (4 weeks) | pending — **interim, still not the result.** OAI-SearchBot by day: 2 (08-11) → **248** (08-12) → 74 (08-13) → 43 (08-14 by 06:00, partial). bingbot 82 → 243 → 213 → 56. The spike decayed but the floor is ~20-40x the pre-ping baseline of 2/day and has now held **three days**, which is more than the one-day spike I cautioned about yesterday. Still confounded by 08-12 being a heavy deploy day. **Hold to 09-09** |
| 2026-08-12 | Announcing `/sitemap-frontier.xml` in robots.txt steers crawl budget toward changed pages | robots.ts +1 Sitemap line | do GPTBot/ClaudeBot/Meta-ExternalAgent fetch it, and does their hit share on frontier URLs rise? | 2026-08-26 (2 weeks) | pending |
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day.** The crawler was AhrefsBot, which feeds a backlink index, not a language model |

No new experiment today. Both changes were defect fixes — a pipeline failure
and a false published number. Logging either as an SEO experiment would be
exactly the manufactured progress this file exists to prevent.

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
| AVM median absolute error | **15.94%** (in-sample, n=2007) | 2026-08-14 | `public/model-stats.json`. n moved 2000→2007 with the book; every error metric byte-identical to the committed file across both of today's gate runs |
| Live book | **2,007 listings** | 2026-08-14 | `public/data.json` |
| Sitemap | 2,658 `<loc>`, valid XML | 2026-08-14 | `/sitemap.xml` |
| Corpus version | site **v2026-08-14** · `avena-data` **v2026-08-12 (DIVERGED, O-28)** · HF unverified | 2026-08-14 | the mirror has no automation and did not self-heal when the nightly completed |
| Ledger (published) | first 2026-08-05, latest 2026-08-14, **10 observation days, 2,069 refs, 101 moves, 52 delistings** | 2026-08-14 | `/open-data/dataset.json` |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), 13 (08-11), 15 (08-12), 5 (08-13), **15 (08-14)** | 2026-08-14 | `price_snapshots`, diffed |
| Snapshot rows by day | 1,999 (08-10) → 1,999 (08-11) → 2,004 (08-12) → 2,000 (08-13) → **2,007 (08-14)**, one clean write per day since 08-10 | 2026-08-14 | `price_snapshots` |
| Delistings | **0 on 08-14** (6 on 08-13, 11 on 08-12) | 2026-08-14 | `sold_properties` |
| Cumulative moves / cuts | **101 moves since 08-05 — 28 cuts, 73 rises.** Median cut **3.83%** | 2026-08-14 | `price_snapshots`, SQL |
| **Citation rate, organic (qb-v2) — THE baseline** | **4.41% (3/68)** on 08-10 and 08-12; **2.94% (2/68)** on 08-14. Three complete runs, mean 3.92%. One hit = 1.47pp, so **08-14 is one hit below and is NOT a decline** — do not read anything under ~3pp as signal | 2026-08-14 | `citation_measurements` |
| Citation rate, branded control (qb-v2) | 83.33% (5/6), all three complete runs — perfectly stable | 2026-08-14 | `citation_measurements` |
| Citation run coverage | 08-10, 08-12, 08-14 all 68/68 + 6/6 — three complete runs | 2026-08-14 | `bank_organic`/`bank_branded` |
| Citation rate, qb-v1 (RETIRED RULER — never a baseline) | organic 6.19% (26/420), branded 20.00% (3/15) | 2026-08-07 | excluded from all published series |
| **Crawler ledger, hits since 08-12** | AwarioBot 11,368 · Googlebot 2,433 · PetalBot 2,087 · **Lightpanda 1,677 (new)** · AhrefsBot 1,167 · Amazonbot 749 · bingbot 512 · SemrushBot 467 · SERanking 384 · **OAI-SearchBot 365** · YandexBot 275 · MJ12bot 116 · ChatGPT-User 103 · DotBot 65 · Bytespider 51 · **PerplexityBot 17** · Applebot 15 · GPTBot 11 · meta-externalagent 3 · **ClaudeBot 3** · Google-Extended 1 | 2026-08-14 | `crawler_hits` |
| **Nightly reliability** | **5 of the last 7 scheduled nightlies FAILED at the feed step** (08-08, 08-09, 08-10, 08-12, 08-13 failed; 08-11, 08-14 succeeded). Pre-`78a493b` failures died in ~40s, later ones burned 120min — same cause, different give-up | 2026-08-14 | Actions run list. **This is the real reliability number and it was worse than recorded** |
| Search impressions / clicks, last 28d | 1,906 / 21 (prior 28d: 2,087 / 22 — flat) | 2026-08-07 | `gsc_daily` — GSC capture ran again 08-14 after three missed days; re-read tomorrow |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **RedSP is challenging GitHub Actions egress** (O-27) | ROOT CAUSE NOW PROVEN: their provider serves an openresty JS interstitial instead of the feed. It killed 5 of the last 7 nightlies. I shipped a curl fallback today that gets through, but that is a mitigation riding on a client-fingerprint difference — if their guard starts challenging curl too, it dies and every night is lost until someone notices. | Either (a) ask RedSP to allow-list GitHub Actions egress for the feed URL — the clean fix, and a reasonable ask since Avena is a paying consumer of that feed; or (b) approve moving the feed step to a runner with a stable IP that RedSP can allow-list. |
| **Search Console now has Generative AI performance reports** (NEW today) | Google shipped them 3 June 2026: impressions in AI Overviews and AI Mode, and **which of your URLs got cited**, broken down by page/country/device/date. That is the first direct measurement of the exact channel this entire strategy targets — today it is measured only by proxy (a Perplexity question bank and crawler hits). **It is UI-only: no API, no `aiOverview`/`aiMode` type on `searchanalytics.query`, no BigQuery export.** So I cannot capture it, at all, until Google ships the API. | Check whether avenaterminal.com has the report yet (rollout began with a subset of sites) at Search Console → Performance → Generative AI. If it is there, export the CSV and drop it anywhere I can read it. Even one month would tell us whether the citation work is landing. |
| **`avena-data` corpus mirror is unautomated and now diverged** (O-28) | Site publishes v2026-08-14, the mirror still serves v2026-08-12. Corpus filters resolve conflicts by cross-source agreement, so two surfaces disagreeing is worse than one surface alone. Nothing in the repo pushes the mirror — it has only ever been updated by hand. | A cross-repo write credential (deploy key or fine-grained PAT for `HenrikKolstad/avena-data`) as a repo secret, and I will add the mirror push to the nightly so all surfaces move together. |
| `HF_TOKEN` in CI | Same family as above. Hugging Face cannot be verified from here at all — the API returns "Invalid username or password" without a token — so three-way agreement remains unproven, only two-way, and today even the two-way broke. | Store the HF write token as a repo secret so the nightly pushes all three surfaces together. |
| Bing Webmaster Tools claim | **DONE — Henrik claimed avenaterminal.com in Bing Webmaster Tools on 2026-08-13** (morning clicks session with Fable; the site was already Bing-verified). The indexation-coverage and IndexNow-key views should now be readable — next step is READING them, not claiming. | Fable 2026-08-14: move to reading Bing's index coverage + IndexNow submission status for the 09-09 read-out. If the dashboard shows the key rejected, say so loudly. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-14 | **the published change-answers claimed 101 price moves inside a 1-day observation window** — "28 reductions and 73 increases across 1 daily captures, 5 August to 5 August", which is self-refuting (a move needs two captures) and overstates daily churn ~10x on a page built to be cited | `9c387fd` — cause was an unpaginated `price_snapshots` select hitting PostgREST's 1000-row cap, so all returned rows were the earliest date. Window and moves now derive from ONE read, so they cannot disagree; the paging loop throws instead of silently truncating at its budget; and an invariant refuses to publish moves alongside <2 capture dates |
| 2026-08-14 | the feed retry loop spent 120 minutes on a challenge it could never pass | `e415c6b` — HTML bodies recognised as interstitials, curl fallback (measured: curl 6/6, fetch 0/3), give-up in ~30s with a diagnosis naming the remedy |
| ~~O-25~~ | **CLOSED 2026-08-14.** "The GitHub PAT is not durable, so I cannot self-recover" | The MCP GitHub integration now has Actions write (granted 08-13). Proven today: `cancel_workflow_run` succeeded on run 31774148318, and two `run_workflow` dispatches went through. No PAT needed. Cancelling a wedged run is how I got today's root-cause evidence |
| ~~O-24~~ | **CLOSED 2026-08-14.** "Every enrichment step is downstream of the one step that keeps breaking" | The 08-14 nightly reached all of them — GSC capture, corpus rebuild, move capture and change-answers all ran green. The premise (that they never get reached) was a symptom of the feed failure, not a separate defect. If the corpus lags again after a green nightly, that is O-28, not this |
| ~~O-11~~ | **SUPERSEDED 2026-08-14 by O-28.** Recorded as "corpus mirror lag, should self-heal once the nightly completes" | It did not self-heal. The nightly completed and the mirror stayed at v2026-08-12, because nothing has ever pushed it automatically. Reopened as O-28 with the real cause |
| 2026-08-13 | a short feed body was logged only as a byte count | `714b9ab` — and it is what cracked O-27 the next morning |
| 2026-08-13 | an unbounded `fetch` could wedge a run until GitHub's silent 6h default | `f7dbc83` — insurance, NOT a fix; shipped on a wrong diagnosis |
| 2026-08-13 | `/api/v1/crawler-report` published `estimated_weeks_to_dominance: 152` computed from an invented 0.5 floor over a fabricated zero trend | `63f405b` — floor removed; projection emitted only from a real prior week, else `null` + an `estimate_basis` sentence. Verified live |
| ~~O-22~~ | `isCompleteRun()` shipped with no caller | `63f405b` — day-over-day across complete runs only; publishes `complete` + `bank_organic` with every rate |
| 2026-08-13 | 2026-08-13's book and capture, lost by the wedged nightly | `355def7` — regenerated, capture hand-driven, `errors:null` |
| ~~O-23~~ | Perplexity failures were a request-rate limit, not balance | `b8376a0` batches of 2 with 1.5s gaps; re-run 74/74. `8482e6c` fixed a rollup that counted rows so partial+full double-counted |
| ~~O-19~~ | one FK rejecting 100% of live refs, carrying a CASCADE that would have deleted 394k rows | dropped; first move events in the table's life followed |
| 2026-08-12 | the nightly gave up on the feed after 3 tries in 15 seconds | `78a493b` — 120min budget. **Note 08-14: against an interstitial this was never going to work; superseded by `e415c6b`** |
| 2026-08-12 | a 62%-coverage citation run published as a comparable data point | `24db855` — `bank_organic`/`bank_branded`; NULL never read as complete |
| 2026-08-11 | move diff compared today's price against itself | `7478108` |
| 2026-08-11 | dedupe read seq-scanned 394k rows and hit `statement timeout` | `59c140d` |
| 2026-08-11 | crawler ledger (O-18) | `a9775c5`..`3ecf70b` — the only reason O-13/O-14/O-16/O-29 and the IndexNow signal are readable at all |
| 2026-08-11 | O-17 provenance proven, ledger extended to 8 April | 688 properties with an observed price change over four months |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` |
| 2026-08-11 | O-9: `loadMeasurements` pooled the final qb-v1 run into every v2 rate | fixed to strictly-after the epoch |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days |
