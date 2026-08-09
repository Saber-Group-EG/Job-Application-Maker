import { useSearchParams, Link } from 'react-router';
import { useLocale } from '../../context/LocaleContext';
import { useCompanyFilter } from '../../context/CompanyFilterContext';
import { useCompanies, useTopUpStatus } from '../../hooks/queries/useCompanies';
import { useQueryClient } from '@tanstack/react-query';
import { cardsKeys } from '../../hooks/queries/useCompanies'; // adjust import path/name to wherever this key factory actually lives
import { paths } from '../../router/Paths';
import { useEffect } from 'react';

export default function SubscriptionComplete() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const isAddCard = ref?.startsWith('addcard-') ?? false;

  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? companies[0]?._id;
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useTopUpStatus(
    isAddCard ? '' : (companyId ?? ''),
    isAddCard ? null : ref
  );

  const paymobSuccess = params.get('success');
  const paymobPending = params.get('pending');

  const status = isAddCard
    ? paymobSuccess === 'true'
      ? 'paid'
      : paymobPending === 'true'
        ? 'pending'
        : 'failed'
    : data?.status;

  useEffect(() => {
    if (ref) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [ref]);

  useEffect(() => {
    if (isAddCard && status === 'paid' && companyId) {
      queryClient.invalidateQueries({ queryKey: cardsKeys.detail(companyId) });
    }
  }, [isAddCard, status, companyId, queryClient]);

  const isPending = isAddCard
    ? status === 'pending'
    : (isLoading || status === 'pending') && !isError;
  const isFailed = isAddCard
    ? status === 'failed'
    : status === 'failed' || isError;

  const successKey = isAddCard
    ? 'subscription.addCardSuccess'
    : 'subscription.topupSuccess';
  const failedKey = isAddCard
    ? 'subscription.addCardFailed'
    : 'subscription.topupFailed';
  const processingKey = isAddCard
    ? 'subscription.addCardProcessing'
    : 'subscription.topupProcessing';

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isPending && (
          <>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
            <h1 className="text-lg font-bold">
              {t(processingKey, 'settings')}
            </h1>
          </>
        )}

        {status === 'paid' && (
          <>
            <h1 className="text-lg font-bold text-emerald-600">
              {t(successKey, 'settings')}
            </h1>
            <Link
              to={paths.recruiting.subscription}
              className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t('subscription.backToSubscription', 'settings')}
            </Link>
          </>
        )}

        {isFailed && (
          <>
            <h1 className="text-lg font-bold text-red-600">
              {t(failedKey, 'settings')}
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
