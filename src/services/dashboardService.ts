import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';

export interface DashboardOverview {
  attention: {
    unseenApplicants?: number;
    interviewsToday?: number;
    unassignedReplies?: number;
    offersAwaiting?: number;
    contractsAwaiting?: number;
  };
  activity: {
    type: 'status' | 'comment' | 'reply' | 'offer' | 'contract';
    at: string;
    applicantId?: string | null;
    applicantName?: string;
    emailId?: string;
    status?: string;
    text?: string;
    userName?: string;
  }[];
  planUsage:
    | {
        companyId: string;
        requests: { used: number; limit: number; planName?: string; unlimited: boolean } | null;
        ai: { used: number; limit: number } | null;
      }[]
    | null;
}

export type AiUsageRange = 'cycle' | '30' | '90';

export interface AiUsageBreakdown {
  enabled: boolean;
  range: AiUsageRange;
  from: string;
  to: string;
  cycle: { start: string | null; end: string | null; used: number; limit: number };
  totals: { cost: number; calls: number; failed: number };
  features: {
    feature: string;
    cost: number;
    calls: number;
    failed: number;
    tokensIn: number;
    tokensOut: number;
    lastUsedAt: string;
  }[];
  days: { date: string; cost: number; calls: number; features: Record<string, number> }[];
}

export const dashboardService = {
  async aiUsage(params: { companyId: string; range: AiUsageRange }): Promise<AiUsageBreakdown> {
    try {
      const { data } = await axios.get('/dashboard/ai-usage', {
        params: {
          companyId: params.companyId,
          range: params.range,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return data.data;
    } catch (error: any) {
      throw new ApiError(getErrorMessage(error), error?.response?.status);
    }
  },

  async activity(params: { companyIds?: string[]; skip: number; limit?: number }): Promise<{ items: DashboardOverview['activity']; hasMore: boolean }> {
    try {
      const { data } = await axios.get('/dashboard/activity', {
        params: {
          ...(params.companyIds?.length ? { companyId: params.companyIds.join(',') } : {}),
          skip: params.skip,
          limit: params.limit ?? 20,
        },
      });
      return data.data;
    } catch (error: any) {
      throw new ApiError(getErrorMessage(error), error?.response?.status);
    }
  },

  async overview(params: { companyIds?: string[] }): Promise<DashboardOverview> {
    try {
      const { data } = await axios.get('/dashboard/overview', {
        params: {
          ...(params.companyIds?.length ? { companyId: params.companyIds.join(',') } : {}),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return data.data;
    } catch (error: any) {
      throw new ApiError(getErrorMessage(error), error?.response?.status);
    }
  },
};
