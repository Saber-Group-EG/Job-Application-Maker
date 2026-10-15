import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Swal from '../../../../../../utils/swal';
import { useAuth } from '../../../../../../context/AuthContext';
import { useLocale } from '../../../../../../context/LocaleContext';
import { useScheduleInterview } from '../../../../../../hooks/queries/useApplicants';
import { paths } from '../../../../../../router/Paths';
import type { Applicant, Interview } from '../../../../../../types/applicants';

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

/**
 * "Start interview": creates the interview already running and opens it. One
 * request, a loading state, and a guard so a double click cannot create two.
 * Shared by every page that shows the interview Start button.
 */
export const useStartInterview = (applicantId: string | undefined, applicant: Applicant | null | undefined) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLocale();
  const scheduleInterview = useScheduleInterview();
  const [isStarting, setIsStarting] = useState(false);
  const startingRef = useRef(false);

  const start = useCallback(async () => {
    if (!applicantId || !applicant || startingRef.current) return;
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
        navigate(paths.applicants.interview(applicantId, String(running._id || running.id)));
        return;
      }

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
      const interviews: Interview[] = res.succeeded?.[0]?.interviews ?? res.interviews ?? [];
      const newest = interviews
        .filter((iv) => iv.status === 'in_progress')
        .sort(
          (x, y) =>
            new Date(y.createdAt || y.scheduledAt || 0).getTime() -
            new Date(x.createdAt || x.scheduledAt || 0).getTime()
        )[0];
      const interviewId = String(newest?._id || newest?.id || '');
      if (!interviewId) {
        await Swal.fire({ icon: 'error', title: t('startInterviewFailed', 'interview') });
        return;
      }
      navigate(paths.applicants.interview(applicantId, interviewId));
    } catch {
      // The mutation already shows the server's error.
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [applicantId, applicant, user, navigate, scheduleInterview, t]);

  return { start, isStarting };
};
