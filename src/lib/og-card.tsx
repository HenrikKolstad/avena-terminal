/**
 * Shared OG card renderer — consistent luxe design across pages.
 * Used by the opengraph-image.tsx files under individual route folders.
 */

import { ImageResponse } from 'next/og';

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = 'image/png';

interface CardOpts {
  eyebrow: string;
  title: string;
  italicWord?: string;
  metrics?: Array<{ label: string; value: string; accent?: boolean }>;
  footerLeft?: string;
}

export function renderOgCard(opts: CardOpts) {
  const title = opts.italicWord
    ? opts.title.replace(opts.italicWord, '{{italic}}')
    : opts.title;
  const [before, after] = title.split('{{italic}}');

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#1D1815',
          color: '#F4EFE8',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <div
            style={{
              width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #F5A623',
              background: 'rgba(245, 166, 35, 0.06)',
              fontFamily: 'Georgia, serif',
              fontSize: 34, fontStyle: 'italic',
              color: '#F5A623',
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 300 }}>Avena</div>
            <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: '#C9C0B6' }}>
              Terminal · Est. 2026
            </div>
          </div>
        </div>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ height: 1, width: 40, background: '#F5A623' }} />
          <span style={{ fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', color: '#F5A623' }}>
            {opts.eyebrow}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 80,
            fontWeight: 300,
            lineHeight: 0.98,
            letterSpacing: -1,
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: '90%',
          }}
        >
          <span>{before}</span>
          {opts.italicWord && (
            <span style={{ fontStyle: 'italic', color: '#F5A623' }}>{opts.italicWord}</span>
          )}
          <span>{after ?? ''}</span>
        </div>

        {/* Metrics row */}
        {opts.metrics && opts.metrics.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
            {opts.metrics.slice(0, 4).map((m) => (
              <div
                key={m.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '18px 22px',
                  border: '1px solid rgba(201, 192, 182, 0.25)',
                  background: 'rgba(38, 32, 28, 0.6)',
                  flex: 1,
                }}
              >
                <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: '#C9C0B6', marginBottom: 8 }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 40,
                    fontWeight: 300,
                    color: m.accent ? '#F5A623' : '#F4EFE8',
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 32,
            fontSize: 14,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#C9C0B6',
          }}
        >
          <div>{opts.footerLeft ?? 'avenaterminal.com'}</div>
          <div>European property intelligence · CC BY 4.0</div>
        </div>
      </div>
    ),
    ogSize
  );
}
