import { useState, useMemo, useId } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { Modal } from '../../components/ui/modal';
import { useCommissions, useUsers, useSettleCommissions, useCommissionReport } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import Swal from '../../utils/swal';
import {
  AlertTriangle,
  BadgeDollarSign,
  ChevronRight,
  CircleDollarSign,
  Clock4,
  Coins,
  FileBarChart,
  ListOrdered,
  Wallet,
  X,
} from 'lucide-react';
import type { PromoCommissionReportRow } from '../../types/promos';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  CodeChip,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  PageShell,
  Pagination,
  Segmented,
  SkeletonRows,
  StatCard,
  Table,
  Td,
  Th,
  inputClass,
  rowClass,
  selectClass,
} from './components/PromoUI';
import { commissionState, companyLabel, formatPeriod, isHrUser, personName } from './promoFormat';

type Tab = 'report' | 'ledger';
type HrOption = { _id: string; label: string };

const LEDGER_PAGE_SIZE = 10;

// Report rows are aggregated per HR; try the usual id fields so clicking a
// row can filter the ledger to that HR.
function reportRowHrId(row: PromoCommissionReportRow): string | null {
  const anyRow = row as unknown as Record<string, unknown>;
  const candidate = anyRow.hrUserId ?? anyRow.hrId ?? anyRow._id ?? null;
  return typeof candidate === 'string' ? candidate : null;
}

export default function AdminCommissions() {
  const { t } = useLocale();

  // Shared by both tabs so switching (or drilling from Report into Ledger)
  // keeps the context.
  const [month, setMonth] = useState('');
  const [hrFilter, setHrFilter] = useState('all');
  const [tab, setTab] = useState<Tab>('report');
  const [isSettleOpen, setIsSettleOpen] = useState(false);

  const { data: rawUsers = [] } = useUsers();
  const hrOptions = useMemo<HrOption[]>(
    () => rawUsers.filter(isHrUser).map((u) => ({ _id: u._id, label: u.fullName || u.name || u.email })),
    [rawUsers]
  );

  const drillThrough = (hrId: string | null) => {
    if (hrId) setHrFilter(hrId);
    setTab('ledger');
  };

  return (
    <PageShell
      title={t('commissionsPageTitle', 'promos')}
      subtitle={t('commissionsPageSubtitle', 'promos')}
      actions={
        <Button variant="primary" icon={<BadgeDollarSign className="size-4" />} onClick={() => setIsSettleOpen(true)}>
          {t('settleTitle', 'promos')}
        </Button>
      }
    >
      <PageMeta title={t('commissionsMetaTitle', 'promos')} description={t('commissionsSubtitle', 'promos')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<Tab>
          role="tablist"
          ariaLabel={t('commissionsTabsAriaLabel', 'promos')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'report', label: t('commissionsReportTab', 'promos'), icon: <FileBarChart className="size-4" /> },
            { value: 'ledger', label: t('commissionsLedgerTab', 'promos'), icon: <ListOrdered className="size-4" /> },
          ]}
        />
        <div className="flex items-center gap-2">
          <label htmlFor="commissions-month" className="text-sm text-slate-500 dark:text-slate-400">
            {t('commissionsMonthLabel', 'promos')}
          </label>
          <input
            id="commissions-month"
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
      </div>

      {tab === 'report' ? (
        <ReportView month={month} onDrillThrough={drillThrough} />
      ) : (
        <LedgerView month={month} hrFilter={hrFilter} onHrFilterChange={setHrFilter} hrOptions={hrOptions} />
      )}

      <SettleModal
        isOpen={isSettleOpen}
        onClose={() => setIsSettleOpen(false)}
        initialMonth={month}
        initialHr={hrFilter}
        hrOptions={hrOptions}
      />
    </PageShell>
  );
}

/* ---------------------------------- Report ---------------------------------- */

function ReportView({ month, onDrillThrough }: { month: string; onDrillThrough: (hrId: string | null) => void }) {
  const { t, locale } = useLocale();
  const { data: report, isLoading, isError, refetch } = useCommissionReport(month || undefined);
  const rows: PromoCommissionReportRow[] = report?.rows ?? [];
  const totals = report?.totals;
  const money = (v: number | undefined) => (v != null ? formatMoney(v) : '—');

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={month ? t('reportTotalFor', 'promos', { month: formatPeriod(month, locale) }) : t('reportTotalAll', 'promos')}
          value={money(totals?.totalCents ?? 0)}
          icon={<Wallet className="size-4" />}
          loading={isLoading}
        />
        <StatCard label={t('commissionsPaid', 'promos')} value={money(totals?.paidCents ?? 0)} icon={<CircleDollarSign className="size-4" />} loading={isLoading} />
        <StatCard label={t('commissionsPending', 'promos')} value={money(totals?.pendingCents ?? 0)} icon={<Clock4 className="size-4" />} loading={isLoading} />
      </div>

      <Card>
        {isError && !isLoading ? (
          <ErrorState title={t('commissionsLoadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
        ) : !isLoading && rows.length === 0 ? (
          <EmptyState icon={<FileBarChart className="size-6" />} title={t('commissionsNoRows', 'promos')} text={t('commissionsNoRowsText', 'promos')} />
        ) : (
          <Table minWidth={680} busy={isLoading}>
            <thead>
              <tr>
                <Th>{t('commissionsTableHR', 'promos')}</Th>
                <Th align="end">{t('commissionsCycles', 'promos')}</Th>
                <Th align="end">{t('commissionsTotal', 'promos')}</Th>
                <Th align="end">{t('commissionsPaid', 'promos')}</Th>
                <Th align="end">{t('commissionsPending', 'promos')}</Th>
                <Th>
                  <span className="sr-only">{t('commissionsDrillThroughHint', 'promos')}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={4} cols={6} />}
              {!isLoading &&
                rows.map((row, index) => (
                  <tr
                    key={index}
                    tabIndex={0}
                    onClick={() => onDrillThrough(reportRowHrId(row))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDrillThrough(reportRowHrId(row));
                      }
                    }}
                    title={t('commissionsDrillThroughHint', 'promos')}
                    className={`${rowClass} cursor-pointer focus-visible:bg-slate-50 focus-visible:outline-none dark:focus-visible:bg-slate-800/40`}
                  >
                    <Td>
                      <span className="font-medium text-slate-900 dark:text-white">{toPlainString(row.hrName || '') || '—'}</span>
                      {row.hrEmail && <span className="block text-xs text-slate-500 dark:text-slate-400">{toPlainString(row.hrEmail)}</span>}
                    </Td>
                    <Td align="end" className="tabular-nums">{row.cycles ?? '—'}</Td>
                    <Td align="end" className="whitespace-nowrap font-medium tabular-nums text-slate-900 dark:text-white"><bdi>{money(row.totalCents)}</bdi></Td>
                    <Td align="end" className="whitespace-nowrap tabular-nums text-emerald-700 dark:text-emerald-400"><bdi>{money(row.paidCents)}</bdi></Td>
                    <Td align="end" className="whitespace-nowrap tabular-nums text-amber-700 dark:text-amber-400"><bdi>{money(row.pendingCents)}</bdi></Td>
                    <Td align="end">
                      <ChevronRight className="ms-auto size-4 text-slate-400 rtl:rotate-180" />
                    </Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

/* ---------------------------------- Ledger ---------------------------------- */

function LedgerView({
  month,
  hrFilter,
  onHrFilterChange,
  hrOptions,
}: {
  month: string;
  hrFilter: string;
  onHrFilterChange: (v: string) => void;
  hrOptions: HrOption[];
}) {
  const { t, locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Month/HR come from the page; reset paging when they change.
  const filterKey = `${month}|${hrFilter}`;
  const [pagedKey, setPagedKey] = useState(filterKey);
  if (pagedKey !== filterKey) {
    setPagedKey(filterKey);
    setPage(1);
  }

  const params = useMemo(() => {
    const p: { month?: string; hrUserId?: string; status?: string; page: number; limit: number } = {
      page,
      limit: LEDGER_PAGE_SIZE,
    };
    if (month) p.month = month;
    if (hrFilter !== 'all') p.hrUserId = hrFilter;
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [month, hrFilter, statusFilter, page]);

  const { data: envelope, isLoading, isFetching, isError, refetch } = useCommissions(params);
  const ledger = envelope?.data ?? [];

  const hasFilters = hrFilter !== 'all' || statusFilter !== 'all';

  return (
    <Card>
      <CardToolbar>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isLoading ? ' ' : t('resultsFound', 'promos', { count: envelope?.totalCount ?? 0 })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={hrFilter}
            aria-label={t('commissionsTableHR', 'promos')}
            onChange={(e) => onHrFilterChange(e.target.value)}
            className={`${selectClass} w-auto min-w-[10rem]`}
          >
            <option value="all">{t('ledgerFilterAllHR', 'promos')}</option>
            {hrOptions.map((u) => (
              <option key={u._id} value={u._id}>
                {u.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            aria-label={t('commissionsTableStatus', 'promos')}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={`${selectClass} w-auto min-w-[9rem]`}
          >
            <option value="all">{t('ledgerFilterAllStatuses', 'promos')}</option>
            <option value="pending">{t('ledgerStatusPending', 'promos')}</option>
            <option value="paid">{t('ledgerStatusPaid', 'promos')}</option>
            <option value="void">{t('ledgerStatusVoid', 'promos')}</option>
          </select>
          {hasFilters && (
            <Button
              variant="ghost"
              icon={<X className="size-4" />}
              onClick={() => {
                onHrFilterChange('all');
                setStatusFilter('all');
                setPage(1);
              }}
            >
              {t('clearFilters', 'promos')}
            </Button>
          )}
        </div>
      </CardToolbar>

      {isError && !isLoading ? (
        <ErrorState title={t('commissionsLoadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
      ) : !isLoading && ledger.length === 0 ? (
        <EmptyState icon={<Coins className="size-6" />} title={t('ledgerNoRows', 'promos')} text={t('ledgerNoRowsText', 'promos')} />
      ) : (
        <>
          <Table minWidth={860} busy={isLoading || isFetching}>
            <thead>
              <tr>
                <Th>{t('commissionsTableMonth', 'promos')}</Th>
                <Th>{t('commissionsTableHR', 'promos')}</Th>
                <Th>{t('commissionsTableCompany', 'promos')}</Th>
                <Th>{t('commissionsTableCode', 'promos')}</Th>
                <Th>{t('commissionsTableStatus', 'promos')}</Th>
                <Th align="end">{t('commissionsTableAmount', 'promos')}</Th>
              </tr>
            </thead>
            <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {isLoading && <SkeletonRows rows={LEDGER_PAGE_SIZE} cols={6} />}
              {!isLoading &&
                ledger.map((entry) => {
                  const state = commissionState(entry.status);
                  const codeRaw = entry.promoCodeId;
                  const code = typeof codeRaw === 'object' ? toPlainString(codeRaw?.code || '') : '';
                  return (
                    <tr key={entry._id} className={rowClass}>
                      <Td className="whitespace-nowrap">{formatPeriod(entry.billingPeriodKey, locale)}</Td>
                      <Td>{personName(entry.hrUserId) || '—'}</Td>
                      <Td>
                        <span className="block max-w-[14rem] truncate">{companyLabel(entry.companyId, locale)}</span>
                      </Td>
                      <Td>{code ? <CodeChip code={code} /> : '—'}</Td>
                      <Td>
                        <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
                      </Td>
                      <Td align="end" className="whitespace-nowrap font-medium tabular-nums text-slate-900 dark:text-white">
                        <bdi>{entry.amountCents != null ? formatMoney(entry.amountCents, entry.currency) : '—'}</bdi>
                      </Td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
          {!isLoading && (
            <Pagination page={page} totalPages={envelope?.totalPages ?? 1} onChange={setPage} busy={isFetching} />
          )}
        </>
      )}
    </Card>
  );
}

/* ---------------------------------- Settle ---------------------------------- */

function SettleModal({
  isOpen,
  onClose,
  initialMonth,
  initialHr,
  hrOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMonth: string;
  initialHr: string;
  hrOptions: HrOption[];
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-md overflow-hidden !rounded-2xl !bg-white dark:!bg-slate-900">
      {/* Mounted per open so it starts from what the page is filtered to. */}
      {isOpen && <SettleForm onClose={onClose} initialMonth={initialMonth} initialHr={initialHr} hrOptions={hrOptions} />}
    </Modal>
  );
}

function SettleForm({
  onClose,
  initialMonth,
  initialHr,
  hrOptions,
}: {
  onClose: () => void;
  initialMonth: string;
  initialHr: string;
  hrOptions: HrOption[];
}) {
  const { t, locale } = useLocale();
  const uid = useId();
  const settleMutation = useSettleCommissions();
  const [month, setMonth] = useState(initialMonth);
  const [hr, setHr] = useState(initialHr);
  const [error, setError] = useState('');

  const hrLabel = hr === 'all' ? t('settleAllHR', 'promos') : hrOptions.find((o) => o._id === hr)?.label || '';

  const submit = async () => {
    if (!month) {
      setError(t('settleMonthRequired', 'promos'));
      document.getElementById(`${uid}-month`)?.focus();
      return;
    }
    const result = await Swal.fire({
      title: t('settleConfirmTitle', 'promos'),
      text: t('settleConfirmTextFor', 'promos', { month: formatPeriod(month, locale), hr: hrLabel }),
      icon: 'warning',
      showCancelButton: true,
      focusCancel: true,
      cancelButtonText: t('settleCancel', 'promos'),
      confirmButtonColor: '#d97706',
      confirmButtonText: t('settleConfirmButton', 'promos'),
    });
    if (!result.isConfirmed) return;
    try {
      await settleMutation.mutateAsync({ month, ...(hr !== 'all' ? { hrUserId: hr } : {}) });
      onClose();
    } catch {
      // error toast handled by the mutation hook
    }
  };

  return (
    <div className="flex flex-col">
      <div className="border-b border-slate-200 px-6 py-5 pe-16 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settleTitle', 'promos')}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('settleSubtitle', 'promos')}</p>
      </div>
      <div className="space-y-4 px-6 py-5">
        <Field label={t('settleMonthLabel', 'promos')} htmlFor={`${uid}-month`}>
          <input
            id={`${uid}-month`}
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setError('');
            }}
            aria-invalid={!!error}
            className={`${inputClass} ${error ? '!border-rose-400' : ''}`}
          />
          {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        </Field>
        <Field label={t('settleHRLabel', 'promos')} htmlFor={`${uid}-hr`}>
          <select id={`${uid}-hr`} value={hr} onChange={(e) => setHr(e.target.value)} className={selectClass}>
            <option value="all">{t('settleAllHR', 'promos')}</option>
            {hrOptions.map((u) => (
              <option key={u._id} value={u._id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{t('settleNote', 'promos')}</p>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:justify-end">
        <Button onClick={onClose} disabled={settleMutation.isPending}>
          {t('settleCancel', 'promos')}
        </Button>
        <Button variant="primary" icon={<BadgeDollarSign className="size-4" />} loading={settleMutation.isPending} onClick={submit}>
          {t('settleConfirmButton', 'promos')}
        </Button>
      </div>
    </div>
  );
}
