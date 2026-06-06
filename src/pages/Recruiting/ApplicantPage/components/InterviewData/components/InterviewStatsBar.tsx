import { Award, BarChart3, FileText, Target } from 'lucide-react';

export type InterviewStatsBarProps = {
  totalScore: number;
  achieved: number;
  performance: number;
  completion: number;
};

export const InterviewStatsBar = ({
  totalScore,
  achieved,
  performance,
  completion,
}: InterviewStatsBarProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
    <div className="bg-white p-4 text-center">
      <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Total Score</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums">{totalScore}</p>
    </div>
    <div className="bg-white p-4 text-center">
      <Award className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Achieved</p>
      <p className="text-lg font-bold text-emerald-600 tabular-nums">{achieved.toFixed(1)}</p>
    </div>
    <div className="bg-white p-4 text-center">
      <BarChart3 className="h-4 w-4 text-purple-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Performance</p>
      <p className="text-lg font-bold text-purple-600 tabular-nums">{performance.toFixed(1)}%</p>
    </div>
    <div className="bg-white p-4 text-center">
      <FileText className="h-4 w-4 text-amber-500 mx-auto mb-1" />
      <p className="text-xs text-slate-500 font-medium">Completion</p>
      <p className="text-lg font-bold text-amber-600 tabular-nums">{completion.toFixed(0)}%</p>
    </div>
  </div>
);
