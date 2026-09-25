import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import PageMeta from '../../components/common/PageMeta';
import { useMyPromoCodes } from '../../hooks/queries';
import { formatMoney } from '../../utils/money';
import { toPlainString } from '../../utils/strings';
import PromoCodeFormModal from './components/PromoCodeFormModal';
import { Plus, Wallet, CircleDollarSign, Clock4, RefreshCcw, Tag } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CodeChip,
  EmptyState,
  ErrorState,
  PageShell,
  Pagination,
  SkeletonRows,
  StatCard,
  Table,
  Td,
  Th,
  rowClass,
} from './components/PromoUI';
import { codeState, commissionLabel, discountLabel, formatDate, isExpired } from './promoFormat';

const PAGE_SIZE = 10;

export default function MyPromoCodes() {
  const { t, locale } = useLocale();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Promo Code Management', 'create');

  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ page, limit: PAGE_SIZE }), [page]);
  const { data: envelope, isLoading, isFetching, isError, refetch } = useMyPromoCodes(params);

  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const summary = envelope?.summary;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <PageShell
      title={t('myTitle', 'promos')}
      subtitle={t('mySubtitle', 'promos')}
      actions={
        canCreate && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
            {t('myCreateButton', 'promos')}
          </Button>
        )
      }
    >
      <PageMeta title={t('myTitle', 'promos')} description={t('mySubtitle', 'promos')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('mySummaryTotal', 'promos')}
          value={formatMoney(summary?.totalCents ?? 0)}
          icon={<Wallet className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          label={t('mySummaryPending', 'promos')}
          value={formatMoney(summary?.pendingCents ?? 0)}
          icon={<Clock4 className="size-4" />}
          hint={t('mySummaryPendingHint', 'promos')}
          loading={isLoading}
        />
        <StatCard
          label={t('mySummaryPaid', 'promos')}
          value={formatMoney(summary?.paidCents ?? 0)}
          icon={<CircleDollarSign className="size-4" />}
          loading={isLoading}
        />
        <StatCard
          label={t('mySummaryCycles', 'promos')}
          value={summary?.cycles ?? 0}
          icon={<RefreshCcw className="size-4" />}
          hint={t('mySummaryCyclesHint', 'promos')}
          loading={isLoading}
        />
      </div>

      <Card>
        {isError && !isLoading ? (
          <ErrorState title={t('myLoadFailedTitle', 'promos')} text={t('loadFailedText', 'promos')} onRetry={() => refetch()} />
        ) : !isLoading && codes.length === 0 ? (
          <EmptyState
            icon={<Tag className="size-6" />}
            title={t('myNoCodes', 'promos')}
            text={t('myNoCodesText', 'promos')}
            action={
              canCreate && (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
                  {t('myCreateButton', 'promos')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table minWidth={760} busy={isLoading || isFetching}>
              <thead>
                <tr>
                  <Th>{t('tableCode', 'promos')}</Th>
                  <Th>{t('tableDiscount', 'promos')}</Th>
                  <Th>{t('tableCommission', 'promos')}</Th>
                  <Th>{t('tableUses', 'promos')}</Th>
                  <Th>{t('tableStatus', 'promos')}</Th>
                  <Th>{t('tableExpires', 'promos')}</Th>
                </tr>
              </thead>
              <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {isLoading && <SkeletonRows rows={5} cols={6} />}
                {!isLoading &&
                  codes.map((code) => {
                    const state = codeState(code);
                    const cycles = code.discountCycles ?? 1;
                    return (
                      <tr key={code._id} className={rowClass}>
                        <Td>
                          <CodeChip code={toPlainString(code.code)} copyable />
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
                          <span className="text-slate-400">{code.maxUses != null ? ` / ${code.maxUses}` : ''}</span>
                        </Td>
                        <Td>
                          <Badge tone={state.tone}>{t(state.labelKey, 'promos')}</Badge>
                        </Td>
                        <Td className={`whitespace-nowrap ${isExpired(code) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {code.expiresAt ? formatDate(code.expiresAt, locale) : t('detailNever', 'promos')}
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
                totalCount={envelope?.totalCount}
                onChange={setPage}
                busy={isFetching}
              />
            )}
          </>
        )}
      </Card>

      <PromoCodeFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} mode="my" />
    </PageShell>
  );
}
