export interface Attack {
  id: string;
  protocol_name: string;
  attack_date: string;
  attack_type: string;
  loss_amount_usd: number;
  description?: string;
  source_url?: string;
  blockchain?: string;
  created_at: string;
  updated_at: string;
  data_source: string;
}

export interface AttackResponse {
  data: Attack[];
  count: number;
}

export interface SummaryStats {
  total_attacks: number;
  total_losses_usd: number;
  attacks_last_30_days: number;
  losses_last_30_days: number;
  average_loss_per_attack: number;
  most_targeted_protocol?: string;
  most_common_attack_type?: string;
}

export interface TimelinePoint {
  period: string;
  attack_count: number;
  total_loss_usd: number;
}

export interface TimelineResponse {
  timeline: TimelinePoint[];
}

export interface ProtocolStats {
  protocol_name: string;
  attack_count: number;
  total_loss_usd: number;
  percentage: number;
}

export interface ProtocolBreakdownResponse {
  protocols: ProtocolStats[];
}

export interface AttackTypeStats {
  attack_type: string;
  attack_count: number;
  total_loss_usd: number;
  percentage: number;
}

export interface AttackTypeBreakdownResponse {
  attack_types: AttackTypeStats[];
}

export interface TopAttack {
  protocol_name: string;
  attack_date: string;
  loss_amount_usd: number;
  attack_type: string;
  description?: string;
  source_url?: string;
}

export interface TopAttacksResponse {
  top_attacks: TopAttack[];
}

export interface RefreshStatusResponse {
  last_refresh?: string;
  status: string;
  records_fetched?: number;
  next_scheduled_refresh?: string;
}

export interface RefreshResponse {
  status: string;
  message: string;
  job_id?: string;
}

