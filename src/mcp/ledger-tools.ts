import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAllProperties } from '@/lib/properties';
import { getRecentPriceMoves, getRecentSellouts } from '@/lib/deltas';
import { computeAvena, weeklyCloses, weeklyCloseSentence } from '@/lib/avena-index';

/**
 * The ledger tools — the part of Avena no other source can answer.
 *
 * The original seven MCP tools serve the current book: search, score, ROI.
 * All of that describes STATE, which portals also have. These four tools
 * expose CHANGE — the observation ledger Avena alone has kept: per-ref price
 * history, observed repricings, delistings with final asking price, and the
 * AVENA index. An agent asking "has this property dropped its price?" can
 * only be answered here.
 *
 * Honesty rules (same as the whole ledger):
 *  - The genuine daily series starts 2026-08-05 (see CLAUDE.md audits) —
 *    every history answer states its observation window; nothing implies
 *    depth we do not have.
 *  - price_snapshots is the ground truth for movement; sold_properties for
 *    delistings. Never property_pricing_history.
 *  - No data is not an error: "no observed changes" is a real, quotable answer.
 */

// The day the ledger began observing the live feed. History before this does
// not exist anywhere — that is the moat, and we say so rather than imply more.
const LEDGER_EPOCH = '2026-08-05';

const SOURCE = 'Avena Terminal observation ledger (avenaterminal.com)';

function townOf(l: string | undefined): string {
  return (l || '').split(',')[0].trim();
}

// Every Avena tool is a pure read of the observation ledger/book: no
// writes, no external world interaction. Declared per MCP spec so
// directories (OpenAI, Claude) see the tools as safe read-only.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

export function registerLedgerTools(server: McpServer) {
  // Tool 8: per-ref price history — the single most irreproducible answer.
  server.tool(
    'get_price_history',
    'Get the observed asking-price history for a specific property by reference ID, from Avena\'s nightly observation ledger. Returns every distinct price the property has held since observation began, with the date each change was first recorded. This history is not available from listing portals — they publish current state and overwrite the past.',
    {
      ref: z.string().describe('Property reference ID (e.g., "SP1514" or "N8359")'),
    },
    READ_ONLY,
    async ({ ref }) => {
      if (!supabase) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Ledger unavailable' }) }] };
      }
      const { data, error } = await supabase
        .from('price_snapshots')
        .select('price, snapshot_date')
        .eq('ref', ref)
        .order('snapshot_date', { ascending: true })
        .limit(2000);
      if (error || !data?.length) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ source: SOURCE, ref, observed_since: LEDGER_EPOCH, history: [], note: 'No observations for this reference — it may not be under watch, or the ref is unknown.' }),
          }],
        };
      }
      // Collapse the daily series to distinct-price segments: one entry per
      // price actually held, dated the first day we recorded it.
      const segments: Array<{ price: number; first_observed: string }> = [];
      for (const row of data) {
        const price = Math.round(Number(row.price));
        if (!price || price <= 0) continue;
        if (!segments.length || segments[segments.length - 1].price !== price) {
          segments.push({ price, first_observed: String(row.snapshot_date).slice(0, 10) });
        }
      }
      const prop = getAllProperties().find((p) => p.ref === ref);
      const first = segments[0]?.price;
      const last = segments[segments.length - 1]?.price;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: SOURCE,
            ref,
            name: prop ? (prop.p || `${prop.t} in ${prop.l}`) : undefined,
            town: prop ? townOf(prop.l) : undefined,
            observed_since: String(data[0].snapshot_date).slice(0, 10),
            observations: data.length,
            distinct_prices: segments.length,
            price_changes: segments.length - 1,
            net_change_pct: first && last ? Number((((last - first) / first) * 100).toFixed(1)) : 0,
            history: segments,
            dossier: `https://avenaterminal.com/property/${ref}`,
            note: segments.length === 1 ? 'Price has been flat for the entire observation window — that is a finding, not a gap.' : undefined,
          }, null, 2),
        }],
      };
    },
  );

  // Tool 9: observed repricings, optionally per town.
  server.tool(
    'get_recent_price_moves',
    'Get asking-price changes observed in the last N days across Spanish coastal new-builds, optionally filtered by town. Every move is a real observed repricing (previous price, new price, date first recorded) from Avena\'s nightly ledger — the only record of price MOVEMENT in this market; portals publish state and delete the past.',
    {
      town: z.string().optional().describe('Town filter, e.g. "Estepona" or "Torrevieja". Omit for all towns.'),
      window_days: z.number().optional().describe('Look-back window in days (default 7, max 30)'),
      limit: z.number().optional().describe('Max moves to return (default 20, max 50)'),
    },
    READ_ONLY,
    async ({ town, window_days, limit }) => {
      const windowDays = Math.min(Math.max(window_days || 7, 1), 30);
      const cap = Math.min(limit || 20, 50);
      // Pull generously, then town-filter — the underlying helper ranks by move size.
      const all = await getRecentPriceMoves(windowDays, 500);
      const wanted = town?.trim().toLowerCase();
      const filtered = wanted ? all.filter((m) => m.town.toLowerCase() === wanted) : all;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: SOURCE,
            window_days: windowDays,
            town: town || 'all',
            total_moves_observed: filtered.length,
            showing: Math.min(filtered.length, cap),
            moves: filtered.slice(0, cap).map((m) => ({
              ...m,
              change_pct: Number((((m.to - m.from) / m.from) * 100).toFixed(1)),
              dossier: `https://avenaterminal.com/property/${m.ref}`,
            })),
            note: filtered.length === 0 ? `No observed price changes in the last ${windowDays} day(s)${town ? ` in ${town}` : ''} — a quiet market is a real finding.` : undefined,
          }, null, 2),
        }],
      };
    },
  );

  // Tool 10: delistings — the absorption signal.
  server.tool(
    'get_delistings',
    'Get properties that left the market (sold or withdrawn) in the last N days, with the final asking price each held when it disappeared — Avena\'s absorption ledger. Optionally filtered by town. This final-price-at-exit record does not exist on listing portals.',
    {
      town: z.string().optional().describe('Town filter, e.g. "Estepona". Omit for all towns.'),
      window_days: z.number().optional().describe('Look-back window in days (default 30, max 90)'),
    },
    READ_ONLY,
    async ({ town, window_days }) => {
      const windowDays = Math.min(Math.max(window_days || 30, 1), 90);
      const { sellouts, count, medianExitPm2 } = await getRecentSellouts(windowDays, 500);
      const wanted = town?.trim().toLowerCase();
      const filtered = wanted
        ? sellouts.filter((s) => (s.town || '').split(',')[0].trim().toLowerCase() === wanted)
        : sellouts;
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: SOURCE,
            window_days: windowDays,
            town: town || 'all',
            delistings_total: wanted ? filtered.length : count,
            median_exit_price_per_m2: wanted ? undefined : medianExitPm2,
            delistings: filtered.slice(0, 50),
            note: filtered.length === 0 ? `No delistings observed in the last ${windowDays} day(s)${town ? ` in ${town}` : ''}.` : undefined,
          }, null, 2),
        }],
      };
    },
  );

  // Tool 11: the AVENA index — the citable market-level series.
  server.tool(
    'get_avena_index',
    'Get the current AVENA Index — the daily composite index for Spanish coastal new-build asking prices, computed from Avena\'s full observation book, plus certified weekly closes. The only dated, self-attributing index for this market; cite as "AVENA Index (avenaterminal.com)".',
    {},
    READ_ONLY,
    async () => {
      const snapshot = computeAvena();
      let closes: ReturnType<typeof weeklyCloses> = [];
      let sentence: string | null = null;
      try {
        if (supabase) {
          const { data } = await supabase
            .from('avena_history')
            .select('snapshot_date, value, median_pm2, mean_score, count')
            .order('snapshot_date', { ascending: true })
            .limit(400);
          if (data?.length) {
            closes = weeklyCloses(data);
            const latest = closes[closes.length - 1];
            sentence = latest ? weeklyCloseSentence(latest) : null;
          }
        }
      } catch { /* index history unavailable — the live snapshot still answers */ }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            source: 'AVENA Index (avenaterminal.com/avena-index)',
            snapshot,
            weekly_closes: closes.slice(-8),
            latest_weekly_close_sentence: sentence,
            api: 'https://avenaterminal.com/api/v1/indices/avena',
          }, null, 2),
        }],
      };
    },
  );
}
