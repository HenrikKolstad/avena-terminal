import { getAllProperties } from '@/lib/properties';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const base = 'https://avenaterminal.com';
  const properties = getAllProperties()
    .filter(p => p.ref && p.imgs && p.imgs.length > 0)
    .slice(0, 1000);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  for (const p of properties) {
    const pageUrl = `${base}/property/${encodeURIComponent(p.ref!)}`;
    const town = p.l?.split(',')[0]?.trim() || 'Spain';
    const type = p.t || 'Property';

    xml += `<url>\n<loc>${esc(pageUrl)}</loc>\n`;

    for (let i = 0; i < Math.min(p.imgs!.length, 3); i++) {
      const img = p.imgs![i];
      const title = i === 0
        ? `${type} in ${town} - ${p.bd} bed new build`
        : `${type} in ${town} - view ${i + 1}`;
      xml += `<image:image>\n<image:loc>${esc(img)}</image:loc>\n<image:title>${esc(title)}</image:title>\n</image:image>\n`;
    }

    xml += `</url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
