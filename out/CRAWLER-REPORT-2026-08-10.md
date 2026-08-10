# Who actually crawls Avena — 2026-08-10

Source: Vercel runtime log export, 13,620 requests, 11:07–23:06 CEST (12h).
This is the first time the question has ever been asked with data. Vercel keeps
runtime logs ~1 day, so this window would have been gone by tomorrow.

## Headline

**The corpus work has a receiver.** GPTBot took 423 requests, ChatGPT-User 31.
The invitation written into `src/app/robots.ts` in April is being accepted by
OpenAI daily. That was unmeasured until tonight — not failing, unmeasured.

## By family

| family | requests | share |
|---|---|---|
| No bot marker in UA (see caveat) | 6,943 | 50% |
| Brand/social monitoring | 2,850 | 20% |
| Search engines | 1,300 | 9% |
| **Model / AI crawlers** | **1,286** | **9%** |
| SEO backlink tools | 1,216 | 8% |
| Infra (Stripe webhooks) | 22 | — |

## By crawler

| crawler | requests | family |
|---|---|---|
| AwarioBot | 2,849 | monitoring |
| AhrefsBot | 836 | SEO tool |
| PetalBot | 631 | search (Huawei) |
| **Amazonbot** | **598** | model |
| Googlebot | 468 | search |
| **GPTBot** | **423** | model |
| SemrushBot | 222 | SEO tool |
| **meta-externalagent** | **185** | model |
| GoogleOther | 126 | search |
| SERankingBacklinksBot | 113 | SEO tool |
| bingbot | 75 | search |
| **Bytespider** | **37** | model (ByteDance) |
| MJ12bot | 34 | SEO tool |
| **ChatGPT-User** | **31** | model (live retrieval) |
| **TikTokSpider** | **11** | model |
| RankshiftFetcher | 6 | SEO tool |
| DotBot | 5 | SEO tool |
| **PerplexityBot** | **1** | model |

## What the model crawlers took

**GPTBot (423)** — training ingest, and it went for exactly the surfaces built
for it: 46 one-pagers, 30 property pages, 19 `/enquire`, 12 town pages, and
then `/brand`, `/costas`, `/blog`, `/license`, `/watchlist`, `/benchmark`,
`/standards`. It is reading the corpus surfaces, not just the shop front.

**ChatGPT-User (31)** — this is not training. This is a live person asking
ChatGPT a question and ChatGPT fetching Avena to answer it, in the moment:

- `/blog/spanish-property-taxes-foreign-buyers-2026` (6)
- `/blog/foreign-buyer-statistics-spain-2026` (4)
- `/blog/spanish-mortgage-guide-non-residents-2026` (2)
- `/blog/spanish-property-market-forecast-2026-2027` (2)
- `/blog/best-areas-spain-rental-income-2026` (2)
- `/answers/average-rental-yield-costa-calida-2026` (2)
- `/blog/new-build-snagging-guide-spain` (2)

Seven distinct topics, ten hits on the homepage. The citation strategy is
working at retrieval time today, regardless of what training does later.

**PerplexityBot: 1 request, to `/press`.** Perplexity has the most generous
allow-list in `robots.ts` — every `/api/v1/*` surface is opened to it by name —
and it fetched one page all day. The most-courted crawler is the least
present. That gap is worth its own investigation.

## The cost side

**AwarioBot: 2,849 requests (21% of everything).** A social-listening/brand
monitoring tool. It hit `/property/*/…` 1,940 times and `/enquire` 578 times.
It feeds no model, no search index and no buyer. It is pure compute.

**Lightpanda/1.0: 915 requests** — a headless browser built for automated
agents, carrying no bot marker at all, which is why it lands in the "no bot
marker" bucket. Plus 102 HeadlessChrome. Roughly 1,000 requests of undeclared
automation.

Together AwarioBot + Lightpanda ≈ 3,764 requests, ~28% of the day, for nothing.

## Caveat on the 50% "no bot marker"

That bucket is NOT 6,943 humans. It contains Lightpanda, HeadlessChrome, and a
large block of Firefox/121.0 — a common automation fingerprint. Execution
regions skew to gru1 (São Paulo, 1,303) and bom1 (Mumbai, 341), which is not
where Avena's buyers are. Treat the real human count as unknown and small.

**Consequence: the "295 visitors" in Vercel Analytics for 2026-08-10 is mostly
machines.** It must not be used as a traffic or advertising baseline. Zero
leads on that day is the corroborating evidence.

## What follows

1. Model crawlers are real and daily. Keep every corpus surface open to them.
2. Perplexity's absence is a genuine open question, not a robots.txt problem.
3. AwarioBot is a candidate for a `Disallow` or crawl-delay — it costs and
   returns nothing. Not urgent, but it is 21% of the load.
4. This report exists only because the log was exported by hand within the
   retention window. A permanent crawler ledger in Supabase would make it
   answerable any day, retroactively.
