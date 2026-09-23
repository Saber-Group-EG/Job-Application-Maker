import { useMemo } from 'react';
import { useLocale } from '../../../context/LocaleContext';
import { formatMoney } from '../../../utils/money';
import { toPlainString } from '../../../utils/strings';
import { Ticket } from 'lucide-react';
import type { PromoRedemption } from '../../../types/promos';

interface PromoRedemptionsTableProps {
  data?: PromoRedemption[];
  isLoading?: boolean;
}

const SKELETON_ROWS = 6;
const COLUMN_COUNT = 6;

function companyName(
  companyId: PromoRedemption['companyId'],
  locale: string
): string {
  if (!companyId) return '—';
  if (typeof companyId === 'string') return '—';
  const name = companyId.name;
  if (!name) return '—';
  if (typeof name === 'string') return toPlainString(name);
  return toPlainString(
    locale === 'ar' ? name.ar || name.en : name.en || name.ar
  );
}

function redemptionStatus(status: string | undefined): {
  dot: string;
  labelKey: string;
} {
  const key = (status || '').toLowerCase().trim();
  switch (key) {
    case 'active':
      return { dot: 'bg-green-500', labelKey: 'redemptionsStatusActive' };
    case 'expired':
      return { dot: 'bg-gray-400', labelKey: 'redemptionsStatusExpired' };
    case 'revoked':
      return { dot: 'bg-red-500', labelKey: 'redemptionsStatusRevoked' };
    default:
      return { dot: 'bg-gray-300 dark:bg-gray-700', labelKey: '' };
  }
}

// Per-cycle savings, mirroring the backend's computeDiscountedAmountCents
// (services/promoService.js): percent wins over a fixed amount, and the
// discounted bill never drops below 1 cent.
function savedPerCycleCents(redemption: PromoRedemption): number | undefined {
  const plan = redemption.planId;
  if (!plan || typeof plan === 'string' || plan.priceCents == null)
    return undefined;
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
}: PromoRedemptionsTableProps) {
  const { t, locale } = useLocale();

  const isRtl = locale === 'ar';
  // Letter-spacing breaks Arabic letter joining, so only track Latin text.
  const tracking = isRtl ? '' : 'tracking-widest';

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [isRtl]
  );

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return dateFormatter.format(date);
  };

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div className="py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-md border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
        <div className="size-16 rounded-full bg-slate-100 dark:bg-white/5 mx-auto mb-5 flex items-center justify-center">
          <Ticket className="size-8 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white">
          {t('redemptionsNoResults', 'promos')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto mt-2">
          {t('redemptionsNoResultsText', 'promos')}
        </p>
      </div>
    );
  }

  return (
    <div
      aria-busy={!!isLoading}
      className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl"
    >
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr
            className={`text-[10px] font-black uppercase ${tracking} text-gray-400 border-b border-slate-100 dark:border-white/10`}
          >
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableCompany', 'promos')}
            </th>
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableCode', 'promos')}
            </th>
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableStatus', 'promos')}
            </th>
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableCycle', 'promos')}
            </th>
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableSaved', 'promos')}
            </th>
            <th scope="col" className="px-6 py-4 text-start">
              {t('redemptionsTableDate', 'promos')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {/* Skeleton rows keep the layout stable while loading */}
          {isLoading &&
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <tr
                key={`skeleton-${i}`}
                className="animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              >
                {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                  <td key={j} className="px-6 py-5">
                    <div
                      className={`h-4 rounded-md bg-slate-200/70 dark:bg-white/10 ${j === 0 ? 'w-32' : 'w-20'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading &&
            data?.map((redemption) => {
              const status = redemptionStatus(redemption.status);
              const code =
                typeof redemption.promoCodeId === 'string'
                  ? '—'
                  : toPlainString(redemption.promoCodeId?.code || '—');
              const company = companyName(redemption.companyId, locale);
              const savedPerCycle = savedPerCycleCents(redemption);
              const saved =
                savedPerCycle != null && redemption.discountCyclesUsed != null
                  ? formatMoney(savedPerCycle * redemption.discountCyclesUsed)
                  : '—';
              return (
                <tr
                  key={redemption._id}
                  className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span
                      className="block max-w-[240px] truncate"
                      title={company !== '—' ? company : undefined}
                    >
                      {company}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      dir="ltr"
                      className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide"
                    >
                      {code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 capitalize">
                      <span
                        className={`size-2 rounded-full ${status.dot}`}
                        aria-hidden="true"
                      />
                      {status.labelKey
                        ? t(status.labelKey, 'promos')
                        : toPlainString(redemption.status || '—')}
                    </span>
                  </td>
                  <td className="px-6 py-4 tabular-nums">
                    {redemption.discountCyclesUsed != null
                      ? redemption.discountCyclesUsed
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-green-600 dark:text-green-400 tabular-nums whitespace-nowrap">
                    <bdi>{saved}</bdi>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(redemption.createdAt)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
