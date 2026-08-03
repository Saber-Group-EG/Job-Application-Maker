import { useSearchParams, Link } from 'react-router';
import { useLocale } from '../../context/LocaleContext';
import { useCompanyFilter } from '../../context/CompanyFilterContext';
import {
  useCompanies,
  useTopUpStatus,
} from '../../hooks/queries/useCompanies';
import { paths } from '../../router/Paths';
import { useEffect } from 'react';

export default function SubscriptionComplete() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const ref = params.get('ref');

  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? companies[0]?._id;

  const { data, isLoading, isError } = useTopUpStatus(companyId, ref);
  const status = data?.status;

  useEffect(() => {
    if (ref) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [ref]);
  
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {(isLoading || status === 'pending') && !isError && (
          <>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
            <h1 className="text-lg font-bold">
              {t('subscription.topupProcessing', 'settings')}
            </h1>
          </>
        )}

        {status === 'paid' && (
          <>
            <h1 className="text-lg font-bold text-emerald-600">
              {t('subscription.topupSuccess', 'settings')}
            </h1>
            <Link
              to={paths.recruiting.subscription}
              className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('subscription.backToSubscription', 'settings')}
            </Link>
          </>
        )}

        {(status === 'failed' || isError) && (
          <>
            <h1 className="text-lg font-bold text-red-600">
              {t('subscription.topupFailed', 'settings')}
            </h1>
            <Link
              to={paths.recruiting.subscription}
              className="mt-6 inline-block rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
            >
              {t('subscription.backToSubscription', 'settings')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
