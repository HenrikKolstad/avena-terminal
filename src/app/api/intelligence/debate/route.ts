/**
 * POST /api/intelligence/debate
 *
 * Adversarial Bull vs Bear vs Socrates debate on a market or property.
 * Body: { market?: string, property_ref?: string, context?: string }
 *
 * If context is omitted for market debates, we build it from live causal
 * indicators. For property debates, pass the serialized property JSON.
 */

import { NextRequest } from 'next/server';
import {
  runDebate,
  persistDebate,
  loadIndicators,
  causalContextForMarket,
  latestMarketDebate,
} from '@/lib/causal-engine';

export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get('market');
  if (!market) {
    return Response.json({ error: 'market query param required for GET' }, { status: 400 });
  }
  const debate = await latestMarketDebate(market);
  return Response.json({ debate }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const market: string | null = body.market || null;
    const propertyRef: string | null = body.property_ref || null;
    let context: string = String(body.context || '').trim();

    if (!market && !propertyRef) {
      return Response.json({ error: 'market or property_ref required' }, { status: 400 });
    }

    if (!context && market) {
      const indicators = await loadIndicators(market);
      context = causalContextForMarket(market, indicators);
    }

    if (!context) {
      return Response.json({ error: 'context required for property debates' }, { status: 400 });
    }

    const result = await runDebate({ market, property_ref: propertyRef, context });
    if (!result) {
      return Response.json(
        { error: 'debate failed — check ANTHROPIC_API_KEY or upstream response' },
        { status: 500 }
      );
    }

    const id = await persistDebate(market, propertyRef, result);

    return Response.json(
      { ok: true, id, ...result },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
