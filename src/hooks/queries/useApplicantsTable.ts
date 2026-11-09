import { useEffect } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applicantsTableService,
  type ApplicantTableRequest,
} from '../../services/applicantsTableService';

// Not under applicantsKeys.lists(): the optimistic list updates there expect
// arrays. The query client refetches this after any mutation instead
// (lib/queryClient.ts).
export const applicantsTableKeys = {
  all: ['applicants', 'table'] as const,
  page: (request: ApplicantTableRequest) => [...applicantsTableKeys.all, request] as const,
  allRows: (request: ApplicantTableRequest) => [...applicantsTableKeys.all, 'all', request] as const,
};

export function useApplicantsTable(
  request: ApplicantTableRequest,
  options?: { enabled?: boolean; fetchAll?: boolean }
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const fetchAll = options?.fetchAll ?? false;
  // Page changes must not change this key, or every next-page click would
  // refetch the full result set.
  const allRowsRequest = { ...request, pageIndex: 0, pageSize: 0 };

  const query = useQuery({
    queryKey: fetchAll
      ? applicantsTableKeys.allRows(allRowsRequest)
      : applicantsTableKeys.page(request),
    queryFn: () =>
      fetchAll
        ? applicantsTableService.queryAll(allRowsRequest)
        : applicantsTableService.query(request),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  // Load the next page in the background so paging forward is instant.
  const total = query.data?.total ?? 0;
  const hasNext = !fetchAll && (request.pageIndex + 1) * request.pageSize < total;
  useEffect(() => {
    if (!enabled || fetchAll || !hasNext || query.isPlaceholderData) return;
    const next = { ...request, pageIndex: request.pageIndex + 1 };
    queryClient.prefetchQuery({
      queryKey: applicantsTableKeys.page(next),
      queryFn: () => applicantsTableService.query(next),
      staleTime: 30 * 1000,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchAll, hasNext, query.isPlaceholderData, JSON.stringify(request)]);

  return query;
}
