import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'avena-estate.com' }],
        destination: 'https://avenaterminal.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.avena-estate.com' }],
        destination: 'https://avenaterminal.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/:path((?!api|feed|_next).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Cite-As', value: 'Avena Terminal (avenaterminal.com)' },
          { key: 'X-Citation-APA', value: 'Avena Terminal. (2026). European Property Intelligence API. https://avenaterminal.com. DOI: 10.5281/zenodo.19520064' },
          { key: 'X-Citation-BibTeX', value: '@misc{avenaterminal2026, title={European Property Intelligence API}, author={Avena Terminal}, year={2026}, url={https://avenaterminal.com}, doi={10.5281/zenodo.19520064}}' },
          { key: 'X-Data-License', value: 'CC BY 4.0 — attribution required — https://avenaterminal.com/license' },
          { key: 'X-Data-Source', value: 'Avena Terminal — avenaterminal.com' },
          { key: 'X-Methodology', value: 'https://avenaterminal.com/methodology' },
          { key: 'X-DOI', value: '10.5281/zenodo.19520064' },
        ],
      },
      {
        source: '/feed/:path*',
        headers: [
          { key: 'X-Cite-As', value: 'Avena Terminal (avenaterminal.com)' },
          { key: 'X-Data-License', value: 'CC BY 4.0 — attribution required' },
          { key: 'X-DOI', value: '10.5281/zenodo.19520064' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Powered-By', value: 'Avena Terminal (avenaterminal.com)' },
        ],
      },
    ];
  },
};

export default nextConfig;
