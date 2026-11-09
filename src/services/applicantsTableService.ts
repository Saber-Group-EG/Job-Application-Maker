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
  source?: string;
  companyId: string;
  jobPositionId: {
    _id: string;
    title?: { en?: string; ar?: string };
    companyId: { _id: string; name?: { en?: string; ar?: string } };
  };
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
  createdAt?: string;
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
  sourceOptions?: string[];
  jobCounts: Record<string, number>;
  rejectionReasonOptions: string[];
  statusValues: string[];
  duplicateCount?: number;
  salaryRange: { min: number; max: number };
  // Set by queryAll when the result set was too large to load in full.
  truncated?: boolean;
  // True when rows holds every match rather than one server page. Lets the
  // views tell a quick-filter result apart from a leftover page placeholder.
  allRows?: boolean;
}

// The "unseen applicants" quick filter needs every matching row before it can
// filter in the browser. Fetch it in pages and stop at a safe ceiling so one
// click cannot pull an unbounded result set into memory.
const ALL_ROWS_PAGE_SIZE = 200;
const ALL_ROWS_MAX = 5000;
const ALL_ROWS_CONCURRENCY = 4;

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

  // Every row matching the request, assembled from server pages. Used by
  // quick filters that must filter on the client (the API has no unseen
  // filter). Returns truncated: true when the match set was not fully loaded.
  async queryAll(request: ApplicantTableRequest): Promise<ApplicantTableResponse> {
    const fetchPage = async (pageIndex: number) => {
      const page = await this.query({ ...request, pageIndex, pageSize: ALL_ROWS_PAGE_SIZE });
      return page.rows;
    };

    const first = await this.query({ ...request, pageIndex: 0, pageSize: ALL_ROWS_PAGE_SIZE });
    const total = first.total;
    // Some servers cap pageSize; follow whatever the first page actually held.
    const pageSize = first.rows.length > 0 ? first.rows.length : ALL_ROWS_PAGE_SIZE;
    const pageCount = Math.ceil(Math.min(total, ALL_ROWS_MAX) / pageSize);
    const pages: ApplicantTableRow[][] = [first.rows];

    // The first page reveals the size of the set, so the rest can go out a few
    // at a time instead of one slow round trip after another.
    for (let start = 1; start < pageCount; start += ALL_ROWS_CONCURRENCY) {
      const indexes: number[] = [];
      for (let i = start; i < Math.min(start + ALL_ROWS_CONCURRENCY, pageCount); i += 1) {
        indexes.push(i);
      }
      pages.push(...(await Promise.all(indexes.map(fetchPage))));
    }

    const rows: ApplicantTableRow[] = [];
    const seen = new Set<string>();
    pages.forEach((page) => {
      page.forEach((row) => {
        if (seen.has(row._id)) return;
        seen.add(row._id);
        rows.push(row);
      });
    });

    return {
      ...first,
      rows,
      total: rows.length,
      pageIndex: 0,
      pageSize: rows.length,
      ids: rows.map((row) => row._id),
      // A short read means the server did not return everything we asked for.
      truncated: total > rows.length,
      allRows: true,
    };
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
