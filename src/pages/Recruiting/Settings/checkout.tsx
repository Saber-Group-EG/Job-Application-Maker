import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Package,
  Plus,
  Check,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useLocale } from '../../../context/LocaleContext';
import { BackLink, Badge, Button, Card, CardToolbar, EmptyState, ErrorState, PageShell, SectionTitle, focusRing } from '../../../components/ui/kit';
import {
  useSubscription,
  useTopUpPacks,
  usePlans,
  useCompanies,
  useCards,
  useStartTopUp,
  useChangePlan,
  useChangePrimaryCard,
  subscriptionKeys,
} from '../../../hooks/queries/useCompanies';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { requestsToCredits } from '../../../utils/credits';
import type { SubscriptionCard } from '../../../types/companies';
import { paths } from '../../../router/Paths';
import PaymobCardForm from '../../../components/payments/PaymobCardForm';
import { parsePaymobCheckoutUrl } from '../../../lib/paymobApi';

type CompanyShape = {
  _id: string;
};

type CheckoutResult =
  | { kind: 'success' }
  | { kind: 'queued'; effectiveAt: string | null };

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPeriodEndDate(lastPaymentAt: string, frequencyDays: number) {
  const d = new Date(lastPaymentAt);
  d.setDate(d.getDate() + frequencyDays);
  return d;
}

const TOP_UP_ICONS: Record<string, typeof Zap> = {
  small: Zap,
  medium: Rocket,
  large: Crown,
};

export default function CheckoutPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();

  const type = params.get('type') === 'topup' ? 'topup' : 'plan';
  const packId = params.get('packId');
  const planId = params.get('planId');

  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const { data: topUpPacks = [], isLoading: packsLoading } = useTopUpPacks();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const {
    data: cards = [],
    isLoading: cardsLoading,
  } = useCards(companyId ?? '');

  const startTopUpMutation = useStartTopUp();
  const changePlanMutation = useChangePlan();
  const changePrimaryMutation = useChangePrimaryCard();

  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [cardSession, setCardSession] = useState<{
    clientSecret: string;
    publicKey: string;
    checkoutUrl: string;
  } | null>(null);

  const pageTitle = t('subscription.checkout', 'settings');
  const back = (
    <BackLink onClick={() => navigate(paths.recruiting.subscription)}>
      {t('subscription.backToSubscription', 'settings')}
    </BackLink>
  );

  if (!companyId) {
    return (
      <PageShell title={pageTitle} back={back}>
        <Card>
          <EmptyState icon={<Receipt className="size-6" />} title={t('subscription.noCompany', 'settings')} />
        </Card>
      </PageShell>
    );
  }

  if (isLoading || packsLoading || plansLoading) {
    return (
      <PageShell title={pageTitle} back={back}>
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell title={pageTitle} back={back}>
        <Card>
          <ErrorState title={t('subscription.loadFailed', 'settings')} />
        </Card>
      </PageShell>
    );
  }

  const { plan: currentPlan } = data;
  const periodEndDate = getPeriodEndDate(
    data.subscription.lastPaymentAt,
    currentPlan.frequency
  );
  const currency = currentPlan.currency;

  const topUpPack = type === 'topup' ? topUpPacks.find((p) => p.id === packId) : null;
  const targetPlan =
    type === 'plan'
      ? plans.find((p) => p._id === planId && p.isActive) ?? null
      : null;

  const isValid =
    (type === 'topup' && !!topUpPack) || (type === 'plan' && !!targetPlan);
  const isDowngrade =
    type === 'plan' && targetPlan
      ? targetPlan.priceCents < currentPlan.priceCents
      : false;
  const isCurrentPlan = type === 'plan' && targetPlan?._id === currentPlan._id;

  const amountCents =
    type === 'topup' ? (topUpPack?.priceCents ?? 0) : (targetPlan?.priceCents ?? 0);

  const primaryCard = cards.find((c) => c.isPrimary) ?? cards[0] ?? null;

  const invalid = !isValid || isCurrentPlan;

  const goBack = () => navigate(paths.recruiting.subscription);

  const handlePay = () => {
    if (!companyId || submitting) return;
    setSubmitting(true);
    setPayError(false);

    const startCardSession = (res: {
      checkoutUrl?: string;
      clientSecret?: string;
      publicKey?: string;
    } & Record<string, unknown>) => {
      const parsed = res.checkoutUrl ? parsePaymobCheckoutUrl(res.checkoutUrl) : null;
      const publicKey =
        res.publicKey || parsed?.publicKey || import.meta.env.VITE_PAYMOB_PUBLIC_KEY;
      const clientSecret = res.clientSecret || parsed?.clientSecret;
      if (clientSecret && publicKey) {
        setCardSession({
          clientSecret,
          publicKey,
          checkoutUrl: res.checkoutUrl ?? parsed!.checkoutUrl,
        });
        setSubmitting(false);
        return true;
      }
      return false;
    };

    const onError = () => {
      setSubmitting(false);
      setPayError(true);
    };

    if (type === 'topup' && packId) {
      startTopUpMutation.mutate(
        { companyId, packId },
        {
          onSuccess: (res) => {
            if (startCardSession(res)) return;
            if (res.checkoutUrl) {
              window.location.href = res.checkoutUrl;
              return;
            }
            queryClient.invalidateQueries({
              queryKey: subscriptionKeys.detail(companyId),
            });
            setSubmitting(false);
            setResult({ kind: 'success' });
          },
          onError,
        }
      );
      return;
    }

    if (type === 'plan' && targetPlan) {
      changePlanMutation.mutate(
        { companyId, planId: targetPlan._id },
        {
          onSuccess: (res) => {
            if (startCardSession(res)) return;
            if ('checkoutUrl' in res) {
              window.location.href = res.checkoutUrl;
              return;
            }
            if ('queued' in res) {
              setSubmitting(false);
              setResult({ kind: 'queued', effectiveAt: res.effectiveAt });
              return;
            }
            queryClient.invalidateQueries({
              queryKey: subscriptionKeys.detail(companyId),
            });
            setSubmitting(false);
            setResult({ kind: 'success' });
          },
          onError,
        }
      );
    }
  };

  const handleCardComplete = () => {
    if (companyId) {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.detail(companyId),
      });
    }
    setResult({ kind: 'success' });
  };

  const handleCardPending = (redirectUrl: string) => {
    window.location.href = redirectUrl;
  };

  const goToAddCard = () => navigate(paths.recruiting.addCard);

  const handleMakePrimary = (card: SubscriptionCard) => {
    changePrimaryMutation.mutate({ companyId, cardId: card.id });
  };

  const ItemIcon =
  type === 'topup' ? (TOP_UP_ICONS[packId ?? ''] ?? Package) : Sparkles;
  const itemName =
    type === 'topup'
      ? t(`subscription.topUp_${packId}`, 'settings')
      : targetPlan?.name ?? '';
  const itemDesc =
    type === 'topup'
      ? t(`subscription.topUp_${packId}_desc`, 'settings')
      : `${requestsToCredits(targetPlan?.requestQuota ?? 0)} ${t(
          'subscription.credits',
          'settings'
        )} / ${targetPlan?.frequency ?? ''} ${t('subscription.days', 'settings')}`;

  const payLabel = isDowngrade
    ? t('subscription.confirmChangePlan', 'settings')
    : `${t('subscription.payNow', 'settings')} — ${formatMoney(amountCents, currency)}`;

  if (result) {
    const queued = result.kind === 'queued';
    return (
      <PageShell title={pageTitle}>
        <Card className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span
              className={`flex size-12 items-center justify-center rounded-full ${
                queued ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              }`}
            >
              {queued ? <Clock className="size-6" /> : <Check className="size-6" />}
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
              {queued ? t('subscription.downgradeQueuedTitle', 'settings') : t('subscription.paymentSuccessful', 'settings')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {queued ? (
                <>
                  {t('subscription.downgradeQueuedText', 'settings')}{' '}
                  {result.effectiveAt ? formatDate(result.effectiveAt, locale) : formatDate(periodEndDate.toISOString(), locale)}.
                </>
              ) : (
                t('subscription.paymentSuccessText', 'settings')
              )}
            </p>
            <Button variant="primary" className="mt-6" onClick={goBack}>
              {t('subscription.backToSubscription', 'settings')}
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (invalid) {
    return (
      <PageShell title={pageTitle} back={back}>
        <Card className="mx-auto w-full max-w-md">
          <EmptyState
            icon={<AlertTriangle className="size-6" />}
            title={t('subscription.checkoutInvalid', 'settings')}
            action={<Button onClick={goBack}>{t('subscription.backToSubscription', 'settings')}</Button>}
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={pageTitle} back={back}>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardToolbar>
            <SectionTitle icon={<Receipt className="size-4" />}>{t('subscription.orderSummary', 'settings')}</SectionTitle>
          </CardToolbar>
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <ItemIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {itemName}
                  {type === 'plan' && (
                    <Badge tone={isDowngrade ? 'blue' : 'amber'}>
                      {isDowngrade ? t('subscription.type_downgrade', 'settings') : t('subscription.type_upgrade', 'settings')}
                    </Badge>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{itemDesc}</p>
              </div>
              <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(amountCents, currency)}</p>
            </div>

            {type === 'plan' && (
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('subscription.billingCycle', 'settings')}</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {targetPlan?.frequency} {t('subscription.days', 'settings')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">{t('subscription.credits', 'settings')}</dt>
                  <dd className="font-medium tabular-nums text-slate-900 dark:text-white">{requestsToCredits(targetPlan?.requestQuota ?? 0)}</dd>
                </div>
                {isDowngrade && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">{t('subscription.effectiveDate', 'settings')}</dt>
                    <dd className="font-medium text-slate-900 dark:text-white">{formatDate(periodEndDate.toISOString(), locale)}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('subscription.total', 'settings')}</span>
              {isDowngrade ? (
                <Badge tone="blue">{t('subscription.noChargeNow', 'settings')}</Badge>
              ) : (
                <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{formatMoney(amountCents, currency)}</span>
              )}
            </div>

            {type === 'plan' && !isDowngrade && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {t('subscription.upgradeChargedNow', 'settings')} {t('subscription.forfeitTopUpWarning', 'settings')}
                </span>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardToolbar>
            <SectionTitle icon={<CreditCard className="size-4" />}>{t('subscription.paymentMethod', 'settings')}</SectionTitle>
          </CardToolbar>
          <div className="space-y-3 p-4">
            {cardSession ? (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('subscription.enterCardDetails', 'settings')}</p>
                <PaymobCardForm
                  publicKey={cardSession.publicKey}
                  clientSecret={cardSession.clientSecret}
                  checkoutUrl={cardSession.checkoutUrl}
                  payButtonLabel={payLabel}
                  onSuccess={handleCardComplete}
                  onPending={handleCardPending}
                  onCancel={() => setCardSession(null)}
                />
              </>
            ) : (
              <>
                {cardsLoading && <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}

                {!cardsLoading && cards.length === 0 && (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('subscription.noCardsCheckout', 'settings')}</p>
                    <Button className="w-full" icon={<Plus className="size-4" />} onClick={goToAddCard}>
                      {t('subscription.addCard', 'settings')}
                    </Button>
                  </>
                )}

                {!cardsLoading && cards.length > 0 && (
                  <div role="radiogroup" aria-label={t('subscription.paymentMethod', 'settings')} className="space-y-2">
                    {cards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        role="radio"
                        aria-checked={card.isPrimary}
                        onClick={() => handleMakePrimary(card)}
                        disabled={changePrimaryMutation.isPending}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start transition ${focusRing} ${
                          card.isPrimary
                            ? 'border-brand-400 bg-brand-50/60 dark:border-brand-500/50 dark:bg-brand-500/10'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            card.isPrimary ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {card.isPrimary && <span className="size-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                            <span dir="ltr" className="font-mono">{card.maskedPan}</span>
                            {card.isPrimary && <Badge tone="blue">{t('subscription.primaryCard', 'settings')}</Badge>}
                          </span>
                          {card.failedAttempts > 0 && (
                            <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400">
                              {card.failedAttempts} {t('subscription.failedAttempts', 'settings')}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                    <Button variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={goToAddCard}>
                      {t('subscription.addCard', 'settings')}
                    </Button>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  loading={submitting}
                  disabled={!primaryCard || changePrimaryMutation.isPending}
                  onClick={handlePay}
                >
                  {payLabel}
                </Button>

                {payError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                    {t('subscription.payFailed', 'settings')}
                  </p>
                )}

                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="size-3.5" />
                  {t('subscription.securePayment', 'settings')}
                  {primaryCard && <> · {t('subscription.chargedToPrimary', 'settings')}</>}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
