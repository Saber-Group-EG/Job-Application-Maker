import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLocale } from '../context/LocaleContext';
import { useQuota } from '../context/QuotaContext';

export default function QuotaBlockedScreen() {
  const { t } = useLocale();
  const { canRenew, renewPath } = useQuota();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-slate-900">
      <div className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <Lock className="size-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {t('subscription.quotaBlockedTitle', 'settings')}
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {canRenew
          ? t('subscription.quotaBlockedAdminBody', 'settings')
          : t('subscription.quotaBlockedBody', 'settings')}
      </p>
      {canRenew && (
        <button
          type="button"
          onClick={() => navigate(renewPath)}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          {t('subscription.renewPlan', 'settings')}
        </button>
      )}
    </div>
  );
}
