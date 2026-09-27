import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CreditCard, Loader2 } from 'lucide-react';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { BackLink, Button, Card, CardToolbar, EmptyState, PageShell, SectionTitle } from '../../../components/ui/kit';
import PaymobCardForm from '../../../components/payments/PaymobCardForm';
import { useCompanies, useStartAddCard, cardsKeys } from '../../../hooks/queries/useCompanies';
import { parsePaymobCheckoutUrl } from '../../../lib/paymobApi';
import { paths } from '../../../router/Paths';

type CompanyShape = {
  _id: string;
};

export default function AddCardPage() {
  const { t } = useLocale();
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
      <PageShell title={t('subscription.addCardTitle', 'settings')}>
        <Card>
          <EmptyState icon={<CreditCard className="size-6" />} title={t('subscription.noCompany', 'settings')} />
        </Card>
      </PageShell>
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
    <PageShell
      title={t('subscription.addCardTitle', 'settings')}
      subtitle={t('subscription.addCardPageDesc', 'settings')}
      back={<BackLink onClick={goBack}>{t('subscription.backToSubscription', 'settings')}</BackLink>}
    >
      <Card className="mx-auto w-full max-w-xl">
        {saved ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Check className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{t('subscription.cardSavedTitle', 'settings')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subscription.cardSavedText', 'settings')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={goBack}>{t('subscription.backToSubscription', 'settings')}</Button>
              <Button variant="primary" onClick={() => navigate(-1)}>
                {t('subscription.backToCheckout', 'settings')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <CardToolbar>
              <SectionTitle icon={<CreditCard className="size-4" />}>{t('subscription.addCardTitle', 'settings')}</SectionTitle>
            </CardToolbar>
            <div className="p-4">
              {startAddCardMutation.isPending && (
                <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
                  <Loader2 className="size-4 animate-spin" />
                  {t('addingCard', 'common')}…
                </p>
              )}

              {failed && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
                    <AlertTriangle className="size-4 shrink-0" />
                    {t('subscription.addCardFailed', 'settings')}
                  </p>
                  <Button variant="primary" className="w-full" onClick={start}>
                    {t('subscription.retry', 'settings')}
                  </Button>
                </div>
              )}

              {session && (
                <div>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t('subscription.addCardDetails', 'settings')}</p>
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
                </div>
              )}

              {!session && !failed && !startAddCardMutation.isPending && (
                <EmptyState
                  icon={<CreditCard className="size-6" />}
                  title={t('subscription.addCardTitle', 'settings')}
                  action={
                    <Button variant="primary" onClick={start}>
                      {t('subscription.startAddCard', 'settings')}
                    </Button>
                  }
                />
              )}
            </div>
          </>
        )}
      </Card>
    </PageShell>
  );
}
