import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  jobContractsService,
  type CreateJobContractPayload,
  type UpdateJobContractPayload,
  type ContractStatus,
  ApiError,
  BulkCreateJobContractPayload,
} from '../../services/contractsService';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';

// ===== Query Keys =====
export const jobContractsKeys = {
  all: ['jobContracts'] as const,
  lists: () => [...jobContractsKeys.all, 'list'] as const,
  list: (params?: object) => [...jobContractsKeys.lists(), params] as const,
  templates: (companyId?: string[] | string) =>
    [...jobContractsKeys.all, 'templates', companyId] as const,
  detail: (id: string) => [...jobContractsKeys.all, 'detail', id] as const,
};

// ===== Queries =====

export function useJobContractTemplates(
  companyId?: string[] | string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: jobContractsKeys.templates(companyId),
    queryFn: () =>
      jobContractsService.listContracts({
        companyId,
        isTemplate: true,
        PageCount: 'all',
      }),
    enabled: (options?.enabled ?? true) && !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useJobContracts(
  params?: {
    companyId?: string[];
    status?: ContractStatus;
    isTemplate?: boolean;
    PageCount?: 'all' | number;
    page?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: jobContractsKeys.list(params),
    queryFn: () =>
      jobContractsService.listContracts({ ...params, isTemplate: false }),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useJobContract(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: jobContractsKeys.detail(id),
    queryFn: () => jobContractsService.getContract(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ===== Mutations =====

export function useCreateJobContract() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: CreateJobContractPayload) =>
      jobContractsService.createContract(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(t('contractCreated', 'common'), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('contractCreateFailed', 'common'), t),
  });
}

export function useUpdateJobContract() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateJobContractPayload;
    }) => jobContractsService.updateContract(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobContractsKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(t('contractUpdated', 'common'), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('contractUpdateFailed', 'common'), t),
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContractStatus }) =>
      jobContractsService.updateContractStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobContractsKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      showSuccess(t('statusUpdated', 'common'), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('statusUpdateFailed', 'common'), t),
  });
}

export function useCloneJobContract() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => jobContractsService.cloneContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(t('contractCloned', 'common'), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('contractCloneFailed', 'common'), t),
  });
}

export function useDeleteJobContract() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => jobContractsService.deleteContract(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: jobContractsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(t('contractDeleted', 'common'), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('contractDeleteFailed', 'common'), t),
  });
}

export function useBulkCreateJobContracts() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: BulkCreateJobContractPayload) =>
      jobContractsService.bulkCreateContracts(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(t('bulkCreated', 'common', { count: created.length, entity: t('contract', 'common') }), t);
    },
    onError: (err: ApiError) =>
      showError(err.message, t('bulkContractCreateFailed', 'common'), t),
  });
}

// ===== Toast helpers =====
function showSuccess(message: string, t: (key: string, ns?: string) => string) {
  Swal.fire({
    title: t('success', 'common'),
    text: message,
    icon: 'success',
    timer: 1400,
    showConfirmButton: false,
  });
}

function showError(message: string, fallback: string, t: (key: string, ns?: string) => string) {
  Swal.fire({ title: t('error', 'common'), text: message || fallback, icon: 'error' });
}
