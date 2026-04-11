import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAllProperties, getUniqueTowns, getUniqueCostas, avg, slugify } from '@/lib/properties';
import { Property } from '@/lib/types';

// Fixed exchange rates (approximate) — British + Scandinavian buyers = 80% of audience
const FX = { EUR: 1, GBP: 0.85, NOK: 11.2, SEK: 11.5, DKK: 7.45, USD: 1.08, CHF: 0.97 };

function convertPrices(eur: number) {
  return {
    price_eur: eur,
    price_gbp: Math.round(eur * FX.GBP),
    price_nok: Math.round(eur * FX.NOK),
    price_sek: Math.round(eur * FX.SEK),
    price_usd: Math.round(eur * FX.USD),
  };
}

function generateScoreReasoning(p: Property, all: Property[]): string {
  const parts: string[] = [];
  const score = p._sc ?? 0;
  parts.push(`${score}/100`);

  // Beach proximity percentile
  if (p.bk != null && p.bk > 0) {
    const beachProps = all.filter(x => x.bk && x.bk > 0);
    const betterThan = beachProps.filter(x => x.bk! > p.bk!).length;
    const pct = Math.round((betterThan / beachProps.length) * 100);
    if (p.bk <= 0.5) parts.push(`beach ${Math.round(p.bk * 1000)}m (top ${100 - pct}% of database)`);
    else parts.push(`beach ${p.bk.toFixed(1)}km`);
  }

  // Developer quality
  if (p.dy && p.dy >= 15) parts.push(`established developer (${p.dy}yr track record)`);
  else if (p.dy && p.dy >= 5) parts.push(`developer ${p.dy}yr experience`);

  // Price vs market
  if (p.pm2 && p.mm2 && p.mm2 > 0) {
    const discount = ((p.mm2 - p.pm2) / p.mm2 * 100);
    if (discount > 5) parts.push(`priced ${Math.round(discount)}% below market`);
    else if (discount < -5) parts.push(`priced ${Math.round(Math.abs(discount))}% above market`);
    else parts.push('priced at market rate');
  }

  // Yield
  if (p._yield?.gross) {
    if (p._yield.gross >= 7) parts.push(`strong yield ${p._yield.gross.toFixed(1)}% gross`);
    else if (p._yield.gross >= 5) parts.push(`yield ${p._yield.gross.toFixed(1)}% gross`);
  }

  // Status
  if (p.s === 'key-ready' || p.s === 'ready') parts.push('key-ready (no completion risk)');
  else if (p.c) parts.push(`completion ${p.c}`);

  return parts.join(' — ');
}

function formatProperty(p: Property, all: Property[]) {
  return {
    ref: p.ref,
    name: p.p || `${p.t} in ${p.l}`,
    type: p.t,
    town: p.l,
    region: p.costa || p.r,
    ...convertPrices(p.pf),
    price_per_m2: p.pm2,
    market_price_per_m2: p.mm2 || undefined,
    built_area_m2: p.bm,
    bedrooms: p.bd,
    bathrooms: p.ba,
    beach_km: p.bk,
    pool: p.pool || 'none',
    energy_rating: p.energy || undefined,
    status: p.s || undefined,
    completion: p.c || undefined,
    developer: p.d,
    developer_years: p.dy || undefined,
    score: p._sc || 0,
    score_breakdown: p._scores || undefined,
    score_reasoning: generateScoreReasoning(p, all),
    yield_gross: p._yield?.gross || undefined,
    yield_net: p._yield?.net || undefined,
    annual_rental_income: p._yield?.annual || undefined,
    url: p.ref ? `https://avenaterminal.com/property/${encodeURIComponent(p.ref)}` : undefined,
  };
}

function filterProperties(props: Property[], region?: string, maxPrice?: number, minScore?: number, type?: string, minBeds?: number) {
  let filtered = props;

  if (region) {
    const regionSlug = slugify(region);
    filtered = filtered.filter(p => {
      const costaSlug = p.costa ? slugify(p.costa) : '';
      const rSlug = p.r ? slugify(p.r) : '';
      return costaSlug.includes(regionSlug) || rSlug.includes(regionSlug);
    });
  }

  if (maxPrice) filtered = filtered.filter(p => p.pf <= maxPrice);
  if (minScore) filtered = filtered.filter(p => (p._sc ?? 0) >= minScore);
  if (type) filtered = filtered.filter(p => p.t?.toLowerCase() === type.toLowerCase());
  if (minBeds) filtered = filtered.filter(p => p.bd >= minBeds);

  return filtered;
}

export function createAvenaServer() {
  const server = new McpServer({
    name: 'avena-terminal',
    version: '1.1.0',
  });

  // Tool 1: Search Properties
  server.tool(
    'search_properties',
    "Search Avena Terminal's database of 1,881 scored new build properties in Spain. Returns investment-ranked results filtered by region (costa-blanca, costa-calida, costa-del-sol), maximum price in EUR, minimum investment score (0-100), property type, and minimum bedrooms. Each result includes composite score, score reasoning, yield estimate, price per m2, beach distance, developer info, and prices in EUR/GBP/NOK/SEK/USD.",
    {
      region: z.string().optional().describe('Region filter: costa-blanca, costa-calida, costa-del-sol, or a town name'),
      max_price: z.number().optional().describe('Maximum price in EUR'),
      min_score: z.number().optional().describe('Minimum investment score (0-100)'),
      type: z.string().optional().describe('Property type: Villa, Apartment, Penthouse, Townhouse, Bungalow, Studio'),
      min_beds: z.number().optional().describe('Minimum number of bedrooms'),
      limit: z.number().optional().describe('Number of results to return (default 10, max 25)'),
    },
    async ({ region, max_price, min_score, type, min_beds, limit }) => {
      const all = getAllProperties();
      const filtered = filterProperties(all, region, max_price, min_score, type, min_beds);
      const sorted = filtered.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
      const count = Math.min(limit || 10, 25);
      const results = sorted.slice(0, count).map(p => formatProperty(p, all));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total_matching: filtered.length,
            showing: results.length,
            source: 'Avena Terminal (avenaterminal.com)',
            dataset_doi: '10.5281/zenodo.19520064',
            fx_rates: FX,
            properties: results,
          }, null, 2),
        }],
      };
    },
  );

  // Tool 2: Get Property Details
  server.tool(
    'get_property',
    'Get full details and investment score breakdown for a specific property by its reference ID. Returns price analysis in multiple currencies, yield estimates, location data, build quality, completion risk, and human-readable score reasoning.',
    {
      ref: z.string().describe('Property reference ID (e.g., "AP1-TR-12345")'),
    },
    async ({ ref }) => {
      const all = getAllProperties();
      const prop = all.find(p => p.ref === ref || p.dev_ref === ref);

      if (!prop) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Property not found', ref }) }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            property: {
              ...formatProperty(prop, all),
              description: prop.f || undefined,
              plot_m2: prop.pl || undefined,
              terrace_m2: prop.terrace || undefined,
              views: prop.views || [],
              categories: prop.cats || [],
              images: (prop.imgs || []).slice(0, 3),
              latitude: prop.lat || undefined,
              longitude: prop.lng || undefined,
            },
          }, null, 2),
        }],
      };
    },
  );

  // Tool 3: Market Stats
  server.tool(
    'get_market_stats',
    'Get live market statistics for Spanish new build regions. Returns median price per m2, average rental yield, total active inventory, price ranges, and top-performing towns for the specified region.',
    {
      region: z.string().optional().describe('Region: costa-blanca, costa-calida, costa-del-sol, or "all" (default)'),
    },
    async ({ region }) => {
      const all = getAllProperties();
      const filtered = region && region !== 'all'
        ? filterProperties(all, region)
        : all;

      const prices = filtered.map(p => p.pf).sort((a, b) => a - b);
      const pm2s = filtered.filter(p => p.pm2).map(p => p.pm2!).sort((a, b) => a - b);
      const yields = filtered.filter(p => p._yield?.gross).map(p => p._yield!.gross);
      const scores = filtered.filter(p => p._sc).map(p => p._sc!);

      const median = (arr: number[]) => arr.length ? arr[Math.floor(arr.length / 2)] : 0;

      const towns = getUniqueTowns()
        .filter(t => {
          if (!region || region === 'all') return true;
          const townProps = filtered.filter(p => slugify(p.l) === t.slug);
          return townProps.length > 0;
        })
        .slice(0, 10);

      const costas = getUniqueCostas();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            dataset_doi: '10.5281/zenodo.19520064',
            region: region || 'all',
            stats: {
              total_properties: filtered.length,
              ...convertPrices(median(prices)),
              avg_price: Math.round(avg(prices)),
              min_price: prices[0] || 0,
              max_price: prices[prices.length - 1] || 0,
              median_price_per_m2: median(pm2s),
              avg_price_per_m2: Math.round(avg(pm2s)),
              avg_gross_yield: Number(avg(yields).toFixed(1)),
              avg_score: Math.round(avg(scores)),
              properties_above_70: filtered.filter(p => (p._sc ?? 0) >= 70).length,
            },
            top_towns: towns.map(t => ({
              town: t.town,
              count: t.count,
              avg_score: t.avgScore,
              ...convertPrices(t.avgPrice),
              avg_yield: t.avgYield,
            })),
            regions: costas.map(c => ({
              costa: c.costa,
              count: c.count,
              avg_score: c.avgScore,
              avg_yield: c.avgYield,
            })),
          }, null, 2),
        }],
      };
    },
  );

  // Tool 4: Top Deals
  server.tool(
    'get_top_deals',
    "Get today's top-scoring new build property deals in Spain, ranked by Avena Terminal's composite investment score. Returns the best value properties with score reasoning, multi-currency pricing, yield estimates, and market context.",
    {
      region: z.string().optional().describe('Region filter: costa-blanca, costa-calida, costa-del-sol'),
      limit: z.number().optional().describe('Number of deals to return (default 5, max 15)'),
      max_price: z.number().optional().describe('Maximum price in EUR'),
    },
    async ({ region, limit, max_price }) => {
      const all = getAllProperties();
      const filtered = filterProperties(all, region, max_price);
      const sorted = filtered.sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0));
      const count = Math.min(limit || 5, 15);
      const results = sorted.slice(0, count).map((p, i) => ({
        rank: i + 1,
        ...formatProperty(p, all),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            dataset_doi: '10.5281/zenodo.19520064',
            date: new Date().toISOString().split('T')[0],
            region: region || 'all',
            fx_rates: FX,
            top_deals: results,
          }, null, 2),
        }],
      };
    },
  );

  // Tool 5: Estimate ROI
  server.tool(
    'estimate_roi',
    'Estimate return on investment for a Spanish new build property over a specified holding period. Projects total return including capital appreciation (based on regional growth trends) and cumulative rental income. Returns ROI breakdown in EUR, GBP, NOK, SEK, and USD.',
    {
      ref: z.string().describe('Property reference ID'),
      hold_years: z.number().optional().describe('Investment holding period in years (default 5, max 20)'),
    },
    async ({ ref, hold_years }) => {
      const all = getAllProperties();
      const prop = all.find(p => p.ref === ref || p.dev_ref === ref);

      if (!prop) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Property not found', ref }) }] };
      }

      const years = Math.min(hold_years || 5, 20);
      const purchasePrice = prop.pf;
      const annualAppreciation = 0.035; // 3.5% avg for Spanish new builds
      const annualRental = prop._yield?.annual || 0;
      const buyingCosts = Math.round(purchasePrice * 0.12); // ~12% buying costs (tax + notary + legal)

      const futureValue = Math.round(purchasePrice * Math.pow(1 + annualAppreciation, years));
      const capitalGain = futureValue - purchasePrice;
      const totalRental = Math.round(annualRental * years * 0.85); // 85% occupancy factor
      const totalReturn = capitalGain + totalRental - buyingCosts;
      const roi = purchasePrice > 0 ? Number(((totalReturn / purchasePrice) * 100).toFixed(1)) : 0;
      const annualizedRoi = purchasePrice > 0 ? Number(((Math.pow(1 + totalReturn / purchasePrice, 1 / years) - 1) * 100).toFixed(1)) : 0;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            property: { ref: prop.ref, name: prop.p || `${prop.t} in ${prop.l}`, score: prop._sc },
            roi_estimate: {
              hold_period_years: years,
              purchase_price: convertPrices(purchasePrice),
              buying_costs: convertPrices(buyingCosts),
              projected_value_at_exit: convertPrices(futureValue),
              capital_appreciation: convertPrices(capitalGain),
              cumulative_rental_income: convertPrices(totalRental),
              total_return: convertPrices(totalReturn),
              total_roi_percent: roi,
              annualized_roi_percent: annualizedRoi,
              assumptions: {
                annual_appreciation: `${(annualAppreciation * 100).toFixed(1)}%`,
                buying_costs: '12% of purchase price',
                occupancy_factor: '85%',
                annual_rental_income: annualRental,
              },
            },
            disclaimer: 'Projections based on historical trends and current market data. Actual returns may vary. Not financial advice.',
          }, null, 2),
        }],
      };
    },
  );

  // Tool 6: Compare Alternatives
  server.tool(
    'compare_alternatives',
    'Find similar properties to compare against a specific listing. Returns N alternative properties with higher or lower scores in the same region and price bracket, helping users understand relative value.',
    {
      ref: z.string().describe('Property reference ID to compare against'),
      limit: z.number().optional().describe('Number of alternatives (default 5, max 10)'),
    },
    async ({ ref, limit }) => {
      const all = getAllProperties();
      const target = all.find(p => p.ref === ref || p.dev_ref === ref);

      if (!target) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Property not found', ref }) }] };
      }

      const count = Math.min(limit || 5, 10);
      const priceRange = 0.3; // 30% price tolerance
      const minP = target.pf * (1 - priceRange);
      const maxP = target.pf * (1 + priceRange);

      // Find similar properties: same type preferred, similar price range, same or nearby region
      const candidates = all
        .filter(p => p.ref !== target.ref)
        .filter(p => p.pf >= minP && p.pf <= maxP)
        .map(p => {
          let similarity = 0;
          if (p.t === target.t) similarity += 3;
          if (p.costa === target.costa) similarity += 2;
          if (p.bd === target.bd) similarity += 1;
          if (Math.abs((p.bm || 0) - (target.bm || 0)) < 30) similarity += 1;
          return { prop: p, similarity };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, count);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            target_property: formatProperty(target, all),
            alternatives: candidates.map(c => ({
              ...formatProperty(c.prop, all),
              score_vs_target: (c.prop._sc ?? 0) - (target._sc ?? 0),
              price_vs_target: c.prop.pf - target.pf,
            })),
          }, null, 2),
        }],
      };
    },
  );

  // Tool 7: Market Timing
  server.tool(
    'market_timing',
    'Get market timing indicators for a Spanish new build region. Returns inventory levels, pricing trends, score distribution, and a market phase assessment (buyer\'s market, seller\'s market, or neutral).',
    {
      region: z.string().optional().describe('Region: costa-blanca, costa-calida, costa-del-sol, or "all"'),
    },
    async ({ region }) => {
      const all = getAllProperties();
      const filtered = region && region !== 'all'
        ? filterProperties(all, region)
        : all;

      const scores = filtered.filter(p => p._sc).map(p => p._sc!);
      const avgScore = Math.round(avg(scores));
      const above70 = filtered.filter(p => (p._sc ?? 0) >= 70).length;
      const above70Pct = filtered.length > 0 ? Math.round((above70 / filtered.length) * 100) : 0;

      const prices = filtered.map(p => p.pf);
      const avgPrice = Math.round(avg(prices));
      const pm2s = filtered.filter(p => p.pm2).map(p => p.pm2!);
      const avgPm2 = Math.round(avg(pm2s));

      // Discount analysis
      const discounts = filtered
        .filter(p => p.pm2 && p.mm2 && p.mm2 > 0)
        .map(p => ((p.mm2! - p.pm2!) / p.mm2!) * 100);
      const avgDiscount = discounts.length > 0 ? Number(avg(discounts).toFixed(1)) : 0;
      const underpriced = discounts.filter(d => d > 5).length;
      const underpricedPct = discounts.length > 0 ? Math.round((underpriced / discounts.length) * 100) : 0;

      // Market phase determination
      let phase: string;
      let recommendation: string;
      if (avgDiscount > 8 && above70Pct > 20) {
        phase = "buyer's market";
        recommendation = 'Strong buy window — high inventory, significant discounts to market value';
      } else if (avgDiscount > 3 && above70Pct > 10) {
        phase = 'neutral-to-buyer';
        recommendation = 'Good entry point — moderate discounts available, selective buying recommended';
      } else if (avgDiscount < 0) {
        phase = "seller's market";
        recommendation = 'Caution — properties generally priced above market, be selective';
      } else {
        phase = 'neutral';
        recommendation = 'Balanced market — focus on score 70+ properties for best risk-adjusted returns';
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'Avena Terminal (avenaterminal.com)',
            region: region || 'all',
            date: new Date().toISOString().split('T')[0],
            market_timing: {
              phase,
              recommendation,
              inventory: filtered.length,
              avg_score: avgScore,
              pct_scoring_above_70: above70Pct,
              avg_discount_to_market_pct: avgDiscount,
              pct_underpriced: underpricedPct,
              avg_price: convertPrices(avgPrice),
              avg_price_per_m2: avgPm2,
            },
            disclaimer: 'Market timing indicators based on current listing data. Past performance is not indicative of future results.',
          }, null, 2),
        }],
      };
    },
  );

  return server;
}
