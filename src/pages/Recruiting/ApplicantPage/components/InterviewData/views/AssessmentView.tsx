import { QuestionGroupCard } from '../components/QuestionGroupCard';
import { InterviewHeader } from '../components/InterviewHeader';
import { InterviewStatsBar } from '../components/InterviewStatsBar';
import type { FieldSaveStatus } from '../hooks/useInterviewActions';
import type { Interview, InterviewAnswer } from '../../../../../../types/applicants';

export type AssessmentViewProps = {
  interview: Interview;
  groupedQuestions: Array<{
    key: string;
    name: string;
    source: 'company' | 'user';
    questions: InterviewAnswer[];
  }>;
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
  canEditQuestions: boolean;
  canStart: boolean;
  canEnd: boolean;
  canSaveProgress: boolean;
  onBack: () => void;
  onEditQuestions: () => void;
  onStart: () => void;
  onEnd: () => void;
  onSaveProgress: () => void;
  onToggleGroup: (key: string) => void;
  onQuestionChange: (
    questionId: string,
    patch: { percentage?: number; answer?: unknown }
  ) => void;
};

export const AssessmentView = ({
  interview,
  groupedQuestions,
  openGroups,
  percentages,
  answers,
  totals,
  elapsedMs,
  isInteractive,
  isStarted,
  isEnded,
  fieldSaveStatus,
  isMutating,
  canEditQuestions,
  canStart,
  canEnd,
  canSaveProgress,
  onBack,
  onEditQuestions,
  onStart,
  onEnd,
  onSaveProgress,
  onToggleGroup,
  onQuestionChange,
}: AssessmentViewProps) => (
  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
    <InterviewHeader
      interviewStatus={String(interview.status || '')}
      isStarted={isStarted}
      isEnded={isEnded}
      elapsedMs={elapsedMs}
      answered={totals.answered}
      total={totals.total}
      fieldSaveStatus={fieldSaveStatus}
      canEditQuestions={canEditQuestions}
      canStart={canStart}
      canEnd={canEnd}
      canSaveProgress={canSaveProgress}
      isMutating={isMutating}
      onBack={onBack}
      onEditQuestions={onEditQuestions}
      onStart={onStart}
      onEnd={onEnd}
      onSaveProgress={onSaveProgress}
    />
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <h3 className="text-slate-800 text-lg font-bold">Interview Assessment</h3>
        <p className="text-slate-500 text-sm mt-0.5">Candidate performance evaluation</p>
      </div>
      <div className="text-right">
        <div className="text-slate-800 text-2xl font-bold tabular-nums">
          {totals.achieved.toFixed(1)}
        </div>
        <div className="text-slate-500 text-xs">out of {totals.totalScore}</div>
      </div>
    </div>
    <InterviewStatsBar
      totalScore={totals.totalScore}
      achieved={totals.achieved}
      performance={totals.performance}
      completion={totals.completion}
    />
    <div className="px-5 pb-5 pt-3">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${totals.completion}%` }}
        />
      </div>
    </div>
    <div className="px-5 pb-6 space-y-3">
      {groupedQuestions.length === 0 ? (
        <p className="text-center text-slate-500 py-8">
          No questions in this interview yet.
        </p>
      ) : (
        groupedQuestions.map((g) => (
          <QuestionGroupCard
            key={g.key}
            groupKey={g.key}
            groupName={g.name}
            source={g.source}
            questions={g.questions}
            isOpen={openGroups.includes(g.key)}
            isInteractive={isInteractive}
            canRemove={false}
            percentages={percentages}
            answers={answers}
            onToggle={() => onToggleGroup(g.key)}
            onQuestionChange={onQuestionChange}
          />
        ))
      )}
    </div>
  </div>
);
