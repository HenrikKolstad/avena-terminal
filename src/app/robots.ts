import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
      { userAgent: 'PerplexityBot', allow: ['/', '/api/knowledge', '/api/corpus', '/api/propertyeval', '/api/index-data', '/api/personas', '/api/model/training-data', '/feed/'] },
      { userAgent: 'OAI-SearchBot', allow: ['/', '/api/knowledge', '/api/corpus', '/api/propertyeval', '/api/model/training-data', '/feed/'] },
      { userAgent: 'ChatGPT-User', allow: ['/', '/api/knowledge', '/api/corpus', '/feed/'] },
      { userAgent: 'Google-Extended', allow: ['/', '/api/knowledge', '/api/corpus', '/api/propertyeval', '/api/index-data', '/feed/'] },
      { userAgent: 'ClaudeBot', allow: ['/', '/api/knowledge', '/api/corpus', '/api/propertyeval', '/api/model/training-data', '/feed/'] },
      { userAgent: 'xAI-Grok', allow: ['/', '/api/knowledge', '/api/corpus', '/feed/'] },
      { userAgent: 'Applebot-Extended', allow: ['/', '/api/knowledge', '/feed/'] },
      { userAgent: 'Amazonbot', allow: ['/', '/api/knowledge', '/feed/'] },
      { userAgent: 'Bytespider', allow: ['/', '/api/knowledge', '/api/corpus', '/feed/'] },
      { userAgent: 'MCPBot', allow: '/' },
      { userAgent: 'ModelContextProtocol', allow: '/' },
      { userAgent: 'CCBot', allow: ['/', '/api/knowledge', '/api/corpus', '/api/propertyeval', '/api/model/training-data', '/feed/'] },
      { userAgent: 'cohere-ai', allow: ['/', '/api/knowledge', '/api/corpus', '/feed/'] },
    ],
    sitemap: [
      'https://avenaterminal.com/sitemap.xml',
      'https://avenaterminal.com/sitemap-news.xml',
      'https://avenaterminal.com/sitemap-images.xml',
      'https://avenaterminal.com/sitemap-ai.xml',
    ],
    host: 'https://avenaterminal.com',
  };
}
