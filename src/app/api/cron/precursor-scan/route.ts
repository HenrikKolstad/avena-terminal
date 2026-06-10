/**
 * Precursor Scan cron — daily 05:00 UTC.
 *
 * Each run: Claude scans recent EU public-data themes (regulatory drafts,
 * infrastructure announcements, demographic studies, planning permissions),
 * generates 0-3 new Precursor signals with confidence scoring and historical
 * comparables, persists them to precursor_signals.
 *
 * When ANTHROPIC_API_KEY isn't set, logs a no-op success. Existing seed
 * signals continue to serve the UI.
 */

import { isAuthorizedCron } from '@/lib/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { startCronLog, finishCronLog } from '@/lib/cron-log';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ClaudeSignal {
  signal_id: string;
  signal_type: string;
  title: string;
  description: string;
  source_type?: string;
  affected_markets: string[];
  affected_regions?: string[];
  historical_price_impact_pct?: number;
  historical_time_lag_days?: number;
  historical_sample_size?: number;
  confidence_score: number;
  magnitude_estimate: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  current_apci?: number;
  projected_apci_low?: number;
  projected_apci_high?: number;
  projection_horizon_days?: number;
  claude_analysis: string;
  signal_date?: string;
  track_until?: string;
}

/**
 * Recent themes Claude rotates through. Each cron run picks a different
 * one so signal generation stays varied over weeks.
 */
const THEME_ROTATION = [
  'regulatory: new EU directives, national legislative drafts, or property-related tax changes',
  'infrastructure: airport route announcements, rail expansions, port investments, motorway approvals',
  'demographic: pension reforms, migration patterns, retirement age changes affecting EU mobility',
  'planning: master plan revisions, zoning changes, urban development hub designations',
  'economic_policy: ECB rate signals, mortgage credit directives, LTV cap changes, housing subsidies',
  'transport: new direct flight routes, high-speed rail, ferry services connecting major European cities',
  'zoning: tourist license restrictions, short-term rental regulations, density caps',
];

function pickTheme(): string {
  const day = Math.floor(Date.now() / 86400_000);
  return THEME_ROTATION[day % THEME_ROTATION.length];
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const log = await startCronLog('precursor-scan', '/api/cron/precursor-scan');

  if (!supabase) {
    await finishCronLog(log, 'error', null, new Error('Supabase not configured'));
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await finishCronLog(log, 'success', { signals_generated: 0, note: 'ANTHROPIC_API_KEY not set — skipping' });
    return NextResponse.json({ ok: true, signals_generated: 0, note: 'ANTHROPIC_API_KEY not set' });
  }

  const theme = pickTheme();
  const today = new Date().toISOString().slice(0, 10);
  const trackUntil = new Date(Date.now() + 540 * 86400_000).toISOString().slice(0, 10);

  const prompt = `You are Avena Precursor — a property market signal detection agent. Your job: identify a PLAUSIBLE recent or near-term public signal in EU markets that the market hasn't priced into property yet, and structure it as a Precursor signal.

Today's theme: ${theme}

Output ONE high-quality signal as pure JSON (no markdown fences). Make it realistic and grounded — reference real EU programs, real authorities (ECB, EBA, AENA, Eurostat, national pension systems, etc.), and real markets where possible. Use this exact schema:

{
  "signal_id": "PRC-${today.slice(0, 7)}-NEW-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}",
  "signal_type": "infrastructure" | "regulatory" | "demographic" | "planning" | "transport" | "economic_policy" | "zoning",
  "title": "concise signal headline (under 100 chars)",
  "description": "2-3 sentence description of the actual signal, naming specific authorities/programs",
  "source_type": "regulatory" | "infrastructure" | "demographic" | "planning",
  "affected_markets": ["Costa Blanca" | "Costa del Sol" | "Costa Cálida" | "Mallorca" | "Madrid" | "Algarve" | "Lisbon" | "Porto" | "French Riviera" | "Paris" | "Italian Riviera" | "Milan" | "Tuscany" | "Puglia" | "Athens" | "Crete" | ...],
  "affected_regions": ["Spain" | "Portugal" | "France" | "Italy" | "Greece" | ...],
  "historical_price_impact_pct": number (typical magnitude from comparables),
  "historical_time_lag_days": integer (how long from signal to price effect),
  "historical_sample_size": integer (how many comparable past events),
  "confidence_score": integer 0-100,
  "magnitude_estimate": "minor <3%" | "moderate 3-7%" | "significant 7-15%" | "major >15%",
  "direction": "bullish" | "bearish" | "neutral",
  "current_apci": number 50-80 (current Avena Property Composite Index for primary affected market),
  "projected_apci_low": number,
  "projected_apci_high": number,
  "projection_horizon_days": integer,
  "claude_analysis": "3-5 sentences explaining the historical comparables and why this signal matters. Reference specific past events. End with a falsifiability check — what would invalidate the signal.",
  "signal_date": "${today}",
  "track_until": "${trackUntil}"
}`;

  let signal: ClaudeSignal | null = null;
  try {
    const client = new Anthropic({ apiKey });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }, { signal: ctrl.signal });
    clearTimeout(timer);

    const block = msg.content[0];
    if (block.type !== 'text') throw new Error('non-text response');
    let raw = block.text.trim();
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    signal = JSON.parse(raw);
  } catch (e) {
    await finishCronLog(log, 'error', null, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  if (!signal || !signal.signal_id || !signal.title) {
    await finishCronLog(log, 'error', null, new Error('Malformed signal'));
    return NextResponse.json({ ok: false, error: 'Malformed signal from Claude' }, { status: 500 });
  }

  // Persist (ignoring duplicates by signal_id)
  try {
    await supabase.from('precursor_signals').upsert({
      signal_id: signal.signal_id,
      signal_type: signal.signal_type,
      title: signal.title,
      description: signal.description,
      source_type: signal.source_type ?? null,
      affected_markets: signal.affected_markets ?? [],
      affected_regions: signal.affected_regions ?? [],
      historical_price_impact_pct: signal.historical_price_impact_pct ?? null,
      historical_time_lag_days: signal.historical_time_lag_days ?? null,
      historical_sample_size: signal.historical_sample_size ?? null,
      confidence_score: signal.confidence_score,
      magnitude_estimate: signal.magnitude_estimate,
      direction: signal.direction,
      current_apci: signal.current_apci ?? null,
      projected_apci_low: signal.projected_apci_low ?? null,
      projected_apci_high: signal.projected_apci_high ?? null,
      projection_horizon_days: signal.projection_horizon_days ?? null,
      claude_analysis: signal.claude_analysis,
      status: 'active',
      signal_date: signal.signal_date ?? today,
      track_until: signal.track_until ?? trackUntil,
    }, { onConflict: 'signal_id', ignoreDuplicates: true });
  } catch (e) {
    await finishCronLog(log, 'error', null, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  await finishCronLog(log, 'success', {
    signals_generated: 1,
    signal_id: signal.signal_id,
    confidence: signal.confidence_score,
    direction: signal.direction,
    theme,
  });

  return NextResponse.json({
    ok: true,
    signals_generated: 1,
    signal,
  });
}
