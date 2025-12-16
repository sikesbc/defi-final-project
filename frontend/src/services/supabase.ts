import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Attack,
  AttackResponse,
  SummaryStats,
  TimelinePoint,
  ProtocolStats,
  AttackTypeStats,
  TopAttack,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client only if env vars are present, otherwise create a dummy client that will fail gracefully
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Get attacks with optional filters
 */
export async function getAttacks(params?: {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  protocol?: string;
  attack_type?: string;
}): Promise<AttackResponse> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return { data: [], count: 0 };
  }
  try {
    let query = supabase
      .from('attacks')
      .select('*', { count: 'exact' });

    if (params?.start_date) {
      query = query.gte('attack_date', params.start_date);
    }
    if (params?.end_date) {
      query = query.lte('attack_date', params.end_date);
    }
    if (params?.protocol) {
      query = query.ilike('protocol_name', `%${params.protocol}%`);
    }
    if (params?.attack_type) {
      query = query.eq('attack_type', params.attack_type);
    }

    query = query
      .order('attack_date', { ascending: false })
      .range(
        params?.offset || 0,
        (params?.offset || 0) + (params?.limit || 1000) - 1
      );

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching attacks:', error);
    return { data: [], count: 0 };
  }
}

/**
 * Get summary statistics
 */
export async function getSummaryStats(): Promise<SummaryStats> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return {
      total_attacks: 0,
      total_losses_usd: 0,
      attacks_last_30_days: 0,
      losses_last_30_days: 0,
      average_loss_per_attack: 0,
    };
  }
  try {
    const { data, error } = await supabase
      .from('attacks')
      .select('*');

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_attacks: 0,
        total_losses_usd: 0,
        attacks_last_30_days: 0,
        losses_last_30_days: 0,
        average_loss_per_attack: 0,
        most_targeted_protocol: undefined,
        most_common_attack_type: undefined,
      };
    }

    // Calculate stats
    const total_attacks = data.length;
    const total_losses = data.reduce((sum, attack) => sum + (parseFloat(String(attack.loss_amount_usd)) || 0), 0);

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAttacks = data.filter(
      (attack) => new Date(attack.attack_date) >= thirtyDaysAgo
    );
    const attacks_last_30 = recentAttacks.length;
    const losses_last_30 = recentAttacks.reduce(
      (sum, attack) => sum + (parseFloat(String(attack.loss_amount_usd)) || 0),
      0
    );

    // Average
    const avg_loss = total_attacks > 0 ? total_losses / total_attacks : 0;

    // Most targeted protocol
    const protocolCounts: Record<string, number> = {};
    data.forEach((attack) => {
      const protocol = attack.protocol_name;
      protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
    });
    const most_targeted = Object.keys(protocolCounts).length > 0
      ? Object.entries(protocolCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

    // Most common attack type
    const typeCounts: Record<string, number> = {};
    data.forEach((attack) => {
      const attackType = attack.attack_type;
      typeCounts[attackType] = (typeCounts[attackType] || 0) + 1;
    });
    const most_common_type = Object.keys(typeCounts).length > 0
      ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

    return {
      total_attacks,
      total_losses_usd: total_losses,
      attacks_last_30_days: attacks_last_30,
      losses_last_30_days: losses_last_30,
      average_loss_per_attack: avg_loss,
      most_targeted_protocol: most_targeted,
      most_common_attack_type: most_common_type,
    };
  } catch (error) {
    console.error('Error getting summary stats:', error);
    return {
      total_attacks: 0,
      total_losses_usd: 0,
      attacks_last_30_days: 0,
      losses_last_30_days: 0,
      average_loss_per_attack: 0,
    };
  }
}

/**
 * Get timeline data grouped by period
 */
export async function getTimelineData(params?: {
  granularity?: 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}): Promise<TimelinePoint[]> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return [];
  }
  try {
    let query = supabase
      .from('attacks')
      .select('attack_date,loss_amount_usd');

    if (params?.start_date) {
      query = query.gte('attack_date', params.start_date);
    }
    if (params?.end_date) {
      query = query.lte('attack_date', params.end_date);
    }

    const { data, error } = await query.order('attack_date', { ascending: true });

    if (error) throw error;
    if (!data) return [];

    // Group by period
    const timeline: Record<string, { attack_count: number; total_loss_usd: number }> = {};

    data.forEach((attack) => {
      const dateStr = attack.attack_date;
      let period: string;

      if (params?.granularity === 'month') {
        period = dateStr.substring(0, 7); // YYYY-MM
      } else if (params?.granularity === 'week') {
        // Group by week (simplified - using month for now)
        period = dateStr.substring(0, 7);
      } else {
        // day
        period = dateStr;
      }

      if (!timeline[period]) {
        timeline[period] = { attack_count: 0, total_loss_usd: 0 };
      }

      timeline[period].attack_count += 1;
      timeline[period].total_loss_usd += parseFloat(String(attack.loss_amount_usd)) || 0;
    });

    // Format response
    return Object.entries(timeline)
      .map(([period, data]) => ({
        period,
        attack_count: data.attack_count,
        total_loss_usd: data.total_loss_usd,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    console.error('Error getting timeline data:', error);
    return [];
  }
}

/**
 * Get protocol breakdown statistics
 */
export async function getProtocolBreakdown(): Promise<ProtocolStats[]> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('attacks')
      .select('protocol_name,loss_amount_usd');

    if (error) throw error;
    if (!data) return [];

    // Group by protocol
    const protocols: Record<string, { attack_count: number; total_loss_usd: number }> = {};
    let total_loss = 0;

    data.forEach((attack) => {
      const protocol = attack.protocol_name;
      const loss = parseFloat(String(attack.loss_amount_usd)) || 0;

      if (!protocols[protocol]) {
        protocols[protocol] = { attack_count: 0, total_loss_usd: 0 };
      }

      protocols[protocol].attack_count += 1;
      protocols[protocol].total_loss_usd += loss;
      total_loss += loss;
    });

    // Calculate percentages and format
    const result: ProtocolStats[] = Object.entries(protocols).map(([protocol_name, data]) => ({
      protocol_name,
      attack_count: data.attack_count,
      total_loss_usd: data.total_loss_usd,
      percentage: total_loss > 0 ? Math.round((data.total_loss_usd / total_loss) * 100 * 100) / 100 : 0,
    }));

    // Sort by total loss
    result.sort((a, b) => b.total_loss_usd - a.total_loss_usd);

    return result;
  } catch (error) {
    console.error('Error getting protocol breakdown:', error);
    return [];
  }
}

/**
 * Get attack type breakdown statistics
 */
export async function getAttackTypeBreakdown(): Promise<AttackTypeStats[]> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('attacks')
      .select('attack_type,loss_amount_usd');

    if (error) throw error;
    if (!data) return [];

    // Group by attack type
    const attackTypes: Record<string, { attack_count: number; total_loss_usd: number }> = {};
    let total_loss = 0;

    data.forEach((attack) => {
      const attackType = attack.attack_type;
      const loss = parseFloat(String(attack.loss_amount_usd)) || 0;

      if (!attackTypes[attackType]) {
        attackTypes[attackType] = { attack_count: 0, total_loss_usd: 0 };
      }

      attackTypes[attackType].attack_count += 1;
      attackTypes[attackType].total_loss_usd += loss;
      total_loss += loss;
    });

    // Calculate percentages and format
    const result: AttackTypeStats[] = Object.entries(attackTypes).map(([attack_type, data]) => ({
      attack_type,
      attack_count: data.attack_count,
      total_loss_usd: data.total_loss_usd,
      percentage: total_loss > 0 ? Math.round((data.total_loss_usd / total_loss) * 100 * 100) / 100 : 0,
    }));

    // Sort by total loss
    result.sort((a, b) => b.total_loss_usd - a.total_loss_usd);

    return result;
  } catch (error) {
    console.error('Error getting attack type breakdown:', error);
    return [];
  }
}

/**
 * Get top attacks by loss amount
 */
export async function getTopAttacks(limit: number = 10): Promise<TopAttack[]> {
  if (!supabase) {
    console.error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('attacks')
      .select('protocol_name,attack_date,loss_amount_usd,attack_type,description,source_url')
      .order('loss_amount_usd', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []) as TopAttack[];
  } catch (error) {
    console.error('Error getting top attacks:', error);
    return [];
  }
}

/**
 * Export attacks to CSV format
 */
export function exportToCSV(attacks: Attack[]): string {
  const headers = [
    'Protocol Name',
    'Attack Date',
    'Attack Type',
    'Loss Amount (USD)',
    'Description',
    'Source URL',
    'Blockchain',
    'Data Source',
  ];

  const rows = attacks.map((attack) => [
    attack.protocol_name || '',
    attack.attack_date || '',
    attack.attack_type || '',
    String(attack.loss_amount_usd || 0),
    attack.description || '',
    attack.source_url || '',
    attack.blockchain || '',
    attack.data_source || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Insert attacks into the database (with upsert)
 */
export async function insertAttacks(attacks: Array<{
  protocol_name: string;
  attack_date: string;
  attack_type: string;
  loss_amount_usd: number;
  description?: string;
  source_url?: string;
  blockchain?: string;
  data_source: string;
}>): Promise<{ records_inserted: number }> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('attacks')
      .upsert(attacks, {
        onConflict: 'protocol_name,attack_date',
      })
      .select();

    if (error) throw error;

    return {
      records_inserted: data?.length || 0,
    };
  } catch (error) {
    console.error('Error inserting attacks:', error);
    throw error;
  }
}

/**
 * Log a refresh operation
 */
export async function logRefresh(
  status: string,
  records_fetched?: number,
  records_inserted?: number,
  error_message?: string
): Promise<string | undefined> {
  if (!supabase) {
    console.warn('Supabase is not configured. Cannot log refresh.');
    return undefined;
  }

  try {
    const logData: any = {
      refresh_started_at: new Date().toISOString(),
      status,
    };

    if (status === 'completed') {
      logData.refresh_completed_at = new Date().toISOString();
    }

    if (records_fetched !== undefined) {
      logData.records_fetched = records_fetched;
    }

    if (records_inserted !== undefined) {
      logData.records_inserted = records_inserted;
    }

    if (error_message) {
      logData.error_message = error_message;
    }

    const { data, error } = await supabase
      .from('refresh_logs')
      .insert(logData)
      .select()
      .single();

    if (error) throw error;

    return data?.id;
  } catch (error) {
    console.error('Error logging refresh:', error);
    return undefined;
  }
}

