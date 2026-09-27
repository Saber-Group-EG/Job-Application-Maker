import { useNavigate } from 'react-router';
import {
  Check,
  RotateCcw,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { BackLink, Badge, Button, Card, EmptyState, ErrorState, PageShell } from '../../../components/ui/kit';
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
  const { t, locale } = useLocale();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('Billing Management', 'write');
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const { data: plans = [], isLoading: plansLoading } = usePlans();

  const cancelPlanChangeMutation = useCancelPlanChange();

  const back = (
    <BackLink onClick={() => navigate(paths.recruiting.subscription)}>
      {t('subscription.backToSubscription', 'settings')}
    </BackLink>
  );

  if (!companyId) {
    return (
      <PageShell title={t('subscription.plansTitle', 'settings')} back={back}>
        <Card>
          <EmptyState icon={<Sparkles className="size-6" />} title={t('subscription.noCompany', 'settings')} />
        </Card>
      </PageShell>
    );
  }

  if (isLoading || plansLoading) {
    return (
      <PageShell title={t('subscription.plansTitle', 'settings')} back={back}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell title={t('subscription.plansTitle', 'settings')} back={back}>
        <Card>
          <ErrorState title={t('subscription.loadFailed', 'settings')} />
        </Card>
      </PageShell>
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

  return (
    <PageShell back={back} title={t('subscription.plansTitle', 'settings')} subtitle={t('subscription.plansSubtitle', 'settings')}>
      {hasPendingChange && (
        <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            {pendingPlan ? <ArrowDownCircle className="mt-0.5 size-4 shrink-0" /> : <ArrowUpCircle className="mt-0.5 size-4 shrink-0" />}
            {pendingPlan ? (
              <span>
                {t('subscription.switchingTo', 'settings')} <strong>{pendingPlan.name}</strong> {t('subscription.effectiveOn', 'settings')}{' '}
                {formatDate(periodEndDate.toISOString(), locale)}
              </span>
            ) : (
              <span>
                {t('subscription.upgradeInProgress', 'settings')} <strong>{upgradeInProgressPlan?.name}</strong>
              </span>
            )}
          </p>
          {pendingPlan && canEdit && (
            <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={handleUndoPlanChange} loading={cancelPlanChangeMutation.isPending}>
              {t('subscription.undoSwitch', 'settings')}
            </Button>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${activePlans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {activePlans.map((p) => {
          const isCurrent = p._id === plan._id;
          return (
            <Card key={p._id} className={`flex flex-col p-5 ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{p.name}</h2>
                {isCurrent && <Badge tone="blue">{t('subscription.currentPlanBadge', 'settings')}</Badge>}
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(p.priceCents, p.currency)}
                <span className="ms-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                  / {p.frequency} {t('subscription.days', 'settings')}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {t('subscription.billingCycle', 'settings')}: {p.frequency} {t('subscription.days', 'settings')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {requestsToCredits(p.requestQuota)} {t('subscription.credits', 'settings')} / {p.frequency} {t('subscription.days', 'settings')}
                </li>
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button className="w-full" disabled icon={<Check className="size-4" />}>
                    {t('subscription.current', 'settings')}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleSelectPlan(p)}
                    disabled={hasPendingChange || !canEdit}
                    title={hasPendingChange ? t('subscription.resolvePendingFirst', 'settings') : undefined}
                  >
                    {t('subscription.chooseThisPlan', 'settings')}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t('subscription.plansNote', 'settings')}</p>
    </PageShell>
  );
}
