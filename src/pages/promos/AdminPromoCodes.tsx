import { useState, useMemo, useEffect, useRef, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import {
  usePromoCodes,
  useUsers,
  useUpdatePromoCode,
} from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import Swal from '../../utils/swal';
import {
  Search,
  Plus,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Users,
  Percent,
  Coins,
  CalendarX2,
  Copy,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import PromoCodeFormModal from './components/PromoCodeFormModal';
import type { PromoCode } from '../../types/promos';

type HrUser = {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
};

const PAGE_SIZE = 8;
const COLUMN_COUNT = 9;
const SEARCH_DEBOUNCE_MS = 350;
const COPIED_FEEDBACK_MS = 1500;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

export default function AdminPromoCodes() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  // `searchInput` follows the keyboard; `searchTerm` is the debounced value sent to the API.
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  const params = useMemo(() => {
    const p: {
      search?: string;
      ownerUserId?: string;
      isActive?: boolean;
      page: number;
      limit: number;
    } = {
      page,
      limit: PAGE_SIZE,
    };
    if (searchTerm) p.search = searchTerm;
    if (ownerFilter !== 'all') p.ownerUserId = ownerFilter;
    if (statusFilter !== 'all') p.isActive = statusFilter === 'active';
    return p;
  }, [searchTerm, ownerFilter, statusFilter, page]);

  const {
    data: envelope,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePromoCodes(params);
  const { data: rawUsers = [] } = useUsers();
  const updateMutation = useUpdatePromoCode();

  const hrUsers = useMemo<HrUser[]>(() => {
    return rawUsers
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
      }));
  }, [rawUsers]);

  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const isHr =
    String(user?.roleId?.name || '')
      .toLowerCase()
      .trim() === 'hr manager';
  const hasActiveFilters =
    searchInput.trim() !== '' ||
    ownerFilter !== 'all' ||
    statusFilter !== 'all';

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [isRtl]
  );

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setOwnerFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const ownerName = (code: PromoCode): string => {
    const owner =
      typeof code.ownerUserId === 'object' ? code.ownerUserId : null;
    return toPlainString(owner?.fullName || owner?.name || owner?.email || '');
  };

  const discountLabel = (code: PromoCode): string => {
    if (code.discountPercent != null) return `${code.discountPercent}%`;
    if (code.discountAmountCents != null)
      return formatMoney(code.discountAmountCents);
    return '—';
  };

  const commissionLabel = (code: PromoCode): string => {
    const parts: string[] = [];
    if (code.commissionPercent != null)
      parts.push(`${code.commissionPercent}%`);
    if (code.commissionAmountCents != null)
      parts.push(formatMoney(code.commissionAmountCents));
    return parts.length ? parts.join(' + ') : '—';
  };

  const handleCopy = async (e: MouseEvent, code: PromoCode) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(toPlainString(code.code));
      setCopiedId(code._id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(
        () => setCopiedId(null),
        COPIED_FEEDBACK_MS
      );
    } catch {
      // Clipboard can be blocked (permissions / insecure context) — fail quietly.
    }
  };

  const handleToggleActive = async (code: PromoCode) => {
    if (togglingId) return;
    const next = !code.isActive;
    const result = await Swal.fire({
      title: t('activeToggleConfirmTitle', 'promos'),
      text: next
        ? t('activeToggleOnText', 'promos')
        : t('activeToggleOffText', 'promos'),
      icon: next ? 'question' : 'warning',
      showCancelButton: true,
      // Deactivating is the risky direction, so default focus to "cancel".
      focusCancel: !next,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: next ? '#22c55e' : '#ef4444',
      confirmButtonText: t('toggleConfirmButton', 'promos'),
    });
    if (!result.isConfirmed) return;

    setTogglingId(code._id);
    try {
      await updateMutation.mutateAsync({
        id: code._id,
        payload: { isActive: next },
      });
      Swal.fire({
        title: next
          ? t('codeActivated', 'promos')
          : t('codeDeactivated', 'promos'),
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire(t('error', 'common'), t('codeToggleFailed', 'promos'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const showEmptyState = !isLoading && !isError && codes.length === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('metaTitle', 'promos')}
        description={t('metaDescription', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <PageBreadcrumb
          pageTitle={t('pageTitle', 'promos')}
          actions={
            !isHr && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 motion-reduce:transform-none transition-all ${focusRing}`}
              >
                <Plus className="size-5" />
                {t('createButton', 'promos')}
              </button>
            )
          }
        />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1
              className={`text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ${
                isRtl ? '' : 'tracking-tight'
              }`}
            >
              {t('pageTitle', 'promos')}
            </h1>
            <p
              className={`mt-1 text-gray-500 dark:text-gray-400 font-medium ${
                isRtl ? '' : 'italic'
              }`}
            >
              {t('pageSubtitle', 'promos')}
            </p>
          </div>

          <div className="relative w-full lg:flex-1 lg:min-w-[300px] lg:max-w-xl">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'promos')}
              aria-label={t('searchPlaceholder', 'promos')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full ps-11 pe-11 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-[1.25rem] focus:ring-2 focus:ring-brand-500/20 outline-none transition-all dark:text-white placeholder:text-gray-400 font-medium"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label={t('clearFilters', 'promos')}
                className={`absolute end-3 top-1/2 -translate-y-1/2 size-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all ${focusRing}`}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 flex flex-wrap gap-4 items-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-2 px-3 text-gray-400">
              <Filter className="size-4" />
              <span className={`text-xs font-black uppercase ${tracking}`}>
                {t('filtersLabel', 'promos')}
              </span>
            </div>

            <select
              value={ownerFilter}
              aria-label={t('tableOwner', 'promos')}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer max-w-[220px]"
            >
              <option value="all">{t('filterAllOwners', 'promos')}</option>
              {hrUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName || u.name || u.email}
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
              className="bg-white dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer"
            >
              <option value="all">{t('filterAllStatuses', 'promos')}</option>
              <option value="active">{t('filterActive', 'promos')}</option>
              <option value="inactive">{t('filterInactive', 'promos')}</option>
            </select>

            <div className="ms-auto flex flex-wrap items-center gap-3">
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
                <Tag className="size-4" />
                <span className="text-sm font-black tabular-nums">
                  {t('resultsFound', 'promos', { count: totalCount })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 rounded-[2rem] shadow-xl shadow-purple-500/20 flex flex-col justify-between">
            <span
              className={`text-[10px] font-black text-white/70 uppercase ${tracking}`}
            >
              {t('tableStats', 'promos')}
            </span>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black text-white tabular-nums">
                {totalCount}
              </span>
              <Tag className="size-8 text-white/30" />
            </div>
          </div>
        </div>

        {/* Error */}
        {isError && !isLoading ? (
          <div className="py-20 text-center rounded-[2rem] border border-red-500/20 bg-red-500/5">
            <div className="size-16 rounded-full bg-red-500/10 mx-auto mb-5 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {t('loadFailedTitle', 'promos')}
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
          /* Table */
          <div
            aria-busy={isLoading || isFetching}
            className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl"
          >
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
<<<<<<< Updated upstream
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                  <th className="px-4 py-4 min-w-[120px]">{t("tableCode", "promos")}</th>
                  <th className="px-4 py-4 min-w-[110px]">{t("tableOwner", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableDiscount", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableCommission", "promos")}</th>
                  <th className="px-4 py-4 w-[70px]">{t("tableCycles", "promos")}</th>
                  <th className="px-4 py-4 w-[90px]">{t("tableStats", "promos")}</th>
                  <th className="px-4 py-4 min-w-[80px]">{t("tableStatus", "promos")}</th>
                  <th className="px-4 py-4 min-w-[100px]">{t("tableExpires", "promos")}</th>
                  <th className="px-4 py-4 text-right w-[90px]">{t("tableActions", "promos")}</th>
=======
                <tr
                  className={`text-start text-[10px] font-black uppercase ${tracking} text-gray-400 border-b border-slate-100 dark:border-white/10`}
                >
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableCode', 'promos')}
                  </th>
                  <th scope="col" className="px-6 py-4 text-start">
                    {t('tableOwner', 'promos')}
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
                  <th scope="col" className="px-6 py-4 text-end">
                    {t('tableActions', 'promos')}
                  </th>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide text-xs">
                          {toPlainString(code.code)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 text-xs">
                          <Users className="size-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{ownerName(code) || "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                          {code.discountPercent != null ? (
                            <Percent className="size-3.5 shrink-0" />
                          ) : (
                            <Coins className="size-3.5 shrink-0" />
                          )}
                          {discountLabel(code)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs">
                          <Coins className="size-3.5 shrink-0" />
                          {commissionLabel(code)}
                        </span>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-xs">
                        {code.discountCycles ?? 1}
                      </td>
                      <td className="px-4 py-4 tabular-nums text-gray-500 dark:text-gray-400 text-xs">
                        {code.stats?.redemptions ?? 0}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg whitespace-nowrap ${
                            isActive
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {isActive
                            ? t("statusActive", "promos")
                            : t("statusInactive", "promos")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {code.expiresAt ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarX2 className="size-3.5 shrink-0" />
                            {expiresLabel}
                          </span>
                        ) : (
                          expiresLabel
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCode(code);
                            }}
                            className="size-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                            title={t("modalEditTitle", "promos")}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(code);
                            }}
                            className={`size-8 rounded-lg flex items-center justify-center transition-all ${
                              isActive
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                : "bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white"
                            }`}
                            title={t("activeToggleConfirmTitle", "promos")}
                          >
                            <Power className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
=======
                      {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                        <td key={j} className="px-6 py-5">
                          <div
                            className={`h-4 rounded-md bg-slate-200/70 dark:bg-white/10 ${
                              j === COLUMN_COUNT - 1
                                ? 'ms-auto w-20'
                                : j === 0
                                  ? 'w-28'
                                  : 'w-20'
                            }`}
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
                    const owner = ownerName(code);
                    const isCopied = copiedId === code._id;
                    const isToggling = togglingId === code._id;

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
                        tabIndex={0}
                        onClick={() => navigate(`/promos/${code._id}`)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/promos/${code._id}`);
                          }
                        }}
                        className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 focus-visible:bg-brand-500/10 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-brand-500/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide"
                            >
                              {toPlainString(code.code)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, code)}
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
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2 max-w-[220px] text-gray-600 dark:text-gray-300">
                            <Users className="size-3.5 shrink-0 text-gray-400" />
                            <span
                              className="truncate"
                              title={owner || undefined}
                            >
                              {owner || '—'}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            {code.discountPercent != null ? (
                              <Percent className="size-3.5" />
                            ) : (
                              <Coins className="size-3.5" />
                            )}
                            <bdi>{discountLabel(code)}</bdi>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Coins className="size-3.5" />
                            <bdi>{commissionLabel(code)}</bdi>
                          </span>
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {code.discountCycles ?? 1}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-gray-500 dark:text-gray-400">
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
                          {code.expiresAt ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarX2 className="size-3.5" />
                              {expiresLabel}
                            </span>
                          ) : (
                            expiresLabel
                          )}
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCode(code);
                              }}
                              aria-label={t('modalEditTitle', 'promos')}
                              title={t('modalEditTitle', 'promos')}
                              className={`size-9 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all ${focusRing}`}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(code);
                              }}
                              aria-label={t(
                                'activeToggleConfirmTitle',
                                'promos'
                              )}
                              title={t('activeToggleConfirmTitle', 'promos')}
                              className={`size-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-wait ${
                                isActive
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                  : 'bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white'
                              } ${focusRing}`}
                            >
                              <Power
                                className={`size-4 ${isToggling ? 'animate-pulse' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
>>>>>>> Stashed changes
              </tbody>
            </table>

            {showEmptyState && (
              <div className="py-24 text-center">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
                  {hasActiveFilters ? (
                    <Search className="size-8 text-slate-300 dark:text-slate-700" />
                  ) : (
                    <Tag className="size-8 text-slate-300 dark:text-slate-700" />
                  )}
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {hasActiveFilters
                    ? t('noCodesMatchTitle', 'promos')
                    : t('noCodesFound', 'promos')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
                  {hasActiveFilters
                    ? t('noCodesMatchText', 'promos')
                    : t('noCodesFoundText', 'promos')}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500/10 text-brand-500 font-bold hover:bg-brand-500 hover:text-white transition-all ${focusRing}`}
                  >
                    <X className="size-4" />
                    {t('clearFilters', 'promos')}
                  </button>
                ) : (
                  !isHr && (
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all ${focusRing}`}
                    >
                      <Plus className="size-4" />
                      {t('createButton', 'promos')}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-4 pt-10"
            aria-label={t('pageTitle', 'promos')}
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
        mode="admin"
        hrUsers={hrUsers}
      />
      <PromoCodeFormModal
        isOpen={!!editingCode}
        onClose={() => setEditingCode(null)}
        mode="admin"
        code={editingCode}
        hrUsers={hrUsers}
      />
    </div>
  );
}
