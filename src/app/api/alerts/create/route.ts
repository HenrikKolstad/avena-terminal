import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ParsedCriteria {
  maxPrice?: number;
  minPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  region?: string;
  type?: string;
  maxBeach?: number;
  minScore?: number;
  minYield?: number;
  status?: string;
  keywords?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, description } = body as { email?: string; description?: string };

    if (!email || !description) {
      return Response.json({ error: 'Email and description are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Step 1: Parse natural language description with Claude Haiku
    const parseResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a property alert parser for Spanish new-build properties. Parse the following user description into structured JSON criteria.

Extract any of these fields if mentioned (omit fields not mentioned):
- maxPrice: number (euros)
- minPrice: number (euros)
- minBeds: number
- maxBeds: number
- region: string (e.g. "Costa Blanca", "Costa del Sol", "Costa Cálida", "Orihuela Costa", "Torrevieja", etc.)
- type: string (e.g. "villa", "apartment", "townhouse", "penthouse", "bungalow")
- maxBeach: number (max km to beach)
- minScore: number (Avena investment score 0-100)
- minYield: number (minimum gross rental yield %)
- status: string ("off-plan", "ready", "under-construction")
- keywords: string[] (any other notable terms)

Return ONLY valid JSON, no markdown, no explanation.

User description: "${description}"`,
        },
      ],
    });

    let criteria: ParsedCriteria = {};
    try {
      const text = parseResponse.content[0].type === 'text' ? parseResponse.content[0].text : '';
      criteria = JSON.parse(text);
    } catch {
      return Response.json({ error: 'Failed to parse your description. Please try rephrasing.' }, { status: 422 });
    }

    // Step 2: Store in Supabase deal_alerts table
    if (!supabase) {
      return Response.json({ error: 'Database connection unavailable.' }, { status: 500 });
    }

    const { error: dbError } = await supabase.from('deal_alerts').insert({
      email,
      region: criteria.region || 'all',
      property_type: criteria.type || 'all',
      max_price: criteria.maxPrice || null,
      min_score: criteria.minScore || 60,
      active: true,
    });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return Response.json({ error: 'Failed to save alert. Please try again.' }, { status: 500 });
    }

    // Step 3: Return success with parsed criteria
    return Response.json({
      success: true,
      criteria_parsed: criteria,
      message: 'Alert active. You will be emailed when a matching property appears.',
    });
  } catch (err) {
    console.error('Alert creation error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
