import { MutationCache, QueryClient } from "@tanstack/react-query";

export const queryClient: QueryClient = new QueryClient({
  // The applicants table is filtered and paged on the server, so no
  // mutation can patch it in place; refetch it after any change (only runs
  // if the table is on screen, and the server re-reads just what changed).
  mutationCache: new MutationCache({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants", "table"] });
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 30 * 60 * 1000, // 30 minutes (previously cacheTime)
    },
    mutations: {
      retry: 0,
    },
  },
});
