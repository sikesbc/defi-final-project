import { AlertCircle, Shield, TrendingDown, RefreshCw, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useState } from 'react';
import {
  useSummaryStats,
  useTimeline,
  useProtocolBreakdown,
  useAttackTypeBreakdown,
  useTopAttacks,
} from '../hooks/useAttacks';
import { isSupabaseConfigured } from '../services/supabase';
import { attacksApi } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useSummaryStats();
  const { data: timelineData, isLoading: timelineLoading, refetch: refetchTimeline } = useTimeline({ granularity: 'month' });
  const { data: protocolData, isLoading: protocolLoading, refetch: refetchProtocol } = useProtocolBreakdown();
  const { data: attackTypeData, refetch: refetchAttackType } = useAttackTypeBreakdown();
  const { data: topAttacksData, refetch: refetchTopAttacks } = useTopAttacks(10);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  // Check if any critical data is loading
  const isLoading = summaryLoading || timelineLoading || protocolLoading;

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <Card className="max-w-md animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <CardTitle>Configuration Error</CardTitle>
            </div>
            <CardDescription>
              Supabase is not configured. Please create a <code className="text-xs bg-zinc-800 px-2 py-1 rounded">.env</code> file in the frontend directory with:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-lg font-mono text-sm">
              <div>VITE_SUPABASE_URL=your_supabase_url</div>
              <div>VITE_SUPABASE_ANON_KEY=your_anon_key</div>
            </div>
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

  const handleScrapeRekt = async () => {
    setIsScraping(true);
    setScrapeMessage('Starting web scraping... This may take a few minutes as we extract content from article pages.');
    try {
      const result = await attacksApi.scrapeRektLeaderboard();
      setScrapeMessage(result.message);
      // Refetch all data to show updated information
      await Promise.all([
        refetchSummary(),
        refetchTimeline(),
        refetchProtocol(),
        refetchAttackType(),
        refetchTopAttacks(),
      ]);
      // Clear message after 10 seconds (longer for success message)
      setTimeout(() => setScrapeMessage(null), 10000);
    } catch (error: any) {
      setScrapeMessage(error.message || 'Failed to scrape rekt.news. This may take several minutes - please try again.');
    } finally {
      setIsScraping(false);
    }
  };

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
            <div className="flex items-center gap-3">
              <Link to="/chat">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-50"
                  title="Ask questions about the attack data using AI"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ask Questions
                </Button>
              </Link>
              <Button
                onClick={handleScrapeRekt}
                disabled={isScraping}
                variant="outline"
                size="lg"
                className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-50"
                title="Scrape rekt.news leaderboard and extract detailed content from article pages (may take a few minutes)"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isScraping ? 'animate-spin' : ''}`} />
                {isScraping ? 'Scraping Articles...' : 'Refresh Attack Data via Web-Scraping'}
              </Button>
              <ExportButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Scrape Status Message */}
        {scrapeMessage && (
          <div className="animate-fade-in">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className={`flex items-center gap-3 ${scrapeMessage.includes('Successfully') ? 'text-green-400' : 'text-red-400'}`}>
                  {scrapeMessage.includes('Successfully') ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <p className="text-sm font-medium">{scrapeMessage}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

