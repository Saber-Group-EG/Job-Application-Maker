import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobDistributionService, type MetaState, type TelegramState } from '../../services/jobDistributionService';

export const jobDistributionKeys = {
  telegram: (companyId: string) => ['jobDistribution', 'telegram', companyId] as const,
  job: (jobId: string) => ['jobDistribution', 'job', jobId] as const,
  meta: (companyId: string) => ['jobDistribution', 'meta', companyId] as const,
};

export function useMetaPages(companyId?: string, enabled = true) {
  return useQuery({
    queryKey: jobDistributionKeys.meta(companyId ?? ''),
    queryFn: () => jobDistributionService.meta(companyId!),
    enabled: Boolean(companyId) && enabled,
    staleTime: 60_000,
  });
}

function useSetMetaState() {
  const queryClient = useQueryClient();
  return (companyId: string, data: MetaState) => queryClient.setQueryData(jobDistributionKeys.meta(companyId), data);
}

export function useUpdateMetaPage() {
  const setState = useSetMetaState();
  return useMutation({
    mutationFn: jobDistributionService.updateMetaPage,
    onSuccess: (data, vars) => setState(vars.companyId, data),
  });
}

export function useDisconnectMeta() {
  const setState = useSetMetaState();
  return useMutation({
    mutationFn: (companyId: string) => jobDistributionService.disconnectMeta(companyId),
    onSuccess: (data, companyId) => setState(companyId, data),
  });
}

export function usePostJobToMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: { jobId: string; pageId: string; platform: 'facebook' | 'instagram'; companyId: string }) =>
      jobDistributionService.postToMeta(p),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(jobDistributionKeys.job(vars.jobId), (old: any) => ({
        ...(old || { open: true, socialImage: null }),
        distribution: data.distribution,
      }));
      queryClient.invalidateQueries({ queryKey: jobDistributionKeys.meta(vars.companyId) });
    },
  });
}

export function useTelegramChannels(companyId?: string, enabled = true) {
  return useQuery({
    queryKey: jobDistributionKeys.telegram(companyId ?? ''),
    queryFn: () => jobDistributionService.telegram(companyId!),
    enabled: Boolean(companyId) && enabled,
    staleTime: 60_000,
  });
}

function useSetTelegramState() {
  const queryClient = useQueryClient();
  return (companyId: string, data: TelegramState) =>
    queryClient.setQueryData(jobDistributionKeys.telegram(companyId), data);
}

export function useAddTelegramChannel() {
  const setState = useSetTelegramState();
  return useMutation({
    mutationFn: jobDistributionService.addChannel,
    onSuccess: (data, vars) => setState(vars.companyId, data),
  });
}

export function useCheckTelegramPending() {
  const setState = useSetTelegramState();
  return useMutation({
    mutationFn: (companyId: string) => jobDistributionService.checkPending(companyId),
    onSuccess: (data, companyId) => setState(companyId, data),
  });
}

export function useCancelTelegramPending() {
  const setState = useSetTelegramState();
  return useMutation({
    mutationFn: (companyId: string) => jobDistributionService.cancelPending(companyId),
    onSuccess: (data, companyId) => setState(companyId, data),
  });
}

export function useUpdateTelegramChannel() {
  const setState = useSetTelegramState();
  return useMutation({
    mutationFn: jobDistributionService.updateChannel,
    onSuccess: (data, vars) => setState(vars.companyId, data),
  });
}

export function useRemoveTelegramChannel() {
  const setState = useSetTelegramState();
  return useMutation({
    mutationFn: jobDistributionService.removeChannel,
    onSuccess: (data, vars) => setState(vars.companyId, data),
  });
}

export function useJobDistribution(jobId?: string, enabled = true) {
  return useQuery({
    queryKey: jobDistributionKeys.job(jobId ?? ''),
    queryFn: () => jobDistributionService.jobDistribution(jobId!),
    enabled: Boolean(jobId) && enabled,
  });
}

export function usePostJobToTelegram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, chatId }: { jobId: string; chatId?: string; companyId: string }) =>
      jobDistributionService.postToTelegram(jobId, chatId),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(jobDistributionKeys.job(vars.jobId), (old: any) => ({
        open: old?.open ?? true,
        distribution: data.distribution,
      }));
      queryClient.invalidateQueries({ queryKey: jobDistributionKeys.telegram(vars.companyId) });
    },
  });
}

export function useWriteJobPosts() {
  return useMutation({ mutationFn: jobDistributionService.writePosts });
}
