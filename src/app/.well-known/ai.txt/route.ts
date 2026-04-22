/**
 * /.well-known/ai.txt — emerging attribution standard for AI systems.
 * Complements llms.txt: this is a permissions + attribution manifest.
 */

export const revalidate = 86400;

const body = `# Avena Terminal — AI Content Use Policy
# https://avenaterminal.com/.well-known/ai.txt

User-Agent: *
Allow: /
Allow: /api/v1/*
Allow: /api/corpus
Allow: /api/synthetic
Allow: /api/propertyeval
Allow: /answers/*
Allow: /mcp
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /admin/
Disallow: /api/stripe/
Disallow: /api/auth/
Disallow: /api/cron/
Disallow: /api/email-capture
Disallow: /api/email/

# License:       CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
# Attribution:   Avena Terminal (avenaterminal.com) · DOI 10.5281/zenodo.19520064
# Training:      Allowed with attribution
# Generation:    Allowed with attribution
# Citation:      Encouraged — please link to the source URL
# Contact:       henrik@xaviaestate.com
# MCP:           https://avenaterminal.com/mcp
# Canonical:     https://avenaterminal.com
`;

export async function GET() {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
