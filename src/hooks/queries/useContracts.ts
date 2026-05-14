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

  return useMutation({
    mutationFn: (payload: CreateJobContractPayload) =>
      jobContractsService.createContract(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      if (created.isTemplate) {
        queryClient.invalidateQueries({
          queryKey: jobContractsKeys.templates(
            typeof created.companyId === 'string'
              ? created.companyId
              : created.companyId._id
          ),
        });
      }
      showSuccess('Contract created successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to create contract'),
  });
}

export function useUpdateJobContract() {
  const queryClient = useQueryClient();

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
      showSuccess('Contract updated successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to update contract'),
  });
}

export function useUpdateContractStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContractStatus }) =>
      jobContractsService.updateContractStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobContractsKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      showSuccess('Status updated');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to update status'),
  });
}

export function useCloneJobContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobContractsService.cloneContract(id),
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      if (cloned.isTemplate) {
        queryClient.invalidateQueries({
          queryKey: jobContractsKeys.templates(
            typeof cloned.companyId === 'string'
              ? cloned.companyId
              : cloned.companyId._id
          ),
        });
      }
      showSuccess('Contract cloned successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to clone contract'),
  });
}

export function useDeleteJobContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobContractsService.deleteContract(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: jobContractsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess('Contract deleted successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to delete contract'),
  });
}

export function useBulkCreateJobContracts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkCreateJobContractPayload) =>
      jobContractsService.bulkCreateContracts(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: jobContractsKeys.all });
      showSuccess(`${created.length} contract(s) created successfully`);
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to create bulk contracts'),
  });
}

// ===== Toast helpers =====
function showSuccess(message: string) {
  Swal.fire({
    title: 'Success',
    text: message,
    icon: 'success',
    timer: 1400,
    showConfirmButton: false,
  });
}

function showError(message: string, fallback: string) {
  Swal.fire({ title: 'Error', text: message || fallback, icon: 'error' });
}
