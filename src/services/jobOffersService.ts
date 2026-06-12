import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';

// ===== Types =====
export type WorkType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type OfferStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired';
export type CommissionType = 'percentage' | 'fixed';

export type BulkCreateJobOfferPayload = Omit<
  CreateJobOfferPayload,
  'applicantId' | 'companyId'
> & {
  applicantIds: {
    applicantId: string;
    companyId: string;
  }[];
};

export interface BilingualField {
  en: string;
  ar: string;
}

export interface Commission {
  _id?: string;
  label: BilingualField;
  value: number;
  type: CommissionType;
  condition: BilingualField | null;
}

export interface OfferSectionItem {
  _id?: string;
  en: string;
  ar: string;
}

export interface OfferSection {
  _id?: string;
  title: BilingualField;
  items: OfferSectionItem[];
  displayOrder: number;
}

export interface JobOffer {
  _id: string;
  companyId: { _id: string; name: string; logoPath?: string } | string;
  applicantId?: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    applicantNo?: string;
    jobPositionId?: {
      _id: string;
      title: string;
      jobCode?: string;
      companyId: { _id: string };
    } | null;
  } | null;
  isTemplate: boolean;
  position: BilingualField;
  workType: WorkType;
  workHours: BilingualField;
  salary: { basic: number | null; currency: string };
  commissions: Commission[];
  sections: OfferSection[];
  status: OfferStatus;
  sentAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  notes: BilingualField | null;
  createdBy: { _id: string; fullName: string; email: string };
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastEmailSentAt: string | null;
}

export interface PaginatedJobOffers {
  data: JobOffer[];
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
}

export type CreateJobOfferPayload = {
  companyId: string;
  applicantId?: string | null;
  jobPositionId?: string | null;
  isTemplate?: boolean;
  position: BilingualField;
  workType: WorkType;
  workHours?: BilingualField;
  salary?: { basic?: number | null; currency?: string };
  commissions?: Omit<Commission, '_id'>[];
  sections?: Omit<OfferSection, '_id'>[];
  notes?: BilingualField | null;
  expiresAt?: string | null;
};

export type UpdateJobOfferPayload = Partial<CreateJobOfferPayload> & {
  status?: OfferStatus;
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
class JobOffersService {
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

  async listOffers(params?: {
    companyId?: string | string[];
    applicantId?: string;
    isTemplate?: boolean;
    status?: OfferStatus;
    deleted?: boolean;
    PageCount?: 'all' | number;
    page?: number;
  }): Promise<PaginatedJobOffers> {
    try {
      const response = await axios.get('/job-offers', {
        params: { deleted: false, sort: '-createdAt', ...params },
      });
      // backend: { message, page, totalPages, pageCount, totalCount, data }
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

  async getOffer(id: string): Promise<JobOffer> {
    return this.request<JobOffer>('get', `/job-offers/${id}`);
  }

  async createOffer(payload: CreateJobOfferPayload): Promise<JobOffer> {
    return this.request<JobOffer>('post', '/job-offers', payload);
  }

  async updateOffer(
    id: string,
    payload: UpdateJobOfferPayload
  ): Promise<JobOffer> {
    return this.request<JobOffer>('put', `/job-offers/${id}`, payload);
  }

  async updateOfferStatus(id: string, status: OfferStatus): Promise<JobOffer> {
    return this.request<JobOffer>('put', `/job-offers/${id}/status`, {
      status,
    });
  }

  async cloneOffer(id: string): Promise<JobOffer> {
    return this.request<JobOffer>('post', `/job-offers/${id}/clone`);
  }

  async deleteOffer(id: string): Promise<void> {
    await this.request<void>('delete', `/job-offers/${id}`);
  }

  async bulkCreateOffers(
    payload: BulkCreateJobOfferPayload
  ): Promise<JobOffer[]> {
    return this.request<JobOffer[]>('post', '/job-offers/bulk', payload);
  }
}

export const jobOffersService = new JobOffersService();
