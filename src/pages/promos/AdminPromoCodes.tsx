import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { usePromoCodes, usePromoRedemptions, useUsers, useUpdatePromoCode } from '../../hooks/queries';
import { toPlainString } from '../../utils/strings';
import Swal from '../../utils/swal';
import { Search, Plus, Pencil, Power, Tag, X, Ticket } from 'lucide-react';
import PromoCodeFormModal from './components/PromoCodeFormModal';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  CodeChip,
  EmptyState,
  ErrorState,
  IconButton,
  Pagination,
  SkeletonRows,
  StatCard,
  Table,
  Td,
  Th,
  PageShell,
  inputClass,
  rowClass,
  filterSelectClass,
} from './components/PromoUI';
import {
  codeState,
  commissionLabel,
  discountLabel,
  formatDate,
  isExpired,
  isHrUser,
  personName,
} from './promoFormat';
import type { PromoCode } from '../../types/promos';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

export default function AdminPromoCodes() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { user } = useAuth();

  // `searchInput` follows the keyboard; `searchTerm` is the debounced value sent to the API.
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput.trim() === searchTerm) return;
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput, searchTerm]);

  const params = useMemo(() => {
    const p: { search?: string; ownerUserId?: string; isActive?: boolean; page: number; limit: number } = {
      page,
      limit: PAGE_SIZE,
    };
    if (searchTerm) p.search = searchTerm;
    if (ownerFilter !== 'all') p.ownerUserId = ownerFilter;
    if (statusFilter !== 'all') p.isActive = statusFilter === 'active';
    return p;
  }, [searchTerm, ownerFilter, statusFilter, page]);

  const { data: envelope, isLoading, isFetching, isError, refetch } = usePromoCodes(params);
  // Only totalCount is used — per-code stats on one page would undercount.
  const { data: redemptionsEnvelope, isLoading: redemptionsLoading } = usePromoRedemptions();
  const { data: rawUsers = [] } = useUsers();
  const updateMutation = useUpdatePromoCode();

  const hrUsers = useMemo(
    () =>
      rawUsers.filter(isHrUser).map((u) => ({ _id: u._id, fullName: u.fullName, name: u.name, email: u.email })),
    [rawUsers]
  );

  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isHr = isHrUser(user);
  const hasActiveFilters = searchInput.trim() !== '' || ownerFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setOwnerFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const handleToggleActive = async (code: PromoCode) => {
    if (togglingId) return;
    const next = !code.isActive;
    const result = await Swal.fire({
      title: next ? t('detailActivateConfirmTitle', 'promos') : t('detailDeactivateConfirmTitle', 'promos'),
      text: next ? t('activeToggleOnText', 'promos') : t('activeToggleOffText', 'promos'),
      icon: next ? 'question' : 'warning',
      showCancelButton: true,
      focusCancel: !next, // deactivating is the risky direction
      cancelButtonText: t('cancel', 'common'),
      confirmButtonColor: next ? '#16a34a' : '#e11d48',
      confirmButtonText: next ? t('detailActivateConfirmButton', 'promos') : t('detailDeactivateConfirmButton', 'promos'),
    });
    if (!result.isConfirmed) return;

    setTogglingId(code._id);
    try {
      await updateMutation.mutateAsync({ id: code._id, payload: { isActive: next } });
    } catch {
      Swal.fire(t('error', 'common'), t('codeToggleFailed', 'promos'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const openDetail = (code: PromoCode) => navigate(`/promos/${code._id}`);

  return (
    <PageShell
      title={t('pageTitle', 'promos')}
      subtitle={t('pageSubtitle', 'promos')}
      actions={
        !isHr && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
            {t('createButton', 'promos')}
          </Button>
        )
      }
    >
      <PageMeta title={t('metaTitle', 'promos')} description={t('metaDescription', 'promos')} />

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={hasActiveFilters ? t('statMatchingCodes', 'promos') : t('statTotalCodes', 'promos')}
          value={totalCount}
          icon={<Tag className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          label={t('statRedemptions', 'promos')}
          value={redemptionsEnvelope?.totalCount ?? 0}
          icon={<Ticket className="size-4" />}
          loading={redemptionsLoading}
        />
      </div>

      <Card>
        <CardToolbar>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={t('searchPlaceholder', 'promos')}
              aria-label={t('searchPlaceholder', 'promos')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${inputClass} ps-9`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ownerFilter}
              aria-label={t('tableOwner', 'promos')}
              onChange={(e) => {
                setOwnerFilter(e.target.value);
                setPage(1);
              }}
              className={`${filterSelectClass} min-w-[10rem]`}
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
              className={`${filterSelectClass} min-w-[9rem]`}
            >
              <option value="all">{t('filterAllStatuses', 'promos')}</option>
              <option value="active">{t('filterActive', 'promos')}</option>
              <option value="inactive">{t('filterInactive', 'promos')}</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" icon={<X className="size-4" />} onClick={clearFilters}>
                {t('clearFilters', 'promos')}
              </Button>
            )}
          </div>
        </CardToolbar>

        {isError && !isLoading ? (
          <ErrorState title={t('loadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
        ) : !isLoading && codes.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={<Search className="size-6" />}
              title={t('noCodesMatchTitle', 'promos')}
              text={t('noCodesMatchText', 'promos')}
              action={<Button icon={<X className="size-4" />} onClick={clearFilters}>{t('clearFilters', 'promos')}</Button>}
            />
          ) : (
            <EmptyState
              icon={<Tag className="size-6" />}
              title={t('noCodesFound', 'promos')}
              text={t('noCodesFoundHint', 'promos')}
              action={
                !isHr && (
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
                    {t('createButton', 'promos')}
                  </Button>
                )
              }
            />
          )
        ) : (
          <>
            <Table minWidth={960} busy={isLoading || isFetching}>
              <thead>
                <tr>
                  <Th>{t('tableCode', 'promos')}</Th>
                  <Th>{t('tableOwner', 'promos')}</Th>
                  <Th>{t('tableDiscount', 'promos')}</Th>
                  <Th>{t('tableCommission', 'promos')}</Th>
                  <Th>{t('tableUses', 'promos')}</Th>
                  <Th>{t('tableStatus', 'promos')}</Th>
                  <Th>{t('tableExpires', 'promos')}</Th>
                  <Th align="end">
                    <span className="sr-only">{t('tableActions', 'promos')}</span>
                  </Th>
                </tr>
              </thead>
              <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {isLoading && <SkeletonRows rows={PAGE_SIZE} cols={8} />}
                {!isLoading &&
                  codes.map((code) => {
                    const state = codeState(code);
                    const isToggling = togglingId === code._id;
                    const cycles = code.discountCycles ?? 1;
                    return (
                      <tr
                        key={code._id}
                        tabIndex={0}
                        onClick={() => openDetail(code)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDetail(code);
                          }
                        }}
                        className={`${rowClass} cursor-pointer focus-visible:bg-slate-50 focus-visible:outline-none dark:focus-visible:bg-slate-800/40`}
                      >
                        <Td>
                          <CodeChip code={toPlainString(code.code)} copyable />
                        </Td>
                        <Td>
                          <span className="block max-w-[12rem] truncate" title={personName(code.ownerUserId) || undefined}>
                            {personName(code.ownerUserId) || '—'}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-medium text-slate-900 dark:text-white">
                            <bdi>{discountLabel(code)}</bdi>
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {t(cycles === 1 ? 'cyclesOne' : 'cyclesMany', 'promos', { count: cycles })}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <bdi>{commissionLabel(code)}</bdi>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          {code.stats?.redemptions ?? 0}
                          <span className="text-slate-400">
                            {code.maxUses != null ? ` / ${code.maxUses}` : ''}
                          </span>
                        </Td>
                        <Td>
                          <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
                        </Td>
                        <Td className={`whitespace-nowrap ${isExpired(code) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {code.expiresAt ? formatDate(code.expiresAt, locale) : t('detailNever', 'promos')}
                        </Td>
                        <Td align="end">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              label={t('modalEditTitle', 'promos')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCode(code);
                              }}
                            >
                              <Pencil className="size-4" />
                            </IconButton>
                            <IconButton
                              label={code.isActive ? t('detailDeactivateButton', 'promos') : t('detailActivateButton', 'promos')}
                              tone={code.isActive ? 'danger' : 'success'}
                              disabled={isToggling}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(code);
                              }}
                            >
                              <Power className={`size-4 ${isToggling ? 'animate-pulse' : ''}`} />
                            </IconButton>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
            {!isLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onChange={setPage}
                busy={isFetching}
              />
            )}
          </>
        )}
      </Card>

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
    </PageShell>
  );
}
