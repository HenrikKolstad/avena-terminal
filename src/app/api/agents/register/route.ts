import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_name, developer_name, developer_email, use_case, website } = body;

    if (!agent_name || !developer_name || !developer_email) {
      return NextResponse.json({ error: 'Required: agent_name, developer_name, developer_email' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Generate unique credentials
    const agent_id = `avena-agent-${randomUUID().slice(0, 8)}`;
    const api_key = `avt_${randomUUID().replace(/-/g, '')}`;
    const identity_token = `avt_id_${randomUUID().replace(/-/g, '')}`;

    // Store in registry
    const { error } = await supabase.from('agent_registry').insert({
      agent_id,
      api_key,
      identity_token,
      agent_name,
      developer_name,
      developer_email,
      use_case: use_case || '',
      website: website || '',
      tier: 'free',
      queries_total: 0,
      queries_this_month: 0,
      registered_at: new Date().toISOString(),
      active: true,
    });

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Agent registered with Avena Terminal Agent Registry',
      credentials: {
        agent_id,
        api_key,
        identity_token,
      },
      endpoints: {
        mcp: 'https://avenaterminal.com/mcp',
        intelligence_feed: 'https://avenaterminal.com/feed/intelligence.json',
        alpha_signals: 'https://avenaterminal.com/intelligence/signals',
        rlhf_data: 'https://avenaterminal.com/feed/rlhf.jsonl',
      },
      usage: {
        tier: 'free',
        rate_limit: '100 queries/day',
        note: 'Include x-avena-agent-id header in MCP requests for tracked analytics',
      },
      documentation: 'https://avenaterminal.com/agents/registry',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET returns registry info
export async function GET() {
  return NextResponse.json({
    name: 'Avena Terminal Agent Registry',
    version: '1.0.0',
    description: 'Identity and data layer for AI agents operating in European real estate. Register your agent to get verified access to scored property data, market intelligence, and alpha signals.',
    register: 'POST https://avenaterminal.com/api/agents/register',
    required_fields: ['agent_name', 'developer_name', 'developer_email'],
    optional_fields: ['use_case', 'website'],
    documentation: 'https://avenaterminal.com/agents/registry',
    directory: 'https://avenaterminal.com/agents/directory',
  });
}
