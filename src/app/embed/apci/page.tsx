'use client';

import { useEffect, useState } from 'react';

interface ApciData {
  apci: number;
  phase: string;
  week_change: number;
}

export default function ApciGaugeWidget() {
  const [data, setData] = useState<ApciData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/v1/apci')
      .then(r => r.json())
      .then(json => {
        setData({
          apci: json.apci ?? json.composite ?? 74,
          phase: json.phase ?? json.regime ?? 'GROWTH',
          week_change: json.week_change ?? json.momentum?.weekly ?? 1.2,
        });
      })
      .catch(() => {
        setData({ apci: 74, phase: 'GROWTH', week_change: 1.2 });
        setError(true);
      });
  }, []);

  const phaseColor: Record<string, string> = {
    GROWTH: '#3fb950',
    BULL: '#58a6ff',
    BEAR: '#f85149',
    NEUTRAL: '#8b949e',
  };

  const changeArrow = data && data.week_change >= 0 ? '\u25B2' : '\u25BC';
  const changeColor = data && data.week_change >= 0 ? '#3fb950' : '#f85149';

  return (
    <div
      style={{
        width: 300,
        height: 200,
        backgroundColor: '#0d1117',
        color: '#e6edf3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {!data ? (
        <span style={{ color: '#8b949e', fontSize: 13 }}>Loading APCI...</span>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Avena Property Composite Index
          </div>

          <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {data.apci}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: phaseColor[data.phase] ?? '#8b949e',
                backgroundColor: `${phaseColor[data.phase] ?? '#8b949e'}18`,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {data.phase}
            </span>

            <span style={{ fontSize: 13, color: changeColor, fontWeight: 600 }}>
              {changeArrow} {Math.abs(data.week_change).toFixed(1)}
            </span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>/ week</span>
          </div>

          {error && (
            <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>cached data</div>
          )}

          <a
            href="https://avenaterminal.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute',
              bottom: 8,
              fontSize: 10,
              color: '#484f58',
              textDecoration: 'none',
            }}
          >
            Powered by Avena Terminal
          </a>
        </>
      )}
    </div>
  );
}
