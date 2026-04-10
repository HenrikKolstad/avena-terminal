import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const base = 'https://avenaterminal.com';
  const now = new Date();
  const isoNow = now.toISOString();

  // Get the current week number of 2026
  const startOfYear = new Date(2026, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const currentWeek = Math.ceil(dayOfYear / 7);

  // Build news entries: /live page + recent weekly pages
  const entries: { loc: string; title: string; pubDate: string }[] = [];

  // Live feed is always a news item
  entries.push({
    loc: `${base}/live`,
    title: 'Live Market Feed — Spain New Build Property Data',
    pubDate: isoNow,
  });

  // Include last 4 weekly snapshots (or fewer if early in the year)
  const startWeek = Math.max(1, currentWeek - 3);
  for (let w = startWeek; w <= Math.min(currentWeek, 52); w++) {
    // Approximate publication date: Monday of that ISO week
    const weekStart = new Date(2026, 0, 1 + (w - 1) * 7);
    entries.push({
      loc: `${base}/weekly/2026/${w}`,
      title: `Spain Property Market Week ${w} 2026 — Avena Terminal`,
      pubDate: weekStart.toISOString(),
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Avena Terminal</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${e.pubDate}</news:publication_date>
      <news:title>${escapeXml(e.title)}</news:title>
    </news:news>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
