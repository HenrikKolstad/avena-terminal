/**
 * Institutional-grade forward transmission curve.
 *
 * Renders the projected cumulative % impact over the chosen timeframe with:
 *   · proper axes (months on X, % on Y)
 *   · gridlines on Y-axis at each major tick
 *   · area fill under the curve
 *   · end-point marker with terminal value label
 *   · zero line if the projection crosses it
 *
 * No charting library — pure SVG. Keeps bundle small + render fast.
 */

interface Props {
  values: number[];      // length = months; cumulative % impact at each month
  timeframe: number;     // total months
  height?: number;
}

export function TransmissionChart({ values, timeframe, height = 220 }: Props) {
  if (values.length < 2) return null;

  const paddingL = 40;
  const paddingR = 16;
  const paddingT = 14;
  const paddingB = 28;
  const viewW = 1000;
  const innerW = viewW - paddingL - paddingR;
  const innerH = height - paddingT - paddingB;

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  // Pad the y-range by 8% so the curve never touches the top/bottom edge
  const yPad = (max - min) * 0.08 || 0.1;
  const yMin = min - yPad;
  const yMax = max + yPad;
  const yRange = yMax - yMin;

  const xStep = innerW / (values.length - 1);
  const yToPx = (v: number) => paddingT + ((yMax - v) / yRange) * innerH;
  const xToPx = (i: number) => paddingL + i * xStep;

  // Path
  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xToPx(i).toFixed(2)},${yToPx(v).toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${xToPx(values.length - 1).toFixed(2)},${yToPx(0).toFixed(2)} L${xToPx(0).toFixed(2)},${yToPx(0).toFixed(2)} Z`;

  // Y-axis ticks — 4 evenly spaced
  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMax - (yRange / 4) * i);
  }

  // X-axis labels — show every nth month so we get ~6 labels max
  const xLabelStep = Math.max(1, Math.ceil((values.length - 1) / 6));
  const xLabels: Array<{ month: number; px: number }> = [];
  for (let i = 0; i < values.length; i += xLabelStep) {
    xLabels.push({ month: i + 1, px: xToPx(i) });
  }
  if (xLabels[xLabels.length - 1].month !== values.length) {
    xLabels.push({ month: values.length, px: xToPx(values.length - 1) });
  }

  const terminalValue = values[values.length - 1];
  const terminalUp = terminalValue >= 0;
  const stroke = terminalUp ? 'hsl(var(--av-success))' : 'hsl(var(--av-destructive))';

  return (
    <svg viewBox={`0 0 ${viewW} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="block">
      {/* Gridlines + Y-axis labels */}
      {yTicks.map((tv, i) => {
        const py = yToPx(tv);
        const isZero = Math.abs(tv) < 0.0001;
        return (
          <g key={i}>
            <line
              x1={paddingL} x2={viewW - paddingR}
              y1={py} y2={py}
              stroke={isZero ? 'hsl(var(--av-border-strong))' : 'hsl(var(--av-border) / 0.4)'}
              strokeWidth={isZero ? 1 : 0.5}
              strokeDasharray={isZero ? '' : '2 4'}
            />
            <text
              x={paddingL - 6} y={py + 3}
              fontSize="10" fontFamily="'JetBrains Mono', monospace"
              fill="hsl(var(--av-muted-foreground))" textAnchor="end"
            >
              {(tv >= 0 ? '+' : '') + tv.toFixed(2)}%
            </text>
          </g>
        );
      })}

      {/* Area fill under curve */}
      <path d={areaPath} fill={stroke} opacity={0.12} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />

      {/* End-point marker */}
      <circle
        cx={xToPx(values.length - 1)} cy={yToPx(terminalValue)}
        r={4}
        fill={stroke}
        stroke="hsl(var(--av-background))" strokeWidth={2}
      />

      {/* Terminal value label */}
      <text
        x={xToPx(values.length - 1) - 8} y={yToPx(terminalValue) - 10}
        fontSize="11" fontFamily="'Cormorant Garamond', serif"
        fill={stroke} textAnchor="end" fontWeight="500"
      >
        {(terminalValue >= 0 ? '+' : '') + terminalValue.toFixed(2)}%
      </text>

      {/* X-axis labels */}
      {xLabels.map((l, i) => (
        <text
          key={i} x={l.px} y={height - 8}
          fontSize="10" fontFamily="'JetBrains Mono', monospace"
          fill="hsl(var(--av-muted-foreground))" textAnchor="middle"
        >
          m{l.month}
        </text>
      ))}

      {/* Caption strip at bottom */}
      <text
        x={paddingL} y={height - 8}
        fontSize="9" fontFamily="'JetBrains Mono', monospace"
        fill="hsl(var(--av-primary))" textAnchor="start"
        letterSpacing="0.22em" style={{ textTransform: 'uppercase' }}
      >
        {/* hide if there's too little room */}
      </text>
    </svg>
  );
}
