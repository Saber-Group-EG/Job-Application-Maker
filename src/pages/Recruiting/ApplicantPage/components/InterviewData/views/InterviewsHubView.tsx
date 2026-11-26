import { Calendar, CalendarPlus, History, Loader2, Lock, MessageSquare, Play, Trash2, User } from 'lucide-react';
import type { Interview } from '../../../../../../types/applicants';
import { useLocale } from '../../../../../../context/LocaleContext';

export type InterviewsHubViewProps = {
  /** Scheduled and in-progress interviews. */
  interviews: Interview[];
  /** Finished, cancelled and missed interviews, newest first. */
  pastInterviews?: Interview[];
  /** Open a finished interview's results. */
  onViewPast?: (interview: Interview) => void;
  onStart: () => void;
  onSchedule: () => void;
  onOpen: (interview: Interview) => void;
  /** Start a scheduled interview right away (no questions needed) and open it. */
  onStartScheduled?: (interview: Interview) => void;
  /** Id of the scheduled interview being started, if any. */
  startingInterviewId?: string | null;
  onDelete?: (interview: Interview) => void;
  /** "Start interview" is creating and opening an interview. */
  isStarting?: boolean;
  authUser?: { _id?: string; id?: string } | null;
};

type TFn = (key: string, ns?: string, params?: Record<string, string | number>) => string;

const formatDate = (iso: string | undefined, t: TFn, locale: string): string => {
  if (!iso) return t('unknownDate', 'interview');
  try {
    return new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return t('unknownDate', 'interview');
  }
};

const idOf = (v: unknown): string =>
  !v ? '' : typeof v === 'string' ? v : String((v as { _id?: string; id?: string })._id || (v as { id?: string }).id || '');

export const InterviewsHubView = ({
  interviews,
  pastInterviews = [],
  onViewPast,
  onStart,
  onSchedule,
  onOpen,
  onStartScheduled,
  startingInterviewId = null,
  onDelete,
  isStarting = false,
  authUser,
}: InterviewsHubViewProps) => {
  const { t, locale } = useLocale();
  const currentUserId = authUser?._id || authUser?.id || '';

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onSchedule}
        disabled={isStarting}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarPlus className="h-4 w-4" />
        {t('scheduleInterview', 'interview')}
      </button>
      <button
        type="button"
        onClick={onStart}
        disabled={isStarting}
        aria-busy={isStarting}
        className="inline-flex min-w-[10rem] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-80"
      >
        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isStarting ? t('startingInterview', 'interview') : t('startInterviewNow', 'interview')}
      </button>
    </div>
  );

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{t('interviewsTitle', 'interview')}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{t('interviewsSubtitle', 'interview')}</p>
        </div>
        {actions}
      </div>

      {interviews.length > 0 && pastInterviews.length > 0 && (
        <p className="bg-slate-50 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('upcomingAndRunning', 'interview')}
        </p>
      )}
      {interviews.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-500">
            <MessageSquare className="h-8 w-8" />
          </div>
          <p className="text-base font-semibold text-slate-800">{t('noActiveInterviews', 'interview')}</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">{t('noActiveInterviewsHint', 'interview')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {interviews.map((interview, idx) => {
            const id = idOf(interview) || `iv_${idx}`;
            const isInProgress = String(interview.status || '').toLowerCase() === 'in_progress';
            const conductedById = idOf(interview.conductedBy);
            const conductedByName =
              interview.conductedBy && typeof interview.conductedBy === 'object'
                ? (interview.conductedBy as { fullName?: string; name?: string }).fullName ||
                  (interview.conductedBy as { name?: string }).name ||
                  ''
                : '';
            const isMine = !conductedById || conductedById === currentUserId;
            const isLocked = isInProgress && !isMine;
            const questionCount = Array.isArray(interview.questions) ? interview.questions.length : 0;
            const label = isInProgress
              ? t('continueInterview', 'interview')
              : questionCount === 0
              ? t('chooseQuestionsAndStart', 'interview')
              : t('openInterview', 'interview');
            // A scheduled interview (not started yet) can be started straight away;
            // choosing questions first stays available as the secondary button.
            const canStartDirectly = Boolean(onStartScheduled) && !isInProgress && !interview.startedAt;
            const isThisStarting = Boolean(startingInterviewId) && startingInterviewId === idOf(interview);
            const isBusy = isStarting || Boolean(startingInterviewId);

            return (
              <li key={id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {formatDate(interview.scheduledAt, t, locale)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isInProgress ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {isInProgress ? t('inProgress', 'interview') : t('scheduled', 'interview')}
                    </span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <Lock className="h-3 w-3" />
                        {t('locked', 'interview')}
                      </span>
                    )}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {interview.type && (
                      <span>{t(interview.type === 'in-person' ? 'inPerson' : interview.type, 'modals')}</span>
                    )}
                    <span>
                      {t('questions', 'interview')}: {questionCount}
                    </span>
                    {conductedById && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {isMine ? t('interviewerYou', 'interview') : conductedByName || conductedById}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canStartDirectly ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpen(interview)}
                        disabled={isBusy}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {label}
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartScheduled?.(interview)}
                        disabled={isBusy}
                        aria-busy={isThisStarting}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                      >
                        {isThisStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {isThisStarting ? t('startingInterview', 'interview') : t('startInterview', 'interview')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(interview)}
                      disabled={isLocked}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {label}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(interview)}
                      title={t('deleteInterview', 'interview')}
                      aria-label={t('deleteInterview', 'interview')}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pastInterviews.length > 0 && (
        <div className="border-t border-slate-100">
          <p className="flex items-center gap-1.5 bg-slate-50 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <History className="h-3.5 w-3.5" />
            {t('pastInterviews', 'interview')} ({pastInterviews.length})
          </p>
          <ul className="divide-y divide-slate-100">
            {pastInterviews.map((interview, idx) => {
              const id = idOf(interview) || `past_${idx}`;
              const status = String(interview.status || '').toLowerCase();
              const isCompleted = status === 'completed';
              const total = Number((interview as { totalScore?: number }).totalScore ?? 0);
              const achieved = Number((interview as { achievedScore?: number }).achievedScore ?? 0);
              const when = interview.endedAt || interview.startedAt || interview.scheduledAt;
              const conductedById = idOf(interview.conductedBy);
              const conductedByName =
                interview.conductedBy && typeof interview.conductedBy === 'object'
                  ? (interview.conductedBy as { fullName?: string; name?: string }).fullName ||
                    (interview.conductedBy as { name?: string }).name ||
                    ''
                  : '';
              const isMine = Boolean(conductedById) && conductedById === currentUserId;
              const badge = isCompleted
                ? 'bg-emerald-50 text-emerald-700'
                : status === 'missed'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-600';
              return (
                <li key={id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(when, t, locale)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge}`}>
                        {t(status === 'missed' ? 'missed' : status === 'cancelled' ? 'cancelled' : 'completed', 'interview')}
                      </span>
                      {isCompleted && total > 0 && (
                        <span className="text-xs font-medium tabular-nums text-slate-600">
                          {achieved} / {total} ({Math.round((achieved / total) * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {interview.type && (
                        <span>{t(interview.type === 'in-person' ? 'inPerson' : interview.type, 'modals')}</span>
                      )}
                      {Array.isArray(interview.questions) && (
                        <span>
                          {t('questions', 'interview')}: {interview.questions.length}
                        </span>
                      )}
                      {(conductedByName || isMine) && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {isMine ? t('interviewerYou', 'interview') : conductedByName}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isCompleted && onViewPast && (
                      <button
                        type="button"
                        onClick={() => onViewPast(interview)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50"
                      >
                        {t('viewResults', 'interview')}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(interview)}
                        title={t('deleteInterview', 'interview')}
                        aria-label={t('deleteInterview', 'interview')}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
