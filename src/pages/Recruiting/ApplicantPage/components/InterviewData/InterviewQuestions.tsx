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
import type { NewCustomQuestion } from './views/AssessmentView';
import { InterviewPickerView } from './views/InterviewPickerView';
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
  const [pendingAddGroups, setPendingAddGroups] = useState<string[]>([]);
  const [newCustomQuestions, setNewCustomQuestions] = useState<NewCustomQuestion[]>([]);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>([]);
  const [pendingRemoveGroups, setPendingRemoveGroups] = useState<string[]>([]);
  const saveInFlightRef = useRef(false);
  const pendingGenRef = useRef(0);


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

  // ---- Derived flags ---------------------------------------------------
  const selectedInterview = state.selectedInterview;
  const isStarted = Boolean(selectedInterview?.startedAt);
  const isEnded = Boolean(selectedInterview?.endedAt);
  const isInteractive = isStarted && !isEnded;
  const canStart = Boolean(selectedInterview) && !isStarted && !isEnded;
  const canEnd = Boolean(selectedInterview) && isStarted && !isEnded;
  const canSaveProgress = isInteractive;

  // ---- Pool grouping ---------------------------------------------------
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

  const availableGroups: PoolGroup[] = useMemo(() => {
    return state.questionPool.filter(
      (g) => !attachedGroupKeys.has(g.key) || pendingRemoveGroups.includes(g.key)
    );
  }, [state.questionPool, attachedGroupKeys, pendingRemoveGroups]);

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

  const buildUpdatedQuestions = useCallback((): InterviewAnswer[] => {
    const deletedSet = new Set(pendingRemoveIds);
    const removedGroupsSet = new Set(pendingRemoveGroups);
    // Filter out deleted existing questions and questions in removed groups
    const existing = state.flatExistingQuestions.filter((q) => {
      const qId = String(q?.id || q?._id || '');
      if (deletedSet.has(qId)) return false;
      const meta = (qId && state.groupMeta.meta[qId]) || null;
      const gKey = meta?.key || q?.groupKey || '';
      if (removedGroupsSet.has(gKey)) return false;
      return true;
    });
    // Add questions from pending groups
    pendingAddGroups.forEach((key) => {
      const group = state.questionPool.find((g) => g.key === key);
      if (!group) return;
      group.questions.forEach((q) => {
        existing.push({
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
    // Add new custom questions — no group, they render as standalone rows
    if (newCustomQuestions.length > 0) {
      const customPrefix = `free_${Date.now()}`;
      newCustomQuestions.forEach((q, idx) => {
        const renderId = `new_custom_${idx}`;
        const percent = Number(state.achievedPercentages[renderId] || 0);
        const achieved = Math.round((q.score * percent) / 100);
        const notesValue = state.answers[renderId];
        const notes =
          notesValue === undefined || notesValue === null
            ? ''
            : typeof notesValue === 'string'
            ? notesValue
            : String(notesValue);
        existing.push({
          id: `${customPrefix}_${idx}`,
          question: q.question,
          score: q.score,
          achievedScore: achieved,
          notes,
          answerType: q.answerType,
          choices: q.choices,
          groupKey: '__free__',
        });
      });
    }
    return existing;
  }, [state.flatExistingQuestions, state.questionPool, state.achievedPercentages, state.answers, state.groupMeta.meta, pendingAddGroups, newCustomQuestions, pendingRemoveIds, pendingRemoveGroups]);

  // ---- Handlers --------------------------------------------------------
  const togglePickerKey = useCallback((key: string) => {
    setPickerSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleAddGroup = useCallback((key: string) => {
    pendingGenRef.current++;
    setPendingAddGroups((prev) => [...prev, key]);
    setPendingRemoveGroups((prev) => prev.filter((k) => k !== key));
    // Clear answers/percentages for questions in the re-added group
    state.flatExistingQuestions.forEach((q) => {
      const qId = String(q?.id || q?._id || '');
      const meta = (qId && state.groupMeta.meta[qId]) || null;
      const gKey = meta?.key || q?.groupKey;
      if (gKey === key && qId) {
        state.updateField(qId, { percentage: 0, answer: '' });
      }
    });
  }, [state.flatExistingQuestions, state.groupMeta.meta, state.updateField]);

  const handleCreateQuestion = useCallback((q: NewCustomQuestion) => {
    pendingGenRef.current++;
    setNewCustomQuestions((prev) => [...prev, q]);
  }, []);

  const handleRemoveGroup = useCallback((groupKey: string) => {
    pendingGenRef.current++;
    setPendingAddGroups((prev) => prev.filter((k) => k !== groupKey));
    setPendingRemoveGroups((prev) =>
      prev.includes(groupKey) ? prev : [...prev, groupKey]
    );
  }, []);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    pendingGenRef.current++;
    // Check if it's a custom pending question
    const customIdx = newCustomQuestions.findIndex(
      (_, i) => `new_custom_${i}` === questionId
    );
    if (customIdx !== -1) {
      setNewCustomQuestions((prev) => prev.filter((_, i) => i !== customIdx));
    } else {
      setPendingRemoveIds((prev) => [...prev, questionId]);
    }
  }, [newCustomQuestions]);

  const triggerBackgroundSave = useCallback(async () => {
    if (!state.selectedInterview) return;
    if (saveInFlightRef.current) return;
    const gen = pendingGenRef.current;
    const hasPending =
      pendingAddGroups.length > 0 ||
      pendingRemoveGroups.length > 0 ||
      pendingRemoveIds.length > 0 ||
      newCustomQuestions.length > 0;
    if (!hasPending) return;
    const updated = buildUpdatedQuestions();
    let cleared = false;
    void cleared; 
    saveInFlightRef.current = true;
    try {
      const ok = await actions.savePickedGroups(updated, false, true);
      if (ok && gen === pendingGenRef.current) {
        setPendingAddGroups([]);
        setNewCustomQuestions([]);
        setPendingRemoveIds([]);
        setPendingRemoveGroups([]);
        cleared = true;
      }
    } catch {
      // silent background failure
    } finally {
      saveInFlightRef.current = false;
    }
  }, [state, buildUpdatedQuestions, pendingAddGroups, pendingRemoveGroups, pendingRemoveIds, newCustomQuestions, actions]);

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

  const handleQuestionChange = useCallback(
    (questionId: string, patch: { percentage?: number; answer?: unknown }) => {
      // Local state only — no auto-save. All data is persisted on End Interview.
      state.updateField(questionId, patch);
    },
    [state]
  );

  // ---- Background auto-save --------------------------------------------
  const triggerSaveRef = useRef(triggerBackgroundSave);
  triggerSaveRef.current = triggerBackgroundSave;
  useEffect(() => {
    const hasPending =
      pendingAddGroups.length > 0 ||
      pendingRemoveGroups.length > 0 ||
      pendingRemoveIds.length > 0 ||
      newCustomQuestions.length > 0;
    if (!hasPending || isEnded) return;
    triggerSaveRef.current();
  }, [pendingAddGroups, pendingRemoveGroups, pendingRemoveIds, newCustomQuestions, isEnded]);

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
        canStart={canStart}
        canEnd={canEnd}
        canSaveProgress={canSaveProgress}
        availableGroups={availableGroups}
        pendingAddGroups={pendingAddGroups}
        pendingRemoveIds={pendingRemoveIds}
        newCustomQuestions={newCustomQuestions}
        onAddGroup={handleAddGroup}
        onCreateQuestion={handleCreateQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onRemoveGroup={handleRemoveGroup}
        pendingRemoveGroups={pendingRemoveGroups}
        onBack={() => {
          if (state.scheduledInterviews.length > 1) {
            state.setSelectedInterviewId(null);
            state.setView('interview-picker');
          } else {
            state.setSelectedInterviewId(null);
            state.setView('selection');
          }
        }}
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
