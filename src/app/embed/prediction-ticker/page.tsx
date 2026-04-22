import { supabase } from '@/lib/supabase';

export const revalidate = 600;

export const metadata = {
  title: 'Avena Prediction Ticker',
  description: 'Live Avena prediction ledger ticker.',
  robots: { index: false, follow: false },
};

interface Pred {
  target: string;
  metric: string;
  predicted_change_pct: number;
  confidence: number;
  horizon_days: number;
}

async function loadActive(): Promise<Pred[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('predictions')
      .select('target, metric, predicted_change_pct, confidence, horizon_days')
      .eq('status', 'active')
      .order('confidence', { ascending: false })
      .limit(8);
    return (data ?? []) as Pred[];
  } catch {
    return [];
  }
}

export default async function EmbedPredictionTicker({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const params = await searchParams;
  const theme = params.theme === 'light' ? 'light' : 'dark';
  const dark = theme === 'dark';
  const preds = await loadActive();

  const bg = dark ? '#1D1815' : '#ffffff';
  const fg = dark ? '#F4EFE8' : '#1D1815';
  const muted = dark ? '#8B827A' : '#6B625A';
  const border = dark ? '#3B3530' : '#D9D4CD';
  const gold = '#F5A623';
  const red = '#E07A5F';

  return (
    <html>
      <head>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes ticker {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .track { animation: ticker 90s linear infinite; }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: bg, color: fg, fontFamily: 'Menlo, Consolas, monospace', overflow: 'hidden' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            border: `1px solid ${border}`,
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ background: `linear-gradient(90deg, ${gold}, #E07A1F)`, height: 2 }} />
          <div
            style={{
              padding: '8px 16px',
              fontSize: 10,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: gold,
              borderBottom: `1px solid ${border}`,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Avena · Prediction Ledger · Live</span>
            <span style={{ color: muted }}>{preds.length} active</span>
          </div>

          {preds.length > 0 ? (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 0' }}>
              <div className="track" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {[...preds, ...preds].map((p, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '0 24px',
                      borderRight: `1px solid ${border}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: muted, marginRight: 8 }}>
                      {p.horizon_days}d
                    </span>
                    <span style={{ color: fg, marginRight: 8 }}>{p.target}</span>
                    <span style={{ color: muted, marginRight: 6 }}>{p.metric}</span>
                    <span
                      style={{
                        color: p.predicted_change_pct > 0 ? gold : red,
                        fontWeight: 600,
                        marginRight: 6,
                      }}
                    >
                      {p.predicted_change_pct > 0 ? '+' : ''}
                      {p.predicted_change_pct.toFixed(1)}%
                    </span>
                    <span style={{ color: muted, fontSize: 10 }}>
                      conf {p.confidence}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 14, fontSize: 11, color: muted, textAlign: 'center' }}>
              No active predictions — check back after the next Nostradamus run.
            </div>
          )}

          <div
            style={{
              padding: '6px 16px',
              borderTop: `1px solid ${border}`,
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: muted,
              textAlign: 'center',
            }}
          >
            <a href="https://avenaterminal.com/predictions" style={{ color: gold, textDecoration: 'none' }}>
              avenaterminal.com/predictions →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
