import type {
  AttackResponse,
  SummaryStats,
  TimelineResponse,
  ProtocolBreakdownResponse,
  AttackTypeBreakdownResponse,
  TopAttacksResponse,
  RefreshStatusResponse,
  RefreshResponse,
} from '../types';
import {
  getAttacks,
  getSummaryStats,
  getTimelineData,
  getProtocolBreakdown,
  getAttackTypeBreakdown,
  getTopAttacks,
  exportToCSV as exportAttacksToCSV,
  insertAttacks,
  logRefresh,
} from './supabase';
import { scrapeLeaderboard as scrapeRektLeaderboard } from './rektScraper';
import { processAttackData } from './llmProcessor';
import { filterDuplicates } from './duplicateChecker';

export const attacksApi = {
  getAttacks: async (params?: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    protocol?: string;
    attack_type?: string;
  }): Promise<AttackResponse> => {
    return await getAttacks(params);
  },

  getSummary: async (): Promise<SummaryStats> => {
    return await getSummaryStats();
  },

  getTimeline: async (params?: {
    granularity?: 'day' | 'week' | 'month';
    start_date?: string;
    end_date?: string;
  }): Promise<TimelineResponse> => {
    const timeline = await getTimelineData(params);
    return { timeline };
  },

  getProtocolBreakdown: async (): Promise<ProtocolBreakdownResponse> => {
    const protocols = await getProtocolBreakdown();
    return { protocols };
  },

  getAttackTypeBreakdown: async (): Promise<AttackTypeBreakdownResponse> => {
    const attack_types = await getAttackTypeBreakdown();
    return { attack_types };
  },

  getTopAttacks: async (limit: number = 10): Promise<TopAttacksResponse> => {
    const top_attacks = await getTopAttacks(limit);
    return { top_attacks };
  },

  exportToCSV: async (params?: {
    start_date?: string;
    end_date?: string;
    protocol?: string;
    attack_type?: string;
  }): Promise<Blob> => {
    // Fetch attacks with filters
    const result = await getAttacks({
      limit: 10000,
      start_date: params?.start_date,
      end_date: params?.end_date,
      protocol: params?.protocol,
      attack_type: params?.attack_type,
    });

    // Convert to CSV
    const csvContent = exportAttacksToCSV(result.data);
    
    // Return as Blob
    return new Blob([csvContent], { type: 'text/csv' });
  },

  getRefreshStatus: async (): Promise<RefreshStatusResponse> => {
    // Since we don't have backend, return a simple status
    // You could query refresh_logs table if needed
    return {
      status: 'not_available',
      last_refresh: undefined,
      records_fetched: undefined,
    };
  },

  scrapeRektLeaderboard: async (): Promise<RefreshResponse> => {
    try {
      // Log refresh start
      const logId = await logRefresh('running');

      // Scrape rekt.news leaderboard and article pages
      console.log('Scraping rekt.news leaderboard and article pages...');
      const rawAttacks = await scrapeRektLeaderboard();

      if (!rawAttacks || rawAttacks.length === 0) {
        await logRefresh('failed', undefined, undefined, 'No data scraped from rekt.news');
        throw new Error('Failed to scrape rekt.news');
      }

      const articlesWithContent = rawAttacks.filter(a => a.article_content).length;
      console.log(`Scraped ${rawAttacks.length} attacks (${articlesWithContent} with article content). Processing data...`);

      // Process data (using fast basic processing)
      const processedAttacks = await processAttackData(rawAttacks);

      if (!processedAttacks || processedAttacks.length === 0) {
        await logRefresh('failed', undefined, undefined, 'Processing returned no valid attacks');
        throw new Error('Processing failed');
      }

      console.log(`Processed ${processedAttacks.length} attacks. Checking for duplicates...`);

      // Check for duplicates using LLM
      const { unique, duplicates } = await filterDuplicates(processedAttacks);

      console.log(`Found ${unique.length} unique attacks and ${duplicates.length} duplicates`);

      if (duplicates.length > 0) {
        console.log('Duplicates found (will not be inserted):', duplicates.map(d => `${d.protocol_name} (${d.attack_date})`));
      }

      if (unique.length === 0) {
        await logRefresh('completed', rawAttacks.length, 0);
        return {
          status: 'completed',
          message: `Scraped ${rawAttacks.length} attacks, but all ${duplicates.length} were duplicates. No new records inserted.`,
          job_id: logId,
        };
      }

      console.log(`Inserting ${unique.length} unique attacks into database...`);

      // Clean and prepare data for insertion
      // Also deduplicate within the batch itself (in case LLM missed some or same attack appears twice in scraped data)
      type AttackData = {
        protocol_name: string;
        attack_date: string;
        attack_type: string;
        loss_amount_usd: number;
        description?: string;
        source_url?: string;
        blockchain?: string;
        data_source: string;
      };

      const cleanedDataMap = new Map<string, AttackData>();
      
      for (const attack of unique) {
        const key = `${attack.protocol_name.toLowerCase().trim()}_${attack.attack_date}`;
        // Keep the first occurrence, or update if we have more complete data
        const existing = cleanedDataMap.get(key);
        if (!existing || 
            (!existing.description && attack.description) ||
            (!existing.source_url && attack.source_url)) {
          cleanedDataMap.set(key, {
            protocol_name: attack.protocol_name,
            attack_date: attack.attack_date,
            attack_type: attack.attack_type,
            loss_amount_usd: attack.loss_amount_usd,
            description: attack.description || undefined,
            source_url: attack.source_url || undefined,
            blockchain: attack.blockchain || undefined,
            data_source: attack.data_source,
          });
        }
      }

      const cleanedData = Array.from(cleanedDataMap.values());
      console.log(`After batch deduplication: ${cleanedData.length} attacks to insert (removed ${unique.length - cleanedData.length} duplicates from batch)`);

      // Insert into database
      const result = await insertAttacks(cleanedData);

      // Log completion
      await logRefresh('completed', rawAttacks.length, result.records_inserted);

      const duplicateMessage = duplicates.length > 0 
        ? ` (${duplicates.length} duplicates skipped)` 
        : '';

      return {
        status: 'completed',
        message: `Successfully scraped ${rawAttacks.length} attacks from rekt.news (extracted content from ${articlesWithContent} articles) and inserted ${result.records_inserted} new records${duplicateMessage}`,
        job_id: logId,
      };
    } catch (error: any) {
      await logRefresh('failed', undefined, undefined, error.message || String(error));
      throw error;
    }
  },
};

