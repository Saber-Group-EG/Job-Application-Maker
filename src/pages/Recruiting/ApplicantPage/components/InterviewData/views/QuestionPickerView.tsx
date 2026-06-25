import { useMemo } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Library, Play, Save } from 'lucide-react';
import type { PoolGroup } from '../hooks/useQuestionPool';
import type { InterviewAnswer } from '../../../../../../types/applicants';
import { useLocale } from '../../../../../../context/LocaleContext';

export type QuestionPickerViewProps = {
  pool: PoolGroup[];
  isLoading: boolean;
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onBack: () => void;
  onSaveOnly: () => void;
  onSaveAndStart: () => void;
  isSaving: boolean;
  scheduledAtLabel: string;
};

export const QuestionPickerView = ({
  pool,
  isLoading,
  selectedKeys,
  onToggle,
  onBack,
  onSaveOnly,
  onSaveAndStart,
  isSaving,
  scheduledAtLabel,
}: QuestionPickerViewProps) => {
  const { t } = useLocale();
  const selectedCount = selectedKeys.length;
  const totalQuestions = useMemo(
    () =>
      selectedKeys.reduce((sum, k) => {
        const g = pool.find((qg) => qg.key === k);
        return sum + (g ? g.questions.length : 0);
      }, 0),
    [pool, selectedKeys]
  );
  const totalScore = useMemo(
    () =>
      selectedKeys.reduce((sum, k) => {
        const g = pool.find((qg) => qg.key === k);
        return sum + (g ? g.questions.reduce((s, q) => s + (q.score || 0), 0) : 0);
      }, 0),
    [pool, selectedKeys]
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-7">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <div>
            <h3 className="text-2xl font-bold text-white">{t('pickInterviewQuestions', 'interview')}</h3>
            <p className="text-slate-300 mt-1 text-sm">
              {t('scheduledForLabel', 'interview', { label: scheduledAtLabel })}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('back', 'interview')}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white">
            {t('nGroupsSelected', 'interview', { count: selectedCount })}
          </span>
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white">
            {t('nQuestions', 'interview', { count: totalQuestions })}
          </span>
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white">
            {t('nPtsTotal', 'interview', { count: totalScore })}
          </span>
        </div>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {t('loadingQuestionLibrary', 'interview')}
          </div>
        ) : pool.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <Library className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{t('noQuestionGroupsAvailable', 'interview')}</p>
            <p className="mt-1 text-xs text-slate-400">
              {t('addGroupsInCompanySettings', 'interview')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {pool.map((group) => {
              const isSelected = selectedKeys.includes(group.key);
              const groupTotal = group.questions.reduce((s, q) => s + (q.score || 0), 0);
              const SourceIcon = group.source === 'company' ? Building2 : Library;
              const sourceLabel = group.source === 'company' ? t('companyLibrary', 'interview') : t('myLibrary', 'interview');
              return (
                <div
                  key={group.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggle(group.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggle(group.key);
                    }
                  }}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/60 shadow-lg transform scale-[1.01]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <SourceIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{group.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          {sourceLabel} · {t('nQuestionsCount', 'interview', { count: group.questions.length })} · {groupTotal} pts
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          {t('youCanEditGroupsLater', 'interview')}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveOnly}
            disabled={isSaving || selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-3.5 w-3.5" />
            {t('saveQuestions', 'interview')}
          </button>
          <button
            type="button"
            onClick={onSaveAndStart}
            disabled={isSaving || selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-3.5 w-3.5" />
            {t('saveAndStartInterview', 'interview')}
          </button>
        </div>
      </div>
    </div>
  );
};

// helper type alias to silence unused warnings on InterviewAnswer
export type _QuestionPickerView = InterviewAnswer;
