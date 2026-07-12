import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Clock4,
  ExternalLink,
  Inbox,
  Save,
  StickyNote,
  Target,
  User as UserIcon,
  Video,
  XCircle,
} from 'lucide-react';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import PageMeta from '../../../components/common/PageMeta';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useApplicant, useUpdateInterviewStatus, applicantsKeys } from '../../../hooks/queries/useApplicants';
import Swal from '../../../utils/swal';
import { useLocale } from '../../../context/LocaleContext';
import type {
  Interview,
  InterviewAnswer,
  UpdateInterviewStatusRequest,
} from '../../../types/applicants';
import { paths } from '../../../router/Paths';
import {
  formatDate,
} from './components/history/historyUtils';

type CompletedInterview = Interview & { id?: string };

const calcDurationMs = (startedAt?: string, endedAt?: string): number | null => {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
};

const formatDuration = (ms: number | null): string => {
  if (ms === null) return '\u2014';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(seconds)}s`;
};

const flattenQuestions = (
  questions: InterviewAnswer[] | undefined,
): InterviewAnswer[] => {
  if (!questions || !Array.isArray(questions)) return [];
  return questions;
};

const toUserLabel = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const name = obj.fullName || obj.name || obj.email;
    if (typeof name === 'string' && name.trim()) return name;
    const id = obj._id || obj.id;
    if (typeof id === 'string') return id;
  }
  return '';
};

const getAnswerDisplay = (q: InterviewAnswer, t?: (key: string, ns: string) => string): {
  type: 'choice' | 'text' | 'empty';
  text: string;
  selectedChoice?: string;
} => {
  const noteText = (q?.notes ?? '').toString().trim();
  if (noteText) return { type: 'text', text: noteText };
  return { type: 'empty', text: t ? t('noAnswerRecorded', 'completedInterview') : 'No answer recorded' };
};

const InfoTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';
}> = ({ icon, label, value, accent = 'gray' }) => {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-gray-800 break-words">
          {value || <span className="text-gray-300">\u2014</span>}
        </div>
      </div>
    </div>
  );
};

const QuestionDisplay: React.FC<{
  question: InterviewAnswer;
  index: number;
  editable?: boolean;
  onChange?: (updated: InterviewAnswer) => void;
}> = ({ question, index, editable, onChange }) => {
  const { t } = useLocale();
  const score = Number(question?.score || 0);
  const achieved = Number(question?.achievedScore || 0);
  const percentage = score > 0 ? Math.round((achieved / score) * 100) : 0;
  const choices = Array.isArray(question?.choices) ? question!.choices : [];
  const answer = getAnswerDisplay(question, t);

  const handleChange = (field: 'score' | 'achievedScore' | 'notes', value: string | number) => {
    if (!onChange) return;
    onChange({ ...question, [field]: value });
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 mt-1.5">
            {question?.question || t('untitledQuestion', 'completedInterview')}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
          </div>
        </div>
        {score > 0 && (
          <div className="text-right">
            <p className="text-base font-bold text-emerald-600 tabular-nums">
              {achieved}
              <span className="text-xs text-gray-400"> / {score}</span>
            </p>
          </div>
        )}
      </div>

      {choices.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {t('choices', 'completedInterview')}
          </p>
          <div className="flex flex-wrap gap-2">
            {choices.map((choice, i) => {
              const value = String(choice ?? '');
              if (!value) return null;
              const isSelected =
                answer.type === 'text' && answer.text === value;
              return (
                <span
                  key={`${value}_${i}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  {value}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-1.5 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {t('candidateAnswer', 'completedInterview')}
        </p>
        {editable ? (
          <textarea
            value={question?.notes ?? ''}
            onChange={e => handleChange('notes', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder={t('editAnswerNotes', 'completedInterview')}
          />
        ) : answer.type === 'text' ? (
          <p className="whitespace-pre-wrap text-sm text-gray-800">{answer.text}</p>
        ) : (
          <p className="text-sm italic text-gray-400">{answer.text}</p>
        )}
      </div>

      {editable && score > 0 && (
        <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
            <span>{t('performanceWeight', 'completedInterview')}</span>
            <span>{percentage}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={percentage}
            onChange={e => {
              const newPct = Number(e.target.value);
              const newAchieved = Math.round((score * newPct) / 100);
              handleChange('achievedScore', newAchieved);
            }}
            style={{
              background: `linear-gradient(to right, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%)`,
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer accent-blue-600"
          />
        </div>
      )}
    </div>
  );
};

const STATUS_OPTIONS = [
  { value: 'completed', labelKey: 'statusCompleted' },
  { value: 'scheduled', labelKey: 'statusScheduled' },
  { value: 'in_progress', labelKey: 'statusInProgress' },
  { value: 'cancelled', labelKey: 'statusCancelled' },
];

const CompletedInterviewDetails: React.FC = () => {
  const { id: applicantId, interviewId } = useParams<{
    id: string;
    interviewId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();

  const passedInterview = (location.state as { interview?: CompletedInterview; mode?: string } | null)
    ?.interview;
  const isEditing = (location.state as { mode?: string } | null)?.mode === 'edit';

  const { data: applicant, isLoading, isError, error } = useApplicant(applicantId || '');

  const interview = useMemo<CompletedInterview | null>(() => {
    if (!applicant && !passedInterview) return null;
    if (passedInterview) {
      const pid = String(passedInterview._id || passedInterview.id || '');
      if (!interviewId || pid === String(interviewId)) return passedInterview;
    }
    if (!applicant?.interviews) return null;
    const list = applicant.interviews as CompletedInterview[];
    return (
      list.find(
        (iv) =>
          String(iv?._id || iv?.id || '') === String(interviewId || ''),
      ) || null
    );
  }, [applicant, passedInterview, interviewId]);

  const [editForm, setEditForm] = useState({
    status: 'completed',
    questions: [] as InterviewAnswer[],
  });

  const [isSaving, setIsSaving] = useState(false);
  const updateInterviewMutation = useUpdateInterviewStatus();

  useEffect(() => {
    if (interview && isEditing) {
      setEditForm({
        status: interview.status || 'completed',
        questions: interview.questions ? interview.questions.map(q => ({ ...q })) : [],
      });
    }
  }, [interview, isEditing]);

  const handleSave = async () => {
    if (!applicantId || !interviewId || !interview) return;
    setIsSaving(true);
    try {
      const data: UpdateInterviewStatusRequest = {
        scheduledAt: interview.scheduledAt,
        startedAt: interview.startedAt,
        endedAt: interview.endedAt,
        status: editForm.status as UpdateInterviewStatusRequest['status'],
        questions: editForm.questions,
      };
      await updateInterviewMutation.mutateAsync({
        applicantId,
        interviewId,
        data,
      });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(applicantId) });
      await Swal.fire({
        title: t('success', 'common'),
        text: t('interviewUpdated', 'common'),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(paths.applicants.details(applicantId));
    } catch (error) {
      await Swal.fire({
        title: t('error', 'common'),
        text: t('interviewUpdateFailed', 'common'),
        icon: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (applicantId) {
      navigate(paths.applicants.details(applicantId));
    } else {
      navigate(-1);
    }
  };

  const handleQuestionChange = (index: number, updated: InterviewAnswer) => {
    setEditForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? updated : q),
    }));
  };

  const effectiveQuestions = useMemo(
    () => isEditing ? editForm.questions : flattenQuestions(interview?.questions),
    [isEditing, editForm.questions, interview],
  );

  const totalScore = useMemo(
    () =>
      effectiveQuestions.reduce(
        (sum, q) => sum + Number(q?.score || 0),
        0,
      ),
    [effectiveQuestions],
  );
  const achievedScore = useMemo(
    () =>
      Math.round(
        effectiveQuestions.reduce(
          (sum, q) => sum + Number(q?.achievedScore || 0),
          0,
        ),
      ),
    [effectiveQuestions],
  );
  const performance =
    totalScore > 0 ? Math.round((achievedScore / totalScore) * 100) : 0;
  const answeredCount = effectiveQuestions.filter((q) => {
    const notes = (q?.notes ?? '').toString().trim();
    return notes.length > 0;
  }).length;
  const completion =
    effectiveQuestions.length > 0
      ? Math.round((answeredCount / effectiveQuestions.length) * 100)
      : 0;
  const duration = calcDurationMs(interview?.startedAt, interview?.endedAt);

  const handleBack = () => {
    if (applicantId) {
      navigate(paths.applicants.details(applicantId));
    } else {
      navigate(-1);
    }
  };

  if (isLoading && !passedInterview) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError && !passedInterview) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {t('interviewNotFound', 'completedInterview')}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {(error as { message?: string } | null | undefined)?.message ||
              t('couldNotLoadInterview', 'completedInterview')}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            {t('backToApplicant', 'completedInterview')}
          </button>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <XCircle className="h-6 w-6 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {t('interviewNotFound', 'completedInterview')}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t('interviewNotFoundDesc', 'completedInterview')}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            {t('backToApplicant', 'completedInterview')}
          </button>
        </div>
      </div>
    );
  }

  const status = String(interview.status || 'completed').toLowerCase();
  const typeLabel = interview.type
    ? t(interview.type.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), 'modals')
    : t('interview', 'completedInterview');
  const conductedByLabel = toUserLabel(interview.conductedBy);
  const interviewerLabels = Array.isArray(interview.interviewers)
    ? interview.interviewers.map((i) => toUserLabel(i)).filter(Boolean)
    : [];

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <PageMeta
          title={t('interviewDetailsPageTitle', 'completedInterview', { type: typeLabel })}
          description={t('completedInterviewDetails', 'completedInterview')}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageBreadCrumb pageTitle={isEditing ? t('editInterview', 'completedInterview') : t('completedInterviewDetails', 'completedInterview')} />
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel', 'completedInterview')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? t('saving', 'completedInterview') : t('saveEdits', 'completedInterview')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('backToApplicant', 'completedInterview')}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    {t('back', 'completedInterview')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium group"
                  >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    {t('back', 'completedInterview')}
                </button>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/50"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="text-gray-800">{t(opt.labelKey, 'completedInterview')}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status === 'completed' ? 'bg-emerald-500/20 text-emerald-50' : 'bg-white/15 text-white'}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {(() => { const opt = STATUS_OPTIONS.find(o => o.value === status); return opt ? t(opt.labelKey, 'completedInterview') : status; })()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4">
            <div className="bg-white p-4 text-center">
              <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <div className="flex items-baseline justify-center gap-2">
                <p className="text-xl font-bold text-purple-600 tabular-nums">
                  {performance}%
                </p>
                <p className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-gray-700 hover:bg-blue-200 transition-colors">
                  {t('scoreFormat', 'completedInterview', { achieved: achievedScore, total: totalScore })}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 text-center">
              <Clock className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold tabular-nums">
                {formatDuration(duration)}
              </p>
            </div>

            <div className="bg-white p-4 text-center">
              <Award className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <div className="flex items-baseline justify-center gap-2">
                <p className="text-lg font-bold text-amber-600 tabular-nums">
                  {completion}%
                </p>
                <p className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-gray-700 hover:bg-blue-200 transition-colors">
                  {t('answeredCountFormat', 'completedInterview', { answered: answeredCount, total: effectiveQuestions.length })}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 text-center">
              <Clock className="h-4 w-4 text-gray-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-800 tabular-nums">
                {interview?.startedAt ? new Date(interview.startedAt).toLocaleString(locale) : t('na', 'completedInterview')}
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            {t('interviewInformation', 'completedInterview')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile
              icon={<Clock4 className="h-4 w-4" />}
              label={t('type', 'completedInterview')}
              value={typeLabel}
              accent="blue"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label={t('scheduledAt', 'completedInterview')}
              value={formatDate(interview.scheduledAt, locale)}
              accent="purple"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label={t('startedAt', 'completedInterview')}
              value={formatDate(interview.startedAt, locale)}
              accent="green"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label={t('endedAt', 'completedInterview')}
              value={formatDate(interview.endedAt, locale)}
              accent="amber"
            />
            {conductedByLabel && (
              <InfoTile
                icon={<UserIcon className="h-4 w-4" />}
                label={t('conductedBy', 'completedInterview')}
                value={conductedByLabel}
                accent="purple"
              />
            )}
            {interview.videoLink && (
              <InfoTile
                icon={<Video className="h-4 w-4" />}
                label={t('videoLink', 'completedInterview')}
                value={
                  <a
                    href={interview.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {t('openLink', 'completedInterview')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
                accent="blue"
              />
            )}
            {interviewerLabels.length > 0 && (
              <InfoTile
                icon={<UserIcon className="h-4 w-4" />}
                label={t('interviewers', 'completedInterview')}
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {interviewerLabels.map((name, i) => (
                      <span
                        key={`${name}_${i}`}
                        className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                }
                accent="purple"
              />
            )}
          </div>

          <div className="mt-3 rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <StickyNote className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-gray-800">
                {t('interviewerNotes', 'completedInterview')}
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {interview.notes || t('noNotesRecorded', 'completedInterview')}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {t('questionsAndAnswers', 'completedInterview')}
            </h2>
            <span className="text-xs text-gray-400">
              {t('questionCount', 'completedInterview', { count: effectiveQuestions.length })}
            </span>
          </div>

          {effectiveQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Inbox className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {t('noQuestionsRecorded', 'completedInterview')}
              </p>
              <p className="text-xs text-gray-400">
                {t('noQuestionsRecordedDesc', 'completedInterview')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {effectiveQuestions.map((q, i) => (
                <QuestionDisplay
                  key={q?._id || q?.id || i}
                  question={q}
                  index={i}
                  editable={isEditing}
                  onChange={isEditing ? (updated) => handleQuestionChange(i, updated) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CompletedInterviewDetails;
