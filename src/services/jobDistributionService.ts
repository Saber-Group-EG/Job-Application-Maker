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
  googleIndexing: boolean;
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
  updateChannel: (p: { companyId: string; channelId: string; autoPost: boolean }) =>
    call<TelegramState>(() =>
      axios.patch(`/job-distribution/telegram/channels/${p.channelId}`, { companyId: p.companyId, autoPost: p.autoPost })
    ),
  removeChannel: (p: { companyId: string; channelId: string }) =>
    call<TelegramState>(() =>
      axios.delete(`/job-distribution/telegram/channels/${p.channelId}`, { params: { companyId: p.companyId } })
    ),
  jobDistribution: (jobId: string) =>
    call<{ open: boolean; distribution: JobDistributionEntry[] }>(() => axios.get(`/job-distribution/jobs/${jobId}`)),
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
