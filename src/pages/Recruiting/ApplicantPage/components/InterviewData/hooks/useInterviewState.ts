import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApplicant } from '../../../../../../hooks/queries';
import type { Applicant, Interview, InterviewAnswer } from '../../../../../../types/applicants';
import {
  isScheduled,
  getInterviewId,
  getQuestionId,
  computeAchievedScore,
  computeTotalScore,
} from '../utils/interviewUtils';
import { useGroupMeta } from './useGroupMeta';
import { useQuestionPool, type PoolGroup } from './useQuestionPool';

export type InterviewViewName =
  | 'selection'
  | 'interview-picker'
  | 'question-picker'
  | 'assessment';

type ExistingInterview = Interview;
type ExistingQuestion = InterviewAnswer;

const resolveApplicantCompanyId = (applicant: Applicant | undefined): string => {
  if (!applicant) return '';
  const resolve = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const obj = v as { _id?: string; id?: string };
      return obj?._id || obj?.id || '';
    }
    return '';
  };
  const direct = applicant as { companyId?: string | { _id?: string; id?: string } };
  const nested = (applicant as { jobPositionId?: { companyId?: string | { _id?: string; id?: string } } })
    .jobPositionId;
  return (
    resolve(direct.companyId) ||
    resolve(nested?.companyId) ||
    ''
  );
};

export const useInterviewState = (
  applicantId: string,
  autoSelectInterviewId: string | null | undefined,
  externalApplicantData?: Applicant
) => {
  const { data: fetchedData } = useApplicant(applicantId, { enabled: !!applicantId && !externalApplicantData });
  const applicantData = externalApplicantData ?? fetchedData;
  const companyId = useMemo(() => resolveApplicantCompanyId(applicantData), [applicantData]);
  const { pool: questionPool } = useQuestionPool(companyId);

  const allInterviews = useMemo<ExistingInterview[]>(
    () =>
      (Array.isArray((applicantData as { interviews?: ExistingInterview[] } | undefined)?.interviews)
        ? (applicantData as { interviews: ExistingInterview[] }).interviews
        : []),
    [applicantData]
  );

  const scheduledInterviews = useMemo<ExistingInterview[]>(
    () => allInterviews.filter((iv) => isScheduled(iv)),
    [allInterviews]
  );

  // View + selection state
  const [view, setView] = useState<InterviewViewName>('selection');
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [achievedPercentages, setAchievedPercentages] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const selectedInterview = useMemo<ExistingInterview | null>(() => {
    if (!selectedInterviewId) return null;
    return (
      allInterviews.find((iv) => getInterviewId(iv) === selectedInterviewId) ?? null
    );
  }, [allInterviews, selectedInterviewId]);

  const flatExistingQuestions = useMemo<ExistingQuestion[]>(
    () => (selectedInterview && Array.isArray(selectedInterview.questions) ? selectedInterview.questions : []),
    [selectedInterview]
  );

  // Group meta (persisted)
  const groupMeta = useGroupMeta(applicantId, selectedInterviewId ?? '');

  // Auto-load on first data arrival: pick a single interview directly, or
  // open the picker if there are multiple. Auto-select a newly created
  // interview once. We guard with a ref so subsequent cache updates
  // (e.g. after Start Interview / Save & Start) do NOT clobber the user's
  // current view — that was sending the user back to the picker.
  const lastConsumedAutoSelectRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef<boolean>(false);
  useEffect(() => {
    if (autoSelectInterviewId && autoSelectInterviewId !== lastConsumedAutoSelectRef.current) {
      lastConsumedAutoSelectRef.current = autoSelectInterviewId;
      const found = allInterviews.find((iv) => getInterviewId(iv) === autoSelectInterviewId);
      if (found) {
        initialLoadDoneRef.current = true;
        openInterview(found);
        return;
      }
    }
    if (initialLoadDoneRef.current) return;
    if (allInterviews.length === 0) return;
    initialLoadDoneRef.current = true;
    if (allInterviews.length === 1) {
      openInterview(allInterviews[0]);
    } else {
      setView('interview-picker');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInterviews, autoSelectInterviewId]);

  // When the selected interview changes (or its questions are replaced by an
  // optimistic update), seed local state from it. Uses useLayoutEffect so
  // groupMeta is populated BEFORE the first paint — otherwise
  // groupedQuestions collapses everything into __ungrouped__.
  //
  // We preserve the user's existing slider state for any question whose id
  // is still present, and only seed entries for new questions from their
  // achievedScore. This way, the slider responds to drags immediately after
  // a "Save & Start" replaces the question list.
  useLayoutEffect(() => {
    if (!selectedInterview) return;
    const questions = Array.isArray(selectedInterview.questions) ? selectedInterview.questions : [];
    if (questions.length === 0) {
      setAchievedPercentages({});
      setAnswers({});
      setOpenGroups([]);
      return;
    }
    setAchievedPercentages((prev) => {
      const next: Record<string, number> = {};
      questions.forEach((q) => {
        const qId = getQuestionId(q);
        if (!qId) return;
        const score = Number(q?.score ?? 0);
        const achieved = Number(q?.achievedScore ?? 0);
        if (prev[qId] !== undefined) {
          next[qId] = prev[qId];
        } else if (score > 0) {
          next[qId] = Math.max(0, Math.min(100, (achieved / score) * 100));
        }
      });
      return next;
    });
    setAnswers((prev) => {
      const next: Record<string, unknown> = {};
      questions.forEach((q) => {
        const qId = getQuestionId(q);
        if (!qId) return;
        if (prev[qId] !== undefined) {
          next[qId] = prev[qId];
        } else if (q?.notes) {
          next[qId] = q.notes;
        }
      });
      return next;
    });
    groupMeta.seedFromLoaded(questions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterviewId, flatExistingQuestions]);

  // ---- Actions ----------------------------------------------------------
  const openInterview = useCallback((interview: ExistingInterview) => {
    const id = getInterviewId(interview);
    if (!id) return;
    initialLoadDoneRef.current = true;
    setSelectedInterviewId(id);
    const questions = Array.isArray(interview.questions) ? interview.questions : [];
    if (questions.length === 0) {
      setView('question-picker');
    } else {
      setView('assessment');
    }
  }, []);

  const goBack = useCallback(() => {
    if (scheduledInterviews.length > 1) {
      setSelectedInterviewId(null);
      setView('interview-picker');
    } else {
      setSelectedInterviewId(null);
      setView('selection');
    }
  }, [scheduledInterviews.length]);

  const updateField = useCallback(
    (questionId: string, patch: { percentage?: number; answer?: unknown }) => {
      if (patch.percentage !== undefined) {
        setAchievedPercentages((prev) => ({ ...prev, [questionId]: patch.percentage! }));
      }
      if (patch.answer !== undefined) {
        setAnswers((prev) => ({ ...prev, [questionId]: patch.answer }));
      }
    },
    []
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((k) => k !== groupKey) : [...prev, groupKey]
    );
  }, []);

  // Build the questions payload to send to the backend. Combines the
  // server-side question shape (id, score, choices, etc.) with the user's
  // local percentages/answers/notes.
  const buildQuestionsPayload = useCallback((): InterviewAnswer[] => {
    if (!selectedInterview) return [];
    return flatExistingQuestions
      .map((q) => {
        const qId = getQuestionId(q);
        if (!qId) return null;
        const score = Number(q?.score ?? 0);
        const percent = Number(achievedPercentages[qId] || 0);
        const achieved = Math.round((score * percent) / 100);
        const notesValue = answers[qId];
        const meta = groupMeta.meta[qId];
        return {
          _id: q?._id,
          id: q?.id,
          question: q?.question || '',
          score,
          achievedScore: achieved,
          notes:
            notesValue === undefined || notesValue === null
              ? ''
              : typeof notesValue === 'string'
              ? notesValue
              : String(notesValue),
          answerType: q?.answerType,
          choices: Array.isArray(q?.choices) ? q?.choices : [],
          groupKey: meta?.key || q?.groupKey,
          groupName: meta?.name || q?.groupName,
          groupSource: (meta?.source || q?.groupSource) as 'company' | 'user' | undefined,
        } as InterviewAnswer;
      })
      .filter((item): item is InterviewAnswer => item !== null);
  }, [selectedInterview, flatExistingQuestions, achievedPercentages, answers, groupMeta.meta]);

  // ---- Grouping (display) ----------------------------------------------
  const groupedQuestions = useMemo<
    Array<{
      key: string;
      name: string;
      source: 'company' | 'user';
      questions: ExistingQuestion[];
    }>
  >(() => {
    if (flatExistingQuestions.length === 0) return [];
    const groups: Record<
      string,
      { name: string; source: 'company' | 'user'; questions: ExistingQuestion[] }
    > = {};
    const order: string[] = [];
    flatExistingQuestions.forEach((q) => {
      const qId = getQuestionId(q);
      const meta = (qId && groupMeta.meta[qId]) || null;
      const key = meta?.key || q?.groupKey || '__ungrouped__';
      if (!groups[key]) {
        groups[key] = {
          name: meta?.name || q?.groupName || 'Questions',
          source:
            (meta?.source as 'company' | 'user') ||
            (q?.groupSource as 'company' | 'user') ||
            'company',
          questions: [],
        };
        order.push(key);
      }
      groups[key].questions.push(q);
    });
    return order.map((k) => ({ key: k, ...groups[k] }));
  }, [flatExistingQuestions, groupMeta.meta]);

  // ---- Totals -----------------------------------------------------------
  const totals = useMemo(() => {
    const questions = buildQuestionsPayload();
    const totalScore = computeTotalScore(questions);
    const achieved = computeAchievedScore(questions);
    const answered = questions.filter((q) => Number(q.achievedScore) > 0 || q.notes).length;
    const completion = questions.length === 0 ? 0 : (answered / questions.length) * 100;
    const performance = totalScore > 0 ? (achieved / totalScore) * 100 : 0;
    return {
      totalScore,
      achieved,
      answered,
      total: questions.length,
      completion,
      performance,
    };
  }, [buildQuestionsPayload]);

  return {
    // data
    applicant: applicantData,
    allInterviews,
    scheduledInterviews,
    selectedInterview,
    flatExistingQuestions,
    groupedQuestions,
    questionPool,
    companyId,
    // state
    view,
    setView,
    openGroups,
    setOpenGroups,
    toggleGroup,
    achievedPercentages,
    answers,
    selectedInterviewId,
    setSelectedInterviewId,
    // meta
    groupMeta,
    // totals
    totals,
    // actions
    openInterview,
    goBack,
    updateField,
    buildQuestionsPayload,
  };
};

export type InterviewState = ReturnType<typeof useInterviewState>;
export type { PoolGroup };
