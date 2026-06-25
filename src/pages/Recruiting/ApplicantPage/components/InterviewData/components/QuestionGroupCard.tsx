import { useMemo } from 'react';
import { Building2, ChevronDown, ChevronUp, Library, Trash2 } from 'lucide-react';
import { QuestionRow } from './QuestionRow';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import { computeTotalScore, getQuestionId } from '../utils/interviewUtils';
import { useLocale } from '../../../../../../context/LocaleContext';

export type QuestionGroupCardProps = {
  groupKey: string;
  groupName: string;
  source: 'company' | 'user';
  questions: InterviewAnswer[];
  isOpen: boolean;
  isInteractive: boolean;
  canRemove: boolean;
  percentages: Record<string, number>;
  answers: Record<string, unknown>;
  onToggle: () => void;
  onQuestionChange: (
    questionId: string,
    patch: { percentage?: number; answer?: unknown }
  ) => void;
  onRemove?: () => void;
  onDeleteQuestion?: (questionId: string) => void;
};

export const QuestionGroupCard = ({
  groupKey,
  groupName,
  source,
  questions,
  isOpen,
  isInteractive,
  canRemove,
  percentages,
  answers,
  onToggle,
  onQuestionChange,
  onRemove,
  onDeleteQuestion,
}: QuestionGroupCardProps) => {
  const { t } = useLocale();
  const SourceIcon = source === 'company' ? Building2 : Library;
  const totalScore = useMemo(() => computeTotalScore(questions), [questions]);
  const achieved = useMemo(
    () =>
      questions.reduce((sum, q) => {
        const qId = getQuestionId(q);
        const pct = Number((qId && percentages[qId]) || 0);
        const s = Number(q?.score || 0);
        return sum + Math.round((s * pct) / 100);
      }, 0),
    [questions, percentages]
  );
  const answered = questions.filter((q) => {
    const qId = getQuestionId(q);
    const pct = Number((qId && percentages[qId]) || 0);
    const a = qId ? answers[qId] : undefined;
    return (
      pct > 0 ||
      (typeof a === 'string' && a.trim() !== '') ||
      (Array.isArray(a) && a.length > 0)
    );
  }).length;
  const performance = totalScore > 0 ? (achieved / totalScore) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
        >
          <div
            className={`p-2 rounded-md flex-shrink-0 ${
              source === 'company' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
            }`}
          >
            <SourceIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{groupName}</p>
            <p className="text-xs text-slate-500">
              {t('nQuestionsCount', 'interview', { count: questions.length })}
              <span className="text-slate-400 mx-1.5">·</span>
              {source === 'company' ? t('companyLibrary', 'interview') : t('myLibrary', 'interview')}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 leading-none mb-0.5">
              {t('score', 'interview')}
            </p>
            <p className="text-xs font-bold text-slate-800 tabular-nums leading-none">
              {achieved}
              <span className="text-slate-400">/{totalScore}</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 leading-none mb-0.5">
              {t('answered', 'interview')}
            </p>
            <p className="text-xs font-bold text-slate-800 tabular-nums leading-none">
              {answered}/{questions.length}
            </p>
          </div>
          <div className="flex items-center gap-1.5 w-24">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${performance}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums w-9 text-right">
              {Math.round(performance)}%
            </span>
          </div>
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
              title={t('removeThisGroup', 'interview')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
            title={isOpen ? t('collapse', 'interview') : t('expand', 'interview')}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="px-5 py-4 space-y-3">
          {questions.map((q) => {
            const qId = getQuestionId(q);
            return (
              <div key={qId || `${groupKey}_${q?.question}`}>
                <QuestionRow
                  question={q}
                  isInteractive={isInteractive}
                  percentage={Number((qId && percentages[qId]) || 0)}
                  answer={qId ? answers[qId] : undefined}
                  onChange={(patch) => onQuestionChange(qId, patch)}
                  onDelete={onDeleteQuestion}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
