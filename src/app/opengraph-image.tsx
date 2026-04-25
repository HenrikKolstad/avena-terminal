import { ImageResponse } from 'next/og';

export const alt = 'Avena Terminal — European Property Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph card. Warm-dark + gold brand. Updated 2026-04 to match
 * the Avena Terminal v2 visual identity (Cormorant italic, JetBrains
 * Mono, #1D1815 background, #F5A623 gold accent).
 */
export default function Image() {
  const BG = '#1D1815';
  const BG_HI = '#251E1A';
  const GOLD = '#F5A623';
  const GOLD_HI = '#F5C97A';
  const FG = '#F5EFE7';
  const MUTED = '#A39689';
  const BORDER = 'rgba(245,166,35,0.22)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${BG} 0%, ${BG_HI} 50%, ${BG} 100%)`,
          fontFamily: 'Georgia, "Times New Roman", serif',
          position: 'relative',
          padding: '60px 70px',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(245,166,35,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top bar — wordmark + status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: BG,
                border: `2px solid ${GOLD}`,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontSize: 28,
                color: GOLD,
                lineHeight: 1,
              }}
            >
              A
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 16,
                color: FG,
                letterSpacing: '0.32em',
              }}
            >
              AVENA TERMINAL
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'monospace',
              fontSize: 12,
              color: GOLD,
              letterSpacing: '0.3em',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: GOLD,
                boxShadow: `0 0 10px ${GOLD}`,
              }}
            />
            LIVE · 2026
          </div>
        </div>

        {/* Hero block */}
        <div
          style={{
            marginTop: 60,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              color: GOLD,
              letterSpacing: '0.4em',
              marginBottom: 20,
            }}
          >
            EUROPEAN PROPERTY INTELLIGENCE
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 300,
              color: FG,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            <span>The terminal&nbsp;</span>
            <span style={{ fontStyle: 'italic', color: GOLD_HI }}>for property</span>
          </div>
          <div
            style={{
              fontSize: 26,
              color: MUTED,
              marginTop: 18,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Score, rank and audit every European new-build. RICS Tech Partner. Open methodology.
          </div>
        </div>

        {/* Stat strip */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            gap: 0,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {[
            { value: '1,881', label: 'Properties scored' },
            { value: '14', label: 'Ingestion agents' },
            { value: '5', label: 'Countries live' },
            { value: '24/7', label: 'Cron pipeline' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: '22px 26px',
                display: 'flex',
                flexDirection: 'column',
                background: i % 2 === 0 ? 'rgba(245,166,35,0.04)' : 'transparent',
                borderRight: i < 3 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 44,
                  color: GOLD_HI,
                  lineHeight: 1,
                  fontWeight: 300,
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: MUTED,
                  letterSpacing: '0.28em',
                  marginTop: 8,
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer bar */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'monospace',
            fontSize: 12,
            color: MUTED,
            letterSpacing: '0.22em',
            zIndex: 1,
          }}
        >
          <span style={{ color: GOLD, letterSpacing: '0.18em' }}>avenaterminal.com</span>
          <span>RICS TECH PARTNER · DOI 10.5281/ZENODO.19520064</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
