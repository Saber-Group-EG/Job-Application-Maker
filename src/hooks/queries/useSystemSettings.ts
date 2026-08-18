import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemSettingsService } from '../../services/systemSettingsService';
import { useAuth } from '../../context/AuthContext';
import type {
  CreateRecommendedFieldRequest,
  UpdateRecommendedFieldRequest,
  RecommendedField,
} from '../../types/SystemSettings';
import { TableLayout } from '../../types/auth';
import { ApiError } from '../../services/companiesService';
import Swal from '../../utils/swal';
import { useLocale } from '../../context/LocaleContext';

// ===== Query Keys =====
export const systemSettingsKeys = {
  all: ['systemSettings'] as const,

  // Recommended Fields
  recommendedFields: () =>
    [...systemSettingsKeys.all, 'recommendedFields'] as const,

  recommendedFieldsList: () =>
    [...systemSettingsKeys.recommendedFields(), 'list'] as const,

  recommendedField: (id: string) =>
    [...systemSettingsKeys.recommendedFields(), 'detail', id] as const,

  // Table Layouts
  tableLayouts: () => [...systemSettingsKeys.all, 'tableLayouts'] as const,

  tableLayout: (tableKey: string) =>
    [...systemSettingsKeys.tableLayouts(), tableKey] as const,

  // Admin Usage
  adminUsage: () => [...systemSettingsKeys.all, 'adminUsage'] as const,

  adminUsageOverview: (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) => [...systemSettingsKeys.adminUsage(), 'overview', params] as const,

  companyUsageDetail: (companyId: string) =>
    [...systemSettingsKeys.adminUsage(), 'detail', companyId] as const,
};

const EMPTY_LAYOUT: TableLayout = {
  columnVisibility: {},
  columnSizing: {},
  columnOrder: [],
};

// ===== Recommended Fields Queries =====

export function useRecommendedFields(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: systemSettingsKeys.recommendedFieldsList(),
    queryFn: () => systemSettingsService.getAllRecommendedFields(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useRecommendedField(
  fieldId: string,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: systemSettingsKeys.recommendedField(fieldId),
    queryFn: () => systemSettingsService.getRecommendedFieldById(fieldId),
    enabled: options?.enabled ?? !!fieldId,
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      const cached = queryClient.getQueryData<RecommendedField[]>(
        systemSettingsKeys.recommendedFieldsList()
      );

      return cached?.find((field) => field.fieldId === fieldId);
    },
  });
}

// ===== Recommended Fields Mutations =====

export function useCreateRecommendedField() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (data: CreateRecommendedFieldRequest) =>
      systemSettingsService.createRecommendedField(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.recommendedFieldsList(),
      });

      showSuccessToast(t('recommendedFieldCreated', 'common'), t);
    },

    onError: (error: ApiError) => {
      showErrorToast(
        error.message,
        t('recommendedFieldCreateFailed', 'common'),
        t
      );
    },
  });
}

export function useUpdateRecommendedField() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: ({
      fieldId,
      data,
    }: {
      fieldId: string;
      data: UpdateRecommendedFieldRequest;
    }) => systemSettingsService.updateRecommendedField(fieldId, data),

    onSuccess: (updatedField, { fieldId }) => {
      queryClient.setQueryData(
        systemSettingsKeys.recommendedField(fieldId),
        updatedField
      );

      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.recommendedFieldsList(),
      });

      showSuccessToast(t('recommendedFieldUpdated', 'common'), t);
    },

    onError: (error: ApiError) => {
      showErrorToast(
        error.message,
        t('recommendedFieldUpdateFailed', 'common'),
        t
      );
    },
  });
}

export function useDeleteRecommendedField() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  return useMutation({
    mutationFn: (fieldId: string) =>
      systemSettingsService.deleteRecommendedField(fieldId),

    onSuccess: (_, fieldId) => {
      queryClient.setQueryData<RecommendedField[]>(
        systemSettingsKeys.recommendedFieldsList(),
        (old) => {
          if (!old) return [];

          return old.filter((field) => field.fieldId !== fieldId);
        }
      );

      queryClient.removeQueries({
        queryKey: systemSettingsKeys.recommendedField(fieldId),
      });

      showSuccessToast(t('recommendedFieldDeleted', 'common'), t);
    },

    onError: (error: ApiError) => {
      showErrorToast(
        error.message,
        t('recommendedFieldDeleteFailed', 'common'),
        t
      );
    },
  });
}

// ===== Table Layout Hooks =====

export const useTableLayout = (
  tableKey: string,
  defaultLayout: TableLayout = EMPTY_LAYOUT
) => {
  const { user } = useAuth();
  const userId = user?._id;
  const queryClient = useQueryClient();

  const {
    data: fetchedLayout,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: systemSettingsKeys.tableLayout(tableKey),
    queryFn: () => systemSettingsService.getTableLayout(tableKey),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (layout: TableLayout) =>
      systemSettingsService.saveTableLayout(tableKey, layout),

    onError: (error: any) => {
      console.error('Failed to save layout:', error);
    },
  });

  const layout = {
    ...defaultLayout,
    ...(fetchedLayout || EMPTY_LAYOUT),
  };

  const saveLayout = useCallback(
    (updates: Partial<TableLayout>) => {
      if (!userId) return;

      const newLayout = {
        ...layout,
        ...updates,
      };

      queryClient.setQueryData(
        systemSettingsKeys.tableLayout(tableKey),
        newLayout
      );

      saveMutation.mutate(newLayout);
    },
    [userId, tableKey, layout, queryClient, saveMutation]
  );

  return {
    layout,
    saveLayout,
    isLoading: isLoading && !fetchedLayout,
    isError,
    error,
  };
};

// ===== Admin Usage Queries =====

export function useCompaniesUsageOverview(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: systemSettingsKeys.adminUsageOverview(params),
    queryFn: () => systemSettingsService.getCompaniesUsageOverview(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCompanyUsageDetail(companyId: string | null) {
  return useQuery({
    queryKey: systemSettingsKeys.companyUsageDetail(companyId || ''),
    queryFn: () =>
      systemSettingsService.getCompanyUsageDetail(companyId as string),
    enabled: !!companyId,
  });
}

// ===== Admin Usage Mutations =====

export function useCompRequestQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      amount,
    }: {
      companyId: string;
      amount: number;
    }) => systemSettingsService.compRequestQuota(companyId, amount),

    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.adminUsage(),
      });

      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.companyUsageDetail(companyId),
      });
    },
  });
}

export function useCompAiCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      amount,
    }: {
      companyId: string;
      amount: number;
    }) => systemSettingsService.compAiCredits(companyId, amount),

    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.adminUsage(),
      });

      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.companyUsageDetail(companyId),
      });
    },
  });
}

export function useToggleAiEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      enabled,
    }: {
      companyId: string;
      enabled: boolean;
    }) => systemSettingsService.toggleAiEnabled(companyId, enabled),

    onMutate: async ({ companyId, enabled }) => {
      const detailKey = systemSettingsKeys.companyUsageDetail(companyId);
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<any>(detailKey);

      queryClient.setQueryData<any>(detailKey, (old: any) =>
        old ? { ...old, aiSettings: { ...old.aiSettings, enabled } } : old
      );

      return { previousDetail, detailKey };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
    },

    onSettled: (_data, _err, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.adminUsage(),
      });
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.companyUsageDetail(companyId),
      });
    },
  });
}

export function useToggleAiFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      feature,
      enabled,
    }: {
      companyId: string;
      feature: string;
      enabled: boolean;
    }) => systemSettingsService.toggleAiFeature(companyId, feature, enabled),

    onMutate: async ({ companyId, feature, enabled }) => {
      const detailKey = systemSettingsKeys.companyUsageDetail(companyId);
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<any>(detailKey);

      queryClient.setQueryData<any>(detailKey, (old: any) =>
        old
          ? {
              ...old,
              aiSettings: {
                ...old.aiSettings,
                featureToggles: {
                  ...old.aiSettings?.featureToggles,
                  [feature]: enabled,
                },
              },
            }
          : old
      );

      return { previousDetail, detailKey };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
    },

    onSettled: (_data, _err, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.adminUsage(),
      });
      queryClient.invalidateQueries({
        queryKey: systemSettingsKeys.companyUsageDetail(companyId),
      });
    },
  });
}

// ===== Toast Helpers =====

function showSuccessToast(
  message: string,
  t: (key: string, ns?: string) => string
) {
  Swal.fire({
    title: t('success', 'common'),
    text: message,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
  });
}

function showErrorToast(
  message: string,
  fallback: string,
  t: (key: string, ns?: string) => string
) {
  Swal.fire({
    title: t('error', 'common'),
    text: message || fallback,
    icon: 'error',
  });
}
