import { ArrowLeft, Briefcase, Calendar } from 'lucide-react';
import type { Interview } from '../../../../../../types/applicants';

export type InterviewPickerViewProps = {
  interviews: Interview[];
  onBack: () => void;
  onPick: (interview: Interview) => void;
};

const statusClasses = (status: string): string => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (s === 'in_progress') return 'bg-amber-100 text-amber-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
};

const formatDate = (iso: string | undefined): string => {
  if (!iso) return 'Unknown date';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown date';
  }
};

export const InterviewPickerView = ({
  interviews,
  onBack,
  onPick,
}: InterviewPickerViewProps) => (
  <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-2xl font-bold text-white">Existing Interviews</h3>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>
      <p className="text-slate-300">
        {interviews.length} interview{interviews.length === 1 ? '' : 's'} found. Select one to
        review its questions.
      </p>
    </div>
    <div className="p-6">
      {interviews.length === 0 ? (
        <p className="text-center text-slate-500 py-12">
          No scheduled interviews. Schedule one to begin.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map((interview, idx) => {
            const id = String(interview._id || interview.id || `iv_${idx}`);
            const total = Number(interview.totalScore ?? 0);
            const achieved = Number(interview.achievedScore ?? 0);
            const performance = total > 0 ? Math.round((achieved / total) * 100) : 0;
            const questionCount = Array.isArray(interview.questions)
              ? interview.questions.length
              : 0;
            const status = String(interview.status || 'unknown');
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(interview)}
                className="text-left p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Interview #{interviews.length - idx}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(interview.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusClasses(status)}`}
                  >
                    {status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-500">Type</p>
                    <p className="text-xs font-bold text-slate-800 capitalize">
                      {interview.type || '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-500">Questions</p>
                    <p className="text-xs font-bold text-slate-800">{questionCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-slate-500">Score</p>
                    <p className="text-xs font-bold text-blue-600 tabular-nums">
                      {achieved}/{total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mr-3">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${performance}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 tabular-nums">
                    {performance}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
