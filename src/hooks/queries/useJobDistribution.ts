import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobDistributionService, type TelegramState } from '../../services/jobDistributionService';

export const jobDistributionKeys = {
  telegram: (companyId: string) => ['jobDistribution', 'telegram', companyId] as const,
  job: (jobId: string) => ['jobDistribution', 'job', jobId] as const,
};

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
