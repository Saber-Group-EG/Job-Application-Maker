import { useMemo } from 'react';
import type { InterviewAnswer } from '../../../../../../types/applicants';

export type QuestionRowProps = {
  question: InterviewAnswer;
  isInteractive: boolean;
  percentage: number;
  answer: unknown;
  onChange: (patch: { percentage?: number; answer?: unknown }) => void;
};

export const QuestionRow = ({
  question,
  isInteractive,
  percentage,
  answer,
  onChange,
}: QuestionRowProps) => {
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

  return (
    <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{question?.question || '(Untitled question)'}</p>
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
            <span className="text-[10px] text-gray-400">Total Score: {score}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-blue-600">{currentAchieved.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400">Achieved</p>
        </div>
      </div>

      <div className="space-y-3">
        {choices.length > 0 ? (
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
            placeholder="Enter candidate's answer..."
            disabled={!isInteractive}
            rows={2}
            className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        ) : null}
      </div>

      {score > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
            <span>Performance Weight</span>
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
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
};
