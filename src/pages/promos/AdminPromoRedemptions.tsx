import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageMeta from '../../components/common/PageMeta';
import { usePromoRedemptions, usePromoCodes } from '../../hooks/queries';
import { toPlainString } from '../../utils/strings';
import PromoRedemptionsTable from './components/PromoRedemptionsTable';
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
import { REDEMPTION_STATUS_OPTIONS } from './promoFormat';

export default function AdminPromoRedemptions() {
  const { t } = useLocale();

  const [codeFilter, setCodeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: { promoCodeId?: string; status?: string; page: number } = { page };
    if (codeFilter !== 'all') p.promoCodeId = codeFilter;
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [codeFilter, statusFilter, page]);

  const { data: envelope, isLoading, isFetching, isError, refetch } = usePromoRedemptions(params);
  const { data: codesEnvelope } = usePromoCodes({ limit: 100 });

  const redemptions = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const totalCount = envelope?.totalCount ?? 0;

  // Alphabetical order makes a long code list easier to scan.
  const codes = useMemo(
    () => [...(codesEnvelope?.data ?? [])].sort((a, b) => toPlainString(a.code).localeCompare(toPlainString(b.code))),
    [codesEnvelope]
  );

  const hasActiveFilters = codeFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setCodeFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  return (
    <PageShell title={t('redemptionsTitle', 'promos')} subtitle={t('redemptionsSubtitle', 'promos')}>
      <PageMeta title={t('metaTitle', 'promos')} description={t('redemptionsTitle', 'promos')} />

      <Card>
        <CardToolbar>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isLoading ? ' ' : t('resultsFound', 'promos', { count: totalCount })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={codeFilter}
              aria-label={t('tableCode', 'promos')}
              onChange={(e) => {
                setCodeFilter(e.target.value);
                setPage(1);
              }}
              className={`${selectClass} w-auto min-w-[10rem]`}
            >
              <option value="all">{t('redemptionsFilterAllCodes', 'promos')}</option>
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
            <PromoRedemptionsTable data={redemptions} isLoading={isLoading} isFetching={isFetching} />
            {!isLoading && redemptions.length > 0 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} busy={isFetching} />
            )}
          </>
        )}
      </Card>
    </PageShell>
  );
}
