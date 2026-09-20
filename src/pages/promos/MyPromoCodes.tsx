import { useState, useMemo } from 'react';
import { useLocale } from '../../context/LocaleContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import LoadingSpinner from '../../components/common/LoadingSpinner';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 p-6 rounded-[2rem] ${accent} shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-3xl font-black tabular-nums text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export default function MyPromoCodes() {
  const { t, locale } = useLocale();

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const params = useMemo(() => ({ page, limit: pageSize }), [page]);

  const { data: envelope, isLoading } = useMyPromoCodes(params);
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Promo Code Management', 'create');
  const codes = envelope?.data ?? [];
  const totalPages = envelope?.totalPages ?? 1;
  const summary = envelope?.summary;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:p-8 text-slate-900 dark:text-slate-100">
      <PageMeta
        title={t('myTitle', 'promos')}
        description={t('mySubtitle', 'promos')}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {canCreate && (
          <PageBreadcrumb
            pageTitle={t('myTitle', 'promos')}
            actions={
              <button
                onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-[1.25rem] font-bold shadow-xl shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="size-5" />
              {t('myCreateButton', 'promos')}
            </button>
          }
        />
        )}
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">
            {t('myTitle', 'promos')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 font-medium italic">
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
          />
          <SummaryCard
            icon={<Clock4 className="size-8 text-amber-500/40" />}
            label={t('mySummaryPending', 'promos')}
            value={formatMoney(summary?.pendingCents ?? 0)}
            accent="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20"
          />
          <SummaryCard
            icon={<CircleDollarSign className="size-8 text-emerald-500/40" />}
            label={t('mySummaryPaid', 'promos')}
            value={formatMoney(summary?.paidCents ?? 0)}
            accent="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
          />
          <SummaryCard
            icon={<RefreshCcw className="size-8 text-purple-500/40" />}
            label={t('mySummaryCycles', 'promos')}
            value={String(summary?.cycles ?? 0)}
            accent="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
          />
        </div>
        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-slate-100 dark:border-white/10">
                  <th className="px-6 py-4">{t('tableCode', 'promos')}</th>
                  <th className="px-6 py-4">{t('tableDiscount', 'promos')}</th>
                  <th className="px-6 py-4">
                    {t('tableCommission', 'promos')}
                  </th>
                  <th className="px-6 py-4">{t('tableCycles', 'promos')}</th>
                  <th className="px-6 py-4">{t('tableStats', 'promos')}</th>
                  <th className="px-6 py-4">{t('tableStatus', 'promos')}</th>
                  <th className="px-6 py-4">{t('tableExpires', 'promos')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {codes.map((code) => {
                  const isActive = code.isActive !== false;
                  const expiresLabel = code.expiresAt
                    ? new Date(code.expiresAt).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )
                    : t('detailNever', 'promos');
                  return (
                    <tr
                      key={code._id}
                      className="font-bold text-gray-800 dark:text-gray-100 hover:bg-brand-500/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 font-black font-mono tracking-wide">
                          {toPlainString(code.code)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {discountLabel(code)}
                      </td>
                      <td className="px-6 py-4 text-purple-600 dark:text-purple-400 tabular-nums">
                        {commissionLabel(code)}
                      </td>
                      <td className="px-6 py-4 tabular-nums">
                        {code.discountCycles ?? 1}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 tabular-nums">
                        {code.stats?.redemptions ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${
                            isActive
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {isActive
                            ? t('statusActive', 'promos')
                            : t('statusInactive', 'promos')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {expiresLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {codes.length === 0 && !isLoading && (
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
              </div>
            )}
          </div>
        )}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === 'ar' ? (
                <ChevronRight className="size-5" />
              ) : (
                <ChevronLeft className="size-5" />
              )}
            </button>
            <div className="px-6 py-3 bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl font-black tracking-widest text-sm uppercase">
              {t('phaseLabel', 'promos', { page })}{' '}
              <span className="opacity-30 mx-2">/</span> {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="size-12 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center disabled:opacity-30 hover:bg-brand-500 hover:text-white transition-all shadow-sm"
            >
              {locale === 'ar' ? (
                <ChevronLeft className="size-5" />
              ) : (
                <ChevronRight className="size-5" />
              )}
            </button>
          </div>
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
