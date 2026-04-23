import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'avena CLI — European property intelligence in your terminal | Avena Terminal',
  description: 'Bloomberg-style property data from the command line. Score any property, compare deals, run the bubble scanner, resolve AVN_PROP_IDs. Open source.',
  alternates: { canonical: 'https://avenaterminal.com/cli' },
  openGraph: {
    title: 'avena CLI — European property intelligence in your terminal',
    description: 'npx avena score <ref> · deals · compare · bubble · avn. Open source.',
    url: 'https://avenaterminal.com/cli',
    siteName: 'Avena Terminal',
  },
};

const EXAMPLES = [
  {
    cmd: 'npx avena score N9171',
    out: `Cortijo del Mar · €385,000 · €2,182/m² · Avena Score 78/100 · 14% below local market
  Ref                 N9171
  Canonical ID        AVN:ES-03185-NB-0421
  Location            Torrevieja · Costa Blanca · ES
  Type                Villa · 3bed / 2bath · 176m²
  Price               €385 000
  Price / m²          €2 182
  Town median / m²    €2 543
  Discount            −14%
  Yield (gross)       5.4%
  Avena Score         78 / 100
  Status              off-plan
  Developer           La Finca Group

  https://avenaterminal.com/property/N9171`,
  },
  {
    cmd: 'npx avena bubble munich',
    out: `🇩🇪 Munich · Germany
  Bubble status      BUBBLE
  Bubble score       89 / 100
  €/m²               €9 800
  YoY change         +4.2%
  Price-to-income    16.2x
  Affordability      22 / 100

  https://avenaterminal.com/bubble-scanner/munich`,
  },
  {
    cmd: 'npx avena compare N9171 N8820 N7544',
    out: `  Metric        N9171         N8820         N7544
  Ref           N9171         N8820         N7544
  Score         78            82            71
  Price         €385 000      €410 000      €325 000
  €/m²          €2 182        €2 410        €1 985
  Discount      −14%          −11%          −17%
  Yield         5.4%          5.1%          6.0%
  Beds          3             3             2
  Built m²      176           170           164
  Town          Torrevieja    Calpe         Orihuela Costa

  https://avenaterminal.com/compare/deals?refs=N9171,N8820,N7544`,
  },
];

export default function CliPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'avena CLI',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Linux, Windows',
    description: 'Command-line interface for Avena Terminal. Score, compare, and stream European property intelligence from your terminal.',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    url: 'https://avenaterminal.com/cli',
    downloadUrl: 'https://www.npmjs.com/package/avena',
    license: 'https://opensource.org/licenses/MIT',
    author: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-20">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Open source · MIT · node ≥ 18
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              <span className="italic text-gold">avena</span> from your terminal.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light mb-8">
              Bloomberg-style European property intelligence as a CLI. Score any
              property, compare deals, run the bubble scanner, resolve
              AVN_PROP_IDs. All data CC BY 4.0. Works everywhere Node works.
            </p>

            <div
              className="rounded-sm border p-5 font-mono text-sm"
              style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-primary) / 0.35)' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Install</div>
              <div className="space-y-1">
                <div><span className="text-muted-foreground">$</span> <span className="text-foreground">npx avena score N9171</span></div>
                <div><span className="text-muted-foreground">$</span> <span className="text-foreground">npm install -g avena</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Commands <span className="italic text-gold">that matter</span>.
            </h2>
            <div className="space-y-6">
              {EXAMPLES.map((e) => (
                <div
                  key={e.cmd}
                  className="rounded-sm border overflow-hidden"
                  style={{ background: 'hsl(var(--av-background))', borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  <div
                    className="px-5 py-3 border-b font-mono text-sm text-foreground"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.5)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <span className="text-primary">$</span> {e.cmd}
                  </div>
                  <pre className="px-5 py-4 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre overflow-x-auto">{e.out}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-6">
              Environment.
            </h2>
            <p className="text-base text-muted-foreground font-light mb-6 max-w-2xl">
              Set <code className="font-mono text-primary">AVENA_API</code> to point at a custom
              instance. Default is <code className="font-mono text-primary">https://avenaterminal.com</code>.
            </p>
            <div
              className="rounded-sm border p-5 font-mono text-sm"
              style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
            >
              <span className="text-muted-foreground">$</span>{' '}
              <span className="text-foreground">AVENA_API=https://staging.avenaterminal.com avena deals</span>
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="py-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: 'MCP server', sub: 'For AI agents (Claude Desktop, Cursor, Windsurf)', href: '/mcp-server' },
                { title: 'REST API', sub: '208+ open endpoints · CC BY 4.0', href: '/docs' },
                { title: 'AVN_PROP_ID', sub: 'Open canonical identifier standard', href: '/standards/avn-id' },
              ].map((c) => (
                <Link
                  key={c.title}
                  href={c.href}
                  className="rounded-sm border p-5 hover:border-primary/50 transition-colors"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="font-serif text-lg text-foreground mb-1">{c.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{c.sub}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
