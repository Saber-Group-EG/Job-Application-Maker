import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { useMyPromoRedemptions } from '../../hooks/queries';
import PromoRedemptionsTable from './components/PromoRedemptionsTable';
import { REDEMPTION_STATUS_OPTIONS } from './promoFormat';
import { Search, X } from 'lucide-react';
import {
  Button,
  Card,
  CardToolbar,
  EmptyState,
  ErrorState,
  PageShell,
  Pagination,
  selectClass,
} from './components/PromoUI';

export default function MyPromoRedemptions() {
  const { t } = useLocale();

  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: { status?: string; page: number } = { page };
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [statusFilter, page]);

  const { data: envelope, isLoading, isFetching, isError, refetch } = useMyPromoRedemptions(params);

  const redemptions = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  const hasActiveFilters = statusFilter !== 'all';
  const clearFilters = () => {
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <PageShell title={t('myRedemptionsTitle', 'promos')} subtitle={t('myRedemptionsSubtitle', 'promos')}>
      <PageMeta title={t('myRedemptionsTitle', 'promos')} description={t('myRedemptionsSubtitle', 'promos')} />

      <Card>
        <CardToolbar>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isLoading ? ' ' : t('resultsFound', 'promos', { count: totalCount })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              aria-label={t('redemptionsTableStatus', 'promos')}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`${selectClass} w-auto min-w-[9rem]`}
            >
              <option value="all">{t('ledgerFilterAllStatuses', 'promos')}</option>
              {REDEMPTION_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.labelKey, 'promos')}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" icon={<X className="size-4" />} onClick={clearFilters}>
                {t('clearFilters', 'promos')}
              </Button>
            )}
          </div>
        </CardToolbar>

        {isError && !isLoading ? (
          <ErrorState title={t('redemptionsLoadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
        ) : !isLoading && redemptions.length === 0 && hasActiveFilters ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={t('noRedemptionsMatchTitle', 'promos')}
            text={t('noRedemptionsMatchText', 'promos')}
            action={<Button icon={<X className="size-4" />} onClick={clearFilters}>{t('clearFilters', 'promos')}</Button>}
          />
        ) : (
          <>
            <PromoRedemptionsTable
              data={redemptions}
              isLoading={isLoading}
              isFetching={isFetching}
              emptyTitle={t('myRedemptionsNoResults', 'promos')}
              emptyText={t('myRedemptionsNoResultsText', 'promos')}
            />
            {!isLoading && redemptions.length > 0 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} busy={isFetching} />
            )}
          </>
        )}
      </Card>
    </PageShell>
  );
}
