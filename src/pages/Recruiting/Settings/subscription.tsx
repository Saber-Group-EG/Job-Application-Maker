import { useState } from 'react';
import {
  CreditCard,
  XCircle,
  RotateCcw,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import {
  useSubscription,
  useCancelSubscription,
  useResumeSubscription,
  useCompanies,
} from '../../../hooks/queries/useCompanies';
import Swal from '../../../utils/swal';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { requestsToCredits } from '../../../utils/credits';

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

// Internal amounts kept for the backend call — never rendered to the user.
const TOP_UP_PACKS = [
  { id: 'small', amount: 5000, priceCents: 50000 },
  { id: 'medium', amount: 10000, priceCents: 90000 },
  { id: 'large', amount: 20000, priceCents: 160000 },
];

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
  const canEdit = hasPermission('Billing Management', 'write');
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const [topUpPending, setTopUpPending] = useState<string | null>(null);

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

  const { subscription, plan } = data;
  const periodEndDate = getPeriodEndDate(
    subscription.lastPaymentAt,
    plan.frequency
  );

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

  const handleBuyTopUp = (packId: string) => {
    setTopUpPending(packId);
    Swal.fire({
      title: t('subscription.comingSoon', 'settings'),
      text: t('subscription.topUpNotAvailable', 'settings'),
      icon: 'info',
    }).finally(() => setTopUpPending(null));
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

        {canEdit && (
          <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
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

      {/* ── Top-up packs card — sizes, not raw counts ───────────────────── */}
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
            {TOP_UP_PACKS.map((pack) => (
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
    </div>
  );
}
