import { NextResponse } from 'next/server';

export const revalidate = 86400;

/**
 * Regulatory alerts.
 *
 * Until 2026-08-31 this route published five hardcoded "alerts" attributed to
 * the Boletín Oficial del Estado, the Agencia Tributaria and the EU Journal,
 * each with an invented reference (REG-2026-001…005), an invented publication
 * date and an `ai_interpretation` carrying invented figures ("10-15% price
 * premium", "EUR 5,000-15,000"). Avena ingests no Spanish legal gazette and
 * had made none of those observations.
 *
 * One of the five ("Spain Golden Visa Phase-Out Announcement", dated
 * 2026-02-28, described as pending with applications still being honoured) was
 * also factually wrong: the real estate route was abolished on 2025-04-03 by
 * Organic Law 1/2025.
 *
 * Per the be4a736 precedent the fabricated data is removed rather than
 * corrected — editing one sentence inside an invented dataset makes the
 * fabrication more plausible, not less.
 *
 * Avena's real regulatory ingest (ECB, EBA, ESMA, Banco de España,
 * Bundesbank RSS → `regulatory_signals`) is published at /regulatory-radar.
 */

const NOT_PUBLISHED = {
  alerts:
    'Removed 2026-08-31. Were five hardcoded alerts attributed to the BOE, ' +
    'the Agencia Tributaria and the EU Journal, with invented reference ' +
    'numbers and dates. Avena ingests no Spanish legal gazette. See ' +
    '/regulatory-radar for the regulatory signals Avena does observe.',
  ai_interpretation:
    'Removed 2026-08-31. Was invented commentary carrying invented figures ' +
    '("10-15% price premium", "EUR 5,000-15,000 for insulation"). Avena has ' +
    'measured no such effect.',
  affected_property_count:
    'Removed 2026-08-31. Was a real count of book properties matched against ' +
    'the invented alerts above — a true number attached to a false premise.',
  last_updated:
    'Removed 2026-08-31. Was the hardcoded literal "2026-03-15T12:00:00Z", ' +
    'which did not move and did not describe any ingest.',
} as const;

export async function GET() {
  return NextResponse.json({
    alerts: [],
    total_active: 0,
    high_severity_count: 0,
    coverage:
      'Avena does not ingest Spanish legal gazettes and publishes no ' +
      'regulatory alerts on this route.',
    see_instead: {
      regulatory_signals: 'https://avenaterminal.com/regulatory-radar',
      description:
        'Signals ingested from ECB, EBA, ESMA, Banco de España and ' +
        'Bundesbank RSS feeds, each carrying its own source document URL.',
    },
    not_published: NOT_PUBLISHED,
    disclaimer:
      'Nothing on this route constitutes legal advice. Always consult a ' +
      'qualified Spanish property lawyer for compliance decisions.',
  });
}
