import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Clock4,
  ExternalLink,
  Inbox,
  StickyNote,
  Target,
  User as UserIcon,
  Video,
  XCircle,
} from 'lucide-react';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import PageMeta from '../../../components/common/PageMeta';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useApplicant } from '../../../hooks/queries/useApplicants';
import type {
  Interview,
  InterviewAnswer,
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
  if (ms === null) return '—';
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

const getAnswerDisplay = (q: InterviewAnswer): {
  type: 'choice' | 'text' | 'empty';
  text: string;
  selectedChoice?: string;
} => {
  const noteText = (q?.notes ?? '').toString().trim();
  if (noteText) return { type: 'text', text: noteText };
  return { type: 'empty', text: 'No answer recorded' };
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
          {value || <span className="text-gray-300">—</span>}
        </div>
      </div>
    </div>
  );
};

const QuestionDisplay: React.FC<{ question: InterviewAnswer; index: number }> = ({
  question,
  index,
}) => {
  const score = Number(question?.score || 0);
  const achieved = Number(question?.achievedScore || 0);
  const pct = score > 0 ? Math.round((achieved / score) * 100) : 0;
  const choices = Array.isArray(question?.choices) ? question!.choices : [];
  const answer = getAnswerDisplay(question);
  const answerType = String(question?.answerType || 'text');

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 mt-1.5">
            {question?.question || '(Untitled question)'}
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
            Choices
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

      <div className="mt-1.5  rounded-lg border border-gray-100 bg-gray-50/60 p-3">
        <p className=" text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Candidate's answer
        </p>
        {answer.type === 'text' ? (
          <p className="whitespace-pre-wrap  text-sm text-gray-800">{answer.text}</p>
        ) : (
          <p className="text-sm italic text-gray-400">{answer.text}</p>
        )}
      </div>

      
    </div>
  );
};

const CompletedInterviewDetails: React.FC = () => {
  const { id: applicantId, interviewId } = useParams<{
    id: string;
    interviewId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const passedInterview = (location.state as { interview?: CompletedInterview } | null)
    ?.interview;

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

  const flatQuestions = useMemo(
    () => flattenQuestions(interview?.questions),
    [interview],
  );

  const totalScore = useMemo(
    () =>
      (interview?.questions || []).reduce(
        (sum, q) => sum + Number(q?.score || 0),
        0,
      ),
    [interview],
  );
  const achievedScore = useMemo(
    () =>
      Math.round(
        (interview?.questions || []).reduce(
          (sum, q) => sum + Number(q?.achievedScore || 0),
          0,
        ),
      ),
    [interview],
  );
  const performance =
    totalScore > 0 ? Math.round((achievedScore / totalScore) * 100) : 0;
  const answeredCount = (interview?.questions || []).filter((q) => {
    const notes = (q?.notes ?? '').toString().trim();
    return notes.length > 0;
  }).length;
  const completion =
    (interview?.questions || []).length > 0
      ? Math.round((answeredCount / (interview?.questions || []).length) * 100)
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
            Interview not found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {(error as { message?: string } | null | undefined)?.message ||
              'We could not load this interview.'}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Back to applicant
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
            Interview not found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            The interview you are looking for does not exist or has been removed.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Back to applicant
          </button>
        </div>
      </div>
    );
  }

  const status = String(interview.status || 'completed').toLowerCase();
  const typeLabel = interview.type
    ? String(interview.type)
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Interview';
  const conductedByLabel = toUserLabel(interview.conductedBy);
  const interviewerLabels = Array.isArray(interview.interviewers)
    ? interview.interviewers.map((i) => toUserLabel(i)).filter(Boolean)
    : [];

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <PageMeta
          title={`${typeLabel} | Interview Details`}
          description="Completed interview details"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageBreadCrumb pageTitle="Completed Interview Details" />
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to applicant
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>
              <div className="flex items-center gap-2 flex-wrap">

                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status === 'completed' ? 'bg-emerald-500/20 text-emerald-50' : 'bg-white/15 text-white'}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {status === 'completed' ? 'Completed' : status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-3">
            <div className="bg-white p-4 text-center">
              <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Score
              </p>
              <p className="mt-1 text-lg font-bold text-purple-600 tabular-nums">
                {performance}%
              </p>
              <p className="text-xs text-gray-400 tabular-nums">
                {achievedScore} / {totalScore}
              </p>
            </div>
            <div className="bg-white p-4 text-center">
              <Clock className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Duration
              </p>
              <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">
                {formatDuration(duration)}
              </p>
            </div>
            <div className="bg-white p-4 text-center">
              <Award className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Completion
              </p>
              <p className="mt-1 text-lg font-bold text-amber-600 tabular-nums">
                {completion}%
              </p>
              <p className="text-xs text-gray-400 tabular-nums">
                {answeredCount} / {interview?.questions?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Interview Information
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile
              icon={<Clock4 className="h-4 w-4" />}
              label="Type"
              value={typeLabel}
              accent="blue"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label="Scheduled At"
              value={formatDate(interview.scheduledAt)}
              accent="purple"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label="Started At"
              value={formatDate(interview.startedAt)}
              accent="green"
            />
            <InfoTile
              icon={<Calendar className="h-4 w-4" />}
              label="Ended At"
              value={formatDate(interview.endedAt)}
              accent="amber"
            />
            <InfoTile
              icon={<Clock4 className="h-4 w-4" />}
              label="Duration"
              value={formatDuration(duration)}
              accent="blue"
            />
        
            {conductedByLabel && (
              <InfoTile
                icon={<UserIcon className="h-4 w-4" />}
                label="Conducted By"
                value={conductedByLabel}
                accent="purple"
              />
            )}
            {interview.videoLink && (
              <InfoTile
                icon={<Video className="h-4 w-4" />}
                label="Video Link"
                value={
                  <a
                    href={interview.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Open link
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
                accent="blue"
              />
            )}
            {interviewerLabels.length > 0 && (
              <InfoTile
                icon={<UserIcon className="h-4 w-4" />}
                label="Interviewers"
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

          {interview.notes && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <StickyNote className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-gray-800">
                  Interviewer Notes
                </h3>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {interview.notes}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Questions &amp; Answers
            </h2>
            <span className="text-xs text-gray-400">
              {(interview.questions || []).length} question
              {(interview.questions || []).length === 1 ? '' : 's'}
            </span>
          </div>

          {flatQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Inbox className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                No questions recorded
              </p>
              <p className="text-xs text-gray-400">
                This interview does not have any questions attached to it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {flatQuestions.map((q, i) => (
                <QuestionDisplay key={q?._id || q?.id || i} question={q} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CompletedInterviewDetails;
