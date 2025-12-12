import axios from 'axios';
import type {
  AttackResponse,
  SummaryStats,
  TimelineResponse,
  ProtocolBreakdownResponse,
  AttackTypeBreakdownResponse,
  TopAttacksResponse,
  RefreshStatusResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const attacksApi = {
  getAttacks: async (params?: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    protocol?: string;
    attack_type?: string;
  }): Promise<AttackResponse> => {
    const response = await apiClient.get('/attacks', { params });
    return response.data;
  },

  getSummary: async (): Promise<SummaryStats> => {
    const response = await apiClient.get('/attacks/summary');
    return response.data;
  },

  getTimeline: async (params?: {
    granularity?: 'day' | 'week' | 'month';
    start_date?: string;
    end_date?: string;
  }): Promise<TimelineResponse> => {
    const response = await apiClient.get('/attacks/timeline', { params });
    return response.data;
  },

  getProtocolBreakdown: async (): Promise<ProtocolBreakdownResponse> => {
    const response = await apiClient.get('/attacks/by-protocol');
    return response.data;
  },

  getAttackTypeBreakdown: async (): Promise<AttackTypeBreakdownResponse> => {
    const response = await apiClient.get('/attacks/by-type');
    return response.data;
  },

  getTopAttacks: async (limit: number = 10): Promise<TopAttacksResponse> => {
    const response = await apiClient.get('/attacks/top', { params: { limit } });
    return response.data;
  },

  exportToCSV: async (params?: {
    start_date?: string;
    end_date?: string;
    protocol?: string;
    attack_type?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get('/attacks/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getRefreshStatus: async (): Promise<RefreshStatusResponse> => {
    const response = await apiClient.get('/attacks/refresh/status');
    return response.data;
  },
};

export default apiClient;

