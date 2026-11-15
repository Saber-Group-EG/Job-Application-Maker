import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  reportBuilderService,
  reportsService,
  type ChartView,
  type CustomSpec,
  type ReportsParams,
} from '../../services/reportsService';

export const reportsKeys = {
  overview: (p: ReportsParams) =>
    ['reports', 'overview', p.companyIds ?? [], p.days, p.hiringCompanyId ?? null, p.jobId ?? null] as const,
};

export function useReportsOverview(params: ReportsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reportsKeys.overview(params),
    queryFn: () => reportsService.overview(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ─── Saved charts (AI report builder) ─────────────────────────────────────────

export const widgetKeys = {
  list: (companyId: string | null) => ['reports', 'widgets', companyId] as const,
  run: (companyId: string, spec: CustomSpec, locale: string, days: number) => ['reports', 'custom-run', companyId, spec, locale, days] as const,
};

export function useMyReportWidgets(companyId: string | null) {
  return useQuery({
    queryKey: widgetKeys.list(companyId),
    queryFn: () => reportBuilderService.widgets(companyId as string),
    enabled: Boolean(companyId),
    staleTime: 60 * 1000,
  });
}

export function useRunCustomChart(companyId: string, spec: CustomSpec, locale: string, days: number) {
  return useQuery({
    queryKey: widgetKeys.run(companyId, spec, locale, days),
    queryFn: () => reportBuilderService.run({ companyId, spec, locale, days }),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useReportWidgetMutations(companyId: string | null) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: widgetKeys.list(companyId) });
  return {
    save: useMutation({ mutationFn: reportBuilderService.saveWidget, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, ...p }: { id: string; title?: string; view?: ChartView; order?: number }) => reportBuilderService.updateWidget(id, p),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => reportBuilderService.deleteWidget(id), onSuccess: refresh }),
  };
}
