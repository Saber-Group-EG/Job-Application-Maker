import { useState, useMemo } from 'react';
import { Building2, Library, Plus } from 'lucide-react';
import { QuestionGroupCard } from '../components/QuestionGroupCard';
import { QuestionRow } from '../components/QuestionRow';
import { InterviewHeader } from '../components/InterviewHeader';
import { InterviewStatsBar } from '../components/InterviewStatsBar';
import { getQuestionId } from '../utils/interviewUtils';
import { useLocale } from '../../../../../../context/LocaleContext';
import type { FieldSaveStatus } from '../hooks/useInterviewActions';
import type { PoolGroup } from '../hooks/useQuestionPool';
import type { Interview, InterviewAnswer } from '../../../../../../types/applicants';

export type NewCustomQuestion = {
  _tempId?: string;
  question: string;
  score: number;
  answerType: string;
  choices: string[];
};

type GroupedGroup = {
  key: string;
  name: string;
  source: 'company' | 'user';
  questions: InterviewAnswer[];
};

export type AssessmentViewProps = {
  interview: Interview;
  groupedQuestions: GroupedGroup[];
  openGroups: string[];
  percentages: Record<string, number>;
  answers: Record<string, unknown>;
  totals: {
    totalScore: number;
    achieved: number;
    answered: number;
    total: number;
    completion: number;
    performance: number;
  };
  elapsedMs: number;
  isInteractive: boolean;
  isStarted: boolean;
  isEnded: boolean;
  fieldSaveStatus: FieldSaveStatus;
  isMutating: boolean;
  canStart: boolean;
  canEnd: boolean;
  canSaveProgress: boolean;
  availableGroups: PoolGroup[];
  pendingAddGroups: string[];
  pendingRemoveIds: string[];
  pendingRemoveGroups: string[];
  newCustomQuestions: NewCustomQuestion[];
  onAddGroup: (key: string) => void;
  onCreateQuestion: (q: NewCustomQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onRemoveGroup: (groupKey: string) => void;
  onBack: () => void;
  onStart: () => void;
  onEnd: () => void;
  onSaveProgress: () => void;
  onToggleGroup: (key: string) => void;
  onQuestionChange: (
    questionId: string,
    patch: { percentage?: number; answer?: unknown }
  ) => void;
};

const CREATE_QUESTION_INITIAL: NewCustomQuestion = {
  question: '',
  score: 0,
  answerType: 'text',
  choices: [],
};

const CreateQuestionForm = ({
  onAdd,
}: {
  onAdd: (q: NewCustomQuestion) => void;
}) => {
  const { t } = useLocale();
  const [form, setForm] = useState<NewCustomQuestion>({ ...CREATE_QUESTION_INITIAL });
  const [choicesText, setChoicesText] = useState('');

  const isFormValid = form.question.trim().length > 0 && form.score >= 0;

  const handleAdd = () => {
    if (!isFormValid) return;
    const choices = form.answerType === 'text' || form.answerType === 'number'
      ? []
      : choicesText.split(',').map((c) => c.trim()).filter(Boolean);
    onAdd({ ...form, choices });
    setForm({ ...CREATE_QUESTION_INITIAL });
    setChoicesText('');
  };

  const showChoices = form.answerType === 'radio' ||  form.answerType === 'dropdown';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <p className="text-sm font-bold text-slate-800">{t('createCustomQuestion', 'interview')}</p>
      <input
        type="text"
        value={form.question}
        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
        placeholder={t('enterQuestionText', 'interview')}
        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
      />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">{t('score', 'interview')}</label>
          <input
            type="number"
            min={0}
            value={form.score}
            onChange={(e) => setForm((f) => ({ ...f, score: Math.max(0, Number(e.target.value)) }))}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">{t('answerType', 'interview')}</label>
          <select
            value={form.answerType}
            onChange={(e) => setForm((f) => ({ ...f, answerType: e.target.value }))}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          >
            <option value="text">{t('textOption', 'interview')}</option>
            <option value="number">{t('numberOption', 'interview')}</option>
            <option value="radio">{t('radioOption', 'interview')}</option>
            <option value="checkbox">{t('checkboxOption', 'interview')}</option>
            <option value="dropdown">{t('dropdownOption', 'interview')}</option>
            <option value="tags">{t('tagsOption', 'interview')}</option>
          </select>
        </div>
      </div>
      {showChoices && (
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('choicesCommaSeparated', 'interview')}</label>
          <input
            type="text"
            value={choicesText}
            onChange={(e) => setChoicesText(e.target.value)}
            placeholder={t('optionsPlaceholder', 'interview')}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!isFormValid}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('addQuestion', 'interview')}
        </button>
      </div>
    </div>
  );
};

const buildMergedGroups = (
  serverGroups: GroupedGroup[],
  pool: PoolGroup[],
  pendingKeys: string[],
  pendingRemoveIds: string[],
  pendingRemoveGroups: string[]
): GroupedGroup[] => {
  const deletedSet = new Set(pendingRemoveIds);
  const removedGroupsSet = new Set(pendingRemoveGroups);
  const result: GroupedGroup[] = [];
  const seenKeys = new Set<string>();

  // 1. Server groups (filter out deleted questions, removed groups, and free questions)
  serverGroups.forEach((g) => {
    if (removedGroupsSet.has(g.key)) return;
    if (g.key === '__free__') return;
    seenKeys.add(g.key);
    const filtered = g.questions.filter((q) => {
      const qId = String(q?.id || q?._id || '');
      return !deletedSet.has(qId);
    });
    if (filtered.length > 0) {
      result.push({ ...g, questions: filtered });
    }
  });

  // 2. Pending groups from pool
  pendingKeys.forEach((key) => {
    if (removedGroupsSet.has(key)) return;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const group = pool.find((g) => g.key === key);
    if (!group) return;
    const questions: InterviewAnswer[] = group.questions.map((q) => ({
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
    }));
    result.push({
      key: group.key,
      name: group.name,
      source: group.source,
      questions,
    });
  });

  return result;
};

export const AssessmentView = ({
  interview,
  groupedQuestions,
  openGroups,
  percentages,
  answers,
  elapsedMs,
  isStarted,
  isEnded,
  fieldSaveStatus,
  isMutating,
  canStart,
  canEnd,
  canSaveProgress,
  availableGroups,
  pendingAddGroups,
  pendingRemoveIds,
  pendingRemoveGroups,
  newCustomQuestions,
  onAddGroup,
  onCreateQuestion,
  onDeleteQuestion,
  onRemoveGroup,
  onBack,
  onStart,
  onEnd,
  onSaveProgress,
  onToggleGroup,
  onQuestionChange,
}: AssessmentViewProps) => {
  const { t } = useLocale();
  const questionsEditable = isStarted && !isEnded;
  const availableWithoutPending = useMemo(
    () => availableGroups.filter((g) => !pendingAddGroups.includes(g.key)),
    [availableGroups, pendingAddGroups]
  );

  const displayGroups = useMemo(
    () => buildMergedGroups(groupedQuestions, availableGroups, pendingAddGroups, pendingRemoveIds, pendingRemoveGroups),
    [groupedQuestions, availableGroups, pendingAddGroups, pendingRemoveIds, pendingRemoveGroups]
  );

  const standaloneQuestions = useMemo(() => {
    const free = groupedQuestions.find((g) => g.key === '__free__')?.questions || [];
    const freeTexts = new Set(free.map((q) => q.question));
    const pending = newCustomQuestions
      .filter((q) => !freeTexts.has(q.question))
      .map((q, idx) => ({
        id: `new_custom_${idx}` as string | undefined,
        question: q.question,
        score: q.score,
        achievedScore: 0,
        notes: '',
        answerType: q.answerType,
        choices: q.choices,
      }));
    return [...free, ...pending];
  }, [groupedQuestions, newCustomQuestions]);

  const visibleQuestions = useMemo(() => {
    const all: InterviewAnswer[] = [];
    displayGroups.forEach((g) => all.push(...g.questions));
    standaloneQuestions.forEach((q) => all.push(q));
    return all;
  }, [displayGroups, standaloneQuestions]);

  const visibleTotals = useMemo(() => {
    const totalScore = visibleQuestions.reduce((sum, q) => sum + Number(q?.score || 0), 0);
    const answered = visibleQuestions.filter((q) => {
      const qId = getQuestionId(q);
      if (!qId) return false;
      const pct = Number(percentages[qId] || 0);
      const a = answers[qId];
      return (
        pct > 0 ||
        (typeof a === 'string' && a.trim() !== '') ||
        a === true ||
        (Array.isArray(a) && a.length > 0)
      );
    }).length;
    const achieved = visibleQuestions.reduce((sum, q) => {
      const qId = getQuestionId(q);
      const pct = Number((qId && percentages[qId]) || 0);
      const s = Number(q?.score || 0);
      return sum + Math.round((s * pct) / 100);
    }, 0);
    const total = visibleQuestions.length;
    const completion = total === 0 ? 0 : (answered / total) * 100;
    const performance = totalScore > 0 ? (achieved / totalScore) * 100 : 0;
    return { totalScore, achieved, answered, total, completion, performance };
  }, [visibleQuestions, percentages, answers]);

  return (
  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden max-w-full">
    <InterviewHeader
      interviewStatus={String(interview.status || '')}
      isStarted={isStarted}
      isEnded={isEnded}
      elapsedMs={elapsedMs}
      answered={visibleTotals.answered}
      total={visibleTotals.total}
      fieldSaveStatus={fieldSaveStatus}
      canStart={canStart}
      canEnd={canEnd}
      canSaveProgress={canSaveProgress}
      isMutating={isMutating}
      onBack={onBack}
      onStart={onStart}
      onEnd={onEnd}
      onSaveProgress={onSaveProgress}
    />
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <h3 className="text-slate-800 text-lg font-bold">{t('interviewAssessment', 'interview')}</h3>
        <p className="text-slate-500 text-sm mt-0.5">{t('candidatePerformanceEvaluation', 'interview')}</p>
      </div>
    </div>
    <InterviewStatsBar
      totalScore={visibleTotals.totalScore}
      achieved={visibleTotals.achieved}
      completion={visibleTotals.completion}
      answered={visibleTotals.answered}
      total={visibleTotals.total}
      elapsedMs={elapsedMs}
    />
    <div className="px-5 pb-5 pt-3">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${visibleTotals.completion}%` }}
        />
      </div>
    </div>
    <div className="px-5 pb-6 space-y-3">
      {displayGroups.length === 0 && standaloneQuestions.length === 0 ? (
        <p className="text-center text-slate-500 py-8">
          {t('noQuestionsInInterview', 'interview')}
        </p>
      ) : (
        <>
          {displayGroups.map((g) => (
            <QuestionGroupCard
              key={g.key}
              groupKey={g.key}
              groupName={g.name}
              source={g.source}
              questions={g.questions}
              isOpen={openGroups.includes(g.key)}
              isInteractive={questionsEditable}
              canRemove={!isEnded}
              percentages={percentages}
              answers={answers}
              onToggle={() => onToggleGroup(g.key)}
              onQuestionChange={onQuestionChange}
              onDeleteQuestion={onDeleteQuestion}
              onRemove={() => onRemoveGroup(g.key)}
            />
          ))}
          {standaloneQuestions.map((q) => {
            const qId = q.id || '';
            return (
              <QuestionRow
                key={qId}
                question={q}
                isInteractive={questionsEditable}
                percentage={Number((qId && percentages[qId]) || 0)}
                answer={qId ? answers[qId] : undefined}
                onChange={(patch) => onQuestionChange(qId, patch)}
                onDelete={onDeleteQuestion}
              />
            );
          })}
        </>
      )}
    </div>

    {/* Create Custom Question */}
    {!isEnded && (
      <div className="px-5 pb-6 border-t border-slate-100 pt-5">
        <CreateQuestionForm onAdd={onCreateQuestion} />
      </div>
    )}

    {/* Available Question Groups */}
    {availableWithoutPending.length > 0 && !isEnded && (
      <div className="px-5 pb-6 border-t border-slate-100 pt-5">
        <h4 className="text-sm font-bold text-slate-800 mb-3">{t('addQuestionGroups', 'interview')}</h4>
        <div className="space-y-2">
          {availableWithoutPending.map((g) => {
            const SourceIcon = g.source === 'company' ? Building2 : Library;
            return (
              <div
                key={g.key}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-md ${g.source === 'company' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    <SourceIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                    <p className="text-xs text-slate-500">
                      {t('nQuestions', 'interview', { count: g.questions.length })} ·{' '}
                      {g.questions.reduce((s, q) => s + (q.score || 0), 0)} pts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAddGroup(g.key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {t('add', 'interview')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    )}


  </div>
);
};
