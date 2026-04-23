import { NextResponse } from 'next/server';
import { getAllProperties } from '@/lib/properties';

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const all = getAllProperties()
    .filter((p) => p.ref && p._sc != null)
    .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
    .slice(0, 50);

  const now = new Date().toUTCString();

  const items = all.map((p) => {
    const pm2 = p.bm > 0 ? Math.round(p.pf / p.bm) : null;
    const mm2 = p.mm2 ? Math.round(p.mm2) : null;
    const disc = mm2 && pm2 && mm2 > pm2 ? Math.round((1 - pm2 / mm2) * 100) : 0;
    const score = Math.round(p._sc ?? 0);
    const title = `${p.p || `${p.t} in ${p.l}`} · Score ${score}/100 · €${p.pf.toLocaleString()}`;
    const link = `https://avenaterminal.com/property/${encodeURIComponent(p.ref ?? '')}`;
    const desc = [
      `${p.l}${p.costa ? ` · ${p.costa}` : ''} · ${p.t} · ${p.bd}bed / ${p.ba}bath · ${p.bm}m²`,
      pm2 ? `Price €${p.pf.toLocaleString()} (€${pm2.toLocaleString()}/m²)` : `Price €${p.pf.toLocaleString()}`,
      mm2 && disc > 0 ? `Town median €${mm2.toLocaleString()}/m² — ${Math.min(disc, 35)}% below market` : '',
      p._yield?.gross ? `Gross yield ~${p._yield.gross.toFixed(1)}%` : '',
      `Avena Score: ${score}/100`,
    ].filter(Boolean).join(' · ');

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
    <title>Avena Terminal — Top Deals</title>
    <link>https://avenaterminal.com/#deals</link>
    <description>Top 50 new-build property deals in Europe ranked by the Avena Score. Updated hourly. CC BY 4.0.</description>
    <language>en</language>
    <copyright>CC BY 4.0 — Avena Terminal</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://avenaterminal.com/feed/deals.rss" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
