import { useSearchParams, Link } from 'react-router';
import { useLocale } from '../../context/LocaleContext';
import { useCompanyFilter } from '../../context/CompanyFilterContext';
import { useCompanies, useTopUpStatus } from '../../hooks/queries/useCompanies';
import { useQueryClient } from '@tanstack/react-query';
import { cardsKeys } from '../../hooks/queries/useCompanies'; // adjust import path/name to wherever this key factory actually lives
import { paths } from '../../router/Paths';
import { useEffect } from 'react';
import { Check, Loader2, XCircle } from 'lucide-react';
import { Card, focusRing } from '../../components/ui/kit';

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

  const backLink = (primary: boolean) => (
    <Link
      to={paths.recruiting.subscription}
      className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition ${focusRing} ${
        primary
          ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600'
          : 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {t('subscription.backToSubscription', 'settings')}
    </Link>
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center px-6 py-10 text-center" role="status" aria-live="polite">
          {isPending && (
            <>
              <Loader2 className="size-10 animate-spin text-brand-500" />
              <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t(processingKey, 'settings')}</h1>
            </>
          )}

          {status === 'paid' && (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Check className="size-6" />
              </span>
              <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t(successKey, 'settings')}</h1>
              {backLink(true)}
            </>
          )}

          {isFailed && (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <XCircle className="size-6" />
              </span>
              <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t(failedKey, 'settings')}</h1>
              {backLink(false)}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
