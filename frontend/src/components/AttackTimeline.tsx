import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TimelinePoint } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';

interface Props {
  data: TimelinePoint[];
}

export const AttackTimeline: React.FC<Props> = ({ data }) => {
  const chartData = data.map((point) => {
    // Convert to number if it's a string
    const lossAmount = typeof point.total_loss_usd === 'string' 
      ? parseFloat(point.total_loss_usd) 
      : point.total_loss_usd;
    
    return {
      period: point.period,
      attacks: point.attack_count,
      losses: lossAmount / 1_000_000, // Convert to millions for better readability
    };
  });

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-zinc-400" />
          <CardTitle>Attack Timeline</CardTitle>
        </div>
        <CardDescription>
          Monthly breakdown of attacks and financial losses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71717a" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#71717a" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="period"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              label={{
                value: 'Number of Attacks',
                angle: -90,
                position: 'insideLeft',
                fill: '#a1a1aa',
                style: { textAnchor: 'middle' }
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              label={{
                value: 'Losses (Millions USD)',
                angle: 90,
                position: 'insideRight',
                fill: '#a1a1aa',
                style: { textAnchor: 'middle' }
              }}
              tickFormatter={(value) => `$${value}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
              }}
              labelStyle={{ color: '#fafafa', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: '#fafafa' }}
              formatter={(value: number, name: string) => {
                if (name === 'attacks') {
                  return [value, 'Attacks'];
                }
                return [`$${value.toFixed(2)}M`, 'Losses'];
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              yAxisId="left"
              dataKey="attacks"
              fill="url(#barGradient)"
              name="attacks"
              radius={[6, 6, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="losses"
              stroke="#fafafa"
              strokeWidth={2.5}
              name="losses"
              dot={{ r: 4, fill: '#fafafa', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
