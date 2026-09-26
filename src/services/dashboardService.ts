import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';

type Bilingual = string | { en?: string; ar?: string };
type Stat = { avg: number; median: number; count: number } | null;

export interface DashboardOverview {
  attention: {
    unseenApplicants?: number;
    interviewsToday?: number;
    unassignedReplies?: number;
    offersAwaiting?: number;
    contractsAwaiting?: number;
  };
  trend: { days: number; series: { date: string; count: number }[]; current: number; previous: number } | null;
  jobs:
    | {
        _id: string;
        title: Bilingual;
        companyId: string;
        total: number;
        newThisWeek: number;
        interviewed: number;
        offered: number | null;
        hired: number;
        lastApplicationAt: string | null;
        stale: boolean;
      }[]
    | null;
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
  speed: {
    windowDays: number;
    overall: { toInterview: Stat; toOffer?: Stat; toHire?: Stat };
    perJob: { _id: string; title: Bilingual; applicants: number; toInterview: Stat; toOffer?: Stat; toHire?: Stat }[];
  } | null;
  planUsage:
    | {
        companyId: string;
        requests: { used: number; limit: number; planName?: string; unlimited: boolean } | null;
        ai: { used: number; limit: number } | null;
      }[]
    | null;
}

export const dashboardService = {
  async overview(params: { companyIds?: string[]; days: number }): Promise<DashboardOverview> {
    try {
      const { data } = await axios.get('/dashboard/overview', {
        params: {
          ...(params.companyIds?.length ? { companyId: params.companyIds.join(',') } : {}),
          days: params.days,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return data.data;
    } catch (error: any) {
      throw new ApiError(getErrorMessage(error), error?.response?.status);
    }
  },
};
