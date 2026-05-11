import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  jobOffersService,
  type CreateJobOfferPayload,
  type UpdateJobOfferPayload,
  type OfferStatus,
  ApiError,
} from '../../services/jobOffersService';
import Swal from '../../utils/swal';

// ===== Query Keys =====
export const jobOffersKeys = {
  all: ['jobOffers'] as const,
  lists: () => [...jobOffersKeys.all, 'list'] as const,
  list: (params?: object) => [...jobOffersKeys.lists(), params] as const,
  templates: (companyId?: string) =>
    [...jobOffersKeys.all, 'templates', companyId] as const,
  detail: (id: string) => [...jobOffersKeys.all, 'detail', id] as const,
};

// ===== Queries =====

export function useJobOfferTemplates(
  companyId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: jobOffersKeys.templates(companyId),
    queryFn: () =>
      jobOffersService.listOffers({
        companyId,
        isTemplate: true,
        PageCount: 'all',
      }),
    enabled: (options?.enabled ?? true) && !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useJobOffers(
  params?: {
    companyId?: string;
    status?: OfferStatus;
    isTemplate?: boolean;
    PageCount?: 'all' | number;
    page?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: jobOffersKeys.list(params),
    queryFn: () =>
      jobOffersService.listOffers({ ...params, isTemplate: false }),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useJobOffer(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: jobOffersKeys.detail(id),
    queryFn: () => jobOffersService.getOffer(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ===== Mutations =====

export function useCreateJobOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateJobOfferPayload) =>
      jobOffersService.createOffer(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.lists() });
      if (created.isTemplate) {
        queryClient.invalidateQueries({
          queryKey: jobOffersKeys.templates(
            typeof created.companyId === 'string'
              ? created.companyId
              : created.companyId._id
          ),
        });
      }
      showSuccess('Offer created successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to create offer'),
  });
}

export function useUpdateJobOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateJobOfferPayload;
    }) => jobOffersService.updateOffer(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobOffersKeys.detail(updated._id), updated);
      // invalidate everything under ['jobOffers']
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.all });
      showSuccess('Offer updated successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to update offer'),
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OfferStatus }) =>
      jobOffersService.updateOfferStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobOffersKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.lists() });
      showSuccess('Status updated');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to update status'),
  });
}

export function useCloneJobOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobOffersService.cloneOffer(id),
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.lists() });
      if (cloned.isTemplate) {
        queryClient.invalidateQueries({
          queryKey: jobOffersKeys.templates(
            typeof cloned.companyId === 'string'
              ? cloned.companyId
              : cloned.companyId._id
          ),
        });
      }
      showSuccess('Offer cloned successfully');
    },
    onError: (err: ApiError) => showError(err.message, 'Failed to clone offer'),
  });
}

export function useDeleteJobOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => jobOffersService.deleteOffer(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: jobOffersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobOffersKeys.all });
      showSuccess('Offer deleted successfully');
    },
    onError: (err: ApiError) =>
      showError(err.message, 'Failed to delete offer'),
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
