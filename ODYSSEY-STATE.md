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
| 2026-08-11 | `7478108` move diff baselined on the prior date, not today's row | tomorrow's capture must report `moves_baseline_refs` ≈ feed size. Zero there while `trusted_prior:true` means the diff went blind again | **VERIFIED same day** — live run reports `moves_detected:13, moves_baseline_refs:1999`, exactly the 13 reprices hand-diffed from the two books |
| 2026-08-11 | `59c140d` dedupe read scoped to the refs being deduped | must not reappear as `statement timeout` in `errors` | **VERIFIED same day** — EXPLAIN ANALYZE Index Scan 3.8ms; live run `errors:null` |
| 2026-08-11 | `779ac67` FK rejection named as `moves_ledger_blocked`, kept out of `errors` | tonight's nightly capture step must stay GREEN while the summary still names the block. If the run goes red, the classification is wrong | pending — first live test 2026-08-12 |
| 2026-08-11 | `779ac67` workflow asserts `moves_baseline_refs>0` when `trusted_prior` | should be silent on a healthy night; it is the guard that would have caught today's bug | pending — first live test 2026-08-12 |
| 2026-08-11 | branch `odyssey/move-ledger-fk` (NOT merged) | if Henrik applies it: `price_moves` must equal `moves_detected` and `moves_ledger_blocked` must go null | pending Henrik |

**Yesterday's five items, resolved:**
- `1f0a130` stale-feed gate — **VERIFIED, and the stale path finally fired.**
  02:20 skipped with `feed_generated_date:2026-08-10`; the workflow polled
  four more times (03:22:49 → 03:24:22, all skipped) and at 03:24:54 got
  `2026-08-11` and captured 1,999. Working exactly as designed.
- `1f0a130` workflow capture step — **structurally verified, goal REFUTED.**
  The step ran and succeeded, but its stated purpose ("`property_pricing_history`
  must finally gain a `reduced`/`increased` row") did not happen on a day
  holding 13 real moves. Root cause found and it was not the workflow — see O-19.
- `1f0a130` `delisted` counts rows actually inserted — **VERIFIED.** SP1540 left
  the book; `parse-feed.js` tombstoned it at 03:22:31; the route then reported
  `delisted:0` because it inserted 0 rows. Under the old code that would have
  claimed 1. The count is now honest in the direction that used to lie.
- `1f0a130` parse-feed sold-detection overlap guard — verified silent on a
  normal night (overlap 0.999).
- `7e19292` GSC rolling 7-day backfill — **VERIFIED.** `gsc_daily` gained
  2026-08-08 (71 impressions), a day Google published late and the old
  single-day capture would have lost forever. 08-09 not yet published by
  Google, which is the normal 2–3 day lag.

## 2. OPEN — found, not yet fixed

| # | what | evidence | why deferred | priority |
|---|---|---|---|---|
| O-19 | **`property_pricing_history` cannot accept ANY live ref.** `avn_prop_id` has a FK to `properties_registry(avn_prop_id) ON DELETE CASCADE`; that registry froze 2026-05-24 in a different key space — 60,792 rows, and **zero** of the 1,999 live refs appear in it. This is the deepest reason the table holds 394k `'listed'` rows and not one `'reduced'`/`'increased'`: the diff bug fixed today was standing in front of a wall. The CASCADE is a second hazard — cleaning the dead registry would delete the whole pricing history. | measured 2026-08-11; live run rejected all 13 moves on `property_pricing_history_avn_prop_id_fkey` | migration written and pushed to branch `odyssey/move-ledger-fk`; altering a constraint needs Henrik. **Nothing user-facing is blocked** — `price_snapshots` holds all 13 moves and is what `deltas.ts` reads. | high — BLOCKED |
| O-20 | **Two independent writers of `price_snapshots` and `sold_properties`, with no coordination.** `parse-feed.js:1003` banks both from inside the GitHub runner before it even commits the book; the Vercel route banks them again minutes later. Today that ordering is what blinded the move diff. It works now, but the coupling is invisible from either file. | `parse-feed.js:962,1003`; write timestamps 03:22:31 vs 03:24:54 | not urgent — the route is now correct regardless of who wrote first — but the next person to change either side will not know the other exists. Wants a comment at both ends at minimum. | medium |
| O-21 | **`sold_properties.last_seen_date` is stamped "today", not the date last actually seen.** SP1540 left the 08-11 book and was tombstoned with `last_seen_date: 2026-08-11`, but its last appearance was the 08-10 book. Every parse-feed tombstone is a day late. The route's own path uses `priorDate` and is correct; the two disagree. | SP1540 row vs `price_snapshots` | one-day provenance error in the absorption ledger — the moat's most defensible artifact. Worth fixing properly rather than at the end of a long session, and it needs a decision on whether to correct the existing tombstones. | high |
| O-17 | **The 2026-04-08 rows in `price_snapshots` have unverified provenance.** One row per ref, 1,881 of them — exactly the frozen `properties_registry` count. 688 refs show ≥2 distinct prices when it is included, but only 48 within the trustworthy 08-05.. window. | `price_snapshots`; CLAUDE.md on the registry freeze | deliberately EXCLUDED everywhere (`LEDGER_START` in `src/lib/observations.ts`). An April→August delta would be our most impressive-looking evidence and might be an artefact of the registry bug — the worst possible thing to publish while in doubt. **O-19 makes this more likely to be an artefact, not less: the registry is exactly the frozen thing those rows smell of.** | high |
| O-18 | **Nothing captures crawler logs automatically.** The whole 2026-08-10 picture came from a hand export inside Vercel's ~1-day retention window, and two experiments due 2026-08-25 need the same data to read out. | 2026-08-10 session | a permanent crawler ledger (middleware → Supabase) was designed and deliberately not built — it runs on every request. Until it exists, the read-outs depend on Henrik exporting by hand on the day. | high |
| O-13 | **PerplexityBot made 31 requests in 7 days** — the crawler the whole citation strategy is aimed at, holding the most generous allow-list in `robots.ts`. The most-courted bot is the least present. | 7-day crawler export | cause unknown and must not be guessed at. Not a robots.txt problem — the rules are permissive. | high |
| O-9 | citation-measure ran only 68 of ~435 qb-v2 questions on 2026-08-10 (Aug 7 ran 420). Branded control ran 6, not 15. `/api/v1/citation-score` publishes `avena_rate_pct: 4.41` from that thin sample as if comparable to the 420-question run. | `citation_measurements` | needs the cause established before touching a published number — do not guess at a budget/quota story. **Next citation day is Wed 2026-08-12** — check it there. | high |
| O-5 | 186 of 492 indexed pages carry pre-transliteration accent slugs (`marbella-m-laga`, `j-vea-x-bia`); they hold 15 of 21 total clicks | `gsc_pages` 2026-08-07 | 301 shims already redirect old→new; need to confirm Google is consolidating rather than serving both | high |
| O-6 | `/compare` is 293 of 492 indexed pages, 64% of impressions, 20 of 21 clicks | `gsc_pages` 2026-08-07 | not a defect — the highest-leverage surface on the site, and the least examined | high |
| O-7 | `price_snapshots` rows for 2026-08-06..08-09 are a UNION of two books, not snapshots. 08-08 holds 1,996 rows = 1,981 ∪ 1,990. | proven by diffing the data.json blobs against stored row counts | cause fixed as of `1f0a130` (confirmed today: 08-11 has exactly 1,999 rows from a single write). The already-polluted historical rows still need a careful reconciliation — branch-only, needs its own day. | high |
| O-16 | **ClaudeBot went quiet after 08-06.** 1,901 requests on 08-04, then 2/3/0/0. It was the only crawler to fetch `/sitemap-ai.xml`. | 7-day export 2026-08-04..10 | may simply be its weekly cycle. Do not act until a second week shows whether it returns — one absence is not a trend. **Due back ~08-11..12; check the next export.** | medium |
| O-14 | **~28% of traffic is machines that return nothing**: AwarioBot 20,664/7d (20.7%) and Lightpanda carrying no bot marker. | crawler report | a `Disallow` is the obvious move, but robots.txt changes are a live SEO signal and this costs compute, not correctness | medium |
| O-15 | **Vercel Analytics figures for 2026-08-10 are mostly machines** — 295 "visitors", 0 leads. | crawler report 2026-08-10 | the real human number is unknown and no method currently separates them. **Never quote 08-10 as a traffic or ads baseline.** | high |
| O-10 | `citation_measurements` still contains the fabricated-zero rows from the Perplexity 401 incident (08-02..08-06) and two 0-question rows (08-08, 08-09) | table read | cannot distinguish "asked 87, genuinely 0 hits" from "all lookups failed" from this table alone. Never delete data. | medium |
| O-1 | `if (!error) count += chunk` in 5 more places: `scribe/route.ts:48`, `eu-anomalies.ts:127`, `eu-stats-feeds.ts:663`, `eu-validation.ts:281`, `dvf-ingest` | real instances of the recurring shape | `score_history` healthy so not actively losing rows; the pricing-history instance (the one that mattered) is fixed | high |
| O-11 | corpus mirrors lag the site by a day: site v2026-08-11, `avena-data/market/` v2026-08-10 | checked all three 2026-08-11 | mirroring is a manual `scripts/push-corpus-surfaces.py` run; automating it needs `HF_TOKEN` in CI (see BLOCKED) | medium |
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
| 2026-08-11 | Closing `/_next/image` and `/enquire` to bulk training crawlers moves ~25% of their budget onto content | `4e96d3e` robots.txt, 14 bulk crawlers only | distinct properties fetched per crawler per pass, from a log export | 2026-08-25 (2 weeks) | pending — needs O-18 |
| 2026-08-11 | A dated, self-attributing observation sentence on every property page raises the ORGANIC citation rate | `f665245` observed price record | organic citation rate (qb-v2, non-branded) vs the 6.19% full-run baseline | 2026-09-08 (4 weeks) | pending — needs O-9 fixed first or a thin run reads as noise |
| 2026-08-11 | A change-first `sitemap-ai.xml` with true `lastmod` gets changed properties recrawled sooner than unchanged ones | `f665245` | time between an observed price change and the next crawler hit on that ref | 2026-08-25 (2 weeks) | pending — needs O-18 |

No new experiment today. Today's work was pipeline correctness, which is not
an SEO change and does not get a row — recording it as one would be exactly
the manufactured-progress this file exists to prevent.

## 4. BASELINES — what the numbers were, so drift is detectable

| metric | value | as of | source |
|---|---|---|---|
| AVM median absolute error | 15.78% (in-sample) | 2026-08-11 | `public/model-stats.json` — unchanged from 08-10 |
| Live book | 1,999 listings | 2026-08-11 | `public/data.json` |
| Sitemap | 2,649 `<loc>`, valid XML | 2026-08-11 | `/sitemap.xml` |
| Corpus version | site v2026-08-11 · avena-data v2026-08-10 (lags, O-11) | 2026-08-11 | all surfaces |
| **Real price moves by day** | 27 (08-06), 18 (08-07), 8 (08-08), 0 (08-09), 0 (08-10), **13 (08-11)** | 2026-08-11 | `price_snapshots`, diffed; the 08-09/08-10 zeros confirmed real by diffing the data.json blobs |
| Snapshot rows by day | 1,990 → 1,999, one write per day since 08-11 | 2026-08-11 | `price_snapshots` — 08-11 is the first day written by a single capture (1,999 rows, no union) |
| Delistings | SP1540 on 08-11 (1 new ref N9227 arrived) | 2026-08-11 | `sold_properties` |
| Move events ever logged | **0** — structurally impossible, O-19 | 2026-08-11 | `property_pricing_history` |
| Citation rate, organic (qb-v2) | 4.41% (3/68) — thin sample, see O-9 | 2026-08-10 | `citation_measurements` |
| Citation rate, organic — last full run | 6.19% (26/420) | 2026-08-07 | `citation_measurements` |
| Citation rate, branded — last full run | 20.00% (3/15) | 2026-08-07 | `citation_measurements` |
| Observation ledger | 6 days, 2,030 units, 53 moves, 21 tombstones | 2026-08-10 | `public/open-data/dataset.json` |
| **Model-crawler share of all traffic** | **20.1%** (20,125 of 100,000 requests) | 2026-08-04..10 | Vercel log export |
| Model crawlers, 7-day totals | meta-externalagent 5,862 · GPTBot 4,130 · Amazonbot 3,241 · ClaudeBot 2,487 · Bytespider 1,950 · OAI-SearchBot 1,147 · TikTokSpider 1,070 · ChatGPT-User 206 · PerplexityBot 31 · xAI 1 | 2026-08-04..10 | same |
| **ChatGPT-User, live retrieval** | **18–46/day, every one of 7 days** | 2026-08-04..10 | same — the only model line that is a channel rather than an event |
| Daily impressions, 08-04..08-08 | 57, 55, 44, 61, 71 | 2026-08-11 | `gsc_daily` |
| Search impressions, last 28d | 1,906 (prior 28d: 2,087 — flat, -9%) | 2026-08-07 | `gsc_daily` |
| Search clicks, last 28d | 21 (prior 28d: 22) | 2026-08-07 | `gsc_daily` |
| `gsc_daily` latest row | 2026-08-08 (08-09 pending Google) | 2026-08-11 | `gsc_daily` |
| Indexed pages with impressions | 492, of which 186 carry pre-transliteration accent slugs | 2026-08-07 | `gsc_pages` |
| /compare share | 293 of 492 pages · 64% of impressions · 20 of 21 clicks | 2026-08-07 | `gsc_pages` |

**Correction, 2026-08-09 (kept):** an earlier reading of "traffic has halved"
was wrong — the query compared 28 days against 56. Real figures above: flat.
Kept because a wrong baseline would make every future experiment read as a
recovery.

## 5. BLOCKED — needs Henrik

| what | why it matters | what is needed |
|---|---|---|
| **Branch `odyssey/move-ledger-fk`** | `property_pricing_history` cannot record a single live price move — an FK to a registry that froze in May rejects all 1,999 live refs (O-19). The route now detects moves correctly and watches them get rejected. The CASCADE on that FK also means cleaning the dead registry would delete the entire 394k-row history. | Review and merge the branch, then apply the migration to Supabase. One `ALTER TABLE ... DROP CONSTRAINT` plus an index. Nothing user-facing depends on it — `price_snapshots` already holds every move — so this is about reviving the event log, not about a live defect. |
| `HF_TOKEN` in CI | Corpus mirrors are a manual script, so the site is a day ahead of `avena-data` and Hugging Face every day (O-11). Corpus filters resolve conflicts by cross-source agreement, so disagreeing surfaces actively weaken the claim. | Store the HF write token as a repo secret so the nightly job can push all three surfaces together. |
| `actions:write` on the repo token | Odyssey got 403 dispatching a workflow, so it cannot re-run a failed nightly job itself — it can only report and wait a day. | Add the scope to the token it runs with. |
| `GOOGLE_SEARCH_CONSOLE_KEY` in Vercel | The GitHub Actions secret is set, so nightly capture works. Vercel does not have it, so no runtime route can read GSC. Only needed if a live surface should show it. | Paste the same service-account JSON into Vercel env vars. Low priority. |

## 6. CLOSED — resolved, kept so the same ground is not re-dug

| closed | what | outcome |
|---|---|---|
| 2026-08-11 | move diff compared today's price against itself, guaranteeing `moves_detected:0` forever | `7478108` — baseline is the prior date; `moves_baseline_refs` makes a future zero interpretable |
| 2026-08-11 | dedupe read seq-scanned 394k rows and hit `statement timeout` | `59c140d` — predicate leads with the refs being deduped; Index Scan 3.8ms |
| 2026-08-11 | the FK rejection would have turned the nightly red every night | `779ac67` — named as `moves_ledger_blocked`, kept out of `errors`, checked on the live error string so it self-heals when the constraint drops |
| 2026-08-11 | stale-feed gate untested on the stale path | fired correctly at 02:20; workflow polled to 03:24:54 and captured against the right book |
| 2026-08-11 | GSC capture lost any day Google published late | `7e19292` verified — picked up 08-08 |
| 2026-08-10 | pricing-history banked yesterday's book as today's snapshot | `1f0a130` — feed generation stamp + stale gate + workflow-driven capture |
| 2026-08-10 | `delisted` counted rows offered, not rows written | `1f0a130` — verified honest on SP1540 |
| 2026-08-10 | parse-feed sold detection had no feed-overlap guard | `1f0a130` |
| 2026-08-09 | citation rate published fabricated zeros + blended branded control | `9171dce` |
| 2026-08-09 | `pingIndexNow` swallowed every error in an empty catch | returns a result; failures logged |
| 2026-08-08 | `property_pricing_history` never logged a move — believed fixed | **that diagnosis was incomplete.** The prior-snapshot bug was real, but the table was ALSO structurally unwritable (O-19). Reopened and understood properly on 08-11. |
| 2026-08-08 | every branch preview build red for days | four routes built Supabase clients at module top level with `process.env.X!` |
| 2026-08-07 | site claimed "±3% RMSE" with no backtest in existence | measured; exposed a real model bug; 31.8% → 21.3% MAPE |
| 2026-08-09 | O-3: no Search Console access | connected; `gsc_daily`/`gsc_pages` backfilled 90 days, captured nightly |
