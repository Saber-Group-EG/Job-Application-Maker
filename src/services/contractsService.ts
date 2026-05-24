import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';

// ===== Types =====
export type ContractType =
  | 'permanent'
  | 'fixed-term'
  | 'freelance'
  | 'probation';
export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'signed'
  | 'rejected'
  | 'expired';

export interface BilingualField {
  en: string | null;
  ar: string | null;
}

export interface Benefit {
  _id?: string;
  label: BilingualField;
  value: BilingualField | null;
}

export interface ContractSectionItem {
  _id?: string;
  en: string;
  ar: string;
}

export interface ContractSection {
  _id?: string;
  title: BilingualField;
  items: ContractSectionItem[];
  displayOrder: number;
}

export interface JobContract {
  _id: string;
  companyId: { _id: string; name: string; logoPath?: string } | string;
  applicantId?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    applicantNo?: string;
  } | null;
  jobPositionId?: {
    _id: string;
    title: string;
    jobCode?: string;
  } | null;
  offerId?: {
    _id: string;
    position: string;
    status: string;
    sentAt: string | null;
  } | null;
  isTemplate: boolean;
  contractType: ContractType;
  position: BilingualField;
  startDate: string;
  endDate: string | null;
  probationPeriod: number | null;
  salary: { basic: number | null; currency: string };
  benefits: Benefit[];
  sections: ContractSection[];
  status: ContractStatus;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  notes: BilingualField | null;
  createdBy: { _id: string; fullName: string; email: string };
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedJobContracts {
  data: JobContract[];
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
}

export type CreateJobContractPayload = {
  companyId: string;
  applicantId?: string | null;
  jobPositionId?: string | null;
  offerId?: string | null;
  isTemplate?: boolean;
  contractType: ContractType;
  position: BilingualField;
  startDate: string;
  endDate?: string | null;
  probationPeriod?: number | null;
  salary?: { basic?: number | null; currency?: string };
  benefits?: Omit<Benefit, '_id'>[];
  sections?: Omit<ContractSection, '_id'>[];
  notes?: BilingualField | null;
  expiresAt?: string | null;
};

export type UpdateJobContractPayload = Partial<CreateJobContractPayload> & {
  status?: ContractStatus;
};

export type BulkCreateJobContractPayload = Omit<
  CreateJobContractPayload,
  'applicantId' | 'companyId'
> & {
  applicantIds: {
    applicantId: string;
    companyId: string;
  }[];
};

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

// ===== Service =====
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
    return this.request<JobContract>('get', `/job-contracts/${id}`);
  }

  async bulkCreateContracts(
    payload: BulkCreateJobContractPayload
  ): Promise<JobContract[]> {
    return this.request<JobContract[]>('post', '/job-contracts/bulk', payload);
  }

  async createContract(
    payload: CreateJobContractPayload
  ): Promise<JobContract> {
    return this.request<JobContract>('post', '/job-contracts', payload);
  }

  async updateContract(
    id: string,
    payload: UpdateJobContractPayload
  ): Promise<JobContract> {
    return this.request<JobContract>('put', `/job-contracts/${id}`, payload);
  }

  async updateContractStatus(
    id: string,
    status: ContractStatus
  ): Promise<JobContract> {
    return this.request<JobContract>('put', `/job-contracts/${id}/status`, {
      status,
    });
  }

  async cloneContract(id: string): Promise<JobContract> {
    return this.request<JobContract>('post', `/job-contracts/${id}/clone`);
  }

  async deleteContract(id: string): Promise<void> {
    await this.request<void>('delete', `/job-contracts/${id}`);
  }
}

export const jobContractsService = new JobContractsService();
