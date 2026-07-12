import { useMemo } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Library, Plus, X } from 'lucide-react';
import type { PoolGroup } from '../hooks/useQuestionPool';
import { useLocale } from '../../../../../../context/LocaleContext';

export type ManageQuestionsViewProps = {
  attachedGroups: PoolGroup[];
  availableGroups: PoolGroup[];
  pendingAddKeys: string[];
  pendingRemoveKeys: string[];
  onTogglePendingAdd: (key: string) => void;
  onTogglePendingRemove: (key: string) => void;
  onBack: () => void;
  onApply: () => void;
  isApplying: boolean;
};

export const ManageQuestionsView = ({
  attachedGroups,
  availableGroups,
  pendingAddKeys,
  pendingRemoveKeys,
  onTogglePendingAdd,
  onTogglePendingRemove,
  onBack,
  onApply,
  isApplying,
}: ManageQuestionsViewProps) => {
  const { t } = useLocale();
  const hasChanges = useMemo(
    () => pendingAddKeys.length > 0 || pendingRemoveKeys.length > 0,
    [pendingAddKeys, pendingRemoveKeys]
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-2xl font-bold text-white">{t('editQuestions', 'interview')}</h3>
            <p className="text-slate-300 mt-1 text-sm">
              {t('addOrRemoveQuestionGroups', 'interview')}
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
      </div>
      <div className="p-6 space-y-8">
        <section>
          <h4 className="text-sm font-bold text-slate-800 mb-3">{t('attachedGroups', 'interview')}</h4>
          {attachedGroups.length === 0 ? (
            <p className="text-sm text-slate-500">{t('noGroupsAttached', 'interview')}</p>
          ) : (
            <ul className="space-y-2">
              {attachedGroups.map((g) => {
                const isMarkedForRemoval = pendingRemoveKeys.includes(g.key);
                const SourceIcon = g.source === 'company' ? Building2 : Library;
                return (
                  <li
                    key={g.key}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                      isMarkedForRemoval
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-md ${
                          g.source === 'company'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        <SourceIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {g.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('nQuestionsCount', 'interview', { count: g.questions.length })} ·{' '}
                          {g.questions.reduce((s, q) => s + (q.score || 0), 0)} pts
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePendingRemove(g.key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        isMarkedForRemoval
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <X className="h-3 w-3" />
                      {isMarkedForRemoval ? t('willRemove', 'interview') : t('remove', 'interview')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-800 mb-3">{t('availableGroups', 'interview')}</h4>
          {availableGroups.length === 0 ? (
            <p className="text-sm text-slate-500">{t('noMoreGroupsInLibrary', 'interview')}</p>
          ) : (
            <ul className="space-y-2">
              {availableGroups.map((g) => {
                const isMarkedForAdd = pendingAddKeys.includes(g.key);
                const SourceIcon = g.source === 'company' ? Building2 : Library;
                return (
                  <li
                    key={g.key}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                      isMarkedForAdd
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-md ${
                          g.source === 'company'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        <SourceIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                        <p className="text-xs text-slate-500">
                          {t('nQuestionsCount', 'interview', { count: g.questions.length })} ·{' '}
                          {g.questions.reduce((s, q) => s + (q.score || 0), 0)} pts
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePendingAdd(g.key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        isMarkedForAdd
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isMarkedForAdd ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> {t('willAdd', 'interview')}
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> {t('add', 'interview')}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <div className="px-6 pb-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          {t('cancel', 'interview')}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!hasChanges || isApplying}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? t('applying', 'interview') : t('applyChanges', 'interview')}
        </button>
      </div>
    </div>
  );
};
