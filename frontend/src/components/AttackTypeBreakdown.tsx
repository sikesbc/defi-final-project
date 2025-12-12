import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import type { AttackTypeStats } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Target } from 'lucide-react';

interface Props {
  data: AttackTypeStats[];
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
];

export const AttackTypeBreakdown: React.FC<Props> = ({ data }) => {
  const chartData = data.map((item) => {
    // Convert to number if it's a string
    const lossAmount = typeof item.total_loss_usd === 'string' 
      ? parseFloat(item.total_loss_usd) 
      : item.total_loss_usd;
    
    return {
      name: item.attack_type,
      value: lossAmount,
      percentage: item.percentage,
      count: item.attack_count,
    };
  });

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="#09090b"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-zinc-400" />
          <CardTitle>Attack Types by Loss</CardTitle>
        </div>
        <CardDescription>
          Distribution of attack vectors by total financial impact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={chartData.slice(0, 8)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={130}
              innerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.slice(0, 8).map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={GREYSCALE_COLORS[index % GREYSCALE_COLORS.length]}
                  stroke="#18181b"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fafafa',
              }}
              labelStyle={{ color: '#fafafa', fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: '#fafafa' }}
              formatter={(value: number) => formatCurrency(value)}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend list */}
        <div className="mt-6 space-y-2 max-h-80 overflow-y-auto">
          {chartData.slice(0, 8).map((item, index) => (
            <div 
              key={item.name} 
              className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: GREYSCALE_COLORS[index % GREYSCALE_COLORS.length] }}
                />
                <span className="text-zinc-300 text-sm capitalize font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {item.count} attacks
                </Badge>
                <div className="text-right">
                  <div className="text-zinc-50 font-semibold text-sm">
                    {formatCurrency(item.value)}
                  </div>
                  <div className="text-zinc-500 text-xs">
                    {formatPercentage(item.percentage)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
