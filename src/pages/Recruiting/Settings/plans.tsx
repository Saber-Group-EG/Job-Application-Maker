import { useNavigate } from 'react-router';
import {
  Check,
  RotateCcw,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import PageBreadCrumb from '../../../components/common/PageBreadCrumb';
import {
  useSubscription,
  usePlans,
  useCancelPlanChange,
  useCompanies,
} from '../../../hooks/queries/useCompanies';
import Swal from '../../../utils/swal';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { requestsToCredits } from '../../../utils/credits';
import type { Plan } from '../../../types/companies';
import { paths } from '../../../router/Paths';

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

function getPeriodEndDate(lastPaymentAt: string, frequencyDays: number) {
  const d = new Date(lastPaymentAt);
  d.setDate(d.getDate() + frequencyDays);
  return d;
}

export default function PlansPage() {
  const { t, locale, dir } = useLocale();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('Billing Management', 'write');
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const { data: plans = [], isLoading: plansLoading } = usePlans();

  const cancelPlanChangeMutation = useCancelPlanChange();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
        {t('subscription.noCompany', 'settings')}
      </div>
    );
  }

  if (isLoading || plansLoading) {
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

  const { plan, pendingPlan, upgradeInProgressPlan } = data;
  const periodEndDate = getPeriodEndDate(
    data.subscription.lastPaymentAt,
    plan.frequency
  );
  const hasPendingChange = !!pendingPlan || !!upgradeInProgressPlan;

  const activePlans = plans.filter((p) => p.isActive);

  const handleSelectPlan = (targetPlan: Plan) => {
    navigate(
      `${paths.recruiting.checkout}?type=plan&planId=${targetPlan._id}`
    );
  };

  const handleUndoPlanChange = async () => {
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

  const cellClass = (highlighted: boolean, extra = '') =>
    `p-4 ${highlighted ? 'bg-brand-500/10' : ''} ${extra}`;

  return (
    <div className="space-y-6 p-6">
      <PageBreadCrumb pageTitle={t('subscription.choosePlan', 'settings')} />

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="px-6 py-10 md:px-10">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
            {t('subscription.plansEyebrow', 'settings')}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            {t('subscription.plansTitle', 'settings')}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-500 dark:text-slate-400">
            {t('subscription.plansSubtitle', 'settings')}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Check className="size-3.5" />
              {plan.name}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {formatMoney(plan.priceCents, plan.currency)} / {plan.frequency}{' '}
              {t('subscription.days', 'settings')}
            </span>
          </div>
        </div>
      </div>

      {/* Pending change banner */}
      {hasPendingChange && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-4 dark:border-blue-500/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
            {pendingPlan ? (
              <ArrowDownCircle className="size-4 shrink-0" />
            ) : (
              <ArrowUpCircle className="size-4 shrink-0" />
            )}
            {pendingPlan ? (
              <span>
                {t('subscription.switchingTo', 'settings')}{' '}
                <strong>{pendingPlan.name}</strong>{' '}
                {t('subscription.effectiveOn', 'settings')}{' '}
                {formatDate(periodEndDate.toISOString(), locale)}
              </span>
            ) : (
              <span>
                {t('subscription.upgradeInProgress', 'settings')}{' '}
                <strong>{upgradeInProgressPlan?.name}</strong>
              </span>
            )}
          </div>
          {pendingPlan && canEdit && (
            <button
              type="button"
              onClick={handleUndoPlanChange}
              disabled={cancelPlanChangeMutation.isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              <RotateCcw className="size-3.5" />
              {t('subscription.undoSwitch', 'settings')}
            </button>
          )}
        </div>
      )}

      {/* Plan comparison table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr>
                <th className="w-1/5 p-4 text-start text-sm font-medium text-slate-500 dark:text-slate-400" />
                {activePlans.map((p) => {
                  const isCurrent = p._id === plan._id;
                  return (
                    <th
                      key={p._id}
                      className={`rounded-t-xl p-4 text-start ${
                        isCurrent ? 'bg-brand-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            <Sparkles className="size-3" />
                            {t('subscription.currentPlanBadge', 'settings')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.priceCents, p.currency)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        / {p.frequency} {t('subscription.days', 'settings')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('subscription.billingCycle', 'settings')}
                </td>
                {activePlans.map((p) => {
                  const isCurrent = p._id === plan._id;
                  return (
                    <td
                      key={p._id}
                      className={cellClass(
                        isCurrent,
                        'text-sm text-slate-800 dark:text-slate-200'
                      )}
                    >
                      {p.frequency} {t('subscription.days', 'settings')}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('subscription.credits', 'settings')}
                </td>
                {activePlans.map((p) => {
                  const isCurrent = p._id === plan._id;
                  return (
                    <td
                      key={p._id}
                      className={cellClass(
                        isCurrent,
                        'text-sm text-slate-800 dark:text-slate-200'
                      )}
                    >
                      {requestsToCredits(p.requestQuota)}{' '}
                      {t('subscription.credits', 'settings')} /{' '}
                      {p.frequency} {t('subscription.days', 'settings')}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="p-4" />
                {activePlans.map((p) => {
                  const isCurrent = p._id === plan._id;
                  return (
                    <td
                      key={p._id}
                      className={cellClass(
                        isCurrent,
                        'rounded-b-xl'
                      )}
                    >
                      {isCurrent ? (
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 ring-1 ring-brand-300 dark:bg-slate-900 dark:text-brand-400 dark:ring-brand-500/40">
                          <Check className="size-4" />
                          {t('subscription.current', 'settings')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(p)}
                          disabled={hasPendingChange || !canEdit}
                          title={
                            hasPendingChange
                              ? t('subscription.resolvePendingFirst', 'settings')
                              : undefined
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('subscription.chooseThisPlan', 'settings')}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t('subscription.plansNote', 'settings')}
        </div>
      </div>

      {/* Back link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => navigate(paths.recruiting.subscription)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
  );
}