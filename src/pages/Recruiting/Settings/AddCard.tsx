import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import PaymobCardForm from '../../../components/payments/PaymobCardForm';
import { useCompanies, useStartAddCard, cardsKeys } from '../../../hooks/queries/useCompanies';
import { parsePaymobCheckoutUrl } from '../../../lib/paymobApi';
import { paths } from '../../../router/Paths';

type CompanyShape = {
  _id: string;
};

export default function AddCardPage() {
  const { t, dir } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const startAddCardMutation = useStartAddCard();

  const [session, setSession] = useState<{
    clientSecret: string;
    publicKey: string;
    checkoutUrl: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const start = () => {
    if (!companyId) return;
    setFailed(false);
    startAddCardMutation.mutate(companyId, {
      onSuccess: (res) => {
        const parsed = parsePaymobCheckoutUrl(res.checkoutUrl);
        if (parsed) {
          setSession(parsed);
          return;
        }
        window.location.href = res.checkoutUrl;
      },
      onError: () => setFailed(true),
    });
  };

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
        {t('subscription.noCompany', 'settings')}
      </div>
    );
  }

  const goBack = () => navigate(paths.recruiting.subscription);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: cardsKeys.detail(companyId) });
    setSaved(true);
  };

  const handlePending = (redirectUrl: string) => {
    window.location.href = redirectUrl;
  };

  return (
    <div className="space-y-6 p-6">
      <PageBreadCrumb pageTitle={t('subscription.addCardTitle', 'settings')} />

      <div className="mx-auto w-full max-w-xl">
        {saved ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Check className="size-6" />
            </span>
            <h1 className="text-lg font-bold text-emerald-600">
              {t('subscription.cardSavedTitle', 'settings')}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('subscription.cardSavedText', 'settings')}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                {t('subscription.backToCheckout', 'settings')}
              </button>
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('subscription.backToSubscription', 'settings')}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {t('subscription.addCardTitle', 'settings')}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t('subscription.addCardPageDesc', 'settings')}
                </p>
              </div>
            </div>

            <div className="p-6">
              {startAddCardMutation.isPending && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('addingCard', 'common')}…
                </p>
              )}

              {failed && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    {t('subscription.addCardFailed', 'settings')}
                  </p>
                  <button
                    type="button"
                    onClick={start}
                    className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    {t('subscription.retry', 'settings')}
                  </button>
                </div>
              )}

              {session && (
                <>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    {t('subscription.addCardDetails', 'settings')}
                  </p>
                  <PaymobCardForm
                    publicKey={session.publicKey}
                    clientSecret={session.clientSecret}
                    checkoutUrl={session.checkoutUrl}
                    payButtonLabel={t('subscription.saveCard', 'settings')}
                    saveCard
                    onSuccess={handleSaved}
                    onPending={handlePending}
                    onRetry={start}
                    onCancel={goBack}
                  />
                </>
              )}

              {!session && !failed && !startAddCardMutation.isPending && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <CreditCard className="size-8 text-slate-300 dark:text-slate-600" />
                  <button
                    type="button"
                    onClick={start}
                    className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    {t('subscription.startAddCard', 'settings')}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={goBack}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {dir === 'rtl' ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
                {t('subscription.backToSubscription', 'settings')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}