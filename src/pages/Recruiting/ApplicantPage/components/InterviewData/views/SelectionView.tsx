import { History, MessageSquare, Sparkles } from 'lucide-react';
import type { InterviewViewName } from '../hooks/useInterviewState';
import { useLocale } from '../../../../../../context/LocaleContext';

export type SelectionViewProps = {
  hasExistingInterview: boolean;
  interviewCount: number;
  onSchedule: () => void;
  onUseExisting: () => void;
};

export const SelectionView = ({
  hasExistingInterview,
  interviewCount,
  onSchedule,
  onUseExisting,
}: SelectionViewProps) => {
  const { t } = useLocale();
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-xl max-w-full">
      <div className="text-center max-w-md">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse" />
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
            <MessageSquare className="h-12 w-12 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('interviewSession', 'interview')}</h3>
        <p className="text-slate-500 mb-8">
          {hasExistingInterview
            ? t('youHaveScheduledInterviews', 'interview', { count: interviewCount })
            : t('noInterviewScheduled', 'interview')}
        </p>
        <div className="flex gap-3 justify-center items-center flex-wrap">
          <button
            type="button"
            onClick={onSchedule}
            className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
            {hasExistingInterview ? t('scheduleAnother', 'interview') : t('scheduleInterview', 'interview')}
          </button>
          <button
            type="button"
            onClick={onUseExisting}
            disabled={!hasExistingInterview}
            className="group inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <History className="h-3.5 w-3.5 group-hover:text-blue-600 transition-colors" />
            {t('useExistingInterview', 'interview')}
          </button>
        </div>
      </div>
    </div>
  );
};

// helper for type-only import to keep tree-shaking honest
export type _SelectionView = InterviewViewName;
