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

// ─── AI report builder and saved charts ───────────────────────────────────────

export type ChartView = 'table' | 'bar' | 'hbar' | 'line' | 'area' | 'pie' | 'donut' | 'number';

// A chart description from the fixed menu (application-maker:
// services/reports/customReport.js). The AI fills these in; the server runs them.
export type ChartControl = 'job' | 'source' | 'status' | 'gender' | 'department';

export interface CustomSpec {
  title: string;
  measure:
    | 'applicants' | 'interviews' | 'reachedStatus' | 'conversion' | 'avgDaysToStatus'
    | 'avgMatchScore' | 'avgExpectedSalary' | 'medianExpectedSalary';
  status?: string | null;
  // job, status, source, gender, department, rejectionReason, ageBand, weekday,
  // day/week/month/quarter/year, none, or "field:<form question key>".
  groupBy: string;
  splitBy?: string | null;
  filters: Record<string, unknown>;
  view: ChartView;
  sort?: string | null;
  limit?: number;
  // Numbers written on the chart.
  labels?: 'none' | 'value' | 'percent' | 'both';
  stacked?: 'none' | 'stacked' | 'percent';
  cumulative?: boolean;
  showTotal?: boolean;
  showLegend?: boolean;
  colors?: string[];
  groupOthers?: boolean;
  // Menus on the chart (only when the user asked for them).
  controls?: ChartControl[];
  jobFilter?: boolean; // older charts: same as controls: ['job']
}

export interface CustomResult {
  spec: CustomSpec;
  unit: 'count' | 'percent' | 'days' | 'score' | 'money';
  timeGrouped: boolean;
  groupLabel?: string | null;
  categories: string[];
  series: { name: string; data: number[] }[];
  columns: string[];
  rows: (string | number)[][];
  total: number;
  counted: number;
  // Notes about the data, sent when a chart is re-run.
  dataNotes?: AiNote[];
  controlOptions?: {
    source: string[];
    status: string[];
    gender: string[];
    department: { id: string; name: string }[];
  };
}

// A note the AI (or the server, for "data") adds to an answer.
export interface AiNote {
  type: 'limitation' | 'suggestion' | 'assumption' | 'data';
  text: string;
  // For suggestions: the follow-up message that applies it.
  tryMessage?: string;
}

export interface ReportWidget {
  _id: string;
  companyId: string;
  title: string;
  spec: CustomSpec;
  view: ChartView;
  order: number;
  createdAt: string;
}

const call = async <T>(fn: () => Promise<{ data: { data: T } }>): Promise<T> => {
  try {
    const { data } = await fn();
    return data.data;
  } catch (error: any) {
    throw new ApiError(getErrorMessage(error), error?.response?.status);
  }
};

export const reportBuilderService = {
  // days: the Reports page's date range; every chart follows it.
  ask: (p: { companyId: string; message: string; previousSpec?: CustomSpec | null; locale: string; days: number }) =>
    call<{ reply: string; notes?: AiNote[]; spec: CustomSpec | null; result: CustomResult | null }>(() => axios.post('/reports/ai/ask', p)),
  explain: (p: { companyId: string; spec: CustomSpec; locale: string; days: number }) =>
    call<{ insights: string[] }>(() => axios.post('/reports/ai/explain', p)),
  run: (p: { companyId: string; spec: CustomSpec; locale: string; days: number }) =>
    call<CustomResult>(() => axios.post('/reports/custom/run', p)),
  widgets: (companyId: string) =>
    call<ReportWidget[]>(() => axios.get('/users/me/report-widgets', { params: { companyId } })),
  saveWidget: (p: { companyId: string; title: string; spec: CustomSpec; view: ChartView }) =>
    call<ReportWidget>(() => axios.post('/users/me/report-widgets', p)),
  updateWidget: (id: string, p: { title?: string; view?: ChartView; order?: number }) =>
    call<ReportWidget>(() => axios.patch(`/users/me/report-widgets/${id}`, p)),
  deleteWidget: (id: string) => call<{ _id: string }>(() => axios.delete(`/users/me/report-widgets/${id}`)),
};
