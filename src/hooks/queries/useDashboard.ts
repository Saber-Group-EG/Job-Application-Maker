import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';

export const dashboardKeys = {
  overview: (companyIds: string[] | undefined, days: number) =>
    ['dashboard', 'overview', companyIds ?? [], days] as const,
};

export function useDashboardOverview(companyIds: string[] | undefined, days: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.overview(companyIds, days),
    queryFn: () => dashboardService.overview({ companyIds, days }),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
