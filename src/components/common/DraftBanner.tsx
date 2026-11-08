// Shown above a form when useFormDraft restored unsaved work.
import { History, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import type { FormDraft } from '../../hooks/useFormDraft';

const timeAgo = (ts: number, t: (k: string, ns?: string, p?: Record<string, string | number>) => string) => {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return t('draftJustNow', 'common');
  if (mins < 60) return t('draftMinutesAgo', 'common', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('draftHoursAgo', 'common', { count: hours });
  return t('draftDaysAgo', 'common', { count: Math.round(hours / 24) });
};

export default function DraftBanner({
  draft,
  onDiscard,
  className = '',
}: {
  draft: FormDraft;
  /** Reset the form to its starting values. */
  onDiscard: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  if (!draft.restoredAt) return null;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 ${className}`}
    >
      <History className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        {t('draftRestored', 'common', { when: timeAgo(draft.restoredAt, t) })}
      </span>
      <button
        type="button"
        onClick={() => {
          draft.discard();
          onDiscard();
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
      >
        <X className="size-3.5" aria-hidden />
        {t('draftDiscard', 'common')}
      </button>
    </div>
  );
}
