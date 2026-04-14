import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    sdks: {
      python: {
        package: 'avena-terminal',
        registry: 'PyPI',
        install: 'pip install avena-terminal',
        status: 'planned',
        usage: [
          "from avena import AvenaClient",
          "client = AvenaClient(api_key='your_key')",
          "properties = client.search(region='costa-blanca', max_price=300000)",
        ].join('\n'),
        docs: 'https://avenaterminal.com/sdk',
      },
      javascript: {
        package: '@avena/terminal',
        registry: 'npm',
        install: 'npm install @avena/terminal',
        status: 'planned',
        usage: [
          "import { AvenaClient } from '@avena/terminal'",
          "const client = new AvenaClient({ apiKey: 'your_key' })",
          "const properties = await client.search({ region: 'costa-blanca' })",
        ].join('\n'),
        docs: 'https://avenaterminal.com/sdk',
      },
    },
    integrations: {
      zapier: { status: 'planned', triggers: 50, actions: 20 },
      make: { status: 'planned' },
      n8n: { status: 'planned', templates: 20 },
    },
    api_base: 'https://avenaterminal.com/api/v1',
    docs: 'https://avenaterminal.com/api/v1/docs',
  });
}
