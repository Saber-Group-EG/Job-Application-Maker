import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { ApiError } from './companiesService';
import type { JobDistributionEntry } from '../types/jobPositions';

// Job distribution (application-maker: controllers/jobDistribution.controller.js):
// the company's Telegram channels the platform bot posts jobs to, posting a
// job now, and AI-written posts for the platforms we can't post to ourselves.

export interface TelegramChannel {
  _id: string;
  chatId: string;
  title: string;
  username: string | null;
  type: string;
  autoPost: boolean;
  connectedAt: string;
  lastPostAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface TelegramState {
  configured: boolean;
  bot: { username: string; name: string } | null;
  error: string | null;
  allowedByPlan: boolean;
  planReason: string | null;
  channels: TelegramChannel[];
  /** A channel waiting for its ownership code to be posted in it. */
  pending: TelegramPending | null;
  googleIndexing: boolean;
}

export interface TelegramPending {
  chatId: string;
  title: string;
  username: string | null;
  type: string;
  code: string;
  expiresAt: string;
}

export interface MetaPage {
  _id: string;
  pageId: string;
  name: string;
  instagram: { id: string; username: string } | null;
  facebookAutoPost: boolean;
  instagramAutoPost: boolean;
  lastPostAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface MetaState {
  configured: boolean;
  allowedByPlan: boolean;
  planReason: string | null;
  connected: boolean;
  userName: string;
  connectedAt: string | null;
  pages: MetaPage[];
}

export interface SocialImage {
  url: string;
  language: string;
  createdAt: string;
}

export type SharePlatform = 'linkedin' | 'facebook' | 'instagram' | 'whatsapp' | 'x' | 'telegram';

export interface JobPostsResult {
  language: 'en' | 'ar';
  posts: Partial<Record<SharePlatform, string>>;
  links: Partial<Record<SharePlatform, string>>;
}

export interface TelegramPostResult {
  results: { chatId: string; title: string; ok: boolean; url?: string | null; error?: string }[];
  distribution: JobDistributionEntry[];
}

const call = async <T>(fn: () => Promise<{ data: { data: T } }>): Promise<T> => {
  try {
    const { data } = await fn();
    return data.data;
  } catch (error: any) {
    throw new ApiError(getErrorMessage(error), error?.response?.status);
  }
};

export const jobDistributionService = {
  telegram: (companyId: string) =>
    call<TelegramState>(() => axios.get('/job-distribution/telegram', { params: { companyId } })),
  addChannel: (p: { companyId: string; chat: string; autoPost?: boolean }) =>
    call<TelegramState>(() => axios.post('/job-distribution/telegram/channels', p)),
  checkPending: (companyId: string) =>
    call<TelegramState>(() => axios.post('/job-distribution/telegram/pending/check', { companyId })),
  cancelPending: (companyId: string) =>
    call<TelegramState>(() => axios.delete('/job-distribution/telegram/pending', { params: { companyId } })),
  updateChannel: (p: { companyId: string; channelId: string; autoPost: boolean }) =>
    call<TelegramState>(() =>
      axios.patch(`/job-distribution/telegram/channels/${p.channelId}`, { companyId: p.companyId, autoPost: p.autoPost })
    ),
  removeChannel: (p: { companyId: string; channelId: string }) =>
    call<TelegramState>(() =>
      axios.delete(`/job-distribution/telegram/channels/${p.channelId}`, { params: { companyId: p.companyId } })
    ),
  jobDistribution: (jobId: string) =>
    call<{ open: boolean; distribution: JobDistributionEntry[]; socialImage: SocialImage | null }>(() =>
      axios.get(`/job-distribution/jobs/${jobId}`)
    ),
  meta: (companyId: string) => call<MetaState>(() => axios.get('/job-distribution/meta', { params: { companyId } })),
  metaConnectUrl: (p: { companyId: string; redirectUri: string }) =>
    call<{ url: string }>(() => axios.post('/job-distribution/meta/connect', p)),
  metaFinish: (p: { code: string; state: string }) =>
    call<MetaState & { companyId: string }>(() => axios.post('/job-distribution/meta/callback', p)),
  updateMetaPage: (p: { companyId: string; pageId: string; facebookAutoPost?: boolean; instagramAutoPost?: boolean }) =>
    call<MetaState>(() => axios.patch(`/job-distribution/meta/pages/${p.pageId}`, p)),
  disconnectMeta: (companyId: string) =>
    call<MetaState>(() => axios.delete('/job-distribution/meta', { params: { companyId } })),
  postToMeta: (p: { jobId: string; pageId: string; platform: 'facebook' | 'instagram' }) =>
    call<{ result: { ok?: boolean; url?: string | null }; distribution: JobDistributionEntry[] }>(() =>
      axios.post(`/job-distribution/jobs/${p.jobId}/meta`, { pageId: p.pageId, platform: p.platform })
    ),
  saveSocialImage: (p: { jobId: string; url: string; language: string }) =>
    call<{ socialImage: SocialImage }>(() =>
      axios.put(`/job-distribution/jobs/${p.jobId}/social-image`, { url: p.url, language: p.language })
    ),
  postToTelegram: (jobId: string, chatId?: string) =>
    call<TelegramPostResult>(() => axios.post(`/job-distribution/jobs/${jobId}/telegram`, chatId ? { chatId } : {})),
  writePosts: (p: {
    jobId: string;
    companyId: string;
    platforms: SharePlatform[];
    language?: 'en' | 'ar';
    tone?: 'professional' | 'friendly' | 'exciting';
  }) =>
    call<JobPostsResult>(() =>
      axios.post(`/job-distribution/jobs/${p.jobId}/post-text`, {
        companyId: p.companyId,
        platforms: p.platforms,
        language: p.language,
        tone: p.tone,
      })
    ),
};
