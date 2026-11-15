import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { reportsService, type ReportsParams } from '../../services/reportsService';

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
