import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed Live Spanish Property Data — Free Widget | Avena Terminal',
  description: 'Embed live Spanish new build property stats on your site. Free widget with real-time data from Avena Terminal.',
};

export default function EmbedPage() {
  const embedCode = `<iframe src="https://avenaterminal.com/embed/market-stats" width="320" height="180" frameborder="0" style="border-radius:8px;border:1px solid #1c2333"></iframe>`;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: '#e6edf3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <a
          href="/"
          style={{ color: '#58a6ff', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 24 }}
        >
          &larr; Back to Avena Terminal
        </a>

        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Embed Live Spanish Property Data
        </h1>
        <p style={{ color: '#8b949e', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Add real-time Spanish new build market stats to your website or blog. Free to use, updated daily.
        </p>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Live Preview</h2>
          <div
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <iframe
              src="/embed/market-stats"
              width="320"
              height="180"
              frameBorder="0"
              style={{ borderRadius: 8, border: '1px solid #1c2333' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Embed Code</h2>
          <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            Copy and paste this snippet into your HTML where you want the widget to appear.
          </p>
          <pre
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.5,
              overflowX: 'auto',
              color: '#79c0ff',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            <code>{embedCode}</code>
          </pre>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Light Theme</h2>
          <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            For light-background sites, add <code style={{ color: '#79c0ff' }}>?theme=light</code> to the URL:
          </p>
          <pre
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.5,
              overflowX: 'auto',
              color: '#79c0ff',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            <code>{embedCode.replace('/market-stats"', '/market-stats?theme=light"').replace('#1c2333', '#e5e7eb')}</code>
          </pre>
        </div>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Details</h2>
          <ul style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Data refreshes daily from our property feed</li>
            <li>Widget size: 320 x 180px (compact, sidebar-friendly)</li>
            <li>No JavaScript required - pure iframe embed</li>
            <li>Two themes: dark (default) and light</li>
            <li>Free for any non-commercial use with attribution</li>
          </ul>
        </div>

        <div style={{ borderTop: '1px solid #21262d', paddingTop: 24, fontSize: 12, color: '#484f58' }}>
          <a href="https://avenaterminal.com" style={{ color: '#58a6ff', textDecoration: 'none' }}>
            avenaterminal.com
          </a>{' '}
          &mdash; Spain New Build Property Investment Scanner
        </div>
      </div>
    </div>
  );
}
