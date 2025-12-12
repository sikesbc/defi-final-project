import { AlertCircle, Shield, TrendingDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { SummaryStats } from './SummaryStats';
import { AttackTimeline } from './AttackTimeline';
import { ProtocolBreakdown } from './ProtocolBreakdown';
import { AttackTypeBreakdown } from './AttackTypeBreakdown';
import { TopAttacks } from './TopAttacks';
import { ExportButton } from './ExportButton';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import {
  useSummaryStats,
  useTimeline,
  useProtocolBreakdown,
  useAttackTypeBreakdown,
  useTopAttacks,
} from '../hooks/useAttacks';

export const Dashboard: React.FC = () => {
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummaryStats();
  const { data: timelineData, isLoading: timelineLoading } = useTimeline({ granularity: 'month' });
  const { data: protocolData, isLoading: protocolLoading } = useProtocolBreakdown();
  const { data: attackTypeData } = useAttackTypeBreakdown();
  const { data: topAttacksData } = useTopAttacks(10);

  // Check if any critical data is loading
  const isLoading = summaryLoading || timelineLoading || protocolLoading;

  // Check for errors
  if (summaryError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <Card className="max-w-md animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <CardTitle>Error Loading Data</CardTitle>
            </div>
            <CardDescription>
              Failed to load dashboard data. Please check that the API server is running and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
              size="lg"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 animate-slide-in">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-lg">
                <Shield className="w-7 h-7 text-zinc-50" />
              </div>
              <div>
                <h1 className="text-zinc-50 text-3xl font-bold tracking-tight">
                  Crypto Attack Tracker
                </h1>
                <p className="text-zinc-400 text-sm">
                  Real-time monitoring of protocol exploits & security breaches
                </p>
              </div>
            </div>
            <ExportButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Summary Stats */}
        {summaryData && (
          <div className="animate-fade-in">
            <SummaryStats stats={summaryData} />
          </div>
        )}

        <Separator className="my-8" />

        {/* Timeline Chart */}
        {timelineData && timelineData.timeline.length > 0 && (
          <div className="animate-fade-in">
            <AttackTimeline data={timelineData.timeline} />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Protocol Breakdown */}
          {protocolData && protocolData.protocols.length > 0 && (
            <ProtocolBreakdown data={protocolData.protocols} />
          )}

          {/* Attack Type Breakdown */}
          {attackTypeData && attackTypeData.attack_types.length > 0 && (
            <AttackTypeBreakdown data={attackTypeData.attack_types} />
          )}
        </div>

        {/* Top Attacks Table */}
        {topAttacksData && topAttacksData.top_attacks.length > 0 && (
          <div className="animate-fade-in">
            <TopAttacks data={topAttacksData.top_attacks} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <TrendingDown className="w-4 h-4" />
              <p className="text-sm">Data refreshes automatically every 48 hours</p>
            </div>
            <p className="text-xs text-zinc-500">
              Sources: Rekt.news • DeFiYield • SlowMist Hacked Database
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

