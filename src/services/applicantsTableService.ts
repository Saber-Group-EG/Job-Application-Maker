import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';

// One row of the applicants table, shaped by the server
// (application-maker: services/applicantTable). Derived values (salary text,
// score, reasons, previous status…) come precomputed.
export interface ApplicantTableRow {
  _id: string;
  applicantNo?: number;
  profilePhoto?: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  companyId: string;
  jobPositionId: { _id: string; companyId: { _id: string; name?: { en?: string; ar?: string } } };
  jobPositionNameSnapshot?: { en?: string; ar?: string };
  expectedSalary?: number;
  expectedSalaryDisplay: string;
  sscore: number | null;
  matchScore?: { score?: number; reasoning?: string };
  status: string;
  previousStatus: string;
  rejectionReasons: string[];
  lastComment: { comment: string; commentedByName: string } | null;
  submittedAt?: string;
  isSeen: boolean;
  isDuplicated: boolean;
  cvFilePath: string | null;
}

export interface ApplicantTableRequest {
  companyIds?: string[];
  columnFilters: Array<{ id: string; value: unknown }>;
  excludeColumns: string[];
  customFilters: unknown[];
  globalFilter: string;
  companyFilterValue?: string | string[] | null;
  onlyStatus?: string | string[];
  onlyJobPositions?: string[];
  search?: string;
  sorting: Array<{ id: string; desc: boolean }>;
  pageIndex: number;
  pageSize: number;
  locale: string;
}

export interface ApplicantTableResponse {
  rows: ApplicantTableRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
  ids: string[];
  facets: Record<string, Record<string, number>>;
  genderOptions: string[];
  jobCounts: Record<string, number>;
  rejectionReasonOptions: string[];
  statusValues: string[];
  duplicateCount?: number;
  salaryRange: { min: number; max: number };
}

const companyParams = (companyIds?: string[]) =>
  companyIds?.length ? { companyId: companyIds.join(',') } : undefined;

const toApiError = (error: any) =>
  new ApiError(getErrorMessage(error), error?.response?.status);

export const applicantsTableService = {
  async query({ companyIds, ...body }: ApplicantTableRequest): Promise<ApplicantTableResponse> {
    try {
      const { data } = await axios.post('/applicants/table', body, { params: companyParams(companyIds) });
      return data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Rows for selected applicants that aren't on the loaded pages.
  async rowsByIds(ids: string[], companyIds?: string[], search?: string): Promise<ApplicantTableRow[]> {
    if (!ids.length) return [];
    try {
      const { data } = await axios.post('/applicants/table/rows', { ids, search }, { params: companyParams(companyIds) });
      return data.rows ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Full applicant records (populated like GET /applicants) for export.
  async fullByIds(ids: string[], companyIds?: string[], search?: string): Promise<any[]> {
    if (!ids.length) return [];
    try {
      const { data } = await axios.post('/applicants/table/full', { ids, search }, { params: companyParams(companyIds) });
      return data.data ?? [];
    } catch (error) {
      throw toApiError(error);
    }
  },
};
