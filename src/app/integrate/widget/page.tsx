import { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { CITIES } from '@/lib/bubble-data';

export const metadata: Metadata = {
  title: 'Bubble Scanner Widget — Embed Property Intelligence | Avena Terminal',
  description: 'Add live European property bubble scores to any website with one line of code. Free embeddable widget and JSON API for real estate intelligence.',
};

const countryCities = CITIES.reduce<Record<string, { name: string; slug: string; flag: string }[]>>(
  (acc, city) => {
    if (!acc[city.country]) acc[city.country] = [];
    acc[city.country].push({ name: city.name, slug: city.slug, flag: city.flag });
    return acc;
  },
  {}
);

const useCases = [
  {
    title: 'Property Portals',
    description: 'Show bubble risk scores next to property listings so buyers can assess market health before making an offer.',
  },
  {
    title: 'Financial Blogs',
    description: 'Embed live city-level data into market analysis articles to give readers real-time context on European housing trends.',
  },
  {
    title: 'Market Dashboards',
    description: 'Add bubble scores alongside other economic indicators for a comprehensive view of European real estate conditions.',
  },
];

export default function WidgetPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Avena Terminal Bubble Scanner Widget',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'Embeddable widget that displays European property bubble scores, price data, and market risk indicators.',
    url: 'https://avenaterminal.com/integrate/widget',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    author: {
      '@type': 'Organization',
      name: 'Avena Terminal',
      url: 'https://avenaterminal.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{
          minHeight: '100vh',
          background: '#0d1117',
          color: '#c9d1d9',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          padding: '64px 24px',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Hero */}
          <section style={{ textAlign: 'center', marginBottom: 64 }}>
            <h1 style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Embed the Bubble Scanner
            </h1>
            <p style={{ fontSize: 18, color: '#8b949e', marginTop: 12, maxWidth: 560, marginInline: 'auto' }}>
              Add live European property bubble scores to any website. One line of code.
            </p>
          </section>

          {/* Quick Start */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16 }}>Quick Start</h2>
            <p style={{ color: '#8b949e', marginBottom: 12 }}>
              Copy and paste this snippet into your HTML:
            </p>
            <pre
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: 20,
                overflowX: 'auto',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#e6edf3',
              }}
            >
              <code>{`<iframe
  src="https://avenaterminal.com/embed/bubble?city=munich"
  width="320"
  height="200"
  frameborder="0"
></iframe>`}</code>
            </pre>
          </section>

          {/* Configuration */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16 }}>Configuration</h2>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #30363d' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#ffffff', fontWeight: 600 }}>
                      Parameter
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#ffffff', fontWeight: 600 }}>
                      Values
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#ffffff', fontWeight: 600 }}>
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>city</code>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      Any city slug (<code style={{ fontSize: 12 }}>munich</code>, <code style={{ fontSize: 12 }}>amsterdam</code>, etc.)
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <code style={{ fontSize: 13 }}>munich</code>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <code style={{ background: '#161b22', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>theme</code>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#8b949e' }}>
                      <code style={{ fontSize: 12 }}>dark</code>, <code style={{ fontSize: 12 }}>light</code>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <code style={{ fontSize: 13 }}>dark</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Available Cities */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16 }}>Available Cities</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {Object.entries(countryCities)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([country, cities]) => (
                  <div
                    key={country}
                    style={{
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', margin: '0 0 8px 0' }}>
                      {cities[0].flag} {country}
                    </h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13 }}>
                      {cities.map((city) => (
                        <li key={city.slug} style={{ padding: '3px 0', color: '#8b949e' }}>
                          {city.name} &mdash;{' '}
                          <code style={{ fontSize: 12, color: '#58a6ff' }}>{city.slug}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </section>

          {/* API Alternative */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16 }}>API Alternative</h2>
            <p style={{ color: '#8b949e', marginBottom: 12 }}>
              For developers who want raw JSON data:
            </p>
            <pre
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: 20,
                overflowX: 'auto',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#e6edf3',
              }}
            >
              <code>{`curl https://avenaterminal.com/api/v1/bubble-scanner?city=munich`}</code>
            </pre>
            <p style={{ marginTop: 12 }}>
              <a
                href="/api/v1/bubble-scanner"
                style={{ color: '#58a6ff', textDecoration: 'none', fontSize: 14 }}
              >
                View full API documentation &rarr;
              </a>
            </p>
          </section>

          {/* Use Cases */}
          <section style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#ffffff', marginBottom: 16 }}>Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {useCases.map((uc) => (
                <div
                  key={uc.title}
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', margin: '0 0 8px 0' }}>
                    {uc.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#8b949e', margin: 0, lineHeight: 1.5 }}>
                    {uc.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
