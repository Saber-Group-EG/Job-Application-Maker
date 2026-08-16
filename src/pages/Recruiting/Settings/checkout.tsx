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
  Star,
  Plus,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { useLocale } from '../../../context/LocaleContext';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
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
  const { t, locale, dir } = useLocale();
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

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
        {t('subscription.noCompany', 'settings')}
      </div>
    );
  }

  if (isLoading || packsLoading || plansLoading) {
    return (
      <div className="space-y-6 p-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-red-500">
        {t('subscription.loadFailed', 'settings')}
      </div>
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

  if (result) {
    const queued = result.kind === 'queued';
    return (
      <div className="space-y-6 p-6">
        <PageBreadCrumb pageTitle={t('subscription.checkout', 'settings')} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {queued ? (
              <>
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Clock className="size-6" />
                </span>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t('subscription.downgradeQueuedTitle', 'settings')}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t('subscription.downgradeQueuedText', 'settings')}{' '}
                  {result.effectiveAt
                    ? formatDate(result.effectiveAt, locale)
                    : formatDate(periodEndDate.toISOString(), locale)}
                  .
                </p>
              </>
            ) : (
              <>
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Check className="size-6" />
                </span>
                <h1 className="text-lg font-bold text-emerald-600">
                  {t('subscription.paymentSuccessful', 'settings')}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t('subscription.paymentSuccessText', 'settings')}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={goBack}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              {t('subscription.backToSubscription', 'settings')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageBreadCrumb pageTitle={t('subscription.checkout', 'settings')} />

      {invalid ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('subscription.checkoutInvalid', 'settings')}
            </h1>
            <button
              type="button"
              onClick={goBack}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('subscription.backToSubscription', 'settings')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Order summary */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Receipt className="size-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('subscription.orderSummary', 'settings')}
              </h2>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <ItemIcon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {itemName}
                    {type === 'plan' && isDowngrade && (
                      <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        <ArrowDown className="size-3" />
                        {t('subscription.type_downgrade', 'settings')}
                      </span>
                    )}
                    {type === 'plan' && !isDowngrade && (
                      <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <ArrowUp className="size-3" />
                        {t('subscription.type_upgrade', 'settings')}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {itemDesc}
                  </p>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatMoney(amountCents, currency)}
                </p>
              </div>

              {type === 'plan' && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('subscription.billingCycle', 'settings')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {targetPlan?.frequency} {t('subscription.days', 'settings')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('subscription.credits', 'settings')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {requestsToCredits(targetPlan?.requestQuota ?? 0)}
                    </span>
                  </div>
                  {isDowngrade && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t('subscription.effectiveDate', 'settings')}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(periodEndDate.toISOString(), locale)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t('subscription.total', 'settings')}
                </span>
                {isDowngrade ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                    <Clock className="size-3.5" />
                    {t('subscription.noChargeNow', 'settings')}
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatMoney(amountCents, currency)}
                  </span>
                )}
              </div>

              {type === 'plan' && !isDowngrade && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {t('subscription.upgradeChargedNow', 'settings')}{' '}
                    {t('subscription.forfeitTopUpWarning', 'settings')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <CreditCard className="size-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('subscription.paymentMethod', 'settings')}
              </h2>
            </div>

            <div className="space-y-3 p-6">
              {cardSession ? (
                <>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('subscription.enterCardDetails', 'settings')}
                  </p>
                  <PaymobCardForm
                    publicKey={cardSession.publicKey}
                    clientSecret={cardSession.clientSecret}
                    checkoutUrl={cardSession.checkoutUrl}
                    payButtonLabel={
                      isDowngrade
                        ? t('subscription.confirmChangePlan', 'settings')
                        : `${t('subscription.payNow', 'settings')} — ${formatMoney(
                            amountCents,
                            currency
                          )}`
                    }
                    onSuccess={handleCardComplete}
                    onPending={handleCardPending}
                    onCancel={() => setCardSession(null)}
                  />
                </>
              ) : (
                <>
                  {cardsLoading && (
                    <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  )}

                  {!cardsLoading && cards.length === 0 && (
                    <>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('subscription.noCardsCheckout', 'settings')}
                      </p>
                      <button
                        type="button"
                        onClick={goToAddCard}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3.5 text-sm font-semibold text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
                      >
                        <Plus className="size-4" />
                        {t('subscription.addCard', 'settings')}
                      </button>
                    </>
                  )}

                  {!cardsLoading &&
                    cards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleMakePrimary(card)}
                        disabled={changePrimaryMutation.isPending}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start transition ${
                          card.isPrimary
                            ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-5 items-center justify-center rounded-full border-2 ${
                              card.isPrimary
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {card.isPrimary && <Check className="size-3" />}
                          </span>
                          <div>
                            <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                              {card.maskedPan}
                              {card.isPrimary && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                                  <Star className="size-3" />
                                  {t('subscription.primaryCard', 'settings')}
                                </span>
                              )}
                            </p>
                            {card.failedAttempts > 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {card.failedAttempts}{' '}
                                {t('subscription.failedAttempts', 'settings')}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}

                  {!cardsLoading && cards.length > 0 && (
                    <button
                      type="button"
                      onClick={goToAddCard}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      <Plus className="size-4" />
                      {t('subscription.addCard', 'settings')}
                    </button>
                  )}

                  <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="size-3.5" />
                    {t('subscription.securePayment', 'settings')}
                  </p>

                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={
                      submitting || !primaryCard || changePrimaryMutation.isPending
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : null}
                    {isDowngrade
                      ? t('subscription.confirmChangePlan', 'settings')
                      : `${t('subscription.payNow', 'settings')} — ${formatMoney(
                          amountCents,
                          currency
                        )}`}
                  </button>

                  {payError && (
                    <p className="text-xs text-red-500">
                      {t('subscription.payFailed', 'settings')}
                    </p>
                  )}

                  {primaryCard && (
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                      {t('subscription.chargedToPrimary', 'settings')}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {dir === 'rtl' ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronLeft className="size-4" />
                    )}
                    {t('subscription.backToSubscription', 'settings')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}