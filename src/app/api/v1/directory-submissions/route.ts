import { NextRequest, NextResponse } from 'next/server';

/* ────────────────────────────────────────────────────────── */
/*  Directory list                                           */
/* ────────────────────────────────────────────────────────── */

interface Directory {
  platform: string;
  url: string;
  category: string;
  monthly_visitors: string;
  status?: 'live' | 'submitted' | 'pending';
}

const DIRECTORIES: Directory[] = [
  // AI Tool Directories
  { platform: 'Futurepedia', url: 'https://futurepedia.io', category: 'ai-tool', monthly_visitors: '2M+' },
  { platform: 'There is an AI for that', url: 'https://theresanaiforthat.com', category: 'ai-tool', monthly_visitors: '5M+' },
  { platform: 'TopAI.tools', url: 'https://topai.tools', category: 'ai-tool', monthly_visitors: '500k+' },
  { platform: 'Toolify.ai', url: 'https://toolify.ai', category: 'ai-tool', monthly_visitors: '1M+' },
  { platform: 'FutureTools', url: 'https://futuretools.io', category: 'ai-tool', monthly_visitors: '500k+' },
  { platform: 'AI Tools Directory', url: 'https://aitoolsdirectory.com', category: 'ai-tool', monthly_visitors: '300k+' },
  { platform: 'Insidr.ai', url: 'https://insidr.ai', category: 'ai-tool', monthly_visitors: '200k+' },
  { platform: 'AI Tool Hunt', url: 'https://aitoolhunt.com', category: 'ai-tool', monthly_visitors: '200k+' },
  { platform: 'All Things AI', url: 'https://allthingsai.com', category: 'ai-tool', monthly_visitors: '300k+' },
  { platform: 'Supertools', url: 'https://supertools.therundown.ai', category: 'ai-tool', monthly_visitors: '400k+' },
  // SaaS Directories
  { platform: 'Product Hunt', url: 'https://producthunt.com', category: 'saas', monthly_visitors: '10M+' },
  { platform: 'AlternativeTo', url: 'https://alternativeto.net', category: 'saas', monthly_visitors: '5M+' },
  { platform: 'SaaSHub', url: 'https://saashub.com', category: 'saas', monthly_visitors: '500k+' },
  { platform: 'Capterra', url: 'https://capterra.com', category: 'saas', monthly_visitors: '5M+' },
  { platform: 'G2', url: 'https://g2.com', category: 'saas', monthly_visitors: '8M+' },
  { platform: 'GetApp', url: 'https://getapp.com', category: 'saas', monthly_visitors: '2M+' },
  // Data/Developer
  { platform: 'RapidAPI', url: 'https://rapidapi.com', category: 'api', monthly_visitors: '3M+' },
  { platform: 're3data', url: 'https://re3data.org', category: 'research', monthly_visitors: '100k+' },
  { platform: 'DataHub', url: 'https://datahub.io', category: 'data', monthly_visitors: '200k+' },
  { platform: 'Smithery', url: 'https://smithery.ai', category: 'mcp', monthly_visitors: '100k+', status: 'live' },
  // Startup Directories
  { platform: 'BetaList', url: 'https://betalist.com', category: 'startup', monthly_visitors: '200k+' },
  { platform: 'Launching Next', url: 'https://launchingnext.com', category: 'startup', monthly_visitors: '100k+' },
  { platform: 'StartupBase', url: 'https://startupbase.io', category: 'startup', monthly_visitors: '50k+' },
  { platform: 'Hacker News', url: 'https://news.ycombinator.com', category: 'tech', monthly_visitors: '10M+' },
];

/* ────────────────────────────────────────────────────────── */
/*  Submission template                                      */
/* ────────────────────────────────────────────────────────── */

const SUBMISSION_TEMPLATE = {
  name: 'Avena Terminal',
  tagline: "Europe's first AI-native property intelligence platform",
  description:
    'Avena Terminal scores and ranks 1,881 new build properties across Spain. 5 market indices, MCP server, 19 AI agents, PropertyEval benchmark. Open data, CC BY 4.0.',
  url: 'https://avenaterminal.com',
  categories: ['AI Tool', 'PropTech', 'Real Estate', 'Data Platform', 'API'],
  pricing: 'Free (PRO from \u20AC79/mo)',
  logo_url: 'https://avenaterminal.com/favicon.svg',
};

/* ────────────────────────────────────────────────────────── */
/*  In-memory submission store (resets on deploy)            */
/* ────────────────────────────────────────────────────────── */

const submissions = new Map<string, { status: 'live' | 'submitted'; submitted_at: string }>();

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ────────────────────────────────────────────────────────── */

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
  };
}

/* ────────────────────────────────────────────────────────── */
/*  OPTIONS                                                  */
/* ────────────────────────────────────────────────────────── */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ────────────────────────────────────────────────────────── */
/*  GET                                                      */
/* ────────────────────────────────────────────────────────── */

export async function GET() {
  const directories = DIRECTORIES.map(d => {
    const recorded = submissions.get(d.platform);
    const status: 'live' | 'submitted' | 'pending' =
      d.status === 'live'
        ? 'live'
        : recorded
          ? recorded.status
          : 'pending';
    return { ...d, status };
  });

  const submitted = directories.filter(d => d.status === 'live' || d.status === 'submitted').length;

  return NextResponse.json(
    {
      total_directories: DIRECTORIES.length,
      submitted,
      pending: DIRECTORIES.length - submitted,
      directories,
      submission_template: SUBMISSION_TEMPLATE,
      source: 'Avena Terminal (avenaterminal.com)',
    },
    { headers: corsHeaders() },
  );
}

/* ────────────────────────────────────────────────────────── */
/*  POST — record a submission (requires CRON_SECRET)        */
/* ────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders() },
    );
  }

  try {
    const body = await request.json();
    const { platform, status } = body as { platform?: string; status?: 'live' | 'submitted' };

    if (!platform) {
      return NextResponse.json(
        { error: 'Missing required field: platform' },
        { status: 400, headers: corsHeaders() },
      );
    }

    const found = DIRECTORIES.find(d => d.platform === platform);
    if (!found) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400, headers: corsHeaders() },
      );
    }

    submissions.set(platform, {
      status: status || 'submitted',
      submitted_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        ok: true,
        platform,
        status: status || 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders() },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders() },
    );
  }
}
