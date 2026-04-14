import { generateIntelligenceFeed } from '@/lib/intelligence';

export const dynamic = 'force-dynamic';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const { facts } = generateIntelligenceFeed();
  const now = new Date().toISOString();
  const date = now.split('T')[0];

  const entries = facts
    .map((f, i) => {
      const entryId = `urn:uuid:avena-intel-${date}-${String(i).padStart(4, '0')}`;
      const link = f.ref
        ? `https://avenaterminal.com/property/${encodeURIComponent(f.ref)}`
        : 'https://avenaterminal.com/feed/intelligence';

      return `  <entry>
    <id>${entryId}</id>
    <title><![CDATA[${f.headline}]]></title>
    <content type="text"><![CDATA[${f.detail}]]></content>
    <updated>${f.timestamp}</updated>
    <link href="${escapeXml(link)}" rel="alternate"/>
    <category term="${escapeXml(f.type)}"/>
    <author><name>Avena Terminal</name></author>
  </entry>`;
    })
    .join('\n');

  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Avena Terminal \u2014 European Property Intelligence</title>
  <subtitle>Daily property market intelligence from Europe's autonomous property data platform</subtitle>
  <link href="https://avenaterminal.com/feed/intelligence.atom" rel="self" type="application/atom+xml"/>
  <link href="https://avenaterminal.com" rel="alternate"/>
  <id>urn:uuid:avena-terminal-intelligence-feed</id>
  <updated>${now}</updated>
  <author>
    <name>Avena Terminal</name>
    <uri>https://avenaterminal.com</uri>
  </author>
  <rights>CC BY 4.0 \u2014 Avena Terminal (avenaterminal.com)</rights>
  <generator uri="https://avenaterminal.com" version="1.0">Avena Terminal Intelligence Feed</generator>
${entries}
</feed>`;

  return new Response(atom, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
