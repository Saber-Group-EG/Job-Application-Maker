import { useState } from 'react';
import {
  CreditCard,
  XCircle,
  RotateCcw,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import {
  useSubscription,
  useCancelSubscription,
  useResumeSubscription,
  useStartTopUp,
  useCompanies,
  useTopUpPacks,
  usePlans,
  useChangePlan,
  useCancelPlanChange,
} from '../../../hooks/queries/useCompanies';
import Swal from '../../../utils/swal';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { requestsToCredits } from '../../../utils/credits';
import type { Plan } from '../../../types/companies';

type CompanyShape = {
  _id: string;
  name?: string | { en?: string; ar?: string };
};

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

// `lastPaymentAt` is when the last charge happened, not when the next one
// is due — derive the period-end date from the plan's fixed cycle length
// until/unless the backend returns a dedicated `currentPeriodEnd` field.
function getPeriodEndDate(lastPaymentAt: string, frequencyDays: number) {
  const d = new Date(lastPaymentAt);
  d.setDate(d.getDate() + frequencyDays);
  return d;
}

const STATUS_STYLES: Record<string, string> = {
  active:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  past_due:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  cancelled:
    'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

export default function SubscriptionPage() {
  const { t, locale } = useLocale();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('Interview Settings Management', 'write');
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const { data: topUpPacks = [] } = useTopUpPacks();
  const { data: plans = [] } = usePlans();

  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const startTopUpMutation = useStartTopUp();
  const changePlanMutation = useChangePlan();
  const cancelPlanChangeMutation = useCancelPlanChange();

  const [topUpPending, setTopUpPending] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(
    null
  );

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
        {t('subscription.noCompany', 'settings')}
      </div>
    );
  }

  if (isLoading) {
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

  const { subscription, plan, pendingPlan, upgradeInProgressPlan } = data;
  const periodEndDate = getPeriodEndDate(
    subscription.lastPaymentAt,
    plan.frequency
  );
  const hasPendingChange = !!pendingPlan || !!upgradeInProgressPlan;

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: t('subscription.cancelTitle', 'settings'),
      text: t('subscription.cancelConfirm', 'settings'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('subscription.confirmCancel', 'settings'),
      cancelButtonText: t('back', 'common'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) cancelMutation.mutate(companyId);
  };

  const handleResume = () => resumeMutation.mutate(companyId);

  const handleCancelPlanChange = async () => {
    const result = await Swal.fire({
      title: t('subscription.cancelPlanChangeTitle', 'settings'),
      text: t('subscription.cancelPlanChangeConfirm', 'settings'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('subscription.confirmCancelPlanChange', 'settings'),
      cancelButtonText: t('back', 'common'),
    });
    if (result.isConfirmed) cancelPlanChangeMutation.mutate(companyId);
  };

  const handleBuyTopUp = async (packId: string) => {
    const pack = topUpPacks.find((p) => p.id === packId);
    if (!pack) return;

    const result = await Swal.fire({
      title: t('subscription.confirmTopUpTitle', 'settings'),
      html: `${t('subscription.confirmTopUpText', 'settings')}<br/><strong>+${requestsToCredits(
        pack.amount
      )} ${t('subscription.credits', 'settings')} — ${formatMoney(
        pack.priceCents,
        plan.currency
      )}</strong>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('subscription.confirmPurchase', 'settings'),
      cancelButtonText: t('back', 'common'),
    });
    if (!result.isConfirmed) return;

    setTopUpPending(packId);
    startTopUpMutation.mutate(
      { companyId, packId },
      {
        onSuccess: (res) => {
          if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
            return;
          }
          // Silent charge succeeded — saved card was used, nothing to redirect to.
          Swal.fire({
            icon: 'success',
            title: t('subscription.topUpSuccessTitle', 'settings'),
            text: t('subscription.topUpSuccessText', 'settings'),
          });
        },
        onSettled: () => setTopUpPending(null),
      }
    );
  };

  const openPicker = () => {
    if (hasPendingChange) return; // resolve the existing pending change first
    setIsPickerOpen(true);
  };

  const handleSelectPlan = async (targetPlan: Plan) => {
    const isDowngrade = targetPlan.priceCents < plan.priceCents;

    const confirmResult = await Swal.fire({
      title: isDowngrade
        ? t('subscription.confirmDowngradeTitle', 'settings')
        : t('subscription.confirmUpgradeTitle', 'settings'),
      html: isDowngrade
        ? `${t('subscription.confirmDowngradeText', 'settings')} <strong>${targetPlan.name}</strong> (${formatMoney(
            targetPlan.priceCents,
            targetPlan.currency
          )}) ${t('subscription.effectiveOn', 'settings')} ${formatDate(
            periodEndDate.toISOString(),
            locale
          )}. ${t('subscription.noProrationNote', 'settings')}`
        : `${t('subscription.confirmUpgradeText', 'settings')} <strong>${targetPlan.name}</strong> — ${formatMoney(
            targetPlan.priceCents,
            targetPlan.currency
          )} ${t('subscription.chargedNow', 'settings')}. ${t(
            'subscription.forfeitTopUpWarning',
            'settings'
          )}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('subscription.confirmChangePlan', 'settings'),
      cancelButtonText: t('back', 'common'),
      confirmButtonColor: isDowngrade ? undefined : '#f59e0b',
    });
    if (!confirmResult.isConfirmed) return;

    setPendingSelectionId(targetPlan._id);
    changePlanMutation.mutate(
      { companyId, planId: targetPlan._id },
      {
        onSuccess: (res) => {
          if ('checkoutUrl' in res) {
            window.location.href = res.checkoutUrl;
            return;
          }
          setIsPickerOpen(false);
          if ('queued' in res) {
            Swal.fire({
              icon: 'success',
              title: t('subscription.downgradeQueuedTitle', 'settings'),
              text: `${t('subscription.downgradeQueuedText', 'settings')} ${formatDate(res.effectiveAt!, locale)}.`,
            });
          } else {
            Swal.fire({
              icon: 'success',
              title: t('subscription.upgradeSuccessTitle', 'settings'),
              text: t('subscription.upgradeSuccessText', 'settings'),
            });
          }
        },
        onSettled: () => setPendingSelectionId(null),
      }
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Current Plan card ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <CreditCard className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('subscription.currentPlan', 'settings')}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {plan.name}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[subscription.status] ?? STATUS_STYLES.cancelled}`}
          >
            {t(`subscription.status_${subscription.status}`, 'settings')}
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 sm:grid-cols-3">
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t('subscription.price', 'settings')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(plan.priceCents, plan.currency)}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t('subscription.billingCycle', 'settings')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {plan.frequency} {t('subscription.days', 'settings')}
            </p>
          </div>
          <div className="hidden px-6 py-4 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t('subscription.nextRenewal', 'settings')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatDate(periodEndDate.toISOString(), locale)}
            </p>
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="mx-6 mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                {t('subscription.willCancelOn', 'settings')}{' '}
                {formatDate(periodEndDate.toISOString(), locale)}
              </span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleResume}
                disabled={resumeMutation.isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                <RotateCcw className="size-3.5" />
                {t('subscription.keepSubscription', 'settings')}
              </button>
            )}
          </div>
        )}

        {/* ── Pending downgrade banner ─────────────────────────────────── */}
        {pendingPlan && (
          <div className="mx-6 mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <ArrowDownCircle className="size-4 shrink-0" />
              <span>
                {t('subscription.switchingTo', 'settings')}{' '}
                <strong>{pendingPlan.name}</strong>{' '}
                {t('subscription.effectiveOn', 'settings')}{' '}
                {formatDate(periodEndDate.toISOString(), locale)}
              </span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleCancelPlanChange}
                disabled={cancelPlanChangeMutation.isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10"
              >
                <RotateCcw className="size-3.5" />
                {t('subscription.undoSwitch', 'settings')}
              </button>
            )}
          </div>
        )}

        {/* ── Upgrade-in-progress banner ───────────────────────────────── */}
        {upgradeInProgressPlan && (
          <div className="mx-6 mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <ArrowUpCircle className="size-4 shrink-0" />
            <span>
              {t('subscription.upgradeInProgress', 'settings')}{' '}
              <strong>{upgradeInProgressPlan.name}</strong>
            </span>
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={openPicker}
              disabled={hasPendingChange}
              title={
                hasPendingChange
                  ? t('subscription.resolvePendingFirst', 'settings')
                  : undefined
              }
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('subscription.changePlan', 'settings')}
            </button>
            {!subscription.cancelAtPeriodEnd && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <XCircle className="size-4" />
                {t('subscription.cancelSubscription', 'settings')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Top-up packs card ────────────────────────────────────────── */}
      {canEdit && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-6 dark:border-slate-800">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Package className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('subscription.buyAdditionalQuota', 'settings')}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {t('subscription.topUpDescription', 'settings')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            {topUpPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleBuyTopUp(pack.id)}
                disabled={topUpPending === pack.id}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-4 py-5 text-center transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
              >
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  +{requestsToCredits(pack.amount)}{' '}
                  {t('subscription.credits', 'settings')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t(`subscription.topUp_${pack.id}_desc`, 'settings')}
                </span>
                <span className="mt-2 text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {formatMoney(pack.priceCents, plan.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Plan picker modal ────────────────────────────────────────── */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('subscription.choosePlan', 'settings')}
              </h3>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
              {plans
                .filter((p) => p.isActive)
                .map((p) => {
                  const isCurrent = p._id === plan._id;
                  const isDowngrade = p.priceCents < plan.priceCents;
                  const isSelecting = pendingSelectionId === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      disabled={isCurrent || isSelecting}
                      onClick={() => handleSelectPlan(p)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isCurrent
                          ? 'cursor-default border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10'
                      }`}
                    >
                      <div>
                        <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                          {p.name}
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                              <Check className="size-3" />
                              {t('subscription.current', 'settings')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {requestsToCredits(p.requestQuota)}{' '}
                          {t('subscription.credits', 'settings')} /{' '}
                          {p.frequency} {t('subscription.days', 'settings')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isCurrent &&
                          (isDowngrade ? (
                            <ArrowDownCircle className="size-4 text-slate-400" />
                          ) : (
                            <ArrowUpCircle className="size-4 text-amber-500" />
                          ))}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(p.priceCents, p.currency)}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
