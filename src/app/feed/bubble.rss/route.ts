import { NextResponse } from 'next/server';
import { CITIES } from '@/lib/bubble-data';

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const now = new Date().toUTCString();
  const items = [...CITIES]
    .sort((a, b) => b.bubbleScore - a.bubbleScore)
    .slice(0, 30)
    .map((c) => {
      const title = `${c.flag} ${c.name}, ${c.country} — ${c.status.toUpperCase()} (score ${c.bubbleScore}/100)`;
      const link = `https://avenaterminal.com/bubble-scanner/${c.slug}`;
      const desc = `€${c.pricePerM2.toLocaleString()}/m², ${c.yoyChange > 0 ? '+' : ''}${c.yoyChange}% YoY, price-to-income ${c.priceToIncome}x, affordability ${c.affordability}/100.`;
      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(desc)}</description>
      <pubDate>${now}</pubDate>
    </item>`;
    }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Avena Terminal — Bubble Scanner</title>
    <link>https://avenaterminal.com/bubble-scanner</link>
    <description>30 European cities ranked by bubble risk. CC BY 4.0.</description>
    <language>en</language>
    <copyright>CC BY 4.0 — Avena Terminal</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://avenaterminal.com/feed/bubble.rss" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
