import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CreditCard,
  XCircle,
  RotateCcw,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Plus,
  Receipt,
  Gauge,
  Zap,
  Rocket,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  PageShell,
  Pagination,
  SectionTitle,
  SkeletonRows,
  Table,
  Td,
  Th,
  filterSelectClass,
  focusRing,
  rowClass,
} from '../../../components/ui/kit';
import type { BadgeTone } from '../../../components/ui/kit';
import {
  useSubscription,
  useCancelSubscription,
  useResumeSubscription,
  useCompanies,
  useTopUpPacks,
  useTransactions,
  useCancelPlanChange,
} from '../../../hooks/queries/useCompanies';
import Swal from '../../../utils/swal';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import { requestsToCredits } from '../../../utils/credits';
import type {
  SubscriptionCard,
  TransactionRecord,
} from '../../../types/companies';
import { CreditCard as CardIcon, Trash2, Star } from 'lucide-react';
import {
  useCards,
  useDeleteCard,
  useChangePrimaryCard,
  useStartAddCard,
  cardsKeys,
} from '../../../hooks/queries/useCompanies';
import { paths } from '../../../router/Paths';
import { useQueryClient } from '@tanstack/react-query';
import PaymobCardForm from '../../../components/payments/PaymobCardForm';
import { parsePaymobCheckoutUrl } from '../../../lib/paymobApi';

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

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'green',
  past_due: 'amber',
  cancelled: 'slate',
  expired: 'red',
  suspended: 'red',
};

const TRANSACTION_STATUS_TONES: Record<string, BadgeTone> = {
  paid: 'green',
  failed: 'red',
  pending: 'amber',
};

const TRANSACTION_TYPE_ICONS: Record<
  TransactionRecord['type'],
  typeof ArrowUpCircle
> = {
  signup: Package,
  renewal: RotateCcw,
  upgrade: ArrowUpCircle,
  downgrade: ArrowDownCircle,
  topup: Package,
};

const TOP_UP_ICONS: Record<string, typeof Zap> = {
  small: Zap,
  medium: Rocket,
  large: Crown,
};

export default function SubscriptionPage() {
  const { t, locale } = useLocale();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('Billing Management', 'write');
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const { selectedCompanyId } = useCompanyFilter();
  const companyId = selectedCompanyId ?? (companies as CompanyShape[])[0]?._id;

  const { data, isLoading, isError } = useSubscription(companyId ?? '');
  const { data: topUpPacks = [] } = useTopUpPacks();

  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelPlanChangeMutation = useCancelPlanChange();
  const { data: cards = [], isLoading: cardsLoading } = useCards(companyId);
  const deleteCardMutation = useDeleteCard();
  const changePrimaryMutation = useChangePrimaryCard();
  const startAddCardMutation = useStartAddCard(); // NEW
  const [isCardsOpen, setIsCardsOpen] = useState(false);
  const [addCardSession, setAddCardSession] = useState<{
    clientSecret: string;
    publicKey: string;
    checkoutUrl: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionType, setTransactionType] = useState<
    TransactionRecord['type'] | ''
  >('');

  const { data: transactionsData, isLoading: transactionsLoading } =
    useTransactions(companyId, {
      page: transactionPage,
      PageCount: 10,
      ...(transactionType ? { type: transactionType } : {}),
    });

  const transactions = transactionsData?.data ?? [];
  const totalPages = transactionsData?.totalPages ?? 1;

  const pageTitle = t('subscription.pageBreadcrumb', 'settings');

  if (!companyId) {
    return (
      <PageShell title={pageTitle}>
        <Card>
          <EmptyState icon={<CreditCard className="size-6" />} title={t('subscription.noCompany', 'settings')} />
        </Card>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell title={pageTitle}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell title={pageTitle}>
        <Card>
          <ErrorState title={t('subscription.loadFailed', 'settings')} />
        </Card>
      </PageShell>
    );
  }

  const {
    subscription,
    plan,
    pendingPlan,
    upgradeInProgressPlan,
    activePromo,
  } = data;
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

  const handleBuyTopUp = (packId: string) => {
    navigate(`${paths.recruiting.checkout}?type=topup&packId=${packId}`);
  };

  const openPicker = () => navigate(paths.recruiting.plans);

  const handleDeleteCard = async (card: SubscriptionCard) => {
    const result = await Swal.fire({
      title: t('subscription.confirmDeleteCardTitle', 'settings'),
      text: `${t('subscription.confirmDeleteCardText', 'settings')} ${card.maskedPan}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('subscription.confirmDelete', 'settings'),
      cancelButtonText: t('back', 'common'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed)
      deleteCardMutation.mutate({ companyId, cardId: card.id });
  };

  const handleMakePrimary = (card: SubscriptionCard) => {
    changePrimaryMutation.mutate({ companyId, cardId: card.id });
  };

  const handleTypeFilterChange = (value: TransactionRecord['type'] | '') => {
    setTransactionType(value);
    setTransactionPage(1);
  };

  const handleAddCard = () => {
    startAddCardMutation.mutate(companyId, {
      onSuccess: (res) => {
        const session = parsePaymobCheckoutUrl(res.checkoutUrl);
        if (session) {
          setAddCardSession(session);
          return;
        }
        window.location.href = res.checkoutUrl;
      },
    });
  };

  const handleAddCardComplete = () => {
    queryClient.invalidateQueries({ queryKey: cardsKeys.detail(companyId) });
    setAddCardSession(null);
  };

  const handleAddCardPending = (redirectUrl: string) => {
    window.location.href = redirectUrl;
  };

  const overLimit = data.usage.used >= data.usage.effectiveLimit;
  const usageTone: BadgeTone = overLimit ? 'red' : data.usage.nearLimit ? 'amber' : 'green';

  return (
    <PageShell
      title={pageTitle}
      subtitle={plan.name}
      actions={
        canEdit && (
          <>
            <Button icon={<CardIcon className="size-4" />} onClick={() => setIsCardsOpen(true)}>
              {t('subscription.manageCards', 'settings')}
            </Button>
            <Button variant="primary" onClick={openPicker}>
              {t('subscription.changePlan', 'settings')}
            </Button>
          </>
        )
      }
    >
      {/* Usage this cycle */}
      <Card>
        <CardToolbar>
          <div>
            <SectionTitle icon={<Gauge className="size-4" />}>{t('subscription.usageThisCycle', 'settings')}</SectionTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t('subscription.used', 'settings')} {requestsToCredits(data.usage.used)} {t('subscription.of', 'settings')}{' '}
              {requestsToCredits(data.usage.effectiveLimit)} {t('subscription.credits', 'settings')}
            </p>
          </div>
          <Badge tone={usageTone}>
            {overLimit
              ? t('subscription.limitReached', 'settings')
              : data.usage.nearLimit
                ? t('subscription.nearLimitWarning', 'settings')
                : t('subscription.usageOk', 'settings')}
          </Badge>
        </CardToolbar>
        <div className="space-y-4 p-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(data.usage.percentUsed))}
            aria-label={t('subscription.usageThisCycle', 'settings')}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${overLimit ? 'bg-rose-500' : data.usage.nearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.round(data.usage.percentUsed))}%` }}
            />
          </div>
          <dl className="grid grid-cols-3 gap-4">
            {[
              { label: t('subscription.used', 'settings'), value: `${requestsToCredits(data.usage.used)} ${t('subscription.credits', 'settings')}` },
              { label: t('subscription.remaining', 'settings'), value: `${requestsToCredits(data.usage.remaining)} ${t('subscription.credits', 'settings')}` },
              { label: t('subscription.billingCycle', 'settings'), value: `${Math.round(data.usage.percentUsed)}%` },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      {/* Current plan */}
      <Card>
        <CardToolbar>
          <div>
            <SectionTitle icon={<CreditCard className="size-4" />}>{t('subscription.currentPlan', 'settings')}</SectionTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{plan.name}</p>
          </div>
          <Badge tone={STATUS_TONES[subscription.status] ?? 'slate'}>{t(`subscription.status_${subscription.status}`, 'settings')}</Badge>
        </CardToolbar>

        <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('subscription.price', 'settings')}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
              {activePromo ? formatMoney(subscription.currentCycleAmountCents, plan.currency) : formatMoney(plan.priceCents, plan.currency)}
              {activePromo && (
                <span className="ms-2 text-xs font-normal text-slate-400 line-through">{formatMoney(plan.priceCents, plan.currency)}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('subscription.billingCycle', 'settings')}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
              {plan.frequency} {t('subscription.days', 'settings')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('subscription.nextRenewal', 'settings')}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{formatDate(periodEndDate.toISOString(), locale)}</dd>
          </div>
        </dl>

        <div className="space-y-3 px-4 pb-4 empty:hidden">
          {subscription.cancelAtPeriodEnd && (
            <Notice tone="amber" icon={<AlertTriangle className="size-4" />}
              action={canEdit && (
                <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={handleResume} loading={resumeMutation.isPending}>
                  {t('subscription.keepSubscription', 'settings')}
                </Button>
              )}
            >
              {t('subscription.willCancelOn', 'settings')} {formatDate(periodEndDate.toISOString(), locale)}
            </Notice>
          )}

          {pendingPlan && (
            <Notice tone="blue" icon={<ArrowDownCircle className="size-4" />}
              action={canEdit && (
                <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={handleCancelPlanChange} loading={cancelPlanChangeMutation.isPending}>
                  {t('subscription.undoSwitch', 'settings')}
                </Button>
              )}
            >
              {t('subscription.switchingTo', 'settings')} <strong>{pendingPlan.name}</strong> {t('subscription.effectiveOn', 'settings')}{' '}
              {formatDate(periodEndDate.toISOString(), locale)}
            </Notice>
          )}

          {upgradeInProgressPlan && (
            <Notice tone="amber" icon={<ArrowUpCircle className="size-4" />}>
              {t('subscription.upgradeInProgress', 'settings')} <strong>{upgradeInProgressPlan.name}</strong>
            </Notice>
          )}

          {activePromo && (
            <Notice tone="green" icon={<Receipt className="size-4" />}>
              {t('subscription.promoActive', 'settings')} <strong>{activePromo.code}</strong> —{' '}
              {activePromo.discountCyclesTotal - activePromo.discountCyclesUsed} {t('subscription.cyclesRemaining', 'settings')},{' '}
              {t('subscription.revertsOn', 'settings')} {formatDate(activePromo.revertsAt, locale)}
            </Notice>
          )}
        </div>

        {canEdit && !subscription.cancelAtPeriodEnd && (
          <div className="flex justify-end border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <Button variant="danger" icon={<XCircle className="size-4" />} onClick={handleCancel} loading={cancelMutation.isPending}>
              {t('subscription.cancelSubscription', 'settings')}
            </Button>
          </div>
        )}
      </Card>

      {/* Top-up packs */}
      {canEdit && (
        <Card>
          <CardToolbar>
            <div>
              <SectionTitle icon={<Package className="size-4" />}>{t('subscription.buyAdditionalQuota', 'settings')}</SectionTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('subscription.topUpDescription', 'settings')}</p>
            </div>
          </CardToolbar>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            {topUpPacks.map((pack) => {
              const PackIcon = TOP_UP_ICONS[pack.id] ?? Package;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handleBuyTopUp(pack.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border border-slate-200 p-4 text-start transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5 ${focusRing}`}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <PackIcon className="size-4" />
                  </span>
                  <span className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{t(`subscription.topUp_${pack.id}`, 'settings')}</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    +{requestsToCredits(pack.amount)} {t('subscription.credits', 'settings')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t(`subscription.topUp_${pack.id}_desc`, 'settings')}</span>
                  <span className="mt-2 text-sm font-semibold text-brand-600 dark:text-brand-400">{formatMoney(pack.priceCents, plan.currency)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Transaction history */}
      <Card>
        <CardToolbar>
          <div>
            <SectionTitle icon={<Receipt className="size-4" />}>{t('subscription.transactionHistory', 'settings')}</SectionTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('subscription.transactionHistoryDescription', 'settings')}</p>
          </div>
          <select
            value={transactionType}
            aria-label={t('subscription.type', 'settings')}
            onChange={(e) => handleTypeFilterChange(e.target.value as TransactionRecord['type'] | '')}
            className={filterSelectClass}
          >
            <option value="">{t('subscription.allTypes', 'settings')}</option>
            <option value="signup">{t('subscription.type_signup', 'settings')}</option>
            <option value="renewal">{t('subscription.type_renewal', 'settings')}</option>
            <option value="upgrade">{t('subscription.type_upgrade', 'settings')}</option>
            <option value="downgrade">{t('subscription.type_downgrade', 'settings')}</option>
            <option value="topup">{t('subscription.type_topup', 'settings')}</option>
          </select>
        </CardToolbar>

        {!transactionsLoading && transactions.length === 0 ? (
          <EmptyState icon={<Receipt className="size-6" />} title={t('subscription.noTransactions', 'settings')} />
        ) : (
          <>
            <Table minWidth={560} busy={transactionsLoading}>
              <thead>
                <tr>
                  <Th>{t('subscription.date', 'settings')}</Th>
                  <Th>{t('subscription.type', 'settings')}</Th>
                  <Th>{t('subscription.amount', 'settings')}</Th>
                  <Th>{t('subscription.txnStatus', 'settings')}</Th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  <SkeletonRows rows={4} cols={4} />
                ) : (
                  transactions.map((txn) => {
                    const TypeIcon = TRANSACTION_TYPE_ICONS[txn.type] ?? Package;
                    return (
                      <tr key={txn._id} className={rowClass}>
                        <Td>{formatDate(txn.createdAt, locale)}</Td>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <TypeIcon className="size-4 text-slate-400" />
                            {t(`subscription.type_${txn.type}`, 'settings')}
                          </span>
                        </Td>
                        <Td className="font-medium tabular-nums text-slate-900 dark:text-white">{formatMoney(txn.amountCents, txn.currency)}</Td>
                        <Td>
                          <Badge tone={TRANSACTION_STATUS_TONES[txn.status] ?? 'amber'}>{t(`subscription.txnStatus_${txn.status}`, 'settings')}</Badge>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
            {!transactionsLoading && totalPages > 1 && (
              <Pagination page={transactionsData?.page ?? transactionPage} totalPages={totalPages} onChange={setTransactionPage} />
            )}
          </>
        )}
      </Card>

      {/* Cards */}
      <Dialog open={isCardsOpen} onClose={() => setIsCardsOpen(false)} size="sm" title={t('subscription.manageCards', 'settings')}>
        {addCardSession ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('subscription.addCardDetails', 'settings')}</p>
            <PaymobCardForm
              publicKey={addCardSession.publicKey}
              clientSecret={addCardSession.clientSecret}
              checkoutUrl={addCardSession.checkoutUrl}
              payButtonLabel={t('subscription.saveCard', 'settings')}
              saveCard
              onSuccess={handleAddCardComplete}
              onPending={handleAddCardPending}
              onRetry={handleAddCard}
              onCancel={() => setAddCardSession(null)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {cardsLoading && (
              <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status">
                <Loader2 className="size-4 animate-spin" />
                {t('subscription.loadingCards', 'settings')}
              </p>
            )}
            {!cardsLoading && cards.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('subscription.noCards', 'settings')}</p>
            )}
            {cards.map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  card.isPrimary ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                    <CardIcon className="size-4 text-slate-400" />
                    <span dir="ltr" className="font-mono">{card.maskedPan}</span>
                    {card.isPrimary && <Badge tone="blue">{t('subscription.primaryCard', 'settings')}</Badge>}
                  </p>
                  {card.failedAttempts > 0 && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      {card.failedAttempts} {t('subscription.failedAttempts', 'settings')}
                    </p>
                  )}
                </div>
                {!card.isPrimary && (
                  <div className="flex shrink-0">
                    <IconButton label={t('subscription.makePrimary', 'settings')} onClick={() => handleMakePrimary(card)} disabled={changePrimaryMutation.isPending}>
                      <Star className="size-4" />
                    </IconButton>
                    <IconButton tone="danger" label={t('subscription.deleteCard', 'settings')} onClick={() => handleDeleteCard(card)} disabled={deleteCardMutation.isPending}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </div>
            ))}
            <Button className="w-full" icon={<Plus className="size-4" />} onClick={handleAddCard} loading={startAddCardMutation.isPending}>
              {startAddCardMutation.isPending ? t('addingCard', 'common') : t('addCard', 'common')}
            </Button>
          </div>
        )}
      </Dialog>
    </PageShell>
  );
}

function Notice({
  tone,
  icon,
  action,
  children,
}: {
  tone: 'amber' | 'blue' | 'green';
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    blue: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  };
  return (
    <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${tones[tone]}`}>
      <p className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}
