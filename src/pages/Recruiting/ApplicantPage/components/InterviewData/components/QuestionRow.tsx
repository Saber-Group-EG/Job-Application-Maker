import { useMemo, useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import { getQuestionId } from '../utils/interviewUtils';
import { useLocale } from '../../../../../../context/LocaleContext';
import QuestionEvaluation from './QuestionEvaluation';

export type QuestionRowProps = {
  question: InterviewAnswer;
  isInteractive: boolean;
  percentage: number;
  answer: unknown;
  selectedTags?: string[];
  onChange: (patch: { percentage?: number; answer?: unknown; selectedTags?: string[] }) => void;
  onDelete?: (questionId: string) => void;
};

export const QuestionRow = ({
  question,
  isInteractive,
  percentage,
  answer,
  selectedTags,
  onChange,
  onDelete,
}: QuestionRowProps) => {
  const { t } = useLocale();
  const qId = getQuestionId(question);
  const answerType = String(question?.answerType || 'text');
  const score = Number(question?.score || 0);
  const tags = Array.isArray(question?.tags) ? question.tags : [];
  const activeTags = Array.isArray(selectedTags) ? selectedTags : [];  const currentAchieved = useMemo(
    () => (score * Number(percentage || 0)) / 100,
    [score, percentage]
  );
  const rawChoices = Array.isArray(question?.choices) ? question!.choices : [];
  const choices = useMemo(() => rawChoices.map((c: any) => ({
    label: String(c?.label ?? c?.text ?? ''),
    score: Number(c?.score) || 0,
  })), [rawChoices]);
  const answerText =
    typeof answer === 'string' ? answer : Array.isArray(answer) ? answer.join(', ') : '';
  const selectedChoice = typeof answer === 'string' ? answer : '';
  const isChecked = answer === true;
  const tagsAnswer = Array.isArray(answer)
    ? answer.map((x) => String(x ?? '')).filter(Boolean)
    : typeof answer === 'string' && answer.trim()
      ? [answer.trim()]
      : [];
  const [tagInput, setTagInput] = useState('');

  const handleAddAnswerTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!tagsAnswer.includes(value)) {
      onChange({ answer: [...tagsAnswer, value] });
    }
    setTagInput('');
  };

  return (
    <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{question?.question || t('untitledQuestion', 'interview')}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                answerType === 'checkbox'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {answerType}
            </span>
            <span className="text-[10px] text-gray-400">{t('totalScoreLabel', 'interview', { score })}</span>
          </div>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {tags.map((tag: string, i: number) => {
                const isSelected = activeTags.includes(tag);
                if (isInteractive) {
                  return (
                    <button
                      key={`${tag}_${i}`}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? activeTags.filter((x) => x !== tag)
                          : [...activeTags, tag];
                        onChange({ selectedTags: next });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                          : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {tag}
                    </button>
                  );
                }
                return (
                  <span
                    key={`${tag}_${i}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {tag}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-blue-600">{currentAchieved.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400">{t('achieved', 'interview')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {answerType === 'checkbox' && choices.length === 0 ? (
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={!isInteractive}
              onChange={() => onChange({ answer: !isChecked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{t('trueYes', 'interview')}</span>
          </label>
        ) : choices.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => {
              const value = choice.label;
              if (!value) return null;
              const choiceScore = choice.score;
              const isMulti = answerType === 'checkbox';
              const selectedValues = isMulti
                ? (Array.isArray(answer) ? answer : [])
                : [selectedChoice];
              const isSelected = selectedValues.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => {
                    if (isMulti) {
                      const next = isSelected
                        ? selectedValues.filter((v: string) => v !== value)
                        : [...selectedValues, value];
                      const totalPct = score > 0
                        ? Math.round((choices.filter((c) => next.includes(c.label)).reduce((s, c) => s + c.score, 0) / score) * 100)
                        : 0;
                      onChange({ answer: next, percentage: totalPct });
                    } else {
                      const pct = score > 0 ? Math.round((choiceScore / score) * 100) : 0;
                      onChange({ answer: value, percentage: pct });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}
                  {choiceScore > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-70">({choiceScore})</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : answerType === 'number' ? (
          <input
            type="number"
            value={answerText}
            onChange={(e) => onChange({ answer: e.target.value })}
            placeholder={t('enterCandidateAnswer', 'interview')}
            disabled={!isInteractive}
            className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        ) : answerType === 'tags' ? (
          <div className="space-y-2">
            {isInteractive && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAnswerTag();
                  }
                }}
                onBlur={handleAddAnswerTag}
                placeholder={t('typeTagAndPressEnter', 'interview')}
                className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
              />
            )}
            {tagsAnswer.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagsAnswer.map((tag, i) => (
                  <span
                    key={`${tag}_${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {tag}
                    {isInteractive && (
                      <button
                        type="button"
                        onClick={() => onChange({ answer: tagsAnswer.filter((_, idx) => idx !== i) })}
                        className="cursor-pointer text-emerald-400 hover:text-red-500 transition-colors"
                        title={t('removeTag', 'interview')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : answerType === 'text' ? (
          <textarea
            value={answerText}
            onChange={(e) => onChange({ answer: e.target.value })}
            placeholder={t('enterCandidateAnswer', 'interview')}
            disabled={!isInteractive}
            rows={2}
            className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        ) : null}
      </div>

      {score > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
            <span>{t('performanceWeight', 'interview')}</span>
            <span>{Number(percentage || 0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Number(percentage || 0)}
            disabled={!isInteractive}
            onChange={(e) => onChange({ percentage: Number(e.target.value) })}
            style={{
              background: `linear-gradient(to right, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%)`,
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer accent-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <QuestionEvaluation
            percentage={Number(percentage || 0)}
            onEvaluate={(value) => onChange({ percentage: value })}
            disabled={!isInteractive}
          />
        </div>
      )}

      <div className="flex justify-end -mb-1">
        {onDelete && qId && (
          <button
            type="button"
            onClick={() => onDelete(qId)}
            className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title={t('deleteThisQuestion', 'interview')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
