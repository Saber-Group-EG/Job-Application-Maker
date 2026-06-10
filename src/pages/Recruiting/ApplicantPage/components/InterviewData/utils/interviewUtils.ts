import type { Interview, InterviewAnswer } from '../../../../../../types/applicants';

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const formatTimer = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
};

export const isScheduled = (
  interview: Pick<Interview, 'status'> | null | undefined
): boolean => {
  const status = String(interview?.status || '').toLowerCase();
  return status === 'scheduled' || status === 'in_progress';
};

export const isInProgress = (
  interview: Pick<Interview, 'startedAt' | 'endedAt'> | null | undefined
): boolean => Boolean(interview?.startedAt) && !interview?.endedAt;

export const isCompleted = (
  interview: Pick<Interview, 'endedAt' | 'status'> | null | undefined
): boolean => Boolean(interview?.endedAt) || String(interview?.status || '').toLowerCase() === 'completed';

export const computeTotalScore = (questions: InterviewAnswer[] = []): number =>
  questions.reduce((sum, q) => sum + Number(q?.score || 0), 0);

export const computeAchievedScore = (questions: InterviewAnswer[] = []): number =>
  Math.round(
    questions.reduce((sum, q) => sum + Number(q?.achievedScore || 0), 0)
  );

export const getInterviewId = (interview: Interview | null | undefined): string =>
  String(interview?._id || interview?.id || '');

export const getQuestionId = (q: InterviewAnswer | null | undefined): string =>
  String(q?.id || q?._id || '');
