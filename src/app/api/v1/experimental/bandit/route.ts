import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ARMS = [
  'price_drop',
  'yield_anomaly',
  'hidden_gem',
  'developer_stress',
  'regime_change',
  'new_listing',
  'momentum_signal',
  'arbitrage',
] as const;

type ArmName = typeof ARMS[number];

const PERSONAS = [
  'uk_retiree',
  'nl_investor',
  'no_lifestyle',
  'de_longterm',
  'be_value',
] as const;

type Persona = typeof PERSONAS[number];

interface ArmState {
  arm: string;
  alpha: number;
  beta: number;
  expected_value: number;
}

/** Simple Beta distribution sampling via Jinks' method (approximation) */
function sampleBeta(alpha: number, beta: number): number {
  // Use the gamma sampling approach for Beta(a, b)
  const gammaA = sampleGamma(alpha);
  const gammaB = sampleGamma(beta);
  if (gammaA + gammaB === 0) return 0.5;
  return gammaA / (gammaA + gammaB);
}

/** Marsaglia and Tsang's method for Gamma(shape, 1) */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    // Boost for shape < 1
    const u = Math.random();
    return sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Standard normal using Box-Muller */
function randn(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

async function getArmsForPersona(persona: string): Promise<Map<string, { alpha: number; beta: number }>> {
  const map = new Map<string, { alpha: number; beta: number }>();

  // Initialize defaults
  for (const arm of ARMS) {
    map.set(arm, { alpha: 1, beta: 1 });
  }

  if (!supabase) return map;

  const { data } = await supabase
    .from('bandit_arms')
    .select('arm, alpha, beta')
    .eq('persona', persona);

  if (data) {
    for (const row of data) {
      if (ARMS.includes(row.arm as ArmName)) {
        map.set(row.arm, { alpha: row.alpha, beta: row.beta });
      }
    }
  }

  return map;
}

async function upsertArm(persona: string, arm: string, alpha: number, beta: number): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('bandit_arms')
    .upsert(
      { persona, arm, alpha, beta, updated_at: new Date().toISOString() },
      { onConflict: 'persona,arm' }
    );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const persona = searchParams.get('persona') ?? 'uk_retiree';

    if (!PERSONAS.includes(persona as Persona)) {
      return Response.json({
        error: `Invalid persona. Must be one of: ${PERSONAS.join(', ')}`,
      }, { status: 400 });
    }

    const arms = await getArmsForPersona(persona);

    // Thompson sampling: sample from Beta(alpha, beta) for each arm
    let bestArm: ArmName = ARMS[0];
    let bestSample = -1;
    const allArms: ArmState[] = [];

    for (const arm of ARMS) {
      const state = arms.get(arm)!;
      const sample = sampleBeta(state.alpha, state.beta);
      const expectedValue = Number((state.alpha / (state.alpha + state.beta)).toFixed(4));

      allArms.push({
        arm,
        alpha: state.alpha,
        beta: state.beta,
        expected_value: expectedValue,
      });

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    }

    // Sort by expected value descending
    allArms.sort((a, b) => b.expected_value - a.expected_value);

    return Response.json({
      persona,
      recommended_signal: bestArm,
      all_arms: allArms,
      exploration_rate: 0.1,
      methodology: 'thompson_sampling_beta_bernoulli',
      note: supabase
        ? 'Connected to Supabase — arm states persist across requests.'
        : 'No Supabase connection — using uniform priors (alpha=1, beta=1) for all arms.',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { persona?: string; signal_type?: string; reward?: number };

    const { persona, signal_type, reward } = body;

    if (!persona || !signal_type || reward === undefined) {
      return Response.json({
        error: 'Missing required fields: persona, signal_type, reward (0 or 1)',
      }, { status: 400 });
    }

    if (!PERSONAS.includes(persona as Persona)) {
      return Response.json({
        error: `Invalid persona. Must be one of: ${PERSONAS.join(', ')}`,
      }, { status: 400 });
    }

    if (!ARMS.includes(signal_type as ArmName)) {
      return Response.json({
        error: `Invalid signal_type. Must be one of: ${ARMS.join(', ')}`,
      }, { status: 400 });
    }

    if (reward !== 0 && reward !== 1) {
      return Response.json({ error: 'reward must be 0 or 1' }, { status: 400 });
    }

    if (!supabase) {
      return Response.json({
        error: 'No Supabase connection — cannot persist arm updates.',
      }, { status: 503 });
    }

    const arms = await getArmsForPersona(persona);
    const current = arms.get(signal_type)!;

    const newAlpha = current.alpha + (reward === 1 ? 1 : 0);
    const newBeta = current.beta + (reward === 0 ? 1 : 0);

    await upsertArm(persona, signal_type, newAlpha, newBeta);

    return Response.json({
      persona,
      signal_type,
      reward,
      updated_alpha: newAlpha,
      updated_beta: newBeta,
      new_expected_value: Number((newAlpha / (newAlpha + newBeta)).toFixed(4)),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
