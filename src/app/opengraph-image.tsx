import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Avena Estate — Spain Property Investment Scanner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12101a 50%, #0a0a0f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '64px 72px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Top: logo + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <span style={{
              fontSize: 72,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '0.12em',
            }}>AVENA</span>
            <span style={{ fontSize: 22, color: '#d97706', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Estate</span>
          </div>
          <div style={{ fontSize: 18, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Spain&apos;s First PropTech Scanner
          </div>
        </div>

        {/* Center: main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.2 }}>
            Find Spain&apos;s best<br />new-build deals.
          </div>
          <div style={{ fontSize: 24, color: '#9ca3af', fontFamily: 'sans-serif' }}>
            Ranked by value, not by agent commission.
          </div>
        </div>

        {/* Bottom: stat pills */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {[
            { value: '1,040+', label: 'Properties' },
            { value: '35%', label: 'Max Savings' },
            { value: 'Real-time', label: 'Rankings' },
          ].map(({ value, label }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '12px',
              padding: '16px 28px',
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#fbbf24' }}>{value}</span>
              <span style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'sans-serif', marginTop: '4px' }}>{label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 16, color: '#374151', fontFamily: 'sans-serif' }}>
            avenaterminal.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
