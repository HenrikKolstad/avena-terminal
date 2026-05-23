'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { IndexCard } from './page';

interface ChartProps {
  data: Array<Record<string, number | string | null>>;
  indices: IndexCard[];
}

const STROKE: Record<string, string> = {
  'AVENA-CC':  'hsl(42 85% 64% / 1.00)',
  'AVENA-VAL': 'hsl(42 85% 64% / 0.78)',
  'AVENA-SCR': 'hsl(42 85% 64% / 0.58)',
  'AVENA-DPT': 'hsl(42 85% 64% / 0.40)',
};

export function IndexChart({ data, indices }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--av-border) / 0.5)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'hsl(var(--av-muted-foreground))', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickFormatter={(d) => String(d).slice(5)}
          minTickGap={40}
        />
        <YAxis tick={{ fill: 'hsl(var(--av-muted-foreground))', fontSize: 10, fontFamily: 'JetBrains Mono' }} domain={['dataMin - 1', 'dataMax + 1']} />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--av-background))',
            border: '1px solid hsl(var(--av-border-strong))',
            borderRadius: 4,
            fontFamily: 'JetBrains Mono',
            fontSize: 11,
          }}
          labelStyle={{ color: 'hsl(var(--av-primary))' }}
        />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.22em' }} />
        {indices.map((idx) => (
          <Line
            key={idx.code}
            type="monotone"
            dataKey={idx.code}
            stroke={STROKE[idx.code] ?? 'hsl(42 85% 64%)'}
            strokeWidth={idx.code === 'AVENA-CC' ? 2.5 : 1.5}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
