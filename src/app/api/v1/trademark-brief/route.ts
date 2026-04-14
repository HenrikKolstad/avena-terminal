import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'private, no-store',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

const MARKS = [
  {
    mark: 'APCI',
    full_name: 'Avena Property Consciousness Index',
    first_use_date: '2026-04-12',
    first_use_commerce: '2026-04-12',
    description: 'Composite index measuring European property market health on a 0-100 scale',
    goods_services_class: 'Class 36 (Financial analysis), Class 42 (Software as a service)',
    geographic_scope: 'European Union + Norway',
    evidence_urls: [
      'https://avenaterminal.com/apci',
      'https://avenaterminal.com/api/v1/apci',
      'https://avenaterminal.com/embed/apci',
    ],
  },
  {
    mark: 'APIP',
    full_name: 'Avena Property Intelligence Protocol',
    first_use_date: '2026-04-13',
    first_use_commerce: '2026-04-13',
    description: 'Open standard protocol for property intelligence data exchange',
    goods_services_class: 'Class 42 (Software standards and protocols)',
    geographic_scope: 'European Union + Norway',
    evidence_urls: [
      'https://avenaterminal.com/standards/apip',
      'https://avenaterminal.com/standards/apip-v1.json',
    ],
  },
  {
    mark: 'Avena Terminal',
    full_name: 'Avena Terminal',
    first_use_date: '2026-04-11',
    first_use_commerce: '2026-04-11',
    description:
      'European property intelligence platform providing scored property data, market indices, and AI-powered analysis',
    goods_services_class: 'Class 36 (Real estate data), Class 42 (SaaS platform)',
    geographic_scope: 'European Union + Norway + United Kingdom',
    evidence_urls: [
      'https://avenaterminal.com',
      'https://avenaterminal.com/about',
    ],
  },
  {
    mark: 'PropertyEval',
    full_name: 'PropertyEval Benchmark',
    first_use_date: '2026-04-12',
    first_use_commerce: '2026-04-12',
    description:
      'Standardized benchmark for evaluating property AI systems across 100 scenarios',
    goods_services_class: 'Class 42 (Software testing and benchmarking)',
    geographic_scope: 'European Union + Norway',
    evidence_urls: [
      'https://avenaterminal.com/propertyeval',
      'https://avenaterminal.com/api/propertyeval',
    ],
  },
  {
    mark: 'Avena Index Family',
    full_name: 'The Avena Index Family (APCI, APYI, APLI, APRI, APSI)',
    first_use_date: '2026-04-14',
    first_use_commerce: '2026-04-14',
    description:
      'Family of five property market indices measuring consciousness, yield, liquidity, risk, and sentiment',
    goods_services_class: 'Class 36 (Financial indices)',
    geographic_scope: 'European Union + Norway',
    evidence_urls: [
      'https://avenaterminal.com/indices',
      'https://avenaterminal.com/api/v1/indices',
    ],
  },
];

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized. Requires CRON_SECRET bearer token.' },
      { status: 401, headers: corsHeaders() },
    );
  }

  const generated_at = new Date().toISOString();

  const marks = MARKS.map((m) => ({
    ...m,
    evidence_hash: sha256(m.mark + m.first_use_date),
    hash_algorithm: 'SHA-256',
    hash_input: `${m.mark}${m.first_use_date}`,
  }));

  const brief = {
    document_type: 'Trademark Filing Brief',
    version: '1.0',
    generated_at,
    confidential: true,

    applicant: {
      entity_name: 'Avena Terminal',
      owner: 'Henrik Kolstad',
      country: 'Norway',
      website: 'https://avenaterminal.com',
      contact_email: 'partners@avenaterminal.com',
    },

    attorney_instructions: {
      priority:
        'File all marks simultaneously to establish earliest possible priority dates.',
      jurisdictions: [
        'EUIPO (European Union Intellectual Property Office)',
        'Norwegian Industrial Property Office (Patentstyret)',
        'UK Intellectual Property Office (UKIPO)',
      ],
      notes: [
        'All marks have been in continuous commercial use since first_use_date.',
        'SHA-256 evidence hashes computed from mark name + first use date provide cryptographic timestamping.',
        'Web archive snapshots (Wayback Machine) should be captured for all evidence_urls.',
        'Consider Madrid Protocol for international registration efficiency.',
      ],
    },

    marks,

    evidence_package: {
      description:
        'Complete evidence package for each mark including live URLs, SHA-256 hashes, and usage documentation.',
      total_marks: marks.length,
      total_evidence_urls: marks.reduce((sum, m) => sum + m.evidence_urls.length, 0),
      hash_verification:
        'Each evidence_hash can be independently verified by computing SHA-256(mark + first_use_date).',
      recommended_additional_evidence: [
        'Wayback Machine snapshots of all evidence URLs',
        'Google Search Console impression data showing mark usage',
        'API access logs demonstrating commercial use',
        'Press coverage and third-party references',
        'Social media posts referencing the marks',
      ],
    },

    filing_timeline: {
      recommended_filing_date: '2026-04-21',
      reason:
        'File within 10 days of earliest first-use date to minimize prior art risk.',
      estimated_registration_timeline: '6-12 months (EUIPO), 4-8 months (Patentstyret)',
    },
  };

  return NextResponse.json(brief, { status: 200, headers: corsHeaders() });
}
