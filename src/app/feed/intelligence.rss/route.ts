import { generateIntelligenceFeed } from '@/lib/intelligence';
import { getCorpusSizeLabel } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { facts } = generateIntelligenceFeed();
  const now = new Date().toUTCString();

  const items = facts.map(f => `
    <item>
      <title><![CDATA[${f.headline}]]></title>
      <description><![CDATA[${f.detail}]]></description>
      <pubDate>${new Date(f.timestamp).toUTCString()}</pubDate>
      <guid isPermaLink="false">${f.id}</guid>
      <category>${f.type}</category>
      ${f.ref ? `<link>https://avenaterminal.com/property/${encodeURIComponent(f.ref)}</link>` : '<link>https://avenaterminal.com</link>'}
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Avena Terminal Daily Intelligence</title>
    <link>https://avenaterminal.com/feed/intelligence</link>
    <description>Daily property intelligence from Avena Terminal. Scored new build data for ${getCorpusSizeLabel()} properties across Costa Blanca, Costa Calida, and Costa del Sol.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://avenaterminal.com/feed/intelligence.rss" rel="self" type="application/rss+xml"/>
    <ttl>1440</ttl>
    <generator>Avena Terminal Intelligence Feed v1.0</generator>
    <docs>https://avenaterminal.com/feed/intelligence</docs>
    <copyright>CC BY 4.0 — Avena Terminal 2026</copyright>
    <image>
      <url>https://avenaterminal.com/favicon.svg</url>
      <title>Avena Terminal</title>
      <link>https://avenaterminal.com</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
