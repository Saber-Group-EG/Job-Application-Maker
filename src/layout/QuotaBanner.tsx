import { AlertTriangle, X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useQuota } from '../context/QuotaContext';

export default function QuotaBanner() {
  const { t } = useLocale();
  const { nearLimit, bannerDismissed, dismissBanner } = useQuota();
  if (!nearLimit || bannerDismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        <span>{t('subscription.nearLimitWarning', 'settings')}</span>
      </div>
      <button
        type="button"
        onClick={dismissBanner}
        aria-label={t('close', 'common')}
        className="shrink-0 rounded-md p-1 text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
