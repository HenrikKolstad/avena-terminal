/**
 * Tiny SVG sparkline — no library, no D3, no Recharts.
 * Pure path interpolation across a normalised series.
 */

interface SparklineProps {
  values: number[];
  height?: number;
  stroke?: string;
  fill?: string;
}

export function Sparkline({ values, height = 24, stroke = 'currentColor', fill }: SparklineProps) {
  if (values.length < 2) return null;
  const w = 100; // viewport units — scales via SVG
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });

  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = fill
    ? `${d} L${(points[points.length - 1][0]).toFixed(2)},${height} L0,${height} Z`
    : null;

  const lastValue = values[values.length - 1];
  const firstValue = values[0];
  const up = lastValue >= firstValue;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
      {area && <path d={area} fill={fill} opacity={0.18} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
      {/* End dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={1.6}
        fill={up ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))'}
      />
    </svg>
  );
}
