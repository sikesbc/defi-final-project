import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ProtocolStats } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Activity } from 'lucide-react';

interface Props {
  data: ProtocolStats[];
}

const GREYSCALE_COLORS = [
  '#fafafa', // zinc-50
  '#e4e4e7', // zinc-200
  '#d4d4d8', // zinc-300
  '#a1a1aa', // zinc-400
  '#71717a', // zinc-500
  '#52525b', // zinc-600
  '#3f3f46', // zinc-700
  '#27272a', // zinc-800
  '#18181b', // zinc-900
  '#09090b', // zinc-950
];

export const ProtocolBreakdown: React.FC<Props> = ({ data }) => {
  // Take top 10 protocols and prepare chart data
  const chartData = data.slice(0, 10).map((protocol) => {
    const loss = typeof protocol.total_loss_usd === 'string' 
      ? parseFloat(protocol.total_loss_usd) 
      : protocol.total_loss_usd;
    
    return {
      name: protocol.protocol_name.length > 15
        ? protocol.protocol_name.substring(0, 15) + '...'
        : protocol.protocol_name,
      losses: Number((loss / 1_000_000).toFixed(2)), // Convert to millions
    };
  });

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-zinc-400" />
          <CardTitle>Top Protocols by Loss</CardTitle>
        </div>
        <CardDescription>
          Protocols with the highest total losses (in millions USD)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="name"
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              label={{ 
                value: 'Loss Amount (Millions USD)', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#a1a1aa',
                style: { textAnchor: 'middle' }
              }}
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
              formatter={(value: number) => [`$${value.toFixed(2)}M`, 'Loss']}
              cursor={{ fill: 'rgba(113, 113, 122, 0.1)' }}
            />
            <Bar 
              dataKey="losses" 
              radius={[6, 6, 0, 0]}
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={GREYSCALE_COLORS[index % GREYSCALE_COLORS.length]}
                  opacity={0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
