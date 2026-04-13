import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ACADEMIC_DOMAINS = [
  '.edu',
  '.ac.uk',
  '.ac.jp',
  '.ac.kr',
  '.ac.za',
  '.ac.nz',
  '.ac.in',
  '.uni-',
  '.university',
  '.edu.au',
  '.edu.sg',
  '.edu.cn',
  '.edu.br',
  '.edu.mx',
  '.edu.co',
  '.edu.ar',
  '.edu.pe',
  '.ac.be',
  '.ac.at',
  '.uu.se',
  '.lu.se',
  '.ku.dk',
  '.uva.nl',
  '.ethz.ch',
  '.epfl.ch',
  '.tu-',
  '.rwth-',
  '.fu-berlin.de',
  '.hu-berlin.de',
  '.lmu.de',
  '.ox.ac.uk',
  '.cam.ac.uk',
  '.ucl.ac.uk',
  '.imperial.ac.uk',
  '.kcl.ac.uk',
  '.mit.edu',
  '.stanford.edu',
  '.harvard.edu',
  '.berkeley.edu',
  '.princeton.edu',
  '.yale.edu',
  '.columbia.edu',
  '.uchicago.edu',
  '.upenn.edu',
  '.cornell.edu',
  '.insead.edu',
  '.iese.edu',
  '.ie.edu',
  '.esade.edu',
  '.sorbonne-universite.fr',
  '.sciences-po.fr',
  '.ens.fr',
  '.polytechnique.fr',
  '.unibo.it',
  '.unimi.it',
  '.polimi.it',
];

function isAcademicEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ACADEMIC_DOMAINS.some((d) => lower.includes(d));
}

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/properties', description: 'All tracked properties with AI scores' },
  { method: 'GET', path: '/api/v1/market', description: 'Market statistics and indices' },
  { method: 'GET', path: '/api/v1/heatmap', description: 'Geographic heatmap data' },
  { method: 'GET', path: '/api/v1/yield-curve', description: 'Rental yield term structure' },
  { method: 'GET', path: '/api/v1/signals', description: 'Market signals and anomalies' },
  { method: 'GET', path: '/api/v1/contagion', description: 'SIR contagion model outputs' },
  { method: 'GET', path: '/api/v1/genome', description: 'Property genome fingerprints' },
  { method: 'GET', path: '/api/v1/options-pricing', description: 'Black-Scholes adapted valuations' },
  { method: 'GET', path: '/api/v1/datasets', description: 'Downloadable datasets (CSV, JSON, Parquet)' },
  { method: 'GET', path: '/api/v1/sovereign-export', description: 'ECB/Eurostat/IMF formatted data' },
  { method: 'GET', path: '/api/v1/prediction-oracle', description: 'Prediction market probabilities' },
  { method: 'GET', path: '/api/v1/cross-asset', description: 'Cross-asset correlation matrices' },
  { method: 'GET', path: '/api/v1/europe/stats', description: 'Pan-European property statistics' },
  { method: 'POST', path: '/api/v1/valuations/assess', description: 'AI property valuation' },
  { method: 'GET', path: '/api/v1/docs', description: 'Full API documentation' },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, institution, email, research_purpose } = body;

    if (!name || !institution || !email || !research_purpose) {
      return NextResponse.json(
        { error: 'All fields required: name, institution, email, research_purpose' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (!isAcademicEmail(email)) {
      return NextResponse.json(
        {
          error: 'Academic email required',
          message:
            'The Academic Access Programme is available to researchers at accredited institutions. Please use your institutional email address (.edu, .ac.uk, .uni-, etc.). If your institution is not recognised, contact research@avenaterminal.com for manual verification.',
          alternative: 'For commercial use, visit https://avenaterminal.com/api-access for API key tiers.',
        },
        { status: 403 }
      );
    }

    const api_key = `avt_academic_${randomUUID().replace(/-/g, '')}`;
    const created_at = new Date().toISOString();

    if (supabase) {
      const { error: academicError } = await supabase.from('academic_users').insert({
        name,
        institution,
        email,
        research_purpose,
        api_key,
        created_at,
      });

      if (academicError) {
        console.error('Academic user insert error:', academicError.message);
      }

      const { error: keyError } = await supabase.from('api_keys').insert({
        key: api_key,
        email,
        tier: 'academic_institutional',
        requests_count: 0,
        created_at,
        active: true,
      });

      if (keyError) {
        console.error('API key insert error:', keyError.message);
      }
    }

    return NextResponse.json({
      api_key,
      tier: 'academic_institutional',
      rate_limit: 'unlimited',
      citation_format:
        'Please acknowledge: Avena Terminal (avenaterminal.com) European Property Intelligence API, 2026. DOI: 10.5281/zenodo.19520064',
      data_dictionary: '/api/v1/docs',
      endpoints: ENDPOINTS,
      welcome:
        'Welcome to the Avena Terminal Academic Access Programme. Your key grants unlimited access to all API endpoints for non-commercial research purposes.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET() {
  let total_academic_users = 0;

  if (supabase) {
    const { count } = await supabase
      .from('academic_users')
      .select('*', { count: 'exact', head: true });
    total_academic_users = count ?? 0;
  }

  return NextResponse.json({
    programme: 'Avena Terminal Academic Access Programme',
    description:
      'Free, unlimited API access for academic researchers studying European property markets, housing economics, urban planning, and related fields. No rate limits, no cost, no restrictions on non-commercial use.',
    eligibility: [
      'Faculty, researchers, and PhD students at accredited universities',
      'Must use institutional email address (.edu, .ac.uk, .uni-, etc.)',
      'Research must be non-commercial',
      'Published work should cite Avena Terminal',
    ],
    how_to_apply: {
      method: 'POST',
      url: '/api/v1/academic-access',
      body: {
        name: 'Dr. Jane Smith',
        institution: 'University of Barcelona',
        email: 'jsmith@ub.edu',
        research_purpose: 'Studying housing affordability in Mediterranean coastal regions',
      },
    },
    citation_format:
      'Avena Terminal (avenaterminal.com) European Property Intelligence API, 2026. DOI: 10.5281/zenodo.19520064',
    available_endpoints: ENDPOINTS.length,
    total_academic_users,
    featured_research_areas: [
      'Housing economics and affordability',
      'Urban planning and development patterns',
      'Real estate investment analysis',
      'Climate impact on property values',
      'Cross-border property market dynamics',
      'Machine learning for property valuation',
    ],
    contact: 'research@avenaterminal.com',
  });
}
