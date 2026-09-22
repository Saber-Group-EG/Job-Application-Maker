import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/ui/modal';
import {
  useCommissions,
  useUsers,
  useSettleCommissions,
  useCommissionReport,
} from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import Swal from '../../utils/swal';
import {
  Filter,
  CalendarClock,
  Coins,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  ListOrdered,
  X,
} from 'lucide-react';
import type {
  PromoCommission,
  PromoCommissionReportRow,
} from '../../types/promos';

type LocaleT = (
  key: string,
  ns?: string,
  vars?: Record<string, string | number>
) => string;

function hrLabel(commission: PromoCommission): string {
  const raw = commission.hrUserId;
  if (raw && typeof raw === 'object') {
    return toPlainString(raw.fullName || raw.name || raw.email);
  }
  return '';
}

function statusOf(commission: PromoCommission): string {
  const raw = commission.status || '';
  return raw.toLowerCase();
}

/**
 * Report rows are aggregated per-HR and may or may not carry the HR's id
 * depending on what the API returns. We try the common field names so the
 * "drill into Ledger" click still works; if none are present, drilling
 * through just applies the month and leaves the HR filter on "all".
 * If your PromoCommissionReportRow type exposes the id under a different
 * key, add it to this list.
 */
function reportRowHrId(row: PromoCommissionReportRow): string | null {
  const anyRow = row as unknown as Record<string, unknown>;
  const candidate = anyRow.hrUserId ?? anyRow.hrId ?? anyRow._id ?? null;
  return typeof candidate === 'string' ? candidate : null;
}

type Tab = 'ledger' | 'report';

export default function AdminCommissions() {
  const { t, locale } = useLocale();

  // Shared across both tabs, so switching views (or drilling through from
  // Report into Ledger) doesn't lose context.
  const [month, setMonth] = useState('');
  const [hrFilter, setHrFilter] = useState('all');
  const [tab, setTab] = useState<Tab>('ledger');

  const handleDrillThrough = (hrId: string | null, rowMonth: string) => {
    if (rowMonth) setMonth(rowMonth);
    if (hrId) setHrFilter(hrId);
    setTab('ledger');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('commissionsMetaTitle', 'promos')}
        description={t('commissionsSubtitle', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t('commissionsTitle', 'promos')} />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
              {t('commissionsTitle', 'promos')}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
              {t('commissionsSubtitle', 'promos')}
            </p>
          </div>

          {/* Tab toggle */}
          <div
            role="tablist"
            aria-label={t('commissionsTabsAriaLabel', 'promos')}
            className="flex items-center gap-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-1.5 rounded-2xl shadow-sm self-start lg:self-auto"
          >
            <button
              role="tab"
              aria-selected={tab === 'report'}
              onClick={() => setTab('report')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'report'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <FileBarChart className="size-4" />
              {t('commissionsReportTab', 'promos')}
            </button>
            <button
              role="tab"
              aria-selected={tab === 'ledger'}
              onClick={() => setTab('ledger')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'ledger'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <ListOrdered className="size-4" />
              {t('commissionsLedgerTab', 'promos')}
            </button>
          </div>
        </div>

        {tab === 'report' ? (
          <ReportView
            month={month}
            onMonthChange={setMonth}
            onDrillThrough={handleDrillThrough}
            t={t}
          />
        ) : (
          <LedgerView
            month={month}
            onMonthChange={setMonth}
            hrFilter={hrFilter}
            onHrFilterChange={setHrFilter}
            t={t}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Report ---------------------------------- */

function ReportView({
  month,
  onMonthChange,
  onDrillThrough,
  t,
}: {
  month: string;
  onMonthChange: (v: string) => void;
  onDrillThrough: (hrId: string | null, month: string) => void;
  t: LocaleT;
}) {
  const { data: report, isLoading } = useCommissionReport(month || undefined);

  const rows: PromoCommissionReportRow[] = report?.rows ?? [];
  const totals = report?.totals;

  const rowHrLabel = (row: PromoCommissionReportRow): string =>
    toPlainString(row.hrName || row.hrEmail || '');

  const money = (value: number | undefined): string =>
    value != null ? formatMoney(value) : '—';

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <CalendarClock className="size-3.5" />
            {t('commissionsMonthLabel', 'promos')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-5 py-3 font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer dark:text-white dark:[color-scheme:dark]"
            />
            {month && (
              <button
                type="button"
                onClick={() => onMonthChange('')}
                aria-label={t('commissionsClearMonth', 'promos')}
                title={t('commissionsClearMonth', 'promos')}
                className="size-10 rounded-xl bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white transition-all"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
            <FileBarChart className="size-8 text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {t('commissionsNoRows', 'promos')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
            {t('commissionsNoRowsText', 'promos')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                <th className="px-6 py-4">
                  {t('commissionsTableHR', 'promos')}
                </th>
                <th className="px-6 py-4">
                  {t('commissionsCycles', 'promos')}
                </th>
                <th className="px-6 py-4">{t('commissionsTotal', 'promos')}</th>
                <th className="px-6 py-4">{t('commissionsPaid', 'promos')}</th>
                <th className="px-6 py-4">
                  {t('commissionsPending', 'promos')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {rows.map((row, index) => {
                const hrId = reportRowHrId(row);
                return (
                  <tr
                    key={index}
                    onClick={() => onDrillThrough(hrId, month)}
                    title={t('commissionsDrillThroughHint', 'promos')}
                    className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <Coins className="size-4 text-purple-500" />
                        {rowHrLabel(row) || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 tabular-nums">
                      {row.cycles != null ? row.cycles : '—'}
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      {money(row.totalCents)}
                    </td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {money(row.paidCents)}
                    </td>
                    <td className="px-6 py-4 text-amber-600 dark:text-amber-400 tabular-nums">
                      {money(row.pendingCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-purple-500/10 border-t border-purple-500/20 font-black">
                  <td className="px-6 py-5 text-purple-700 dark:text-purple-300 uppercase tracking-widest text-xs">
                    {t('commissionsTotals', 'promos')}
                  </td>
                  <td className="px-6 py-5 tabular-nums">—</td>
                  <td className="px-6 py-5 tabular-nums">
                    {money(totals.totalCents)}
                  </td>
                  <td className="px-6 py-5 tabular-nums">
                    {money(totals.paidCents)}
                  </td>
                  <td className="px-6 py-5 tabular-nums">
                    {money(totals.pendingCents)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Ledger ---------------------------------- */

function LedgerView({
  month,
  onMonthChange,
  hrFilter,
  onHrFilterChange,
  t,
  locale,
}: {
  month: string;
  onMonthChange: (v: string) => void;
  hrFilter: string;
  onHrFilterChange: (v: string) => void;
  t: LocaleT;
  locale: string;
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const params = useMemo(() => {
    const p: {
      month?: string;
      hrUserId?: string;
      status?: string;
      page: number;
      limit: number;
    } = { page, limit: pageSize };
    if (month) p.month = month;
    if (hrFilter !== 'all') p.hrUserId = hrFilter;
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [month, hrFilter, statusFilter, page]);

  const { data: envelope, isLoading } = useCommissions(params);
  const { data: rawUsers = [] } = useUsers();
  const settleMutation = useSettleCommissions();

  const hrOptions = useMemo(
    () =>
      rawUsers
        .filter(
          (u) =>
            String(u?.roleId?.name || '')
              .toLowerCase()
              .trim() === 'hr manager'
        )
        .map((u) => ({
          _id: u._id,
          fullName: u.fullName,
          name: u.name,
          email: u.email,
        })),
    [rawUsers]
  );

  const ledger = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleMonth, setSettleMonth] = useState('');
  const [settleHr, setSettleHr] = useState('all');

  // Prefill the Settle modal with whatever the Ledger is currently filtered
  // to, so the common case (settle exactly what I'm looking at) needs no
  // re-typing. Still fully editable inside the modal.
  const openSettleModal = () => {
    setSettleMonth(month);
    setSettleHr(hrFilter);
    setIsSettleOpen(true);
  };

  const handleSettle = async () => {
    // Close the modal before ANY Swal fires, so nothing ends up stacked behind it.
    setIsSettleOpen(false);

    if (!settleMonth) {
      await Swal.fire(
        t('error', 'common'),
        t('settleStart', 'promos'),
        'warning'
      );
      setIsSettleOpen(true);
      return;
    }

    const result = await Swal.fire({
      title: t('settleConfirmTitle', 'promos'),
      text: t('settleConfirmText', 'promos'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('settleCancel', 'promos'),
      confirmButtonColor: '#f59e0b',
      confirmButtonText: t('settleConfirmButton', 'promos'),
    });

    if (!result.isConfirmed) {
      setIsSettleOpen(true);
      return;
    }

    try {
      await settleMutation.mutateAsync({
        month: settleMonth,
        ...(settleHr !== 'all' ? { hrUserId: settleHr } : {}),
      });
      setSettleHr('all');
      // Left closed on success.
    } catch {
      setIsSettleOpen(true);
      // error toast handled by the mutation hook
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <button
          onClick={openSettleModal}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all self-start"
        >
          <BadgeDollarSign className="size-5" />
          {t('settleTitle', 'promos')}
        </button>

        <div className="flex flex-wrap items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-2 px-2 text-gray-400">
            <Filter className="size-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              {t('filtersLabel', 'promos')}
            </span>
          </div>

          <input
            type="month"
            value={month}
            onChange={(e) => {
              onMonthChange(e.target.value);
              setPage(1);
            }}
            className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer dark:text-white dark:[color-scheme:dark]"
          />

          <select
            value={hrFilter}
            onChange={(e) => {
              onHrFilterChange(e.target.value);
              setPage(1);
            }}
            className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
          >
            <option value="all">{t('ledgerFilterAllHR', 'promos')}</option>
            {hrOptions.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName || u.name || u.email}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
          >
            <option value="all">
              {t('ledgerFilterAllStatuses', 'promos')}
            </option>
            <option value="pending">
              {t('ledgerStatusPending', 'promos')}
            </option>
            <option value="paid">{t('ledgerStatusPaid', 'promos')}</option>
            <option value="void">{t('ledgerStatusVoid', 'promos')}</option>
          </select>

          <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20">
            <Coins className="size-4" />
            <span className="text-sm font-black tabular-nums">
              {t('resultsFound', 'promos', { count: totalCount })}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : ledger.length === 0 ? (
        <div className="py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
            <Coins className="size-8 text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {t('ledgerNoRows', 'promos')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
            {t('ledgerNoRowsText', 'promos')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                <th className="px-6 py-4">
                  {t('commissionsTableMonth', 'promos')}
                </th>
                <th className="px-6 py-4">
                  {t('commissionsTableHR', 'promos')}
                </th>
                <th className="px-6 py-4">
                  {t('commissionsTableCode', 'promos')}
                </th>
                <th className="px-6 py-4">
                  {t('commissionsTableStatus', 'promos')}
                </th>
                <th className="px-6 py-4">
                  {t('commissionsTableAmount', 'promos')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {ledger.map((entry) => {
                const status = statusOf(entry);
                const monthLabel = entry.billingPeriodKey || '—';
                const entryHr = hrLabel(entry) || '—';
                const codeRaw = entry.promoCodeId;
                const code =
                  typeof codeRaw === 'string' ? codeRaw : codeRaw?.code || '—';
                return (
                  <tr
                    key={entry._id}
                    className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
                  >
                    <td className="px-6 py-4 tabular-nums">
                      <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <CalendarClock className="size-3.5 text-gray-400" />
                        {monthLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">{entryHr || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide">
                        {code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${
                          status === 'paid'
                            ? 'bg-green-500/10 text-green-600'
                            : status === 'void'
                              ? 'bg-slate-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                              : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {status === 'paid'
                          ? t('ledgerStatusPaid', 'promos')
                          : status === 'void'
                            ? t('ledgerStatusVoid', 'promos')
                            : t('ledgerStatusPending', 'promos')}
                      </span>
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      {entry.amountCents != null
                        ? formatMoney(entry.amountCents)
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={t('commissionsPrevPage', 'promos')}
            className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
          >
            {locale === 'ar' ? (
              <ChevronRight className="size-5" />
            ) : (
              <ChevronLeft className="size-5" />
            )}
          </button>
          <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black tracking-widest text-sm uppercase">
            {t('phaseLabel', 'promos', { page })}{' '}
            <span className="opacity-30 mx-2">/</span> {totalPages}
          </div>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label={t('commissionsNextPage', 'promos')}
            className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
          >
            {locale === 'ar' ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        </div>
      )}

      {/* Settle modal */}
      <Modal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        className="max-w-md"
      >
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {t('settleTitle', 'promos')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium italic">
              {t('settleSubtitle', 'promos')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {t('settleMonthLabel', 'promos')} *
              </label>
              <input
                type="month"
                value={settleMonth}
                onChange={(e) => setSettleMonth(e.target.value)}
                className="w-full px-6 py-4 bg-white/40 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-bold dark:text-white dark:[color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {t('settleHRLabel', 'promos')}
              </label>
              <select
                value={settleHr}
                onChange={(e) => setSettleHr(e.target.value)}
                className="w-full px-6 py-4 bg-white/40 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-bold dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">{t('settleAllHR', 'promos')}</option>
                {hrOptions.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName || u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <BadgeDollarSign className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                {t('settleNote', 'promos')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => setIsSettleOpen(false)}
                className="px-8 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                {t('settleCancel', 'promos')}
              </button>
              <button
                onClick={handleSettle}
                disabled={settleMutation.isPending}
                className="flex items-center gap-3 px-10 py-4 bg-amber-500 text-white rounded-[2rem] font-black tracking-widest uppercase text-xs shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {settleMutation.isPending ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <BadgeDollarSign className="size-4" />
                    {t('settleConfirmButton', 'promos')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
