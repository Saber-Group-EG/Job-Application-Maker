// hooks/queries/useMail.ts — mail history queries and actions.
// Every key starts with 'mail-logs' so sending mail anywhere can refresh
// all of them with one invalidateQueries({ queryKey: ['mail-logs'] }).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService } from '../../services/mailService';
import type { MailListParams, MailReplyPayload } from '../../types/mail';

const MAIL_POLL_INTERVAL_MS = 30 * 1000;

export const mailKeys = {
  all: ['mail-logs'] as const,
  list: (params: MailListParams) => ['mail-logs', 'list', params] as const,
  counts: (params: { companyId?: string; jobPosition?: string }) => ['mail-logs', 'counts', params] as const,
  applicantCounts: (companyId?: string) => ['mail-logs', 'applicant-counts', companyId ?? 'all'] as const,
  byApplicant: (applicantId: string) => ['mail-logs', 'applicant', applicantId] as const,
  detail: (id: string) => ['mail-logs', 'detail', id] as const,
};

export function useMailList(params: MailListParams, { poll = true }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: mailKeys.list(params),
    queryFn: () => mailService.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: poll ? MAIL_POLL_INTERVAL_MS : false,
  });
}

export function useMailCounts(params: { companyId?: string; jobPosition?: string }) {
  return useQuery({
    queryKey: mailKeys.counts(params),
    queryFn: () => mailService.counts(params),
    refetchInterval: MAIL_POLL_INTERVAL_MS,
  });
}

export function useApplicantMailCounts(companyId?: string, enabled = true) {
  return useQuery({
    queryKey: mailKeys.applicantCounts(companyId),
    queryFn: () => mailService.applicantCounts(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useApplicantMails(applicantId?: string) {
  return useQuery({
    queryKey: mailKeys.byApplicant(applicantId || 'none'),
    queryFn: () => mailService.byApplicant(applicantId as string),
    enabled: !!applicantId,
    staleTime: 60 * 1000,
  });
}

// Full record (with webhook events) for the detail view's raw metadata.
export function useMailDetail(id?: string | null, enabled = true) {
  return useQuery({
    queryKey: mailKeys.detail(id || 'none'),
    queryFn: () => mailService.get(id as string),
    enabled: !!id && enabled,
  });
}

export function useAssignSuggestions(mailId: string | null, q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['mail-logs', 'assign-suggestions', mailId, q] as const,
    queryFn: () => mailService.assignSuggestions(mailId as string, q),
    enabled: !!mailId && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAssignMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mailId, applicantId }: { mailId: string; applicantId: string }) =>
      mailService.assign(mailId, applicantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailKeys.all }),
  });
}

export function useReplyToMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mailId, payload }: { mailId: string; payload: MailReplyPayload }) =>
      mailService.reply(mailId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailKeys.all }),
  });
}

export function useDeleteMail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mailId: string) => mailService.remove(mailId),
    onSuccess: () => qc.invalidateQueries({ queryKey: mailKeys.all }),
  });
}
