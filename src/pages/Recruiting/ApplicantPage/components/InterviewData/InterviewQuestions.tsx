import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  Applicant,
  Interview,
  InterviewAnswer,
  InterviewQuestionsProps,
} from '../../../../../types/applicants';
import { useInterviewActions } from './hooks/useInterviewActions';
import { useInterviewState } from './hooks/useInterviewState';
import { useInterviewTimer } from './hooks/useInterviewTimer';
import { applicantsKeys } from '../../../../../hooks/queries/useApplicants';
import { getInterviewId } from './utils/interviewUtils';
import { AssessmentView } from './views/AssessmentView';
import { InterviewPickerView } from './views/InterviewPickerView';
import { ManageQuestionsView } from './views/ManageQuestionsView';
import { QuestionPickerView } from './views/QuestionPickerView';
import { SelectionView } from './views/SelectionView';
import type { PoolGroup } from './hooks/useQuestionPool';

const formatScheduledAt = (iso: string | undefined): string => {
  if (!iso) return 'an unscheduled time';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'an unscheduled time';
  }
};

const InterviewQuestions = ({
  applicantId = '',
  onRequestScheduleInterview,
  autoSelectInterviewId = null,
}: InterviewQuestionsProps) => {
  const queryClient = useQueryClient();
  const state = useInterviewState(applicantId, autoSelectInterviewId);
  const actions = useInterviewActions({
    applicantId,
    interview: state.selectedInterview,
    onQuestionsPersisted: (saved) => {
      // Seed group meta from the response so reopened interviews still know
      // which group each question belongs to.
      if (saved && saved.length > 0) {
        state.groupMeta.seedFromSaved(saved as InterviewAnswer[], saved);
      }
    },
  });

  // Timer (ticks when in-progress)
  const { elapsedMs } = useInterviewTimer(state.selectedInterview);

  // Picker local state
  const [pickerSelectedKeys, setPickerSelectedKeys] = useState<string[]>([]);
  const [manageAddKeys, setManageAddKeys] = useState<string[]>([]);
  const [manageRemoveKeys, setManageRemoveKeys] = useState<string[]>([]);

  // When entering the question picker, pre-select the currently attached
  // groups so the user can confirm their existing setup.
  useEffect(() => {
    if (state.view !== 'question-picker') return;
    const attached = state.flatExistingQuestions
      .map((q) => {
        const qId = getInterviewId({ _id: q.id || q._id } as Interview);
        const meta = (qId && state.groupMeta.meta[qId]) || null;
        return meta?.key || q?.groupKey;
      })
      .filter((k): k is string => Boolean(k));
    setPickerSelectedKeys(Array.from(new Set(attached)));
  }, [state.view, state.flatExistingQuestions, state.groupMeta.meta]);

  // Reset manage pending state when entering manage view
  useEffect(() => {
    if (state.view === 'manage-questions') {
      setManageAddKeys([]);
      setManageRemoveKeys([]);
    }
  }, [state.view]);

  // ---- Derived flags ---------------------------------------------------
  const selectedInterview = state.selectedInterview;
  const isStarted = Boolean(selectedInterview?.startedAt);
  const isEnded = Boolean(selectedInterview?.endedAt);
  const isInteractive = isStarted && !isEnded;
  const canEditQuestions = Boolean(selectedInterview) && !isEnded;
  const canStart = Boolean(selectedInterview) && !isStarted && !isEnded;
  const canEnd = Boolean(selectedInterview) && isStarted && !isEnded;
  const canSaveProgress = isInteractive;

  // ---- Pool grouping for manage view -----------------------------------
  const attachedGroupKeys = useMemo(() => {
    const set = new Set<string>();
    state.flatExistingQuestions.forEach((q) => {
      const qId = String(q?.id || q?._id || '');
      const meta = (qId && state.groupMeta.meta[qId]) || null;
      const key = meta?.key || q?.groupKey;
      if (key) set.add(key);
    });
    return set;
  }, [state.flatExistingQuestions, state.groupMeta.meta]);

  const attachedGroups: PoolGroup[] = useMemo(() => {
    return state.questionPool.filter((g) => attachedGroupKeys.has(g.key));
  }, [state.questionPool, attachedGroupKeys]);

  const availableGroups: PoolGroup[] = useMemo(() => {
    return state.questionPool.filter(
      (g) => !attachedGroupKeys.has(g.key) || manageAddKeys.includes(g.key)
    );
  }, [state.questionPool, attachedGroupKeys, manageAddKeys]);

  // ---- Question payload builders --------------------------------------
  const buildQuestionsFromGroups = useCallback(
    (keys: string[]): InterviewAnswer[] => {
      const out: InterviewAnswer[] = [];
      keys.forEach((key) => {
        const group = state.questionPool.find((g) => g.key === key);
        if (!group) return;
        group.questions.forEach((q) => {
          out.push({
            _id: q._id,
            id: q.id,
            question: q.question,
            score: q.score,
            achievedScore: 0,
            notes: '',
            answerType: q.answerType,
            choices: q.choices,
            groupKey: group.key,
            groupName: group.name,
            groupSource: group.source,
          });
        });
      });
      return out;
    },
    [state.questionPool]
  );

  const buildMergedPayload = useCallback((): InterviewAnswer[] => {
    // Start with the existing questions, drop any group marked for removal,
    // append any new groups being added.
    const finalKeys = new Set<string>();
    state.flatExistingQuestions.forEach((q) => {
      const qId = String(q?.id || q?._id || '');
      const meta = (qId && state.groupMeta.meta[qId]) || null;
      const key = meta?.key || q?.groupKey;
      if (!key) return;
      if (manageRemoveKeys.includes(key)) return;
      finalKeys.add(key);
    });
    manageAddKeys.forEach((k) => finalKeys.add(k));
    return buildQuestionsFromGroups(Array.from(finalKeys));
  }, [
    state.flatExistingQuestions,
    state.groupMeta.meta,
    manageAddKeys,
    manageRemoveKeys,
    buildQuestionsFromGroups,
  ]);

  // ---- Handlers --------------------------------------------------------
  const togglePickerKey = useCallback((key: string) => {
    setPickerSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleManageAdd = useCallback((key: string) => {
    setManageAddKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleManageRemove = useCallback((key: string) => {
    setManageRemoveKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleSaveQuestions = useCallback(async () => {
    if (!state.selectedInterview) return;
    const built = buildQuestionsFromGroups(pickerSelectedKeys);
    if (built.length === 0) return;
    const ok = await actions.savePickedGroups(built, false);
    if (ok) {
      setPickerSelectedKeys([]);
      state.setView('assessment');
    }
  }, [state, pickerSelectedKeys, buildQuestionsFromGroups, actions]);

  const handleSaveAndStart = useCallback(async () => {
    if (!state.selectedInterview) return;
    const built = buildQuestionsFromGroups(pickerSelectedKeys);
    if (built.length === 0) return;
    const ok = await actions.savePickedGroups(built, true);
    if (ok) {
      setPickerSelectedKeys([]);
      state.setView('assessment');
      state.setOpenGroups(Array.from(new Set(built.map((q) => q.groupKey).filter(Boolean) as string[])));
    }
  }, [state, pickerSelectedKeys, buildQuestionsFromGroups, actions]);

  // Double-fire guards: prevent the mutation from being kicked off twice
  // when the button is clicked rapidly or React batches the event.
  const startInFlightRef = useRef(false);
  const endInFlightRef = useRef(false);

  const handleStart = useCallback(async () => {
    const interview = state.selectedInterview;
    if (!interview) return;
    if (interview.startedAt) return; // already started
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;

    // LOCAL-ONLY: write startedAt + status into the React Query cache.
    // No network request. The server only hears about it on End Interview.
    const startedAtIso = new Date().toISOString();
    const interviewId = getInterviewId(interview);
    if (applicantId && interviewId) {
      queryClient.setQueryData<Applicant | undefined>(
        applicantsKeys.detail(applicantId),
        (prev) => {
          if (!prev || !Array.isArray(prev.interviews)) return prev;
          return {
            ...prev,
            interviews: prev.interviews.map((iv) =>
              getInterviewId(iv) === interviewId
                ? { ...iv, startedAt: startedAtIso, status: 'in_progress' }
                : iv
            ),
          };
        }
      );
    }

    await actions.startInterview();
    startInFlightRef.current = false;
  }, [state.selectedInterview, applicantId, queryClient, actions]);

  const handleEnd = useCallback(async () => {
    if (!state.selectedInterview) return;
    if (endInFlightRef.current) return;
    endInFlightRef.current = true;
    const finalQuestions = state.buildQuestionsPayload();
    actions.clearDebounce();
    try {
      await actions.endInterview(finalQuestions);
    } finally {
      endInFlightRef.current = false;
    }
  }, [state, actions]);

  const handleSaveProgress = useCallback(() => {
    // Disabled per product decision: no network requests until End Interview.
    // The score/notes are kept in local state and persisted on End.
  }, []);

  const handleApplyManage = useCallback(async () => {
    if (!state.selectedInterview) return;
    const next = buildMergedPayload();
    if (next.length === 0) return;
    const ok = await actions.savePickedGroups(next, false);
    if (ok) {
      setManageAddKeys([]);
      setManageRemoveKeys([]);
      state.setView('assessment');
    }
  }, [state, buildMergedPayload, actions]);

  const handleQuestionChange = useCallback(
    (questionId: string, patch: { percentage?: number; answer?: unknown }) => {
      // Local state only — no auto-save. All data is persisted on End Interview.
      state.updateField(questionId, patch);
    },
    [state]
  );

  // ---- Render ----------------------------------------------------------
  if (state.view === 'selection') {
    return (
      <SelectionView
        hasExistingInterview={state.scheduledInterviews.length > 0}
        interviewCount={state.scheduledInterviews.length}
        onSchedule={() => onRequestScheduleInterview?.()}
        onUseExisting={() => {
          if (state.scheduledInterviews.length === 1) {
            state.openInterview(state.scheduledInterviews[0]);
          } else {
            state.setView('interview-picker');
          }
        }}
      />
    );
  }

  if (state.view === 'interview-picker') {
    return (
      <InterviewPickerView
        interviews={state.scheduledInterviews as Interview[]}
        onBack={() => state.setView('selection')}
        onPick={(iv) => state.openInterview(iv)}
      />
    );
  }

  if (state.view === 'question-picker' && state.selectedInterview) {
    return (
      <QuestionPickerView
        pool={state.questionPool}
        isLoading={state.questionPool.length === 0}
        selectedKeys={pickerSelectedKeys}
        onToggle={togglePickerKey}
        onBack={() => {
          // Always go to the interview picker if there are multiple
          // interviews, otherwise back to selection.
          if (state.scheduledInterviews.length > 1) {
            state.setView('interview-picker');
          } else {
            state.setView('selection');
          }
        }}
        onSaveOnly={handleSaveQuestions}
        onSaveAndStart={handleSaveAndStart}
        isSaving={actions.isPickerSaving || actions.isMutating}
        scheduledAtLabel={formatScheduledAt(state.selectedInterview.scheduledAt)}
      />
    );
  }

  if (state.view === 'manage-questions' && state.selectedInterview) {
    return (
      <ManageQuestionsView
        attachedGroups={attachedGroups}
        availableGroups={availableGroups}
        pendingAddKeys={manageAddKeys}
        pendingRemoveKeys={manageRemoveKeys}
        onTogglePendingAdd={toggleManageAdd}
        onTogglePendingRemove={toggleManageRemove}
        onBack={() => state.setView('assessment')}
        onApply={handleApplyManage}
        isApplying={actions.isMutating}
      />
    );
  }

  if (state.view === 'assessment' && state.selectedInterview) {
    return (
      <AssessmentView
        interview={state.selectedInterview}
        groupedQuestions={state.groupedQuestions}
        openGroups={state.openGroups}
        percentages={state.achievedPercentages}
        answers={state.answers}
        totals={state.totals}
        elapsedMs={elapsedMs}
        isInteractive={isInteractive}
        isStarted={isStarted}
        isEnded={isEnded}
        fieldSaveStatus={actions.fieldSaveStatus}
        isMutating={actions.isMutating}
        canEditQuestions={canEditQuestions}
        canStart={canStart}
        canEnd={canEnd}
        canSaveProgress={canSaveProgress}
        onBack={() => {
          if (state.scheduledInterviews.length > 1) {
            state.setSelectedInterviewId(null);
            state.setView('interview-picker');
          } else {
            state.setSelectedInterviewId(null);
            state.setView('selection');
          }
        }}
        onEditQuestions={() => state.setView('manage-questions')}
        onStart={handleStart}
        onEnd={handleEnd}
        onSaveProgress={handleSaveProgress}
        onToggleGroup={state.toggleGroup}
        onQuestionChange={handleQuestionChange}
      />
    );
  }

  // Fallback: selection view
  return (
    <SelectionView
      hasExistingInterview={state.scheduledInterviews.length > 0}
      interviewCount={state.scheduledInterviews.length}
      onSchedule={() => onRequestScheduleInterview?.()}
      onUseExisting={() => {
        if (state.scheduledInterviews.length === 1) {
          state.openInterview(state.scheduledInterviews[0]);
        } else {
          state.setView('interview-picker');
        }
      }}
    />
  );
};

export default InterviewQuestions;
