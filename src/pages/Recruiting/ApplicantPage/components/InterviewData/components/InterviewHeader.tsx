import { useMemo } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Play,
  Save,
  StopCircle,
  Timer,
} from 'lucide-react';
import { formatTimer } from '../utils/interviewUtils';
import { useLocale } from '../../../../../../context/LocaleContext';
import type { FieldSaveStatus } from '../hooks/useInterviewActions';

export type InterviewHeaderProps = {
  interviewStatus: string;
  isStarted: boolean;
  isEnded: boolean;
  elapsedMs: number;
  answered: number;
  total: number;
  fieldSaveStatus: FieldSaveStatus;
  canStart: boolean;
  canEnd: boolean;
  canSaveProgress: boolean;
  isMutating: boolean;
  onBack: () => void;
  onStart: () => void;
  onEnd: () => void;
  onSaveProgress: () => void;
};

export const InterviewHeader = ({
  interviewStatus,
  isStarted,
  isEnded,
  elapsedMs,
  answered,
  total,
  fieldSaveStatus,
  canStart,
  canEnd,
  canSaveProgress,
  isMutating,
  onBack,
  onStart,
  onEnd,
  onSaveProgress,
}: InterviewHeaderProps) => {
  const { t } = useLocale();
  const statusBadge = useMemo(() => {
    const status = String(interviewStatus || '').toLowerCase();
    if (status === 'completed' || isEnded) {
      return { label: t('completed', 'interview'), classes: 'bg-emerald-500/20 text-emerald-50' };
    }
    if (status === 'in_progress' || isStarted) {
      return { label: t('inProgress', 'interview'), classes: 'bg-amber-400/20 text-amber-50' };
    }
    return { label: t('scheduled', 'interview'), classes: 'bg-white/15 text-white' };
  }, [interviewStatus, isStarted, isEnded, t]);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          {t('back', 'interview')}
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isEnded ? 'bg-white/15' : 'bg-white/25 ring-1 ring-white/40'
            }`}
            title={isEnded ? t('finalInterviewDuration', 'interview') : t('liveDurationSinceStarted', 'interview')}
          >
            {isEnded ? (
              <StopCircle className="h-3.5 w-3.5 text-white" />
            ) : (
              <Timer className={`h-3.5 w-3.5 text-white ${isStarted ? 'animate-pulse' : ''}`} />
            )}
            <span className="text-white font-medium tabular-nums">
              {formatTimer(elapsedMs)}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs text-white font-medium">
            <FileText className="h-3.5 w-3.5" />
            {t('nAnsweredOfTotal', 'interview', { answered, total })}
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.classes}`}>
            {statusBadge.label}
          </div>
          {fieldSaveStatus === 'saving' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-50 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-200 animate-pulse" />
              {t('saving', 'interview')}
            </div>
          )}
          {fieldSaveStatus === 'saved' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/20 text-emerald-50 text-[11px] font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {t('saved', 'interview')}
            </div>
          )}
          {fieldSaveStatus === 'error' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-400/20 text-red-50 text-[11px] font-medium">
              <AlertCircle className="h-3 w-3" />
              {t('saveFailed', 'interview')}
            </div>
          )}
          {false && canSaveProgress && (
            <button
              type="button"
              onClick={onSaveProgress}
              disabled={isMutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors shadow-sm disabled:opacity-50"
              title={t('saveCurrentProgress', 'interview')}
            >
              <Save className="h-3.5 w-3.5" />
              {t('saveProgress', 'interview')}
            </button>
          )}
          {canStart && (
            <button
              type="button"
              onClick={onStart}
              disabled={isMutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
              title={t('startTheInterviewTimer', 'interview')}
            >
              <Play className="h-3.5 w-3.5" />
              {t('startInterview', 'interview')}
            </button>
          )}
          {canEnd && (
            <button
              type="button"
              onClick={onEnd}
              disabled={isMutating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
              title={t('stopTheTimerAndSubmit', 'interview')}
            >
              <StopCircle className="h-3.5 w-3.5" />
              {t('endInterview', 'interview')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
