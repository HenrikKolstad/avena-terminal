import { NextRequest } from 'next/server';
import { getAllProperties } from '@/lib/properties';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { property_ref, buyer_email, buyer_name, message } = await req.json();

    if (!property_ref || !buyer_email || !buyer_name) {
      return Response.json({ error: 'Required: property_ref, buyer_email, buyer_name' }, { status: 400 });
    }

    if (!supabase) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    const all = getAllProperties();
    const prop = all.find(p => p.ref === property_ref);
    if (!prop) return Response.json({ error: 'Property not found' }, { status: 404 });

    const developerName = prop.d || 'Developer';
    const projectName = prop.p || `${prop.t} in ${prop.l}`;
    const location = prop.l;
    const price = prop.pf;
    const score = prop._sc || 0;

    // Generate professional inquiry email content
    const emailSubject = `Property Inquiry \u2014 ${projectName} via Avena Terminal`;
    const emailBody = `Dear ${developerName},

I am writing on behalf of ${buyer_name}, a registered investor on Avena Terminal (avenaterminal.com).

They have expressed serious interest in ${projectName} in ${location} (listed at \u20AC${price.toLocaleString()}) following our algorithmic deal matching, which identified this property as meeting their specific investment criteria with an Avena Score of ${score}/100.

${buyer_name} would welcome:
- Current pricing and availability
- Payment plan options
- Earliest viewing or call availability

${message ? `Additional notes from the buyer:\n"${message}"\n` : ''}
This inquiry was initiated by Avena Terminal\u2019s Ambassador Agent on behalf of a verified investor. Avena Terminal is Europe\u2019s first AI-native property intelligence platform \u2014 avenaterminal.com

Please reply directly to: ${buyer_email}

Best regards,
Avena Ambassador Agent
Avena Terminal Intelligence
avenaterminal.com`;

    // Store the initiation (don't send email automatically — manual review first)
    await supabase.from('deal_initiations').insert({
      property_ref,
      project_name: projectName,
      buyer_email,
      buyer_name,
      developer_name: developerName,
      location,
      price,
      score,
      email_subject: emailSubject,
      email_body: emailBody,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Deal initiation created. Pending review before sending.',
      property: { ref: property_ref, name: projectName, location, price, score },
      developer: developerName,
      status: 'pending_review',
      note: 'Ambassador Agent initiations are reviewed before sending to maintain quality and professionalism.',
    });
  } catch (err) {
    console.error('Ambassador error:', err);
    return Response.json({ error: 'Initiation failed' }, { status: 500 });
  }
}
