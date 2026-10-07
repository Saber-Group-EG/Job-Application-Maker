// services/applicantsService.ts
import axios from '../config/axios';
import { getErrorMessage } from '../utils/errorHandler';
import { jobPositionsService } from './jobPositionsService';
import { normalizeChoicesToServer } from '../types/companies';
import type {
  Applicant,
  CreateApplicantRequest,
  UpdateApplicantRequest,
  UpdateStatusRequest,
  ScheduleInterviewRequest,
  BulkScheduleInterviewRequest,
  BulkScheduleInterviewItem,
  UpdateInterviewStatusRequest,
  AddCommentRequest,
  SendMessageRequest,
  InterviewAnswer,
  RejectionInsights,
  CandidateSummaryResult,
  StatusInsights,
  BatchStatusResult,
  BulkScheduleResult,
} from '../types/applicants';
import { ApiError } from './companiesService';

// Re-export types
export type {
  Applicant,
  CreateApplicantRequest,
  UpdateApplicantRequest,
  UpdateStatusRequest,
  ScheduleInterviewRequest,
  BulkScheduleInterviewRequest,
  BulkScheduleInterviewItem,
  UpdateInterviewStatusRequest,
  AddCommentRequest,
  SendMessageRequest,
  InterviewAnswer,
  RejectionInsights,
} from '../types/applicants';

// ===== Helper Functions =====
type RawQuestion = {
  question?: unknown;
  score?: unknown;
  achievedScore?: unknown;
  notes?: string | null;
  answerType?: InterviewAnswer['answerType'];
  choices?: unknown[];
  tags?: unknown[];
};

type Params = Record<string, unknown>;

// Serializes arrays as repeated keys (a=1&a=2), which the API expects.
const repeatKeySerializer = {
  serialize: (p: Params) => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(p)) {
      if (Array.isArray(value)) {
        for (const v of value) parts.push(`${key}=${encodeURIComponent(String(v))}`);
      } else if (value !== undefined && value !== null) {
        parts.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join('&');
  },
};

function normalizeInterviewQuestions(questions: unknown): InterviewAnswer[] {
  if (!Array.isArray(questions)) return [];

  return (questions as RawQuestion[]).map((q) => ({
    question: String(q?.question || '').trim(),
    score: Number(q?.score ?? 0),
    achievedScore: Math.max(
      0,
      Number.isFinite(Number(q?.achievedScore)) ? Number(q?.achievedScore) : 0
    ),
    notes: q?.notes ?? '',
    answerType: q?.answerType || 'text',
    choices: Array.isArray(q?.choices)
      ? (normalizeChoicesToServer(q.choices) as unknown as InterviewAnswer['choices'])
      : undefined,
    tags: Array.isArray(q?.tags) ? q.tags.map((tag) => String(tag ?? '')).filter(Boolean) : undefined,
  }));
}

type Candidate = { _id?: string; id?: string; applicant?: Candidate; interviews?: unknown[] };

// Find the applicant (or the { applicantId, interviews } result) for
// `applicantId` anywhere in a schedule-interview response.
function extractApplicantFromPayload(payload: unknown, applicantId: string): Candidate | undefined {
  const targetId = String(applicantId || '');
  const queue: Candidate[] = [];

  const pushCandidate = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushCandidate);
      return;
    }
    if (typeof value === 'object') {
      queue.push(value as Candidate);
    }
  };

  pushCandidate(payload);

  for (const candidate of queue) {
    const candidateId = String(candidate?._id || candidate?.id || '');
    if (candidateId && candidateId === targetId) {
      return candidate;
    }

    if (candidate?.applicant && typeof candidate.applicant === 'object') {
      const nestedApplicantId = String(
        candidate.applicant?._id || candidate.applicant?.id || ''
      );
      if (nestedApplicantId && nestedApplicantId === targetId) {
        return candidate.applicant;
      }
    }
  }

  return queue.find((value) => Array.isArray(value?.interviews));
}

// ===== Applicants Service =====
class ApplicantsService {
  public async request<T>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    data?: unknown,
    params?: Params,
    extraConfig?: Record<string, unknown>
  ): Promise<T> {
    try {
      const config: Record<string, unknown> = { params, ...extraConfig };
      let response;

      if (method === 'get' || method === 'delete') {
        response = await axios[method](url, config);
      } else if (method === 'patch') {
        response = await axios.patch(url, data, config);
      } else {
        response = await axios[method](url, data, config);
      }

      return response.data?.data ?? response.data;
    } catch (err) {
      const error = err as { response?: { status?: number; data?: { details?: unknown; code?: string; featurePath?: string } } };
      throw new ApiError(
        getErrorMessage(error),
        error.response?.status,
        error.response?.data?.details,
        error.response?.data?.code,
        error.response?.data?.featurePath
      );
    }
  }

  // List endpoints return an array, { data: [] }, or a paginated envelope.
  private extractApplicants(payload: unknown): Applicant[] {
    if (Array.isArray(payload)) return payload;
    const p = payload as { data?: Applicant[] | { data?: Applicant[]; docs?: Applicant[] } } | null;
    if (Array.isArray(p?.data)) return p.data;
    if (p?.data && Array.isArray(p.data.data)) return p.data.data;
    if (p?.data && Array.isArray(p.data.docs)) return p.data.docs;
    return [];
  }

  private normalizeCompanyIds(companyId?: string[]): string[] {
    if (!companyId) return [];
    return [
      ...new Set(
        companyId.map((id) => String(id || '').trim()).filter(Boolean)
      ),
    ];
  }

  private toScheduleInterviewItem(
    applicantId: string | { _id?: string; id?: string } | undefined,
    data: ScheduleInterviewRequest
  ): BulkScheduleInterviewItem {
    const rawApplicantId =
      typeof applicantId === 'object'
        ? applicantId?._id || applicantId?.id || ''
        : applicantId;

    const item: Record<string, unknown> = { applicantId: String(rawApplicantId || '').trim() };

    const allowedKeys: Array<keyof ScheduleInterviewRequest> = [
      'scheduledAt',
      'conductedBy',
      'scheduledBy',
      'description',
      'location',
      'videoLink',
      'address',
      'type',
      'notes',
      'status',
    ];

    allowedKeys.forEach((key) => {
      const value = data?.[key];
      if (value !== undefined) item[key] = value;
    });

    item.questions = normalizeInterviewQuestions(data?.questions);
    return item as BulkScheduleInterviewItem;
  }

  // ===== Public Methods =====
  async getAllApplicants(params?: {
    companyId?: string[];
    jobPositionId?: string | string[];
    status?: string | string[];
    fields?: string | string[];
    departmentId?: string[];
    skipPopulation?: boolean;
    search?: string;
  }): Promise<Applicant[]> {
    const companyIds = this.normalizeCompanyIds(params?.companyId);

    const buildQueryParams = (options?: {
      companyId?: string;
      jobPositionId?: string;
    }) => {
      const queryParams: Params = { deleted: false, PageCount: 'all' };

      if (params?.status) {
        queryParams.status = Array.isArray(params.status)
          ? params.status
          : params.status;
      }
      if (params?.fields) {
        queryParams.fields = Array.isArray(params.fields)
          ? params.fields.join(',')
          : params.fields;
      }
      if (options?.companyId) queryParams.companyId = options.companyId;
      if (options?.jobPositionId)
        queryParams.jobPositionId = options.jobPositionId;
      if (params?.departmentId?.length)
        queryParams.departmentId = params.departmentId.join(',');
      if (params?.search) queryParams.search = params.search;
      if (params?.skipPopulation) queryParams.skipPopulation = true;
      return queryParams;
    };

    const fetchOne = async (options?: {
      companyId?: string;
      jobPositionId?: string;
    }): Promise<Applicant[]> => {
      const queryParams = buildQueryParams(options);
      const response = await this.request<unknown>('get', '/applicants', undefined, queryParams, {
        paramsSerializer: repeatKeySerializer,
      });
      return this.extractApplicants(response);
    };

    const jobIds = params?.jobPositionId
      ? Array.isArray(params.jobPositionId)
        ? params.jobPositionId
        : params.jobPositionId.includes(',')
          ? params.jobPositionId
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [params.jobPositionId.trim()]
      : [];

    let allApplicants: Applicant[] = [];

    // The API takes a comma-separated companyId list and scopes the result
    // to those companies, so one request covers all of them (it used to be
    // one per company, and one per company x job).
    const companyList = companyIds.join(',');

    if (companyIds.length > 0 && jobIds.length > 0) {
      const sets = await Promise.all(
        jobIds.map((jid) => fetchOne({ companyId: companyList, jobPositionId: jid }))
      );
      const combined = sets.flat();
      const uniqueMap = new Map<string, Applicant>();
      combined.forEach((a) => {
        if (a?._id) uniqueMap.set(a._id, a);
      });
      allApplicants = Array.from(uniqueMap.values());
    } else if (companyIds.length > 0) {
      const sets = [await fetchOne({ companyId: companyList })];
      const combined = sets.flat();
      const uniqueMap = new Map<string, Applicant>();
      combined.forEach((a) => {
        if (a?._id) uniqueMap.set(a._id, a);
      });
      allApplicants = Array.from(uniqueMap.values());
    } else if (jobIds.length > 0) {
      const sets = await Promise.all(
        jobIds.map((jid) => fetchOne({ jobPositionId: jid }))
      );
      const combined = sets.flat();
      const uniqueMap = new Map<string, Applicant>();
      combined.forEach((a) => {
        if (a?._id) uniqueMap.set(a._id, a);
      });
      allApplicants = Array.from(uniqueMap.values());
    } else {
      allApplicants = await fetchOne();
    }

    return allApplicants;
  }

  async getApplicantById(id: string, fields?: string): Promise<Applicant> {
    const response = await this.request<Applicant | { applicant: Applicant }>(
      'get',
      `/applicants/${id}`,
      undefined,
      fields ? { fields } : undefined
    );

    // The job ref is populated with its specs; merge them in when the
    // applicant itself came without spec details. Mutates in place.
    const applicant = ('applicant' in response ? response.applicant : response) as Omit<
      Applicant,
      'jobPositionId' | 'jobSpecsResponses'
    > & {
      jobPositionId?: string | (Record<string, unknown> & { jobSpecsWithDetails?: unknown[]; jobSpecsResponses?: unknown[] });
      jobSpecsResponses?: unknown[];
      jobSpecs?: unknown[];
    };

    try {
      if (
        applicant.jobPositionId &&
        typeof applicant.jobPositionId === 'object'
      ) {
        jobPositionsService.normalizeJobPosition(applicant.jobPositionId);
        if (
          !Array.isArray(applicant.jobSpecsWithDetails) ||
          applicant.jobSpecsWithDetails.length === 0
        ) {
          applicant.jobSpecsWithDetails =
            applicant.jobPositionId.jobSpecsWithDetails;
        }
        if (
          !Array.isArray(applicant.jobSpecsResponses) ||
          applicant.jobSpecsResponses.length === 0
        ) {
          applicant.jobSpecsResponses =
            applicant.jobPositionId.jobSpecsResponses;
        }
      }

      if (
        applicant.jobSpecsResponses ||
        applicant.jobSpecs ||
        applicant.jobSpecsWithDetails
      ) {
        jobPositionsService.normalizeJobPosition(applicant as unknown as Record<string, unknown>);
      }
    } catch {
      // Ignore normalization errors
    }

    return applicant as unknown as Applicant;
  }

  async createApplicant(data: CreateApplicantRequest): Promise<Applicant> {
    return this.request<Applicant>('post', '/applicants', data);
  }

  async updateApplicant(
    id: string,
    data: UpdateApplicantRequest
  ): Promise<Applicant> {
    return this.request<Applicant>('put', `/applicants/${id}`, data);
  }

  async updateApplicantStatus(
    id: string,
    data: UpdateStatusRequest
  ): Promise<Applicant> {
    return this.request<Applicant>('put', `/applicants/${id}/status`, data);
  }

  async scheduleInterview(
    applicantId: string,
    data: ScheduleInterviewRequest
  ): Promise<Applicant> {
    const normalizedData = {
      ...data,
      questions: normalizeInterviewQuestions(data?.questions),
    };

    const item = this.toScheduleInterviewItem(applicantId, normalizedData);
    let response: unknown;

    try {
      response = await this.request<BulkScheduleResult>('post', `/applicants/interviews`, [
        item,
      ]);
    } catch (error) {
      // Fall back to the per-applicant route on validation/routing errors.
      const status = Number((error as { response?: { status?: number }; statusCode?: number })?.response?.status || 0);
      if (![400, 404, 405, 422].includes(status)) throw error;
      response = await this.request<unknown>(
        'post',
        `/applicants/${applicantId}/interviews`,
        normalizedData
      );
    }

    const extractedApplicant = extractApplicantFromPayload(
      response,
      applicantId
    );
    if (extractedApplicant && typeof extractedApplicant === 'object')
      return extractedApplicant as unknown as Applicant;
    if (Array.isArray(response) && response.length > 0)
      return response[0] as Applicant;
    if (response && typeof response === 'object') return response as Applicant;

    return { _id: applicantId } as Applicant;
  }

  async scheduleBulkInterviews(
    payload: BulkScheduleInterviewRequest | BulkScheduleInterviewItem[]
  ): Promise<BulkScheduleResult> {
    const sourceItems: BulkScheduleInterviewItem[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.interviews)
        ? payload.interviews
        : [];

    const interviews = sourceItems
      .map((item) =>
        this.toScheduleInterviewItem(item?.applicantId, item || {})
      )
      .filter((item) => item.applicantId);

    if (interviews.length === 0) {
      throw new ApiError('At least one interview payload is required.');
    }

    return this.request<BulkScheduleResult>('post', '/applicants/interviews', interviews);
  }

  async updateInterviewStatus(
    applicantId: string,
    interviewId: string,
    data: UpdateInterviewStatusRequest
  ): Promise<Applicant> {
    const payload: Record<string, unknown> = {};
    const allowedKeys: Array<keyof UpdateInterviewStatusRequest> = [
      'scheduledAt',
      'scheduledBy',
      'startedAt',
      'endedAt',
      'conductedBy',
      'description',
      'location',
      'videoLink',
      'address',
      'type',
      'notes',
      'status',
      'interviewers',
    ];

    allowedKeys.forEach((key) => {
      const value = data?.[key];
      if (value !== undefined) payload[key] = value;
    });

    if (Array.isArray(data?.questions)) {
      payload.questions = normalizeInterviewQuestions(data.questions);
    }

    return this.request<Applicant>(
      'put',
      `/applicants/${applicantId}/interviews/${interviewId}`,
      payload
    );
  }

  async deleteInterview(
    applicantId: string,
    interviewId: string
  ): Promise<Applicant> {
    return this.request<Applicant>(
      'delete',
      `/applicants/${applicantId}/interviews/${interviewId}`
    );
  }

  async batchUpdateStatus(
    updates: Array<{
      applicantId: string;
      status: string;
      notes?: string;
      reasons?: string[];
    }>
  ): Promise<BatchStatusResult> {
    return this.request<BatchStatusResult>('put', '/applicants/batch-status', {
      items: updates,
    });
  }

  async addComment(
    applicantId: string,
    data: AddCommentRequest
  ): Promise<Applicant> {
    return this.request<Applicant>(
      'post',
      `/applicants/${applicantId}/comments`,
      data
    );
  }

  async sendMessage(
    applicantId: string,
    data: SendMessageRequest
  ): Promise<Applicant> {
    return this.request<Applicant>(
      'post',
      `/applicants/${applicantId}/messages`,
      data
    );
  }

  async getDuplicates(applicantId: string): Promise<
    {
      _id: string;
      applicantNo?: number;
      fullName: string;
      email: string;
      phone: string;
      status: string;
      submittedAt?: string;
      source?: string;
      jobTitle?: { en?: string; ar?: string };
      matchedBy: string[];
    }[]
  > {
    return this.request('get', `/applicants/${applicantId}/duplicates`);
  }

  async mergeApplicants(applicantId: string, sourceIds: string[]): Promise<{ mergedCount: number; applicantId: string }> {
    return this.request('post', `/applicants/${applicantId}/merge`, { sourceIds });
  }

  async deleteApplicant(applicantId: string): Promise<void> {
    await this.request<void>('delete', `/applicants/${applicantId}`);
  }

  async getApplicantStatuses(params?: {
    companyId?: string[];
    status?: string | string[];
  }): Promise<StatusInsights> {
    const companyIds = this.normalizeCompanyIds(params?.companyId);

    const fetchOne = async (singleCompanyId?: string): Promise<StatusInsights> => {
      const queryParams: Params = {};
      if (singleCompanyId) queryParams.companyId = singleCompanyId;
      if (params?.status) queryParams.status = params.status;
      return this.request<StatusInsights>(
        'get',
        '/applicants/status-insights',
        undefined,
        queryParams
      );
    };

    if (companyIds.length <= 1) {
      return fetchOne(companyIds[0]);
    }

    const results = await Promise.all(companyIds.map((id) => fetchOne(id)));

    const aggregate: Record<string, number> = {};
    results.forEach((obj) => {
      if (!obj || typeof obj !== 'object') return;
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'number')
          aggregate[key] = (aggregate[key] || 0) + value;
      });
    });
    return aggregate;
  }

  async markAsSeen(applicantId: string): Promise<void> {
    await this.request<void>('patch', `/applicants/${applicantId}/seen`);
  }

  async getRejectionInsights(params?: {
    companyId?: string[];
  }): Promise<RejectionInsights> {
    const companyIds = this.normalizeCompanyIds(params?.companyId);

    const fetchOne = async (companyId?: string): Promise<RejectionInsights> => {
      const queryParams: Params = {};
      if (companyId) queryParams.companyId = companyId;
      return this.request<RejectionInsights>(
        'get',
        '/applicants/rejection-insights',
        undefined,
        queryParams
      );
    };

    if (companyIds.length <= 1) {
      return fetchOne(companyIds[0]);
    }

    const responses = await Promise.all(
      companyIds.map((companyId) => fetchOne(companyId))
    );
    const countsByReason = new Map<string, number>();

    responses.forEach((response) => {
      const items: RejectionInsights = Array.isArray(response)
        ? response
        : ((response as { data?: RejectionInsights })?.data ?? []);

      items.forEach((item) => {
        const reason = String(item?.reason ?? '').trim() || 'Unknown';
        const count = Number(item?.count ?? 0);
        countsByReason.set(reason, (countsByReason.get(reason) ?? 0) + count);
      });
    });

    return Array.from(countsByReason.entries()).map(([reason, count]) => ({
      reason,
      count,
    }));
  }

  async searchApplicants(params: {
    q: string;
    companyId?: string | string[];
    page?: number;
    limit?: number;
  }): Promise<Applicant[]> {
    const queryParams: Params = { q: params.q };
    if (params.companyId) queryParams.companyId = params.companyId;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    return this.request<Applicant[]>('get', '/applicants/search', undefined, queryParams, {
      paramsSerializer: repeatKeySerializer,
    });
  }

  async getApplicantsByPhone(
    phone: string,
    companyId?: string
  ): Promise<Applicant[]> {
    if (!phone || !String(phone).trim()) return [];
    const queryParams: Record<string, string> = {
      phone: String(phone).trim(),
      PageCount: 'all',
    };
    if (companyId) queryParams.companyId = companyId;
    const response = await this.request<unknown>('get', '/applicants', undefined, queryParams);
    return this.extractApplicants(response);
  }

  async generateCandidateSummary(
    applicantId: string,
    companyId: string
  ): Promise<CandidateSummaryResult> {
    return this.request<CandidateSummaryResult>(
      'post',
      `/applicants/${applicantId}/ai-summary`,
      { companyId }
    );
  }
}

export const applicantsService = new ApplicantsService();
