import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicantsService } from '../../services/applicantsService';
import { applicantsKeys } from './useApplicants';
import type { InterviewRecording } from '../../types/interviewRecording';

export const interviewRecordingKeys = {
  detail: (applicantId: string, interviewId: string) =>
    ['interviewRecording', applicantId, interviewId] as const,
};

// Polls while any recorded piece is still being transcribed.
export function useInterviewRecording(applicantId?: string, interviewId?: string, enabled = true) {
  return useQuery({
    queryKey: interviewRecordingKeys.detail(applicantId ?? '', interviewId ?? ''),
    queryFn: () => applicantsService.getInterviewRecording(applicantId!, interviewId!),
    enabled: enabled && !!applicantId && !!interviewId,
    staleTime: 15 * 1000,
    // A cached "nothing recorded yet" from earlier in the interview must never be shown
    // on the results page: always ask the server when the view opens.
    refetchOnMount: 'always',
    refetchInterval: (query) => (query.state.data?.processing ? 3000 : false),
  });
}

function useRecordingCache(applicantId: string, interviewId: string) {
  const queryClient = useQueryClient();
  return (data: InterviewRecording) =>
    queryClient.setQueryData(interviewRecordingKeys.detail(applicantId, interviewId), data);
}

export function useSaveRecordingTranscript(applicantId: string, interviewId: string) {
  const setCache = useRecordingCache(applicantId, interviewId);
  return useMutation({
    mutationFn: (transcript: string) => applicantsService.saveRecordingTranscript(applicantId, interviewId, transcript),
    onSuccess: setCache,
  });
}

export function useRunInterviewReview(applicantId: string, interviewId: string) {
  const setCache = useRecordingCache(applicantId, interviewId);
  return useMutation({
    mutationFn: () => applicantsService.runInterviewReview(applicantId, interviewId),
    onSuccess: setCache,
  });
}

export function useApplyInterviewReview(applicantId: string, interviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionIndexes, extraIndexes }: { questionIndexes: number[]; extraIndexes: number[] }) =>
      applicantsService.applyInterviewReview(applicantId, interviewId, questionIndexes, extraIndexes),
    onSuccess: () => {
      // The interview's questions changed: reload both the recording view and the applicant.
      queryClient.invalidateQueries({ queryKey: interviewRecordingKeys.detail(applicantId, interviewId) });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
    },
  });
}

export function useDeleteInterviewRecording(applicantId: string, interviewId: string) {
  const setCache = useRecordingCache(applicantId, interviewId);
  return useMutation({
    mutationFn: () => applicantsService.deleteInterviewRecording(applicantId, interviewId),
    onSuccess: setCache,
  });
}
