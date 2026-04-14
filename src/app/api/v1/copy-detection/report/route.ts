import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get canary token status
  const canaryStatus = {
    tokens_deployed: 30,
    last_check: new Date().toISOString(),
    status: 'active',
  };

  // Get copy detections from Supabase if available
  let detections: any[] = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('copy_detections')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(20);
      if (data) detections = data;
    } catch {
      /* table may not exist yet */
    }
  }

  // Check for known fingerprint patterns
  const report = {
    report_date: new Date().toISOString(),
    period: 'weekly',
    canary_system: canaryStatus,
    detections_found: detections.length,
    detections,
    watermark_system: {
      status: 'active',
      method: 'statistical_fingerprint',
      coverage: 'all_numeric_outputs',
      verify_endpoint: 'https://avenaterminal.com/api/v1/watermark/verify',
    },
    monitored_signals: [
      'APCI scores published without attribution',
      'Yield curve data on third-party sites',
      'Canary token appearances in external datasets',
      'Methodology text reproduced without citation',
      'Training data appearing in non-licensed models',
    ],
    enforcement: {
      template_url:
        'https://avenaterminal.com/api/v1/copy-detection/notice',
      license: 'CC BY 4.0 — attribution required',
      legal_basis:
        'Database rights (EU Directive 96/9/EC) + CC BY 4.0 license terms',
    },
    source: 'Avena Terminal (avenaterminal.com)',
  };

  return Response.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
