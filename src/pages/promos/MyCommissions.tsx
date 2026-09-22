import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import { useMyCommissions } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import {
  CalendarClock,
  Wallet,
  Clock4,
  History,
  Ban,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type {
  MyCommissionByMonthRow,
  MyCommissionRecentRow,
  MyCommissionSummaryRow,
  CompanyName,
} from '../../types/promos';

const SUMMARY_ORDER = ['pending', 'paid', 'void'];
const RECENT_LIMIT = 8;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

function companyName(name: CompanyName | undefined, locale: string): string {
  if (!name) return '—';
  if (typeof name === 'string') return toPlainString(name);
  return toPlainString(
    locale === 'ar' ? name.ar || name.en : name.en || name.ar
  );
}

function summaryStyle(status: string) {
  const key = status.toLowerCase();
  if (key === 'paid') {
    return {
      accent:
        'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20',
      icon: <Wallet className="size-8 text-emerald-500/40" />,
    };
  }
  if (key === 'void') {
    return {
      accent:
        'bg-gradient-to-br from-slate-500/10 to-slate-500/5 border border-slate-500/20',
      icon: <Ban className="size-8 text-slate-400/60" />,
    };
  }
  return {
    accent:
      'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20',
    icon: <Clock4 className="size-8 text-amber-500/40" />,
  };
}

export default function MyCommissions() {
  const { t, locale } = useLocale();

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  const [month, setMonth] = useState('');

  const {
    data: ledger,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMyCommissions(month || undefined);

  const summary = useMemo<MyCommissionSummaryRow[]>(() => {
    const rank = (status: string) => {
      const i = SUMMARY_ORDER.indexOf(String(status).toLowerCase());
      return i === -1 ? SUMMARY_ORDER.length : i;
    };
    return [...(ledger?.summary ?? [])].sort(
      (a, b) => rank(a._id) - rank(b._id)
    );
  }, [ledger?.summary]);
  const byMonth: MyCommissionByMonthRow[] = ledger?.byMonth ?? [];
  const recent: MyCommissionRecentRow[] = ledger?.recent ?? [];

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [isRtl]
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [isRtl]
  );

  const statusChip = (status: string | undefined) => {
    const key = (status || '').toLowerCase();
    if (key === 'paid')
      return {
        cls: 'bg-green-500/10 text-green-600',
        label: t('ledgerStatusPaid', 'promos'),
      };
    if (key === 'void')
      return {
        cls: 'bg-slate-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400',
        label: t('ledgerStatusVoid', 'promos'),
      };
    return {
      cls: 'bg-amber-500/10 text-amber-600',
      label: t('ledgerStatusPending', 'promos'),
    };
  };

  const formatDate = (value: string | undefined): string => {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return toPlainString(value);
    return dateFormatter.format(date);
  };

  // "2026-09" → "September 2026" (falls back to the raw key if it has another shape).
  const formatPeriod = (key: string | undefined): string => {
    if (!key) return '—';
    const match = /^(\d{4})-(\d{2})$/.exec(key);
    if (!match) return toPlainString(key);
    return monthFormatter.format(
      new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
    );
  };

  const recentCode = (row: MyCommissionRecentRow): string => {
    const raw = row.promoCodeId;
    if (raw && typeof raw === 'object') return toPlainString(raw.code || '');
    return '';
  };

  const money = (value: number | undefined): string =>
    value != null ? formatMoney(value) : '—';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('myLedgerTitle', 'promos')}
        description={t('myLedgerSubtitle', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t('myLedgerTitle', 'promos')} />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1
              className={`text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ${
                isRtl ? '' : 'tracking-tight'
              }`}
            >
              {t('myLedgerTitle', 'promos')}
            </h1>
            <p
              className={`mt-1 text-gray-500 dark:text-gray-400 font-medium ${
                isRtl ? '' : 'italic'
              }`}
            >
              {t('myLedgerSubtitle', 'promos')}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="my-commissions-month"
              className={`text-[10px] font-black text-gray-400 uppercase ${tracking} ms-1 flex items-center gap-2`}
            >
              <CalendarClock className="size-3.5" />
              {t('commissionsMonthLabel', 'promos')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="my-commissions-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer dark:text-white dark:[color-scheme:dark]"
              />
              {month && (
                <button
                  type="button"
                  onClick={() => setMonth('')}
                  aria-label={t('clearFilters', 'promos')}
                  title={t('clearFilters', 'promos')}
                  className={`size-11 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all ${focusRing}`}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div
            aria-busy="true"
            className="space-y-8 animate-pulse motion-reduce:animate-none"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-[2rem] bg-slate-200/50 dark:bg-white/5"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-[2rem] bg-slate-200/50 dark:bg-white/5"
                />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="py-20 text-center rounded-[2rem] border border-red-500/20 bg-red-500/5">
            <div className="size-16 rounded-full bg-red-500/10 mx-auto mb-5 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {t('commissionsLoadFailedTitle', 'promos')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto mt-2">
              {t('loadFailedText', 'promos')}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all ${focusRing}`}
            >
              <RotateCcw className="size-4" />
              {t('retry', 'promos')}
            </button>
          </div>
        ) : (
          <div
            aria-busy={isFetching}
            className={`space-y-8 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}
          >
            {/* Summary */}
            {summary.length > 0 && (
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${
                  summary.length > 2 ? 'lg:grid-cols-3' : ''
                }`}
              >
                {summary.map((row) => {
                  const chip = statusChip(row._id);
                  const style = summaryStyle(String(row._id));
                  return (
                    <div
                      key={row._id}
                      className={`flex flex-col justify-between gap-4 p-6 rounded-[2rem] ${style.accent} shadow-xl`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase ${tracking}`}
                        >
                          {chip.label}
                        </span>
                        {style.icon}
                      </div>
                      <div className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">
                        <bdi>{money(row.totalCents)}</bdi>
                      </div>
                      <div
                        className={`text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase ${tracking}`}
                      >
                        {t('commissionsCycles', 'promos')}: {row.cycles ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* By Month */}
              <section className="space-y-4">
                <h2
                  className={`flex items-center gap-2 text-xs font-black text-gray-400 uppercase ${tracking}`}
                >
                  <CalendarClock className="size-4" />
                  {t('myByMonthTitle', 'promos')}
                </h2>
                {byMonth.length === 0 ? (
                  <div className="py-16 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {t('myLedgerNoMonthData', 'promos')}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className={`text-[10px] font-black uppercase ${tracking} text-gray-400 border-b border-slate-100 dark:border-white/10`}
                        >
                          <th scope="col" className="px-6 py-4 text-start">
                            {t('commissionsTableMonth', 'promos')}
                          </th>
                          <th scope="col" className="px-6 py-4 text-start">
                            {t('commissionsTableStatus', 'promos')}
                          </th>
                          <th scope="col" className="px-6 py-4 text-end">
                            {t('commissionsTableAmount', 'promos')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {byMonth.map((row, index) => {
                          const chip = statusChip(row._id?.status);
                          return (
                            <tr
                              key={index}
                              className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300"
                                  title={row._id?.billingPeriodKey || undefined}
                                >
                                  <CalendarClock className="size-3.5 text-gray-400" />
                                  {formatPeriod(row._id?.billingPeriodKey)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`text-[9px] font-black uppercase ${tracking} px-2.5 py-1.5 rounded-lg ${chip.cls}`}
                                >
                                  {chip.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 tabular-nums text-end whitespace-nowrap">
                                <bdi>{money(row.totalCents)}</bdi>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Recent */}
              <section className="space-y-4">
                <h2
                  className={`flex items-center gap-2 text-xs font-black text-gray-400 uppercase ${tracking}`}
                >
                  <History className="size-4" />
                  {t('myRecentTitle', 'promos')}
                </h2>
                {recent.length === 0 ? (
                  <div className="py-16 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {t('myRecentNoEntries', 'promos')}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl divide-y divide-slate-100 dark:divide-white/5">
                    {recent.slice(0, RECENT_LIMIT).map((row, index) => {
                      const chip = statusChip(row.status);
                      const codeLabel = recentCode(row);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-4 px-6 py-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] font-black uppercase ${tracking} px-2.5 py-1 rounded-lg ${chip.cls}`}
                              >
                                {chip.label}
                              </span>
                              {codeLabel && (
                                <span
                                  dir="ltr"
                                  className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono text-xs tracking-wide"
                                >
                                  {codeLabel}
                                </span>
                              )}
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                                {companyName(
                                  typeof row.companyId === 'object'
                                    ? row.companyId?.name
                                    : undefined,
                                  locale
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                              {formatDate(row.createdAt)}
                            </p>
                          </div>
                          <span className="text-base font-black tabular-nums text-gray-900 dark:text-white shrink-0">
                            <bdi>{money(row.amountCents)}</bdi>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
