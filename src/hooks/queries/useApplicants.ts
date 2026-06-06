// hooks/queries/useApplicants.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicantsService } from "../../services/applicantsService";
import { useAuth } from "../../context/AuthContext";
import type {
  CreateApplicantRequest,
  UpdateApplicantRequest,
  UpdateStatusRequest,
  ScheduleInterviewRequest,
  UpdateInterviewStatusRequest,
  AddCommentRequest,
  SendMessageRequest,
  Applicant,
} from "../../types/applicants";
import { ApiError } from "../../services/companiesService";
import Swal from "../../utils/swal";

// Query keys
export const applicantsKeys = {
  all: ["applicants"] as const,
  lists: () => [...applicantsKeys.all, "list"] as const,
  list: (params?: {
    companyId?: string[];
    jobPositionId?: string | string[];
    search?: string;
    status?: string | string[];
    fields?: string | string[];
    departmentId?: string[];
    skipPopulation?: boolean;
  }) => [...applicantsKeys.lists(), params] as const,
  detail: (id: string) => [...applicantsKeys.all, "detail", id] as const,
  rejectionInsights: (companyId?: string[]) => [...applicantsKeys.all, "rejection-insights", companyId] as const,
  byPhone: (phone: string) => [...applicantsKeys.all, "by-phone", phone] as const,
};

// Helper to get user's company IDs from AuthContext
function getUserCompanyIds(user: any): string[] | undefined {
  const roleName = user?.roleId?.name?.toLowerCase?.();
  if (roleName === "admin" || roleName === "super admin") return undefined;

  const fromCompanies = user?.companies?.map((c: any) =>
    typeof c?.companyId === "string" ? c.companyId : c?.companyId?._id
  ).filter(Boolean) ?? [];

  const fromAssigned = user?.assignedcompanyId?.filter(Boolean) ?? [];
  const merged = [...new Set([...fromCompanies, ...fromAssigned])];
  return merged.length > 0 ? merged : undefined;
}

// Get all applicants
export function useApplicants(params?: {
  companyId?: string[];
  jobPositionId?: string;
  departmentId?: string[];
  status?: string | string[];
  fields?: string | string[];
  enabled?: boolean;
  search?: string;
  skipPopulation?: boolean; // new param to skip population of related fields
}) {
  const { user } = useAuth();
  const userCompanyIds = getUserCompanyIds(user);
  const effectiveCompanyId = params?.companyId?.length ? params.companyId : userCompanyIds;

  return useQuery({
    queryKey: applicantsKeys.list({
      companyId: effectiveCompanyId,
      jobPositionId: params?.jobPositionId,
      departmentId: params?.departmentId,
      status: params?.status,
      search: params?.search,
      fields: params?.fields,
      skipPopulation: params?.skipPopulation,
    }),
    queryFn: () => applicantsService.getAllApplicants({
      companyId: effectiveCompanyId,
      jobPositionId: params?.jobPositionId,
      departmentId: params?.departmentId,
      status: params?.status,
      search: params?.search,
      fields: params?.fields,
      skipPopulation: params?.skipPopulation,
    }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: params?.enabled ?? true,
  });
}

// Get applicant by ID
export function useApplicant(id: string, options?: {
  initialData?: Applicant;
  enabled?: boolean;
  staleTime?: number;
}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: applicantsKeys.detail(id),
    queryFn: () => applicantsService.getApplicantById(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    initialData: options?.initialData ?? (() => {
      const cached = queryClient.getQueryData<Applicant[]>(applicantsKeys.list());
      return cached?.find(a => a._id === id);
    }),
  });
}

// Get applicant status insights
export function useApplicantStatuses(params?: {
  companyId?: string[];
  jobPositionId?: string;
  enabled?: boolean;
}) {
  const { user } = useAuth();
  const userCompanyIds = getUserCompanyIds(user);
  const effectiveCompanyId = params?.companyId?.length ? params.companyId : userCompanyIds;

  return useQuery({
    queryKey: [...applicantsKeys.list({ companyId: effectiveCompanyId, jobPositionId: params?.jobPositionId }), 'statuses'],
    queryFn: () => applicantsService.getApplicantStatuses({
      companyId: effectiveCompanyId,
      status: params?.jobPositionId,
    }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: params?.enabled ?? true,
  });
}

// Batch update applicant status
export function useBatchUpdateApplicantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ applicantId: string; status: string; notes?: string; reasons?: string[] }>) =>
      applicantsService.batchUpdateStatus(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      showSuccessToast("Statuses updated successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to update statuses");
    },
  });
}

// Create applicant
export function useCreateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicantRequest) => applicantsService.createApplicant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      showSuccessToast("Applicant created successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to create applicant");
    },
  });
}

// Update applicant
export function useUpdateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicantRequest }) =>
      applicantsService.updateApplicant(id, data),
    onSuccess: (updatedApplicant, { id }) => {
      // If the response is a full applicant object, update the cache directly.
      // Otherwise, invalidate the cache so the latest data is fetched.
      const looksLikeApplicant =
        updatedApplicant &&
        typeof updatedApplicant === 'object' &&
        (updatedApplicant as Partial<Applicant>)._id &&
        ((updatedApplicant as Partial<Applicant>).fullName !== undefined ||
          (updatedApplicant as Partial<Applicant>).firstName !== undefined ||
          (updatedApplicant as Partial<Applicant>).email !== undefined ||
          (updatedApplicant as Partial<Applicant>).phone !== undefined ||
          (updatedApplicant as Partial<Applicant>).status !== undefined);

      if (looksLikeApplicant) {
        queryClient.setQueryData(applicantsKeys.detail(id), updatedApplicant);
        queryClient.setQueryData<Applicant[]>(applicantsKeys.list(), (old) => {
          if (!old) return [updatedApplicant as Applicant];
          return old.map((applicant) =>
            applicant._id === id ? (updatedApplicant as Applicant) : applicant
          );
        });
      } else {
        queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      }

      showSuccessToast("Applicant updated successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to update applicant");
    },
  });
}

// Mark applicant as seen
export function useMarkApplicantSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicantsService.markAsSeen(id),
    onSuccess: (_, id) => {
      // Silently update - no toast needed
      queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(id) });
    },
    onError: (error: ApiError) => {
      console.error("Failed to mark as seen:", error.message);
    },
  });
}

// Update applicant status
export function useUpdateApplicantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStatusRequest }) =>
      applicantsService.updateApplicantStatus(id, data),
    onSuccess: (updatedApplicant, { id }) => {
      const looksLikeApplicant =
        updatedApplicant &&
        typeof updatedApplicant === 'object' &&
        (updatedApplicant as Partial<Applicant>)._id &&
        ((updatedApplicant as Partial<Applicant>).fullName !== undefined ||
          (updatedApplicant as Partial<Applicant>).firstName !== undefined ||
          (updatedApplicant as Partial<Applicant>).email !== undefined ||
          (updatedApplicant as Partial<Applicant>).phone !== undefined ||
          (updatedApplicant as Partial<Applicant>).status !== undefined);

      if (looksLikeApplicant) {
        queryClient.setQueryData(applicantsKeys.detail(id), updatedApplicant);
        queryClient.setQueryData<Applicant[]>(applicantsKeys.list(), (old) => {
          if (!old) return [updatedApplicant as Applicant];
          return old.map((applicant) =>
            applicant._id === id ? (updatedApplicant as Applicant) : applicant
          );
        });
      } else {
        queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      }

      showSuccessToast("Status updated successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to update status");
    },
  });
}

// Delete applicant
export function useDeleteApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applicantsService.deleteApplicant(id),
    onSuccess: (_, id) => {
      // Remove from list cache
      queryClient.setQueryData<Applicant[]>(applicantsKeys.list(), (old) => {
        if (!old) return [];
        return old.filter(applicant => applicant._id !== id);
      });
      
      // Remove detail cache
      queryClient.removeQueries({ queryKey: applicantsKeys.detail(id) });
      
      showSuccessToast("Applicant deleted successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to delete applicant");
    },
  });
}

// Schedule interview
export function useScheduleInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleInterviewRequest }) =>
      applicantsService.scheduleInterview(id, data),
    onSuccess: (updatedApplicant, { id }) => {
      queryClient.setQueryData(applicantsKeys.detail(id), updatedApplicant);
      showSuccessToast("Interview scheduled successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to schedule interview");
    },
  });
}

// Schedule bulk interviews
export function useScheduleBulkInterviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { interviews: Array<any> } | Array<any>) =>
      applicantsService.scheduleBulkInterviews(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      showSuccessToast("Interviews scheduled successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to schedule interviews");
    },
  });
}

// Update interview status
export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicantId, interviewId, data }: {
      applicantId: string;
      interviewId: string;
      data: UpdateInterviewStatusRequest;
    }) => applicantsService.updateInterviewStatus(applicantId, interviewId, data),
    onMutate: async ({ applicantId, interviewId, data }) => {
      await queryClient.cancelQueries({ queryKey: applicantsKeys.detail(applicantId) });
      const previousApplicant = queryClient.getQueryData<Applicant | undefined>(
        applicantsKeys.detail(applicantId),
      );
      if (previousApplicant && Array.isArray(previousApplicant.interviews)) {
        const nextInterviews = previousApplicant.interviews.map((iv) => {
          if ((iv?._id || iv?.id) !== interviewId) return iv;
          return { ...iv, ...data };
        });
        queryClient.setQueryData(applicantsKeys.detail(applicantId), {
          ...previousApplicant,
          interviews: nextInterviews,
        });
      }
      return { previousApplicant };
    },
    onSuccess: (_updatedApplicant, _variables) => {
      // The optimistic update from onMutate is the source of truth.
      // Do NOT overwrite the cache with the server response — it strips
      // questions/groupKey/groupName/groupSource on round-trips, which
      // would wipe out the user's in-progress answers and re-trigger the
      // question picker view.
    },
    onError: (error: ApiError, _variables, context) => {
      if ((context as { previousApplicant?: unknown } | undefined)?.previousApplicant) {
        const previous = (context as { previousApplicant: unknown }).previousApplicant;
        const { applicantId } = _variables;
        queryClient.setQueryData(applicantsKeys.detail(applicantId), previous);
      }
      showErrorToast(error.message, "Failed to update interview status");
    },
  });
}

// Delete interview
export function useDeleteInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicantId, interviewId }: {
      applicantId: string;
      interviewId: string;
    }) => applicantsService.deleteInterview(applicantId, interviewId),
    onSuccess: (updatedApplicant, { applicantId }) => {
      queryClient.setQueryData(applicantsKeys.detail(applicantId), updatedApplicant);
      queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      showSuccessToast("Interview deleted successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to delete interview");
    },
  });
}

// Add comment
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddCommentRequest }) =>
      applicantsService.addComment(id, data),
    onSuccess: (updatedApplicant, { id }) => {
      queryClient.setQueryData(applicantsKeys.detail(id), updatedApplicant);
      showSuccessToast("Comment added");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to add comment");
    },
  });
}

// Send message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SendMessageRequest }) =>
      applicantsService.sendMessage(id, data),
    onSuccess: (updatedApplicant, { id }) => {
      queryClient.setQueryData(applicantsKeys.detail(id), updatedApplicant);
      showSuccessToast("Message sent successfully");
    },
    onError: (error: ApiError) => {
      showErrorToast(error.message, "Failed to send message");
    },
  });
}

export function useRejectionInsights(params?: { companyId?: string[]; enabled?: boolean }) {
  const { user } = useAuth();
  const userCompanyIds = getUserCompanyIds(user);
  const effectiveCompanyId = params?.companyId?.length ? params.companyId : userCompanyIds; 

  return useQuery({
    queryKey: applicantsKeys.rejectionInsights(effectiveCompanyId),
    queryFn: () => applicantsService.getRejectionInsights({ companyId: effectiveCompanyId }),
    staleTime: 2 * 60 * 1000,
    enabled: params?.enabled ?? true,
    retry: false,
  });
}

// Get applicants by phone number
export function useApplicantsByPhone(phone?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: applicantsKeys.byPhone(phone || ''),
    queryFn: () => applicantsService.getApplicantsByPhone(phone || ''),
    staleTime: 2 * 60 * 1000,
    enabled: !!phone && (options?.enabled ?? true),
    retry: false,
  });
}

// ===== Toast Helpers =====
function showSuccessToast(message: string) {
  Swal.fire({
    title: "Success",
    text: message,
    icon: "success",
    timer: 1500,
    showConfirmButton: false,
  });
}

function showErrorToast(message: string, fallback: string) {
  Swal.fire({
    title: "Error",
    text: message || fallback,
    icon: "error",
  });
}