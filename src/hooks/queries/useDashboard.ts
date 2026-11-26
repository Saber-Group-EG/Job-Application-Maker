import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService, type AiUsageRange } from '../../services/dashboardService';

export const dashboardKeys = {
  overview: (companyIds: string[] | undefined) => ['dashboard', 'overview', companyIds ?? []] as const,
  aiUsage: (companyId: string | undefined, range: AiUsageRange) => ['dashboard', 'ai-usage', companyId ?? '', range] as const,
};

export function useDashboardOverview(companyIds: string[] | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.overview(companyIds),
    queryFn: () => dashboardService.overview({ companyIds }),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAiUsageBreakdown(companyId: string | undefined, range: AiUsageRange, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.aiUsage(companyId, range),
    queryFn: () => dashboardService.aiUsage({ companyId: companyId as string, range }),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
