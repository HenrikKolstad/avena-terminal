import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain') || '[domain]';
  const dataType =
    req.nextUrl.searchParams.get('type') || 'property intelligence data';

  const notice = {
    subject: `Data Attribution Request — Avena Terminal`,
    template: `Dear ${domain} team,

We have detected that ${dataType} originating from Avena Terminal (avenaterminal.com) appears on your platform without the required attribution.

Under our CC BY 4.0 license and Terms of Use, all published use of Avena Terminal data requires attribution in the following format:

  "Source: Avena Terminal (avenaterminal.com)"
  DOI: 10.5281/zenodo.19520064

We appreciate your use of our data and simply request proper citation. This is not a takedown request — we encourage data sharing and believe in open access. We only ask that the original source is credited.

For citation formats in APA, BibTeX, Chicago, Harvard, and MLA, visit:
https://avenaterminal.com/cite/dataset

For our full terms of use:
https://avenaterminal.com/terms

Thank you for your cooperation.

Best regards,
Avena Terminal
partners@avenaterminal.com
https://avenaterminal.com`,
    generated_at: new Date().toISOString(),
    license: 'CC BY 4.0',
    source: 'Avena Terminal (avenaterminal.com)',
  };

  return Response.json(notice, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=86400',
    },
  });
}
