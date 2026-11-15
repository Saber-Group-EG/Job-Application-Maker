import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';

export const dashboardKeys = {
  overview: (companyIds: string[] | undefined) => ['dashboard', 'overview', companyIds ?? []] as const,
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
