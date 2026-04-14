import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TIERS = {
  startup: { price: '€500/mo', endpoints: 50, support: 'Email', sla: '99.5%', custom_branding: false },
  growth: { price: '€2,000/mo', endpoints: 200, support: 'Priority email + Slack', sla: '99.9%', custom_branding: true },
  enterprise: { price: '€10,000/mo', endpoints: 'Unlimited', support: 'Dedicated account manager', sla: '99.99%', custom_branding: true },
} as const;

type Tier = keyof typeof TIERS;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_name, contact_email, website, tier } = body as {
      company_name?: string;
      contact_email?: string;
      website?: string;
      tier?: string;
    };

    if (!company_name || !contact_email || !tier) {
      return NextResponse.json(
        { error: 'Required: company_name, contact_email, tier (startup | growth | enterprise)' },
        { status: 400 }
      );
    }

    if (!['startup', 'growth', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'tier must be one of: startup, growth, enterprise' },
        { status: 400 }
      );
    }

    const validTier = tier as Tier;
    const api_key = `avt_wl_${randomUUID().replace(/-/g, '')}`;

    if (supabase) {
      const { error } = await supabase
        .from('whitelabel_partners')
        .insert({
          company_name,
          contact_email,
          website: website || null,
          tier: validTier,
          api_key,
          created_at: new Date().toISOString(),
          active: true,
        });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to register partner', detail: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      api_key,
      tier: validTier,
      pricing: {
        startup: '€500/mo',
        growth: '€2,000/mo',
        enterprise: '€10,000/mo',
      },
      endpoints_available: TIERS[validTier].endpoints,
      branding: 'Your brand, Avena intelligence underneath',
      welcome_message: `Welcome ${company_name}! Your white-label PIaaS account is active. ` +
        `You now have access to Avena Terminal's full property intelligence stack ` +
        `under your own brand. Embed valuations, yields, compliance scores, and AI insights ` +
        `directly into your platform. Your clients will never know we exist.`,
      next_steps: [
        'Integrate the API using your whitelabel key',
        'Customise branding via the /api/v1/whitelabel/branding endpoint',
        'Access documentation at avenaterminal.com/docs/whitelabel',
      ],
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET() {
  let partnerCount = 0;

  if (supabase) {
    const { count } = await supabase
      .from('whitelabel_partners')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    partnerCount = count ?? 0;
  }

  return NextResponse.json({
    programme: 'Avena Terminal — White-label PIaaS (Property Intelligence as a Service)',
    description:
      'Embed Avena Terminal intelligence into your own platform. ' +
      'Valuations, yield analysis, compliance scores, AI oracle — all under your brand.',
    tiers: {
      startup: {
        price: '€500/mo',
        endpoints: 50,
        support: 'Email',
        sla: '99.5%',
        custom_branding: false,
        features: [
          'Property search API',
          'AVM valuations',
          'Yield calculations',
          'Basic analytics',
        ],
      },
      growth: {
        price: '€2,000/mo',
        endpoints: 200,
        support: 'Priority email + Slack',
        sla: '99.9%',
        custom_branding: true,
        features: [
          'Everything in Startup',
          'AI Oracle access',
          'Compliance engine',
          'Market predictions',
          'Custom branding',
          'Webhook integrations',
        ],
      },
      enterprise: {
        price: '€10,000/mo',
        endpoints: 'Unlimited',
        support: 'Dedicated account manager',
        sla: '99.99%',
        custom_branding: true,
        features: [
          'Everything in Growth',
          'Dedicated infrastructure',
          'Custom model training',
          'Raw data exports',
          'Multi-region support',
          'On-premise deployment option',
          'SLA guarantee',
        ],
      },
    },
    current_partners: partnerCount,
    apply: 'POST /api/v1/whitelabel with { company_name, contact_email, website, tier }',
    docs: 'https://avenaterminal.com/docs/whitelabel',
  });
}
