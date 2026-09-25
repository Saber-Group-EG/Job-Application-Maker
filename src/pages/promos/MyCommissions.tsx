import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { useMyCommissions } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import { Ban, CalendarClock, CircleDollarSign, Clock4, History, X } from 'lucide-react';
import type { MyCommissionByMonthRow, MyCommissionRecentRow, MyCommissionSummaryRow } from '../../types/promos';
import {
  Badge,
  Card,
  CodeChip,
  EmptyState,
  ErrorState,
  IconButton,
  PageShell,
  SectionTitle,
  StatCard,
  Table,
  Td,
  Th,
  inputClass,
  rowClass,
} from './components/PromoUI';
import { commissionState, companyLabel, formatDate, formatPeriod } from './promoFormat';

const SUMMARY_ORDER = ['pending', 'paid', 'void'] as const;
const SUMMARY_ICONS = {
  pending: <Clock4 className="size-4" />,
  paid: <CircleDollarSign className="size-4" />,
  void: <Ban className="size-4" />,
};
const RECENT_LIMIT = 8;

export default function MyCommissions() {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState('');

  const { data: ledger, isLoading, isFetching, isError, refetch } = useMyCommissions(month || undefined);

  // One card per status, always in the same order, zero when absent.
  const summary = useMemo(() => {
    const byStatus = new Map<string, MyCommissionSummaryRow>(
      (ledger?.summary ?? []).map((row) => [String(row._id).toLowerCase(), row])
    );
    return SUMMARY_ORDER.map((status) => ({ status, row: byStatus.get(status) }));
  }, [ledger?.summary]);
  const byMonth: MyCommissionByMonthRow[] = ledger?.byMonth ?? [];
  const recent: MyCommissionRecentRow[] = (ledger?.recent ?? []).slice(0, RECENT_LIMIT);

  const money = (value: number | undefined) => (value != null ? formatMoney(value) : '—');

  return (
    <PageShell
      title={t('myLedgerTitle', 'promos')}
      subtitle={t('myLedgerSubtitle', 'promos')}
      actions={
        <div className="flex items-center gap-2">
          <label htmlFor="my-commissions-month" className="text-sm text-slate-500 dark:text-slate-400">
            {t('commissionsMonthLabel', 'promos')}
          </label>
          <input
            id="my-commissions-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`${inputClass} w-auto`}
          />
          {month && (
            <IconButton label={t('commissionsClearMonth', 'promos')} onClick={() => setMonth('')}>
              <X className="size-4" />
            </IconButton>
          )}
        </div>
      }
    >
      <PageMeta title={t('myLedgerTitle', 'promos')} description={t('myLedgerSubtitle', 'promos')} />

      {isError && !isLoading ? (
        <Card>
          <ErrorState title={t('commissionsLoadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className={`space-y-6 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`} aria-busy={isFetching || undefined}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summary.map(({ status, row }) => (
              <StatCard
                key={status}
                label={t(commissionState(status).labelKey, 'promos')}
                value={money(row?.totalCents ?? 0)}
                icon={SUMMARY_ICONS[status]}
                hint={t('cyclesCount', 'promos', { count: row?.cycles ?? 0 })}
                loading={isLoading}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <SectionTitle icon={<CalendarClock className="size-4" />}>{t('myByMonthTitle', 'promos')}</SectionTitle>
              </div>
              {!isLoading && byMonth.length === 0 ? (
                <EmptyState icon={<CalendarClock className="size-6" />} title={t('myLedgerNoMonthData', 'promos')} />
              ) : (
                <Table minWidth={360}>
                  <thead>
                    <tr>
                      <Th>{t('commissionsTableMonth', 'promos')}</Th>
                      <Th>{t('commissionsTableStatus', 'promos')}</Th>
                      <Th align="end">{t('commissionsTableAmount', 'promos')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? [0, 1, 2].map((i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800" aria-hidden="true">
                            <td colSpan={3} className="px-4 py-3.5">
                              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                            </td>
                          </tr>
                        ))
                      : byMonth.map((row, index) => {
                          const state = commissionState(row._id?.status);
                          return (
                            <tr key={index} className={rowClass}>
                              <Td className="whitespace-nowrap">{formatPeriod(row._id?.billingPeriodKey, locale)}</Td>
                              <Td>
                                <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
                              </Td>
                              <Td align="end" className="whitespace-nowrap font-medium tabular-nums text-slate-900 dark:text-white">
                                <bdi>{money(row.totalCents)}</bdi>
                              </Td>
                            </tr>
                          );
                        })}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card>
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <SectionTitle icon={<History className="size-4" />}>{t('myRecentTitle', 'promos')}</SectionTitle>
              </div>
              {!isLoading && recent.length === 0 ? (
                <EmptyState icon={<History className="size-6" />} title={t('myRecentNoEntries', 'promos')} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading
                    ? [0, 1, 2].map((i) => (
                        <li key={i} className="px-5 py-4" aria-hidden="true">
                          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        </li>
                      ))
                    : recent.map((row) => {
                        const state = commissionState(row.status);
                        const code =
                          row.promoCodeId && typeof row.promoCodeId === 'object' ? toPlainString(row.promoCodeId.code || '') : '';
                        return (
                          <li key={row._id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                {companyLabel(row.companyId, locale)}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                {code && <CodeChip code={code} />}
                                <span>{formatPeriod(row.billingPeriodKey, locale)}</span>
                                <span aria-hidden="true">·</span>
                                <span>{formatDate(row.createdAt, locale)}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                                <bdi>{money(row.amountCents)}</bdi>
                              </span>
                              <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
                            </div>
                          </li>
                        );
                      })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
