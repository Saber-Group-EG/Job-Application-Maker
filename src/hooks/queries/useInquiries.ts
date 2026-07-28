import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiriesService } from '../../services/inquiriesService';
import type { CreateInquiryPayload, UpdateInquiryPayload } from '../../services/inquiriesService';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';

export const inquiryKeys = {
  all: ['inquiries'] as const,
  lists: () => [...inquiryKeys.all, 'list'] as const,
  list: (params?: Record<string, any>) => [...inquiryKeys.lists(), params] as const,
  detail: (id: string) => [...inquiryKeys.all, 'detail', id] as const,
};

export function useInquiries(params?: Record<string, any>) {
  return useQuery({
    queryKey: inquiryKeys.list(params),
    queryFn: () => inquiriesService.getAll(params),
  });
}

export function useInquiry(id: string) {
  return useQuery({
    queryKey: inquiryKeys.detail(id),
    queryFn: () => inquiriesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: CreateInquiryPayload) => inquiriesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
      Swal.fire({
        title: t('messageSent', 'common'),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    },
    onError: (err: any) => {
      Swal.fire({
        title: t('messageSendFailed', 'common'),
        text: err.message || t('unexpectedError', 'common'),
        icon: 'error',
      });
    },
  });
}

export function useCreateAuthenticatedInquiry() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: CreateInquiryPayload) => inquiriesService.createAuthenticated(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
      Swal.fire({
        title: t('messageSent', 'common'),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    },
    onError: (err: any) => {
      Swal.fire({
        title: t('messageSendFailed', 'common'),
        text: err.message || t('unexpectedError', 'common'),
        icon: 'error',
      });
    },
  });
}

function updateItemInCache(old: any, id: string, updates: Record<string, any>) {
  if (!old) return old;
  if (Array.isArray(old)) {
    return old.map((item: any) =>
      item._id === id ? { ...item, ...updates } : item
    );
  }
  if (old.data && Array.isArray(old.data)) {
    return { ...old, data: old.data.map((item: any) => item._id === id ? { ...item, ...updates } : item) };
  }
  if (old.inquiries && Array.isArray(old.inquiries)) {
    return { ...old, inquiries: old.inquiries.map((item: any) => item._id === id ? { ...item, ...updates } : item) };
  }
  return old;
}

function removeItemFromCache(old: any, id: string) {
  if (!old) return old;
  if (Array.isArray(old)) {
    return old.filter((item: any) => item._id !== id);
  }
  if (old.data && Array.isArray(old.data)) {
    return { ...old, data: old.data.filter((item: any) => item._id !== id) };
  }
  if (old.inquiries && Array.isArray(old.inquiries)) {
    return { ...old, inquiries: old.inquiries.filter((item: any) => item._id !== id) };
  }
  return old;
}

export function useUpdateInquiry() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInquiryPayload }) =>
      inquiriesService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: inquiryKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: inquiryKeys.lists() });

      const previousDetail = queryClient.getQueryData(inquiryKeys.detail(id));
      const previousLists: any[] = [];
      queryClient.getQueriesData({ queryKey: inquiryKeys.lists() }).forEach(([key, data]) => {
        previousLists.push({ key, data });
      });

      queryClient.setQueryData(inquiryKeys.detail(id), (old: any) => {
        if (!old) return old;
        return { ...old, ...payload };
      });

      queryClient.setQueriesData({ queryKey: inquiryKeys.lists() }, (old: any) =>
        updateItemInCache(old, id, payload)
      );

      return { previousDetail, previousLists };
    },
    onError: (err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(inquiryKeys.detail(id), context.previousDetail);
      }
      context?.previousLists?.forEach(({ key, data }: any) => {
        queryClient.setQueryData(key, data);
      });
      Swal.fire({
        title: t('error', 'common'),
        text: err.message || t('unexpectedError', 'common'),
        icon: 'error',
      });
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
    },
  });
}

export function useDeleteInquiry() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (id: string) => inquiriesService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: inquiryKeys.lists() });

      const previousLists: any[] = [];
      queryClient.getQueriesData({ queryKey: inquiryKeys.lists() }).forEach(([key, data]) => {
        previousLists.push({ key, data });
      });

      queryClient.setQueriesData({ queryKey: inquiryKeys.lists() }, (old: any) =>
        removeItemFromCache(old, id)
      );

      return { previousLists };
    },
    onError: (err, _id, context) => {
      context?.previousLists?.forEach(({ key, data }: any) => {
        queryClient.setQueryData(key, data);
      });
      Swal.fire({
        title: t('error', 'common'),
        text: err.message || t('unexpectedError', 'common'),
        icon: 'error',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
    },
  });
}
