import { useQuery } from '@tanstack/react-query';
import { attacksApi } from '../services/api';

export const useAttacks = (params?: {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  protocol?: string;
  attack_type?: string;
}) => {
  return useQuery({
    queryKey: ['attacks', params],
    queryFn: () => attacksApi.getAttacks(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSummaryStats = () => {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => attacksApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTimeline = (params?: {
  granularity?: 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: ['timeline', params],
    queryFn: () => attacksApi.getTimeline(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProtocolBreakdown = () => {
  return useQuery({
    queryKey: ['protocol-breakdown'],
    queryFn: () => attacksApi.getProtocolBreakdown(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAttackTypeBreakdown = () => {
  return useQuery({
    queryKey: ['attack-type-breakdown'],
    queryFn: () => attacksApi.getAttackTypeBreakdown(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopAttacks = (limit: number = 10) => {
  return useQuery({
    queryKey: ['top-attacks', limit],
    queryFn: () => attacksApi.getTopAttacks(limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRefreshStatus = () => {
  return useQuery({
    queryKey: ['refresh-status'],
    queryFn: () => attacksApi.getRefreshStatus(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

