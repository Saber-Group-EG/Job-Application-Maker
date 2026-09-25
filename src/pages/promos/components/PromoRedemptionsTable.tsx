import { useLocale } from '../../../context/LocaleContext';
import { formatMoney } from '../../../utils/money';
import { toPlainString } from '../../../utils/strings';
import { Ticket } from 'lucide-react';
import type { PromoRedemption } from '../../../types/promos';
import { Badge, CodeChip, EmptyState, SkeletonRows, Table, Td, Th, rowClass } from './PromoUI';
import { companyLabel, formatDate, redemptionState } from '../promoFormat';

interface PromoRedemptionsTableProps {
  data?: PromoRedemption[];
  isLoading?: boolean;
  isFetching?: boolean;
  // Hide the code column when every row is the same code (code detail page).
  showCode?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}

const SKELETON_ROWS = 6;

// Per-cycle savings, mirroring the backend's computeDiscountedAmountCents
// (services/promoService.js): percent wins over a fixed amount, and the
// discounted bill never drops below 1 cent.
function savedPerCycleCents(redemption: PromoRedemption): number | undefined {
  const plan = redemption.planId;
  if (!plan || typeof plan === 'string' || plan.priceCents == null) return undefined;
  const base = plan.priceCents;
  let discounted: number;
  if (redemption.discountPercent != null) {
    discounted = Math.round((base * (100 - redemption.discountPercent)) / 100);
  } else if (redemption.discountAmountCents != null) {
    discounted = base - redemption.discountAmountCents;
  } else {
    return undefined;
  }
  return base - Math.max(discounted, 1);
}

export default function PromoRedemptionsTable({
  data,
  isLoading,
  isFetching,
  showCode = true,
  emptyTitle,
  emptyText,
}: PromoRedemptionsTableProps) {
  const { t, locale } = useLocale();
  const cols = showCode ? 6 : 5;

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <EmptyState
        icon={<Ticket className="size-6" />}
        title={emptyTitle ?? t('redemptionsNoResults', 'promos')}
        text={emptyText ?? t('redemptionsNoResultsHint', 'promos')}
      />
    );
  }

  return (
    <Table minWidth={showCode ? 820 : 700} busy={isLoading || isFetching}>
      <thead>
        <tr>
          <Th>{t('redemptionsTableCompany', 'promos')}</Th>
          {showCode && <Th>{t('redemptionsTableCode', 'promos')}</Th>}
          <Th>{t('redemptionsTableStatus', 'promos')}</Th>
          <Th>{t('redemptionsTableCycle', 'promos')}</Th>
          <Th align="end">{t('redemptionsTableSaved', 'promos')}</Th>
          <Th>{t('redemptionsTableDate', 'promos')}</Th>
        </tr>
      </thead>
      <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {isLoading && <SkeletonRows rows={SKELETON_ROWS} cols={cols} />}
        {!isLoading &&
          data?.map((redemption) => {
            const state = redemptionState(redemption.status);
            const code =
              typeof redemption.promoCodeId === 'object' ? toPlainString(redemption.promoCodeId?.code || '') : '';
            const company = companyLabel(redemption.companyId, locale);
            const perCycle = savedPerCycleCents(redemption);
            const used = redemption.discountCyclesUsed;
            const total = redemption.discountCyclesTotal;
            return (
              <tr key={redemption._id} className={rowClass}>
                <Td>
                  <span className="block max-w-[16rem] truncate font-medium text-slate-900 dark:text-white" title={company !== '—' ? company : undefined}>
                    {company}
                  </span>
                </Td>
                {showCode && <Td>{code ? <CodeChip code={code} /> : '—'}</Td>}
                <Td>
                  <Badge tone={state.tone}>
                    {state.labelKey ? t(state.labelKey, 'promos') : toPlainString(redemption.status || '—')}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {used != null ? used : '—'}
                  {used != null && total != null && <span className="text-slate-400"> / {total}</span>}
                </Td>
                <Td align="end" className="whitespace-nowrap tabular-nums">
                  {perCycle != null && used != null ? (
                    <>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        <bdi>{formatMoney(perCycle * used)}</bdi>
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {t('savedPerCycle', 'promos', { value: formatMoney(perCycle) })}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                  {formatDate(redemption.appliedAt || redemption.createdAt, locale)}
                </Td>
              </tr>
            );
          })}
      </tbody>
    </Table>
  );
}
