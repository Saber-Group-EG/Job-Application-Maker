// services/mailService.ts — mail history API (/mail).
import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';
import type {
  MailAssignSuggestion,
  MailCounts,
  MailListParams,
  MailListResponse,
  MailRecord,
  MailReplyPayload,
} from '../types/mail';

const wrap = async <T>(fn: () => Promise<{ data: T }>): Promise<T> => {
  try {
    return (await fn()).data;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { details?: unknown } } };
    throw new ApiError(getErrorMessage(error), err.response?.status, err.response?.data?.details);
  }
};

// Drops empty values and turns arrays/booleans into query-string form.
const toQuery = (params: MailListParams) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
  );

export const mailService = {
  list: (params: MailListParams) =>
    wrap<MailListResponse>(() => axios.get('/mail', { params: toQuery(params) })),

  counts: (params: { companyId?: string; jobPosition?: string }) =>
    wrap<{ data: MailCounts }>(() => axios.get('/mail/counts', { params: toQuery(params) })).then((r) => r.data),

  // { <applicantId>: number of emails }
  applicantCounts: (companyId?: string) =>
    wrap<{ data: Record<string, number> }>(() =>
      axios.get('/mail/applicant-counts', { params: companyId ? { companyId } : {} })
    ).then((r) => r.data),

  byApplicant: (applicantId: string) =>
    wrap<{ data: MailRecord[] }>(() => axios.get(`/mail/applicant/${applicantId}`)).then((r) => r.data),

  get: (id: string) =>
    wrap<{ result?: MailRecord; data?: MailRecord; email?: MailRecord }>(() => axios.get(`/mail/${id}`)).then(
      (r) => r.result ?? r.data ?? r.email ?? null
    ),

  attachmentUrl: (mailId: string, attachmentId: string) =>
    wrap<{ data: { url: string } }>(() => axios.get(`/mail/${mailId}/attachments/${attachmentId}`)).then(
      (r) => r.data.url
    ),

  assignSuggestions: (mailId: string, q: string) =>
    wrap<{ data: MailAssignSuggestion[] }>(() =>
      axios.get(`/mail/${mailId}/applicant-suggestions`, { params: q ? { q } : {} })
    ).then((r) => r.data),

  assign: (mailId: string, applicantId: string) =>
    wrap<{ data: MailRecord }>(() => axios.patch(`/mail/${mailId}/assign`, { applicantId })).then((r) => r.data),

  reply: (mailId: string, payload: MailReplyPayload) =>
    wrap<{ data: MailRecord }>(() => axios.post(`/mail/${mailId}/reply`, payload)).then((r) => r.data),

  remove: (mailId: string) => wrap<unknown>(() => axios.delete(`/mail/${mailId}`)),
};
