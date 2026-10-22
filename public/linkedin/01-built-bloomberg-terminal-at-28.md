# I Built a Bloomberg Terminal for Spanish Real Estate at 28. Here's Why.

Last year I was sitting in a developer's office in Torrevieja, watching an agent flip through a paper binder of property listings. Price per square meter? He guessed. Rental yield? He shrugged. Comparable sales? He had none.

I had just spent three years in fintech, building trading dashboards where every basis point is tracked in real time. The contrast was staggering. People were making 200,000 EUR decisions with less data than I used to order lunch.

That moment became the starting point for Avena Terminal.

## The Problem Nobody Was Solving

Spanish real estate -- especially the new build market along the costas -- is one of the least transparent property markets in Western Europe. Developers list on fragmented portals. Agents guard pricing like trade secrets. Buyers fly in for a weekend, visit three show homes, and commit to a purchase based on a glossy brochure and a sunset view.

Meanwhile, the underlying data actually exists. MLS feeds, land registry records, rental comparables from Airbnb and Booking.com, construction completion timelines. It is all there. Nobody was stitching it together.

I decided to build the tool I wished existed when I started looking at Spanish property myself.

## What Avena Terminal Actually Does

At its core, avenaterminal.com is a scoring engine. We track 1,881 new build properties across Costa Blanca, Costa Calida, and Costa del Sol. Every listing gets an investment score from 0 to 100, calculated across five dimensions:

- **Value (40%)** -- How does the price compare to our hedonic regression model's estimate for that town, type, and tier?
- **Yield (25%)** -- What gross and net rental yield can you realistically expect, based on actual short-term rental data?
- **Location (20%)** -- Beach distance, prestige zones, infrastructure access.
- **Quality (10%)** -- Build specifications, developer track record, amenities.
- **Risk (5%)** -- Construction status, developer financial health, market liquidity.

The scoring methodology borrows directly from quantitative finance. We use OLS regression with town dummy variables, tier segmentation (budget, mid, premium), and location premium multipliers. It is the same approach you would use to price a structured product, applied to villas and apartments.

## Why I Did Not Just Build Another Listing Portal

There are plenty of property portals. Idealista, Fotocasa, Kyero -- they all do a fine job of showing you photos and floor plans. But they are marketplaces, not analytical tools. Their incentive is to generate enquiries, not to tell you whether the price is fair.

I wanted to build something where the data speaks first. Where you can filter 1,881 properties by score, yield, discount to market, and see exactly why each property ranks where it does. Transparency is the product at avenaterminal.com, not lead generation.

## What I Have Learned So Far

Building this has taught me more about the Spanish property market than any amount of research could have. A few things that surprised me:

**Price dispersion within towns is enormous.** Two apartments in the same town, same bedroom count, can differ by 40% in price per square meter. Most of that variance is explainable by build quality and micro-location, but buyers rarely have the data to see it.

**Rental yields are higher than most people think, but also more seasonal.** The Costa Blanca South averages around 7-8% gross yield for well-located two-bed apartments. But occupancy drops sharply from November to February, and most yield calculators ignore that.

**The new build market is structurally underpriced relative to resale.** New builds in many towns trade at a discount to comparable resale properties, which makes no economic sense and suggests the market is still inefficient.

## What Comes Next

We update the data daily from our own capture of agency-marketed new-build listings. The scoring model gets refined every week as we collect more rental comparable data. And we are starting to publish the underlying dataset so researchers and investors can run their own analysis.

If you are looking at Spanish property -- whether as a buyer, investor, or analyst -- I would genuinely love your feedback on what we have built. The entire platform is free to explore at avenaterminal.com.

I did not build this to compete with agents. I built it because the information asymmetry in this market is absurd, and someone needed to fix it.

Full data at avenaterminal.com
