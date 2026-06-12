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

export interface BilingualField {
  en: string;
  ar: string;
}

export interface Commission {
  _id?: string;
  label: string;
  value: number;
  type: CommissionType;
  condition: string | null;
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
  } | null;
  jobPositionId?: { _id: string; title: string; jobCode?: string } | null;
  isTemplate: boolean;
  position: string;
  workType: WorkType;
  workHours: string | null;
  salary: { basic: number | null; currency: string };
  commissions: Commission[];
  sections: OfferSection[];
  status: OfferStatus;
  sentAt: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  notes: string | null;
  createdBy: { _id: string; fullName: string; email: string };
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateJobOfferPayload = {
  companyId: string;
  applicantId?: string | null;
  jobPositionId?: string | null;
  isTemplate?: boolean;
  position: string;
  workType: WorkType;
  workHours?: string | null;
  salary?: { basic?: number | null; currency?: string };
  commissions?: Omit<Commission, '_id'>[];
  sections?: Omit<OfferSection, '_id'>[];
  notes?: string | null;
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
    companyId?: string;
    isTemplate?: boolean;
    status?: OfferStatus;
    deleted?: boolean;
    PageCount?: 'all' | number;
    page?: number;
  }): Promise<JobOffer[]> {
    const result = await this.request<JobOffer[]>('get', '/job-offers', undefined, { deleted: false, ...params });
    return result;
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
}

export const jobOffersService = new JobOffersService();
