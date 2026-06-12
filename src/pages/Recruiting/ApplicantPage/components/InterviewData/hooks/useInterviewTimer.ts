import { useEffect, useMemo, useState } from 'react';
import type { Interview } from '../../../../../../types/applicants';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

/**
 * Returns the live duration (ms) for a given interview, ticking every
 * second when running. Stops on endedAt.
 */
export const useInterviewTimer = (interview: Pick<Interview, 'startedAt' | 'endedAt'> | null) => {
  const [now, setNow] = useState<number>(() => Date.now());

  const status: TimerStatus = useMemo(() => {
    if (!interview?.startedAt) return 'idle';
    if (interview.endedAt) return 'done';
    return 'running';
  }, [interview?.startedAt, interview?.endedAt]);

  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const elapsedMs = useMemo(() => {
    if (!interview?.startedAt) return 0;
    const start = new Date(interview.startedAt).getTime();
    if (Number.isNaN(start)) return 0;
    const end = interview.endedAt ? new Date(interview.endedAt).getTime() : now;
    return Math.max(0, end - start);
  }, [interview?.startedAt, interview?.endedAt, now]);

  return { elapsedMs, status };
};
