import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Terms of Use | Avena Terminal',
  description:
    'Terms of use, data attribution requirements, API terms, open data licensing, and trademark notice for Avena Terminal.',
  openGraph: {
    title: 'Terms of Use | Avena Terminal',
    description: 'Data attribution, API terms, open data licensing, and usage policies for Avena Terminal.',
    url: 'https://avenaterminal.com/terms',
    siteName: 'Avena Terminal',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://avenaterminal.com/terms' },
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#161b22',
  border: '1px solid #30363d',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

const h2Style: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: '1rem',
  color: '#34d399',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.7,
  color: '#c9d1d9',
  marginBottom: '0.75rem',
};

const ulStyle: React.CSSProperties = {
  paddingLeft: '1.25rem',
  marginBottom: '0.75rem',
};

const liStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.7,
  color: '#c9d1d9',
  marginBottom: '0.25rem',
};

export default function TermsPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://avenaterminal.com' },
      { '@type': 'ListItem', position: 2, name: 'Terms of Use', item: 'https://avenaterminal.com/terms' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #30363d', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#c9d1d9' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>AVENA</span>
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>TERMINAL</span>
          </Link>
        </header>

        {/* Content */}
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Terms of Use
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
            Last updated: April 2026
          </p>

          {/* 1. Data Attribution Requirements */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>1. Data Attribution Requirements</h2>
            <p style={pStyle}>
              Anyone using Avena Terminal data in published work, research papers, reports, dashboards, or any public-facing material must include the following attribution:
            </p>
            <p style={{ ...pStyle, fontWeight: 600 }}>
              &quot;Avena Terminal (avenaterminal.com)&quot;
            </p>
            <p style={pStyle}>
              All open datasets are published under the Creative Commons Attribution 4.0 International License (CC BY 4.0). You are free to share and adapt the data for any purpose, provided proper attribution is given.
            </p>
            <p style={pStyle}>
              Use our{' '}
              <Link href="/cite" style={{ color: '#34d399', textDecoration: 'underline' }}>
                citation generator
              </Link>{' '}
              to create properly formatted citations for any Avena system.
            </p>
          </section>

          {/* 2. API Terms */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>2. API Terms</h2>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <strong>Free tier:</strong> 100 requests per day. Attribution to Avena Terminal is required in any product or publication that uses API data.
              </li>
              <li style={liStyle}>
                <strong>Paid tiers:</strong> Available per agreement. Contact partners@avenaterminal.com for enterprise access.
              </li>
              <li style={liStyle}>
                <strong>Rate limiting:</strong> All API endpoints are rate-limited. Exceeding limits will result in HTTP 429 responses. Repeated abuse may result in key revocation.
              </li>
            </ul>
          </section>

          {/* 3. Open Data License */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>3. Open Data License</h2>
            <ul style={ulStyle}>
              <li style={liStyle}>
                <strong>Aggregate data:</strong> All aggregate and summary-level data published by Avena Terminal is licensed under CC BY 4.0.
              </li>
              <li style={liStyle}>
                <strong>Indices (APCI, APYI, APLI, APRI, APSI):</strong> Free to reference, display, and redistribute with &quot;Powered by Avena Terminal&quot; attribution clearly visible.
              </li>
              <li style={liStyle}>
                <strong>Research papers and academic use:</strong> All Avena data used in academic publications falls under CC BY 4.0. Proper citation is required.
              </li>
            </ul>
          </section>

          {/* 4. Prohibited Uses */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>4. Prohibited Uses</h2>
            <ul style={ulStyle}>
              <li style={liStyle}>Removing, obscuring, or altering Avena Terminal attribution from any data, index, or output.</li>
              <li style={liStyle}>Claiming Avena Terminal data, indices, or methodologies as original work.</li>
              <li style={liStyle}>Redistributing raw datasets or API responses without a valid license agreement.</li>
            </ul>
          </section>

          {/* 5. Trademark Notice */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>5. Trademark Notice</h2>
            <p style={pStyle}>
              The following are trademarks of Avena Terminal: <strong>APCI</strong>, <strong>APIP</strong>, <strong>Avena Terminal</strong>, and <strong>PropertyEval</strong>. Use of these marks in published material must accurately reference the associated Avena Terminal system and may not imply endorsement without written permission.
            </p>
          </section>

          {/* 6. Contact */}
          <section style={sectionStyle}>
            <h2 style={h2Style}>6. Contact</h2>
            <p style={pStyle}>
              For licensing inquiries, partnership proposals, or questions about these terms:
            </p>
            <p style={pStyle}>
              <a href="mailto:partners@avenaterminal.com" style={{ color: '#34d399', textDecoration: 'underline' }}>
                partners@avenaterminal.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
