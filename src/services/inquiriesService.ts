import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';

export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export interface InquiryAttachment {
  url: string;
  filename?: string;
  size?: number;
}

export interface Inquiry {
  _id: string;
  companyId?: { _id: string; name: string } | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: InquiryAttachment[];
  status: InquiryStatus;
  respondedBy?: { _id: string; email: string; fullName: string } | null;
  createdAt: string;
  deleted: boolean;
  comment?: string;
}

export interface CreateInquiryPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments?: InquiryAttachment[];
  companyId?: string;
}

export interface UpdateInquiryPayload {
  status?: InquiryStatus;
  respondedBy?: string | null;
  comment?: string;
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

class InquiriesService {
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

  async getAll(params?: {
    status?: InquiryStatus;
    deleted?: boolean;
    sort?: string;
  }): Promise<Inquiry[]> {
    return this.request<Inquiry[]>('get', '/inquiries', undefined, {
      deleted: false,
      sort: '-createdAt',
      ...params,
    });
  }

  async getById(id: string): Promise<Inquiry> {
    return this.request<Inquiry>('get', `/inquiries/${id}`);
  }

  async create(payload: CreateInquiryPayload): Promise<Inquiry> {
    return this.request<Inquiry>('post', '/public/inquiries', payload);
  }

  async createAuthenticated(payload: CreateInquiryPayload): Promise<Inquiry> {
    return this.request<Inquiry>('post', '/public/inquiries', payload);
  }

  async update(id: string, payload: UpdateInquiryPayload): Promise<Inquiry> {
    return this.request<Inquiry>('put', `/inquiries/${id}`, payload);
  }

  async delete(id: string): Promise<void> {
    await this.request<void>('delete', `/inquiries/${id}`);
  }
}

export const inquiriesService = new InquiriesService();
