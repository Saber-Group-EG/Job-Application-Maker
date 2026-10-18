import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Swal from '../../../../../../utils/swal';
import { useAuth } from '../../../../../../context/AuthContext';
import { useLocale } from '../../../../../../context/LocaleContext';
import { applicantsKeys, useScheduleInterview } from '../../../../../../hooks/queries/useApplicants';
import type { Applicant, Interview } from '../../../../../../types/applicants';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

/**
 * "Start interview": creates the interview already running and returns its id (the caller opens it in place). One
 * request, a loading state, and a guard so a double click cannot create two.
 * Shared by every page that shows the interview Start button.
 */
export const useStartInterview = (applicantId: string | undefined, applicant: Applicant | null | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLocale();
  const scheduleInterview = useScheduleInterview();
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);

  const start = useCallback(async (): Promise<string | null> => {
    if (!applicantId || !applicant || startingRef.current) return null;
    startingRef.current = true;
    setIsStarting(true);
    try {
      // An interview already running (started in the last 12 hours): open it
      // instead of creating another one.
      const running = ((applicant.interviews ?? []) as Interview[]).find(
        (iv) =>
          iv.status === 'in_progress' &&
          !iv.endedAt &&
          Date.now() - new Date(iv.startedAt || iv.scheduledAt || 0).getTime() < TWELVE_HOURS
      );
      if (running) {
        return String(running._id || running.id);
      }

      const knownIds = new Set(
        ((applicant.interviews ?? []) as Interview[]).map((iv) => String(iv._id || iv.id || ''))
      );
      const conductedById = user?._id ? String(user._id) : user?.id ? String(user.id) : '';
      const now = new Date().toISOString();
      const result = await scheduleInterview.mutateAsync({
        id: applicantId,
        silent: true,
        data: {
          status: 'in_progress',
          scheduledAt: now,
          startedAt: now,
          type: 'in-person',
          ...(conductedById ? { conductedBy: conductedById } : {}),
        },
      });
      const res = result as {
        succeeded?: Array<{ applicantId?: string; interviews?: Interview[] }>;
        interviews?: Interview[];
      };
      // Find the interview we just created: prefer one we did not know about, and
      // fall back to a fresh read of the applicant when the response has no list.
      const pickNew = (list: Interview[]): Interview | undefined => {
        const running = list.filter((iv) => iv.status === 'in_progress' && !iv.endedAt);
        const byTime = (x: Interview, y: Interview) =>
          new Date(y.createdAt || y.scheduledAt || 0).getTime() -
          new Date(x.createdAt || x.scheduledAt || 0).getTime();
        return (
          running.filter((iv) => !knownIds.has(String(iv._id || iv.id || ''))).sort(byTime)[0] ??
          running.sort(byTime)[0]
        );
      };
      let newest = pickNew(res.succeeded?.[0]?.interviews ?? res.interviews ?? []);
      if (!newest) {
        try {
          const fresh = await queryClient.fetchQuery({
            queryKey: applicantsKeys.detail(applicantId),
            staleTime: 0,
          });
          newest = pickNew(((fresh as Applicant | undefined)?.interviews ?? []) as Interview[]);
        } catch {
          newest = undefined;
        }
      }
      const interviewId = String(newest?._id || newest?.id || '');
      if (!interviewId) {
        await Swal.fire({ icon: 'error', title: t('startInterviewFailed', 'interview') });
        return null;
      }
      // The interview page looks the interview up in the applicant's data, so that data must
      // contain the new interview before we go there.
      await queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      return interviewId;
    } catch {
      // The mutation already shows the server's error.
      return null;
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [applicantId, applicant, user, queryClient, scheduleInterview, t]);

  return { start, isStarting };
};
