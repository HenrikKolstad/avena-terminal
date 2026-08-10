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
| 2026-08-10 | `1f0a130` feed generation stamp + stale-book gate on pricing-history | **02:20 UTC run must now report `skipped:true, feed_generated_date:<yesterday>` instead of banking a snapshot.** Then the workflow's capture step must drive a second run reporting `feed_generated_date:<today>`. Check `cron_logs` for both. | happy path verified 2026-08-10 (route returned `feed_generated_date:2026-08-10`, proceeded, snapshotted 1999). **Stale path untested — first real test is the 02:20 run on 08-11.** |
| 2026-08-10 | `1f0a130` workflow capture step polls until the deploy serves today's book | tonight's run must show a "Capture price moves" step that succeeds, and `property_pricing_history` must finally gain a `reduced`/`increased` row on a day the market moves | pending — first live test 2026-08-11 |
| 2026-08-10 | `1f0a130` `delisted` counts rows actually inserted | a run reporting `delisted:N` must be matched by N new `sold_properties` rows | pending — needs a day with a real delisting |
| 2026-08-10 | `1f0a130` parse-feed sold-detection overlap guard | only fires on a broken feed; verify by reading the step log on a normal night (should be silent) | pending |
| 2026-08-10 | `7e19292` GSC rolling 7-day backfill | tonight's run requests 08-04..08-10; `gsc_daily` must gain 08-08 and 08-09 | pending — first live test 2026-08-11 |

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-12 | ~~Are model crawlers reaching us at all?~~ **ANSWERED 2026-08-10 — yes, daily.** GPTBot 423, Amazonbot 598, meta-externalagent 185, Bytespider 37, ChatGPT-User 31, TikTokSpider 11 in a 12h window. Full breakdown in `out/CRAWLER-REPORT-2026-08-10.md`. Two live questions remain, below. | Vercel log export, 13,620 requests, 11:07–23:06 CEST | — | closed |
| O-13 | **PerplexityBot made 1 request all day** — to `/press`. It holds the most generous allow-list in `robots.ts` (every `/api/v1/*` surface opened by name) and is the crawler the whole citation strategy is aimed at. The most-courted bot is the least present. | crawler report 2026-08-10 | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive. Could be crawl budget, could be that Perplexity fetches via a different agent, could be that we are simply not linked from anywhere it crawls. | high |
| O-14 | **~28% of all traffic is machines that return nothing**: AwarioBot 2,849 requests (21%, incl. 578 hits on `/enquire`) and Lightpanda/1.0 915 requests (a headless browser carrying no bot marker). Neither feeds a model, a search index or a buyer. | crawler report 2026-08-10 | a `Disallow` or crawl-delay is the obvious move, but robots.txt changes are a live SEO signal and this is not urgent — it costs compute, not correctness | medium |
| O-15 | **Vercel Analytics figures for 2026-08-10 are mostly machines** — 295 "visitors", 310 one-pager route views, 0 leads. The 50% of requests with no bot marker in the UA is not 50% humans: it contains Lightpanda, HeadlessChrome and a Firefox/121.0 block, executing largely in gru1 (São Paulo) and bom1 (Mumbai). | crawler report 2026-08-10 | the real human number is unknown, and no method currently separates them. **Never quote 08-10 as a traffic or ads baseline.** | high |
| ~~O-12-old~~ | 2026-08-10 traffic spike unexplained: 295 visitors vs a ~40/day baseline, `/property/[ref]/one-pager` 310 route views, GNU/Linux 35% of a 91%-desktop mix, Singapore 32% + Brazil 13%, Norway 6%, and **0 leads** (08-09 produced 2 leads on ~40 visitors) | Vercel Analytics 2026-08-10 22:32 CEST; `leads` table by day; Vercel Logs 22:33 | **Read as a scraper at 22:35 and that was wrong** — see the correction below. Two measurements still disagree and neither has been reconciled: Analytics says Singapore/Linux, the logs sample says Mac/Stockholm. **Do not count 08-10 as a traffic or ads baseline either way** — 0 leads on 295 visitors means it is not comparable to a normal day. | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots. 08-08 holds 1,996 rows = 1,981 (07 Aug book) ∪ 1,990 (08 Aug book). | proven by diffing the data.json blobs against the stored row counts | the cause is fixed as of `1f0a130`, but the already-polluted historical rows need a careful reconciliation. Deleting/rewriting existing rows is the branch-only category — needs its own day and a written plan. | high |
| O-8 | 6 phantom delistings: SP1644, N9519, N9260, N8205, SP1625, SP1080 were tombstoned 08-07, resurrected into the 08-08 snapshot by the stale run, then "left" again on 08-09 | `sold_properties` vs `price_snapshots`; cron_logs 08-09 reported `delisted:6` while writing 0 rows | the tombstones themselves are CORRECT (last_seen 08-07 is right); only the phantom re-detection was wrong, and that path is now fixed. No data to repair. Kept here so the same refs are not re-investigated. | low |
| O-9 | citation-measure ran only 68 of ~435 qb-v2 questions on 2026-08-10 (Aug 7 ran 420). Branded control ran 6, not 15. `/api/v1/citation-score` publishes `avena_rate_pct: 4.41` from that thin sample as if comparable to the 420-question run. | `citation_measurements` 2026-08-10 vs 2026-08-07 | needs the cause established before touching a published number — do not guess at a budget/quota story | high |
| O-10 | `citation_measurements` still contains the fabricated-zero rows from the Perplexity 401 incident (08-02..08-06, 87 questions each, 0.00%) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0 hits" from "asked 87, all lookups failed" from this table alone; the rolling-7d read path appears to skip them but that needs reading, not assuming. Never delete data. | medium |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows; the pricing-history instance (the one that mattered) is fixed | high |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs (`marbella-m-laga`, `j-vea-x-bia`); they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims already redirect old→new; need to confirm Google is consolidating rather than serving both | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and the least examined | high |
| O-11 | corpus mirrors lag the site by a day: site v2026-08-10, `avena-data/market/` v2026-08-09, Hugging Face last modified 2026-08-09 | checked all three 2026-08-10 | mirroring is a manual `scripts/push-corpus-surfaces.py` run; automating it needs `HF_TOKEN` in CI (see BLOCKED) | medium |
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
| 2026-08-10 | ~~A bulk ingest of the one-pagers raises the organic citation rate~~ | ~~an external agent crawled 310 one-pagers~~ | — | — | **WITHDRAWN same day, before it could mislead.** The crawler was AhrefsBot, which builds a backlink index for an SEO tool and feeds no language model. The premise was wrong, so the experiment could only ever have produced a false negative: a flat citation rate on 09-07 would have read as "corpus seeding does not work" when no model crawler ever visited. See O-12. |

The 2026-08-10 row is an observation, not a shipped change — recorded as an
experiment anyway because it has a testable consequence and a date. Whether it
means anything at all depends on O-12, which is NOT settled.

**Resolved 2026-08-10 22:42:** AhrefsBot, from Paris — and it is invited by
name in `src/app/robots.ts:116`. Nothing was stolen and nothing is broken. The
one thing worth carrying forward is a distinction that was blurred all
evening: **an SEO index crawler is not a model crawler.** Ahrefs, Semrush and
DotBot build backlink indexes for subscription tools. GPTBot, ClaudeBot,
PerplexityBot and CCBot are the ones whose visits could plausibly move a
citation rate. Only the second group is evidence about the corpus work, and
none of them appeared on 08-10.

**Correction, 2026-08-10 22:40 (same day):** the spike was called a scraper on
the strength of route shape, OS mix and geography. Reading an actual request
disproved it for that sample. `GET /property/N9363` carried `Prefetch: Yes`,
the `_rsc` search param and `nxtPref`, referer `https://avenaterminal.com/`,
a Macintosh user-agent, received in Stockholm. That is Next.js link
prefetching from our own homepage — a real browser, not a harvester. It also
explains the "parallel threads" tell: five properties inside one second is the
homepage prefetching five links, and the repeated 304s on `/enquire` are the
CTA being prefetched.

What remains genuinely unexplained: Analytics reports Singapore 32% and
GNU/Linux 35%, and prefetch requests do not reach the client-side analytics
beacon at all — so the 310 one-pager ROUTE VIEWS cannot be explained away by
what the logs just showed. Server logs and Analytics are measuring different
things here and have not been reconciled. Resolve that before either the
scraper story or the crawler-ingest story is written down as fact.

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | 15.78% (in-sample) | 2026-08-10 | `public/model-stats.json` — was 15.81%; moved with the new book, not with a code change |
| Citation rate, organic (qb-v2) | 4.41% (3/68) — thin sample, see O-9 | 2026-08-10 | `citation_measurements` |
| Citation rate, branded control | 83.33% (5/6) — thin sample, see O-9 | 2026-08-10 | `citation_measurements` |
| Citation rate, organic — last full run | 6.19% (26/420) | 2026-08-07 | `citation_measurements` |
| Citation rate, branded — last full run | 20.00% (3/15) | 2026-08-07 | `citation_measurements` |
| Observation ledger | 6 days, 2,030 units, 53 moves, 21 tombstones | 2026-08-10 | `public/open-data/dataset.json` |
| Real price moves by day | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10) | 2026-08-10 | `price_snapshots`; the two zeros confirmed real by diffing the data.json blobs |
| Live book | 1,999 listings, 69 towns published (k>=5) | 2026-08-10 | `public/data.json` |
| Sitemap | 2,649 `<loc>` | 2026-08-10 | `/sitemap.xml` |
| Search impressions, last 28d | 1,906 (prior 28d: 2,087 — flat, -9%) | 2026-08-07 | `gsc_daily` |
| Search clicks, last 28d | 21 (prior 28d: 22) | 2026-08-07 | `gsc_daily` |
| Daily impressions, 08-01..08-07 | 59, 71, 63, 57, 55, 44, 61 | 2026-08-07 | `gsc_daily` — no deviation across the reported industry volatility window |
| `gsc_daily` latest row | 2026-08-07 (08-08 pending Google) | 2026-08-10 | `gsc_daily` |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved
(1,986 vs 4,068)" was wrong — the query moved the start date back 56 days
while leaving the end fixed, comparing 28 days against 56. Real figures above:
flat. Kept because a wrong baseline would make every future experiment read
as a recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| `HF_TOKEN` in CI | Corpus mirrors are a manual script, so the site is a day ahead of `avena-data` and Hugging Face every day (O-11). Corpus filters resolve conflicts by cross-source agreement, so disagreeing surfaces actively weaken the claim. | Store the HF write token as a repo secret so the nightly job can push all three surfaces together. |
| `actions:write` on the repo token | Odyssey got 403 dispatching a workflow, so it cannot re-run a failed nightly job itself — it can only report and wait a day. Today's run failed on GSC and could not be re-run. | Add the scope to the token it runs with. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so the nightly capture works. Vercel does not have it, so no runtime route can read GSC. Only needed if a live surface should show it. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — feed generation stamp + stale gate + workflow-driven capture |
| 2026-08-10 | `delisted` counted rows offered, not rows written (reported 6, wrote 0) | `1f0a130` — counts RETURNING rows |
| 2026-08-10 | parse-feed sold detection had no feed-overlap guard | `1f0a130` — the >=50% guard the route already had |
| 2026-08-10 | GSC capture lost any day Google published late | `7e19292` — rolling 7-day window; the refusal-to-write-zero kept |
| 2026-08-10 | `52a7217` feed-before-enrichment held under a real failure: GSC failed, feed `a0a297c` and corpus `dec278a` still committed, run went red at the gate | verified, working as designed |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce`; organic and branded now separate (unmeasured-day path still untested — see VERIFY) |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures are logged and visible |
| 2026-08-08 | `property_pricing_history` never logged a move | prior snapshot taken as global max date; fixed and merged — but note the table was STILL empty, because the route never saw a fresh book until `1f0a130` |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access — Odyssey was optimising blind | connected; `gsc_daily`/`gsc_pages` backfilled 90 days to 2026-05-10, captured nightly |
