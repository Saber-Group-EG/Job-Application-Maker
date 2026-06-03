import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';

export type ContractType = 'permanent' | 'fixed-term' | 'freelance' | 'probation';
export type ContractStatus = string;

export interface JobContract {
  _id: string;
  companyId: { _id: string; name: any; logoPath?: string } | string;
  applicantId?: {
    _id: string;
    fullName?: string;
    email?: string;
    phone?: string;
    applicantNo?: string | number;
  } | null;
  jobPositionId?: {
    _id: string;
    title?: any;
    jobCode?: string;
  } | null;
  offerId?: {
    _id: string;
    position?: any;
    status?: string;
    sentAt?: string | null;
  } | null;
  isTemplate?: boolean;
  contractType?: ContractType;
  position?: any;
  startDate?: string;
  endDate?: string | null;
  probationPeriod?: number | null;
  salary?: { basic?: number | null; currency?: string };
  benefits?: any[];
  sections?: any[];
  status?: ContractStatus;
  sentAt?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  createdBy?: { _id: string; fullName?: string; email?: string };
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedJobContracts {
  data: JobContract[];
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class JobContractsService {
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    params?: any
  ): Promise<T> {
    try {
      const config = { params };
      const response =
        method === 'get' || method === 'delete'
          ? await axios[method](url, config)
          : await axios[method](url, data, config);
      return (response.data?.data ?? response.data) as T;
    } catch (error: any) {
      throw new ApiError(
        getErrorMessage(error),
        error.response?.status,
        error.response?.data?.details
      );
    }
  }

  async listContracts(params?: {
    companyId?: string[] | string;
    applicantId?: string | string[];
    isTemplate?: boolean;
    status?: ContractStatus;
    deleted?: boolean;
    PageCount?: 'all' | number;
    page?: number;
  }): Promise<PaginatedJobContracts> {
    try {
      const response = await axios.get('/job-contracts', {
        params: { deleted: false, sort: '-createdAt', ...params },
      });
      const { data, page, totalPages, pageCount, totalCount } = response.data;
      return { data, page, totalPages, pageCount, totalCount };
    } catch (error: any) {
      throw new ApiError(
        getErrorMessage(error),
        error.response?.status,
        error.response?.data?.details
      );
    }
  }

  async getContract(id: string): Promise<JobContract> {
    const result = await this.request<any>('get', `/job-contracts/${id}`);
    const resolved = result?.jobContract ?? result?.data?.jobContract ?? result?.data ?? result;
    return resolved as JobContract;
  }
}

export const jobContractsService = new JobContractsService();
