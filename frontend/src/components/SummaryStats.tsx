import { Shield, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import type { SummaryStats as SummaryStatsType } from '../types';
import { Card, CardContent } from './ui/card';

interface Props {
  stats: SummaryStatsType;
}

export const SummaryStats: React.FC<Props> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Attacks',
      value: formatNumber(stats.total_attacks),
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      bgGradient: 'from-red-500/10 to-red-600/5',
      borderColor: 'hover:border-red-500/50',
    },
    {
      title: 'Total Losses',
      value: formatCurrency(stats.total_losses_usd),
      icon: DollarSign,
      iconColor: 'text-amber-400',
      bgGradient: 'from-amber-500/10 to-amber-600/5',
      borderColor: 'hover:border-amber-500/50',
    },
    {
      title: 'Recent Attacks',
      subtitle: 'Last 30 days',
      value: formatNumber(stats.attacks_last_30_days),
      icon: TrendingDown,
      iconColor: 'text-zinc-400',
      bgGradient: 'from-zinc-700/10 to-zinc-800/5',
      borderColor: 'hover:border-zinc-500/50',
    },
    {
      title: 'Recent Losses',
      subtitle: 'Last 30 days',
      value: formatCurrency(stats.losses_last_30_days),
      icon: Shield,
      iconColor: 'text-zinc-300',
      bgGradient: 'from-zinc-600/10 to-zinc-700/5',
      borderColor: 'hover:border-zinc-400/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`group transition-all duration-300 ${card.borderColor} hover:shadow-xl hover:scale-[1.02]`}
        >
          <CardContent className="p-6">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} rounded-xl opacity-50`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg bg-zinc-800/80 group-hover:bg-zinc-800 transition-colors`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                  {card.title}
                </p>
                {card.subtitle && (
                  <p className="text-zinc-500 text-[10px]">
                    {card.subtitle}
                  </p>
                )}
                <p className="text-zinc-50 text-2xl font-bold tracking-tight pt-1">
                  {card.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

