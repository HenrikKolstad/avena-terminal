/**
 * The Ingestion Swarm — separate from the infrastructure swarm at /swarm.
 *
 * These agents have one mandate: scan European property portals daily,
 * extract new listings, score them, and feed them into the canonical
 * AVN_PROP_ID registry.
 *
 * Status is derived deterministically from the current minute so the page
 * "ticks" without random jitter. Counts roll forward through the day.
 */

export type AgentStatus = 'scanning' | 'scoring' | 'indexed' | 'queued';

export interface IngestionAgent {
  id: string;
  name: string;
  region: string;
  country: string;
  flag: string;
  sources: string[];          // portals scanned
  base_daily: number;         // typical day's intake
  active: boolean;            // is the agent live yet, or roadmap?
  scope_pct: number;          // % of region coverage achieved
  cron_minutes: number[];     // minutes-of-the-hour the agent fires (deterministic status)
}

export const INGESTION_SWARM: IngestionAgent[] = [
  // SPAIN — fully active
  { id: 'iberia',       name: 'Agent Iberia',       region: 'Spain · core',          country: 'Spain',    flag: '🇪🇸', sources: ['idealista', 'kyero'],                base_daily: 220, active: true,  scope_pct: 100, cron_minutes: [3, 18, 33, 48] },
  { id: 'costa-blanca', name: 'Agent Costa Blanca', region: 'Costa Blanca',          country: 'Spain',    flag: '🇪🇸', sources: ['kyero', 'aplaceinthesun'],          base_daily: 145, active: true,  scope_pct: 100, cron_minutes: [7, 22, 37, 52] },
  { id: 'costa-del-sol',name: 'Agent Costa del Sol',region: 'Costa del Sol',         country: 'Spain',    flag: '🇪🇸', sources: ['fotocasa', 'aplaceinthesun'],       base_daily: 128, active: true,  scope_pct: 100, cron_minutes: [11, 26, 41, 56] },
  { id: 'costa-calida', name: 'Agent Costa Cálida', region: 'Costa Cálida',          country: 'Spain',    flag: '🇪🇸', sources: ['idealista', 'spainhouses'],         base_daily: 62,  active: true,  scope_pct: 100, cron_minutes: [4, 19, 34, 49] },
  { id: 'balearics',    name: 'Agent Balearics',    region: 'Mallorca · Ibiza',      country: 'Spain',    flag: '🇪🇸', sources: ['idealista', 'engelvoelkers'],       base_daily: 41,  active: true,  scope_pct: 78,  cron_minutes: [9, 24, 39, 54] },

  // PORTUGAL — onboarding
  { id: 'algarve',      name: 'Agent Algarve',      region: 'Algarve',               country: 'Portugal', flag: '🇵🇹', sources: ['idealista.pt', 'imovirtual'],       base_daily: 88,  active: true,  scope_pct: 64,  cron_minutes: [13, 28, 43, 58] },
  { id: 'lisboa',       name: 'Agent Lisboa',       region: 'Lisbon · Cascais',      country: 'Portugal', flag: '🇵🇹', sources: ['imovirtual', 'casasapo'],           base_daily: 72,  active: true,  scope_pct: 51,  cron_minutes: [2, 17, 32, 47] },
  { id: 'porto',        name: 'Agent Porto',        region: 'Porto · Douro',         country: 'Portugal', flag: '🇵🇹', sources: ['casasapo', 'idealista.pt'],         base_daily: 38,  active: true,  scope_pct: 38,  cron_minutes: [6, 21, 36, 51] },

  // FRANCE — scoping
  { id: 'cote-dazur',   name: 'Agent Côte d\'Azur', region: 'Côte d\'Azur',          country: 'France',   flag: '🇫🇷', sources: ['seloger', 'leboncoin'],             base_daily: 18,  active: true,  scope_pct: 22,  cron_minutes: [14, 44] },
  { id: 'paris-metro',  name: 'Agent Paris Metro',  region: 'Paris metro',           country: 'France',   flag: '🇫🇷', sources: ['seloger', 'pap.fr'],                base_daily: 12,  active: true,  scope_pct: 14,  cron_minutes: [29, 59] },

  // ITALY — scoping
  { id: 'riviera',      name: 'Agent Riviera',      region: 'Italian Riviera',       country: 'Italy',    flag: '🇮🇹', sources: ['immobiliare.it', 'casa.it'],        base_daily: 14,  active: true,  scope_pct: 9,   cron_minutes: [16, 46] },
  { id: 'milano',       name: 'Agent Milano',       region: 'Milan · Lakes',         country: 'Italy',    flag: '🇮🇹', sources: ['immobiliare.it', 'idealista.it'],   base_daily: 11,  active: true,  scope_pct: 7,   cron_minutes: [31] },

  // GREECE / CYPRUS — onboarding
  { id: 'aegean',       name: 'Agent Aegean',       region: 'Athens · Cyclades',     country: 'Greece',   flag: '🇬🇷', sources: ['spitogatos', 'xe.gr'],              base_daily: 8,   active: true,  scope_pct: 5,   cron_minutes: [38] },

  // NORDICS — roadmap
  { id: 'borealis',     name: 'Agent Borealis',     region: 'Stockholm · Oslo',      country: 'Sweden',   flag: '🇸🇪', sources: ['hemnet', 'finn.no'],                base_daily: 0,   active: false, scope_pct: 0,   cron_minutes: [] },
  { id: 'kobenhavn',    name: 'Agent København',    region: 'Copenhagen · Aarhus',   country: 'Denmark',  flag: '🇩🇰', sources: ['boliga', 'home.dk'],                base_daily: 0,   active: false, scope_pct: 0,   cron_minutes: [] },
];

/**
 * Compute deterministic status for an agent based on current minute-of-hour.
 * Within ±2 min of a cron minute → 'scanning'.
 * Within +3..+8 min → 'scoring'.
 * Within +9..+15 min → 'indexed'.
 * Else → 'queued'.
 */
export function agentStatus(agent: IngestionAgent, now: Date): { status: AgentStatus; nextRunMin: number } {
  if (!agent.active) return { status: 'queued', nextRunMin: 0 };
  const minute = now.getUTCMinutes();
  const next = agent.cron_minutes.find((m) => m >= minute) ?? agent.cron_minutes[0] + 60;
  const ago = minute - (agent.cron_minutes.findLast?.((m) => m <= minute) ?? -100);

  if (ago < 0 || ago > 60) return { status: 'queued', nextRunMin: next - minute };
  if (ago <= 2) return { status: 'scanning', nextRunMin: next - minute };
  if (ago <= 8) return { status: 'scoring', nextRunMin: next - minute };
  if (ago <= 15) return { status: 'indexed', nextRunMin: next - minute };
  return { status: 'queued', nextRunMin: next - minute };
}

/**
 * Deterministic "today's count" — base_daily weighted by hour of day.
 * Morning ramp 06:00–14:00 hits 70%, afternoon 14:00–22:00 fills the rest.
 */
export function todayCount(agent: IngestionAgent, now: Date): number {
  if (!agent.active) return 0;
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dayProgress = Math.min(1, Math.max(0, (hour - 4) / 18)); // 04:00 → 22:00 active
  const variance = ((agent.id.length * 7) % 13) / 100; // deterministic ±5% jitter
  return Math.round(agent.base_daily * dayProgress * (1 + variance));
}

/**
 * Recent activity entries — synthesized from agent + minute math.
 * Returns last 20 deterministic events.
 */
export interface ActivityEvent {
  agent: string;
  flag: string;
  region: string;
  action: 'ingested' | 'scored' | 'indexed' | 'flagged';
  count: number;
  source?: string;
  minutesAgo: number;
}

export function recentActivity(now: Date, limit = 20): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (const agent of INGESTION_SWARM) {
    if (!agent.active) continue;
    for (const cm of agent.cron_minutes) {
      // Each cron tick produces 1-3 events
      const tickMinute = Math.floor(totalMinutes / 60) * 60 + cm;
      if (tickMinute > totalMinutes) continue; // future
      const ago = totalMinutes - tickMinute;
      if (ago > 180) continue; // too old

      const seed = agent.id.length + cm;
      const action: ActivityEvent['action'] =
        ago <= 3 ? 'ingested'
        : ago <= 8 ? 'scored'
        : ago <= 15 ? 'indexed'
        : 'flagged';
      const count = Math.max(1, Math.round(agent.base_daily / 8 + (seed % 7)));
      const source = agent.sources[seed % agent.sources.length];
      events.push({
        agent: agent.name,
        flag: agent.flag,
        region: agent.region,
        action,
        count,
        source,
        minutesAgo: ago,
      });
    }
  }
  return events.sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, limit);
}

export function totalsToday(now: Date): { ingested: number; scored: number; countriesActive: number; agentsLive: number } {
  let ingested = 0;
  let scored = 0;
  const countries = new Set<string>();
  let live = 0;
  for (const a of INGESTION_SWARM) {
    if (a.active) {
      live++;
      countries.add(a.country);
      const c = todayCount(a, now);
      ingested += c;
      scored += Math.round(c * 0.85);
    }
  }
  return { ingested, scored, countriesActive: countries.size, agentsLive: live };
}
