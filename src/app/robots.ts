import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
    ],
    sitemap: [
      'https://avenaterminal.com/sitemap.xml',
      'https://avenaterminal.com/sitemap-news.xml',
      'https://avenaterminal.com/sitemap-images.xml',
    ],
    host: 'https://avenaterminal.com',
  };
}
