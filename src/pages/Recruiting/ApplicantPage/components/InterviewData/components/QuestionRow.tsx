import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import { getQuestionId } from '../utils/interviewUtils';
import { useLocale } from '../../../../../../context/LocaleContext';

export type QuestionRowProps = {
  question: InterviewAnswer;
  isInteractive: boolean;
  percentage: number;
  answer: unknown;
  onChange: (patch: { percentage?: number; answer?: unknown }) => void;
  onDelete?: (questionId: string) => void;
};

export const QuestionRow = ({
  question,
  isInteractive,
  percentage,
  answer,
  onChange,
  onDelete,
}: QuestionRowProps) => {
  const { t } = useLocale();
  const qId = getQuestionId(question);
  const answerType = String(question?.answerType || 'text');
  const score = Number(question?.score || 0);
  const currentAchieved = useMemo(
    () => (score * Number(percentage || 0)) / 100,
    [score, percentage]
  );
  const choices = Array.isArray(question?.choices) ? (question!.choices as unknown[]) : [];
  const answerText =
    typeof answer === 'string' ? answer : Array.isArray(answer) ? answer.join(', ') : '';
  const selectedChoice = typeof answer === 'string' ? answer : '';
  const isChecked = answer === true;

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
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-blue-600">{currentAchieved.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400">{t('achieved', 'interview')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {answerType === 'checkbox' ? (
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
              const value = String(choice ?? '');
              if (!value) return null;
              const isSelected = selectedChoice === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => onChange({ answer: value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}
                </button>
              );
            })}
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
        <div className="space-y-2 pt-2 border-t border-gray-50">
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
