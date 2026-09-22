import { useState, useMemo, useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import { useMyPromoCodes } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import PromoCodeFormModal from './components/PromoCodeFormModal';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Wallet,
  CircleDollarSign,
  Clock4,
  RefreshCcw,
  Tag,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 8;
const COLUMN_COUNT = 7;
const COPIED_FEEDBACK_MS = 1500;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

function SummaryCard({
  icon,
  label,
  value,
  accent,
  loading,
  tracking,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  loading: boolean;
  tracking: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 p-6 rounded-[2rem] ${accent} shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase ${tracking}`}
        >
          {label}
        </span>
        {icon}
      </div>
      {loading ? (
        <div
          className="h-9 w-32 rounded-lg bg-slate-200/70 dark:bg-white/10 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <div className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">
          <bdi>{value}</bdi>
        </div>
      )}
    </div>
  );
}

export default function MyPromoCodes() {
  const { t, locale } = useLocale();

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ page, limit: PAGE_SIZE }), [page]);

  const {
    data: envelope,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMyPromoCodes(params);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Promo Code Management', 'create');
  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const summary = envelope?.summary;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [isRtl]
  );

  const discountLabel = (c: (typeof codes)[number]): string => {
    if (c.discountPercent != null) return `${c.discountPercent}%`;
    if (c.discountAmountCents != null)
      return formatMoney(c.discountAmountCents);
    return '—';
  };

  const commissionLabel = (c: (typeof codes)[number]): string => {
    const parts: string[] = [];
    if (c.commissionPercent != null) parts.push(`${c.commissionPercent}%`);
    if (c.commissionAmountCents != null)
      parts.push(formatMoney(c.commissionAmountCents));
    return parts.length ? parts.join(' + ') : '—';
  };

  const handleCopy = async (e: MouseEvent, id: string, value: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(
        () => setCopiedId(null),
        COPIED_FEEDBACK_MS
      );
    } catch {
      // Clipboard can be blocked (permissions / insecure context) — fail quietly.
    }
  };

  const showEmptyState = !isLoading && !isError && codes.length === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('myTitle', 'promos')}
        description={t('mySubtitle', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb
          pageTitle={t('myTitle', 'promos')}
          actions={
            canCreate && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 motion-reduce:transform-none transition-all ${focusRing}`}
              >
                <Plus className="size-5" />
                {t('myCreateButton', 'promos')}
              </button>
            )
          }
        />

        <div>
          <h1
            className={`text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ${
              isRtl ? '' : 'tracking-tight'
            }`}
          >
            {t('myTitle', 'promos')}
          </h1>
          <p
            className={`mt-1 text-gray-500 dark:text-gray-400 font-medium ${
              isRtl ? '' : 'italic'
            }`}
          >
            {t('mySubtitle', 'promos')}
          </p>
        </div>

        {/* Earnings summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            icon={<Wallet className="size-8 text-brand-500/40" />}
            label={t('mySummaryTotal', 'promos')}
            value={formatMoney(summary?.totalCents ?? 0)}
            accent="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
            loading={isLoading}
            tracking={tracking}
          />
          <SummaryCard
            icon={<Clock4 className="size-8 text-amber-500/40" />}
            label={t('mySummaryPending', 'promos')}
            value={formatMoney(summary?.pendingCents ?? 0)}
            accent="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20"
            loading={isLoading}
            tracking={tracking}
          />
          <SummaryCard
            icon={<CircleDollarSign className="size-8 text-emerald-500/40" />}
            label={t('mySummaryPaid', 'promos')}
            value={formatMoney(summary?.paidCents ?? 0)}
            accent="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
            loading={isLoading}
            tracking={tracking}
          />
          <SummaryCard
            icon={<RefreshCcw className="size-8 text-purple-500/40" />}
            label={t('mySummaryCycles', 'promos')}
            value={String(summary?.cycles ?? 0)}
            accent="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
            loading={isLoading}
            tracking={tracking}
          />
        </div>

        {isError && !isLoading ? (
          <div className="py-20 text-center rounded-[2rem] border border-red-500/20 bg-red-500/5">
            <div className="size-16 rounded-full bg-red-500/10 mx-auto mb-5 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {t('myLoadFailedTitle', 'promos')}
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
            aria-busy={isLoading || isFetching}
            className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl"
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr
                  className={`text-[10px] font-black uppercase ${tracking} text-gray-400 border-b border-slate-100 dark:border-white/10`}
                >
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableCode', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableDiscount', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableCommission', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableCycles', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableStats', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableStatus', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableExpires', 'promos')}
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 dark:divide-white/5 transition-opacity ${
                  isFetching && !isLoading ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {/* Skeleton rows keep the layout stable while loading */}
                {isLoading &&
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr
                      key={`skeleton-${i}`}
                      className="animate-pulse motion-reduce:animate-none"
                      aria-hidden="true"
                    >
                      {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                        <td key={j} className="px-6 py-5">
                          <div
                            className={`h-4 rounded-md bg-slate-200/70 dark:bg-white/10 ${j === 0 ? 'w-28' : 'w-20'}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading &&
                  codes.map((code) => {
                    const isActive = code.isActive !== false;
                    const isExpired =
                      !!code.expiresAt &&
                      new Date(code.expiresAt).getTime() < Date.now();
                    const plainCode = toPlainString(code.code);
                    const isCopied = copiedId === code._id;

                    const statusLabel = !isActive
                      ? t('statusInactive', 'promos')
                      : isExpired
                        ? t('statusExpired', 'promos')
                        : t('statusActive', 'promos');
                    const statusStyle = !isActive
                      ? 'bg-red-500/10 text-red-500'
                      : isExpired
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-green-500/10 text-green-600';

                    const expiresLabel = code.expiresAt
                      ? dateFormatter.format(new Date(code.expiresAt))
                      : t('detailNever', 'promos');

                    return (
                      <tr
                        key={code._id}
                        className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide"
                            >
                              {plainCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleCopy(e, code._id, plainCode)
                              }
                              aria-label={
                                isCopied
                                  ? t('codeCopied', 'promos')
                                  : t('copyCode', 'promos')
                              }
                              title={
                                isCopied
                                  ? t('codeCopied', 'promos')
                                  : t('copyCode', 'promos')
                              }
                              className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                                isCopied
                                  ? 'text-green-500 bg-green-500/10'
                                  : 'text-gray-400 hover:text-purple-600 hover:bg-purple-500/10'
                              } ${focusRing}`}
                            >
                              {isCopied ? (
                                <Check className="size-4" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          <bdi>{discountLabel(code)}</bdi>
                        </td>
                        <td className="px-6 py-4 text-purple-600 dark:text-purple-400 tabular-nums whitespace-nowrap">
                          <bdi>{commissionLabel(code)}</bdi>
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {code.discountCycles ?? 1}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 tabular-nums">
                          {code.stats?.redemptions ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase ${tracking} px-2.5 py-1.5 rounded-lg ${statusStyle}`}
                          >
                            <span
                              className="size-1.5 rounded-full bg-current"
                              aria-hidden="true"
                            />
                            {statusLabel}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap ${
                            isExpired
                              ? 'text-red-500'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {expiresLabel}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {showEmptyState && (
              <div className="py-24 text-center">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
                  <Tag className="size-8 text-slate-300 dark:text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {t('myNoCodes', 'promos')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
                  {t('myNoCodesText', 'promos')}
                </p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all ${focusRing}`}
                  >
                    <Plus className="size-4" />
                    {t('myCreateButton', 'promos')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!isLoading && !isError && totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-4 pt-10"
            aria-label={t('myTitle', 'promos')}
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={t('prevPage', 'promos')}
              className={`size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-500 hover:text-white transition-all shadow-sm ${focusRing}`}
            >
              {isRtl ? (
                <ChevronRight className="size-5" />
              ) : (
                <ChevronLeft className="size-5" />
              )}
            </button>
            <div
              aria-live="polite"
              className={`px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black text-sm uppercase ${tracking}`}
            >
              {t('phaseLabel', 'promos', { page })}{' '}
              <span className="opacity-30 mx-2">/</span> {totalPages}
            </div>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t('nextPage', 'promos')}
              className={`size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-500 hover:text-white transition-all shadow-sm ${focusRing}`}
            >
              {isRtl ? (
                <ChevronLeft className="size-5" />
              ) : (
                <ChevronRight className="size-5" />
              )}
            </button>
          </nav>
        )}
      </div>

      <PromoCodeFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="my"
      />
    </div>
  );
}
