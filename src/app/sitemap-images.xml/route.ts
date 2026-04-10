import { getAllProperties } from '@/lib/properties';

export async function GET() {
  const base = 'https://avenaterminal.com';
  const properties = getAllProperties().slice(0, 1000);

  const urls = properties
    .filter(p => p.ref && p.imgs && p.imgs.length > 0)
    .map(p => {
      const pageUrl = `${base}/property/${encodeURIComponent(p.ref!)}`;
      const images = p.imgs!
        .slice(0, 5)
        .map(
          img =>
            `      <image:image>
        <image:loc>${escapeXml(img)}</image:loc>
        <image:title>${escapeXml(p.p ? `${p.p} in ${p.l}` : p.l || 'Property')}</image:title>
      </image:image>`
        )
        .join('\n');
      return `  <url>
    <loc>${escapeXml(pageUrl)}</loc>
${images}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
