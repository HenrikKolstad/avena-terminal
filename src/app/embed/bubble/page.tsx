'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CITIES, type City } from '@/lib/bubble-data';

export default function EmbedBubblePage() {
  return (
    <Suspense fallback={<div style={{ width: 320, height: 200, background: 'hsl(var(--av-background))' }} />}>
      <BubbleCard />
    </Suspense>
  );
}

function getScoreColor(score: number): string {
  if (score < 40) return '#3fb950';
  if (score <= 60) return '#d29922';
  if (score <= 75) return '#db6d28';
  return '#f85149';
}

function getStatusLabel(status: City['status']): { text: string; color: string } {
  switch (status) {
    case 'healthy':
      return { text: 'Healthy', color: '#238636' };
    case 'warming':
      return { text: 'Warming', color: '#9e6a03' };
    case 'overheating':
      return { text: 'Overheating', color: '#bd561d' };
    case 'bubble':
      return { text: 'Bubble', color: '#da3633' };
  }
}

function BubbleCard() {
  const searchParams = useSearchParams();
  const citySlug = searchParams.get('city') || 'munich';
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';

  const city = CITIES.find((c) => c.slug === citySlug) || CITIES[0];
  const scoreColor = getScoreColor(city.bubbleScore);
  const statusInfo = getStatusLabel(city.status);
  const isPositiveYoy = city.yoyChange >= 0;

  const isDark = theme === 'dark';
  const bg = isDark ? 'hsl(var(--av-background))' : '#ffffff';
  const text = isDark ? '#c9d1d9' : '#1f2328';
  const textMuted = isDark ? '#8b949e' : '#656d76';
  const border = isDark ? 'hsl(var(--av-border))' : '#d0d7de';

  return (
    <html>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
        <div
          style={{
            width: 320,
            height: 200,
            background: bg,
            color: text,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: '16px 20px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{city.flag}</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{city.name}</span>
            </div>
            <span
              style={{
                background: statusInfo.color,
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {statusInfo.text}
            </span>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                {city.bubbleScore}
              </div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Bubble Score</div>
            </div>

            {/* Stats */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{city.pricePerM2.toLocaleString('en-EU')}</span>
                <span style={{ color: textMuted, marginLeft: 4, fontSize: 11 }}>EUR/m2</span>
              </div>
              <div>
                <span
                  style={{
                    color: isPositiveYoy ? '#3fb950' : '#f85149',
                    fontWeight: 600,
                  }}
                >
                  {isPositiveYoy ? '\u25B2' : '\u25BC'} {isPositiveYoy ? '+' : ''}
                  {city.yoyChange.toFixed(1)}%
                </span>
                <span style={{ color: textMuted, marginLeft: 4, fontSize: 11 }}>YoY</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 10, color: textMuted }}>
            Powered by{' '}
            <a
              href="https://avenaterminal.com/bubble-scanner"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: isDark ? '#58a6ff' : '#0969da', textDecoration: 'none' }}
            >
              Avena Terminal
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
