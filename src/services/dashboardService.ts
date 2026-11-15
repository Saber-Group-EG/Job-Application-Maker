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

export const dashboardService = {
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
