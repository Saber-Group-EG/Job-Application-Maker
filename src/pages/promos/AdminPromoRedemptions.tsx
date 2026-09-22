import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import { usePromoRedemptions, usePromoCodes } from '../../hooks/queries';
import { toPlainString } from '../../utils/strings';
import PromoRedemptionsTable from './components/PromoRedemptionsTable';
import {
  Filter,
  Clock4,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active', labelKey: 'redemptionsStatusActive' },
  { value: 'expired', labelKey: 'redemptionsStatusExpired' },
  { value: 'revoked', labelKey: 'redemptionsStatusRevoked' },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

const selectClass =
  'w-full sm:w-auto sm:max-w-[220px] bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer';

export default function AdminPromoRedemptions() {
  const { t, locale } = useLocale();

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  const [codeFilter, setCodeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: { promoCodeId?: string; status?: string; page: number } = { page };
    if (codeFilter !== 'all') p.promoCodeId = codeFilter;
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [codeFilter, statusFilter, page]);

  const {
    data: envelope,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePromoRedemptions(params);
  const { data: codesEnvelope } = usePromoCodes({ limit: 100 });

  const redemptions = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  // Alphabetical order makes a long code list much easier to scan.
  const codes = useMemo(
    () =>
      [...(codesEnvelope?.data ?? [])].sort((a, b) =>
        toPlainString(a.code).localeCompare(toPlainString(b.code))
      ),
    [codesEnvelope]
  );

  const hasActiveFilters = codeFilter !== 'all' || statusFilter !== 'all';
  const showFilteredEmpty =
    !isLoading && !isError && redemptions.length === 0 && hasActiveFilters;

  const clearFilters = () => {
    setCodeFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('metaTitle', 'promos')}
        description={t('redemptionsTitle', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb pageTitle={t('redemptionsTitle', 'promos')} />

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1
              className={`text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ${
                isRtl ? '' : 'tracking-tight'
              }`}
            >
              {t('redemptionsTitle', 'promos')}
            </h1>
            <p
              className={`mt-1 text-gray-500 dark:text-gray-400 font-medium ${
                isRtl ? '' : 'italic'
              }`}
            >
              {t('myRedemptionsSubtitle', 'promos')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-2 px-2 text-gray-400">
              <Filter className="size-4" />
              <span className={`text-xs font-black uppercase ${tracking}`}>
                {t('filtersLabel', 'promos')}
              </span>
            </div>

            <select
              value={codeFilter}
              aria-label={t('tableCode', 'promos')}
              onChange={(e) => {
                setCodeFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="all">
                {t('redemptionsFilterAllCodes', 'promos')}
              </option>
              {codes.map((code) => (
                <option key={code._id} value={code._id}>
                  {toPlainString(code.code)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              aria-label={t('tableStatus', 'promos')}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="all">
                {t('ledgerFilterAllStatuses', 'promos')}
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {t(status.labelKey, 'promos')}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all ${focusRing}`}
              >
                <X className="size-4" />
                {t('clearFilters', 'promos')}
              </button>
            )}

            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-xl border border-brand-500/20"
            >
              <Clock4 className="size-4" />
              <span className="text-sm font-black tabular-nums">
                {t('resultsFound', 'promos', { count: totalCount })}
              </span>
            </div>
          </div>
        </div>

        {isError && !isLoading ? (
          <div className="py-20 text-center rounded-[2rem] border border-red-500/20 bg-red-500/5">
            <div className="size-16 rounded-full bg-red-500/10 mx-auto mb-5 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {t('redemptionsLoadFailedTitle', 'promos')}
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
        ) : showFilteredEmpty ? (
          <div className="py-24 text-center rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
            <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
              <Search className="size-8 text-slate-300 dark:text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {t('noRedemptionsMatchTitle', 'promos')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
              {t('noRedemptionsMatchText', 'promos')}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500/10 text-brand-500 font-bold hover:bg-brand-500 hover:text-white transition-all ${focusRing}`}
            >
              <X className="size-4" />
              {t('clearFilters', 'promos')}
            </button>
          </div>
        ) : (
          <div
            aria-busy={isLoading || isFetching}
            className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : 'opacity-100'}`}
          >
            <PromoRedemptionsTable data={redemptions} isLoading={isLoading} />
          </div>
        )}

        {!isLoading && !isError && totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-4 pt-4"
            aria-label={t('redemptionsTitle', 'promos')}
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
    </div>
  );
}
