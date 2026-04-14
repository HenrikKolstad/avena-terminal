import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Avena Terminal — Spain Property Investment Scanner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0d0d14 0%, #0a1628 50%, #0d0d14 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* AVENA TERMINAL */}
        <div style={{
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: '0.25em',
          marginBottom: '8px',
          background: 'linear-gradient(90deg, #6ee7b7, #10b981, #059669)',
          backgroundClip: 'text',
          color: 'transparent',
        }}>AVENA TERMINAL</div>

        {/* Tagline */}
        <div style={{
          fontSize: 20,
          color: '#9ca3af',
          letterSpacing: '0.12em',
          marginBottom: '36px',
          textTransform: 'uppercase',
        }}>European Property Intelligence Infrastructure</div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '28px' }}>
          {[
            { value: '1,881', label: 'Scored Properties' },
            { value: '5', label: 'Market Indices' },
            { value: '19', label: 'AI Agents' },
            { value: '200+', label: 'Live Systems' },
          ].map(({ value, label }) => (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: '10px',
              padding: '12px 24px',
              minWidth: '140px',
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{value}</span>
              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Feature tags */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px' }}>
          {['MCP Server', 'PropertyEval Benchmark', 'SPARQL', 'RDF', 'Bubble Scanner', 'Oracle AI', 'Context Protocol', 'CC BY 4.0'].map(tag => (
            <span key={tag} style={{
              fontSize: 11,
              color: '#6b7280',
              border: '1px solid rgba(107,114,128,0.2)',
              borderRadius: '20px',
              padding: '4px 14px',
              letterSpacing: '0.05em',
            }}>{tag}</span>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: '#10b981', letterSpacing: '0.1em', fontWeight: 600 }}>avenaterminal.com</span>
          <span style={{ fontSize: 12, color: '#4b5563' }}>DOI: 10.5281/zenodo.19520064</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
