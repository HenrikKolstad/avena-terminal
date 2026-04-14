'use client';

import { useEffect, useState } from 'react';

interface RegimeData {
  regime: string;
  confidence: number;
}

export default function RegimeWidget() {
  const [data, setData] = useState<RegimeData | null>(null);

  useEffect(() => {
    fetch('/api/v1/intelligence/regime')
      .then(r => {
        if (!r.ok) throw new Error('not ok');
        return r.json();
      })
      .then(json => {
        setData({
          regime: json.regime ?? 'GROWTH',
          confidence: json.confidence ?? 76,
        });
      })
      .catch(() => {
        setData({ regime: 'GROWTH', confidence: 76 });
      });
  }, []);

  const regimeColors: Record<string, string> = {
    GROWTH: '#3fb950',
    BULL: '#58a6ff',
    BEAR: '#f85149',
    NEUTRAL: '#8b949e',
    RECOVERY: '#d29922',
  };

  const color = data ? (regimeColors[data.regime] ?? '#8b949e') : '#8b949e';

  return (
    <div
      style={{
        width: 280,
        height: 160,
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
        <span style={{ color: '#8b949e', fontSize: 13 }}>Loading...</span>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Market Regime
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color,
                letterSpacing: '0.04em',
              }}
            >
              {data.regime}
            </span>
          </div>

          <div style={{ fontSize: 13, color: '#8b949e', marginTop: 8 }}>
            Confidence: <span style={{ color: '#e6edf3', fontWeight: 600 }}>{data.confidence}%</span>
          </div>

          <a
            href="https://avenaterminal.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute',
              bottom: 6,
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
