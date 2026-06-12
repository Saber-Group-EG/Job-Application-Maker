import { Award, Clock, FileText, Target } from 'lucide-react';
import { formatTimer } from '../utils/interviewUtils';

export type InterviewStatsBarProps = {
  totalScore: number;
  achieved: number;
  completion: number;
  answered: number;
  total: number;
  elapsedMs: number;
};

export const InterviewStatsBar = ({
  totalScore,
  achieved,
  completion,
  answered,
  total,
  elapsedMs,
}: InterviewStatsBarProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
    <div className="bg-white p-4 text-center">
      <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Total Score</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums">
        {totalScore > 0 ? ((achieved / totalScore) * 100).toFixed(1) : '0'}%
      </p>
      <p className="text-xs text-slate-400 tabular-nums">{achieved} / {totalScore}</p>
    </div>
    <div className="bg-white p-4 text-center">
      <Award className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Achieved</p>
      <p className="text-lg font-bold text-emerald-600 tabular-nums">{achieved.toFixed(1)}</p>
    </div>
    <div className="bg-white p-4 text-center">
      <Clock className="h-4 w-4 text-purple-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Duration</p>
      <p className="text-lg font-bold text-purple-600 tabular-nums">
        {formatTimer(elapsedMs)}
      </p>
    </div>
    <div className="bg-white p-4 text-center">
      <FileText className="h-4 w-4 text-amber-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Completion</p>
      <p className="text-lg font-bold text-amber-600 tabular-nums">{completion.toFixed(0)}%</p>
      <p className="text-xs text-slate-400 tabular-nums">{answered} / {total}
      </p>
    </div>
  </div>
);