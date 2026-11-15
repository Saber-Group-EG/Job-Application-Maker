import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';

type Bilingual = string | { en?: string; ar?: string };
type Stat = { avg: number; median: number; count: number } | null;

// The hiring path report for one company, on its own statuses
// (application-maker: services/reports/hiringPath.js).
export interface HiringReport {
  companyId: string;
  jobId: string | null;
  jobOptions: { _id: string; title: Bilingual }[];
  steps: string[];
  exits: string[];
  applied: number;
  funnel: { status: string; reached: number; pctOfPrevious: number | null; dropOffs: Record<string, number> }[];
  leftAfterApplying: Record<string, number>;
  selectionRatio: { hired: number; applied: number; pct: number | null };
  timeToFill: Stat;
  timeToHire: Stat;
  fillRate: { filled: number; openings: number; pct: number | null };
  jobs: {
    _id: string;
    title: Bilingual;
    postedAt: string;
    applicants: number;
    openings: number;
    filled: number;
    fillRate: number | null;
    daysToFill: number | null;
    daysToHire: number | null;
  }[];
}

export interface ReportsOverview {
  days: number;
  hiring: HiringReport | null;
  trend: { days: number; series: { date: string; count: number }[]; current: number; previous: number } | null;
  sources: { days: number; total: number; items: { channel: string; count: number }[] } | null;
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
  speed: {
    windowDays: number;
    overall: { toInterview: Stat; toOffer?: Stat; toContract?: Stat };
    perJob: { _id: string; title: Bilingual; applicants: number; toInterview: Stat; toOffer?: Stat; toContract?: Stat }[];
  } | null;
}

export type ReportsParams = {
  companyIds?: string[];
  days: number;
  hiringCompanyId?: string | null;
  jobId?: string | null;
};

export const reportsService = {
  async overview(params: ReportsParams): Promise<ReportsOverview> {
    try {
      const { data } = await axios.get('/reports/overview', {
        params: {
          ...(params.companyIds?.length ? { companyId: params.companyIds.join(',') } : {}),
          days: params.days,
          ...(params.hiringCompanyId ? { hiringCompanyId: params.hiringCompanyId } : {}),
          ...(params.jobId ? { jobId: params.jobId } : {}),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      return data.data;
    } catch (error: any) {
      throw new ApiError(getErrorMessage(error), error?.response?.status);
    }
  },
};
