import { useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCompaniesUsageOverview } from '../../../hooks/queries/useSystemSettings';
import CompanyUsageDetailDrawer from '../../../components/settings/CompanyUsageDetailDrawer';
import PageMeta from '../../../components/common/PageMeta';
import { useLocale } from '../../../context/LocaleContext';
import { useDebounce } from '../../../hooks/useDebounce';
import type { CompanyUsageRow } from '../../../types/SystemSettings';
import {
  Badge,
  Button,
  Card,
  CardToolbar,
  EmptyState,
  PageShell,
  SearchInput,
  SkeletonRows,
  Table,
  Td,
  Th,
  focusRing,
  rowClass,
} from '../../../components/ui/kit';
import type { BadgeTone } from '../../../components/ui/kit';

const PAGE_SIZE = 25;

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'green',
  past_due: 'amber',
  suspended: 'red',
  expired: 'red',
  cancelled: 'slate',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  active: 'statusActive',
  past_due: 'statusPastDue',
  suspended: 'statusSuspended',
  expired: 'statusExpired',
  cancelled: 'statusCancelled',
};

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const { t, dir } = useLocale();
  const ratio = limit > 0 ? used / limit : 0;
  const numberLocale = dir === 'rtl' ? 'ar-EG' : 'en-US';
  const color = ratio >= 1 ? 'bg-rose-500' : ratio >= 0.9 ? 'bg-amber-500' : 'bg-emerald-500';
  const percent = Math.round(Math.min(ratio, 1) * 100);
  return (
    <div className="min-w-[140px]" title={t('usagePercent', 'systemSettings', { percent })}>
      <p className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
        {used.toLocaleString(numberLocale)} / {limit.toLocaleString(numberLocale)}
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
      </div>
    </div>
  );
}

export default function AdminUsagePage() {
  const { t, locale } = useLocale();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useCompaniesUsageOverview({
    page: pageIndex + 1,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const rows: CompanyUsageRow[] = data?.data ?? [];
  const hasNext = rows.length === PAGE_SIZE;

  const companyName = (row: CompanyUsageRow) =>
    locale === 'ar' ? row.companyName.ar || row.companyName.en : row.companyName.en || row.companyName.ar;

  return (
    <PageShell title={t('adminPageTitle', 'systemSettings')} subtitle={t('adminPageSubtitle', 'systemSettings')}>
      <PageMeta title={t('adminMetaTitle', 'systemSettings')} description={t('adminMetaDescription', 'systemSettings')} />

      <Card>
        <CardToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder={t('mrtSearch', 'systemSettings')} className="w-full max-w-sm" />
        </CardToolbar>

        {!isLoading && rows.length === 0 ? (
          <EmptyState icon={<Building2 className="size-6" />} title={t('mrtNoRecordsToDisplay', 'systemSettings')} />
        ) : (
          <Table minWidth={880} busy={isFetching}>
            <thead>
              <tr>
                <Th>{t('colCompany', 'systemSettings')}</Th>
                <Th>{t('colPlan', 'systemSettings')}</Th>
                <Th>{t('colStatus', 'systemSettings')}</Th>
                <Th>{t('colRequestQuota', 'systemSettings')}</Th>
                <Th>{t('colAiCredits', 'systemSettings')}</Th>
                <Th>{t('colAiEnabled', 'systemSettings')}</Th>
              </tr>
            </thead>
            <tbody className={isFetching && !isLoading ? 'opacity-60' : ''}>
              {isLoading ? (
                <SkeletonRows rows={6} cols={6} />
              ) : (
                rows.map((row) => {
                  const name = companyName(row);
                  const labelKey = STATUS_LABEL_KEY[row.subscriptionStatus];
                  return (
                    <tr
                      key={row.companyId}
                      className={`${rowClass} cursor-pointer ${selectedCompanyId === row.companyId ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''}`}
                      onClick={() => setSelectedCompanyId(row.companyId)}
                    >
                      <Td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCompanyId(row.companyId);
                          }}
                          className={`flex items-center gap-2 rounded-md text-start font-medium text-slate-900 hover:text-brand-600 dark:text-white ${focusRing}`}
                        >
                          {row.companyLogo ? (
                            <img src={row.companyLogo} alt="" className="size-7 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                              {row.companyName.en.charAt(0)}
                            </span>
                          )}
                          {name}
                        </button>
                      </Td>
                      <Td>{row.planName}</Td>
                      <Td>
                        <Badge tone={STATUS_TONE[row.subscriptionStatus] ?? 'slate'}>
                          {labelKey ? t(labelKey, 'systemSettings') : row.subscriptionStatus}
                        </Badge>
                      </Td>
                      <Td>
                        <UsageBar used={row.requestQuota.used} limit={row.requestQuota.limit} />
                      </Td>
                      <Td>
                        <UsageBar used={row.aiCredits.used} limit={row.aiCredits.limit} />
                      </Td>
                      <Td>
                        <Badge tone={row.aiEnabled ? 'green' : 'slate'}>
                          {row.aiEnabled ? t('aiEnabled', 'systemSettings') : t('aiDisabled', 'systemSettings')}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        )}

        {(pageIndex > 0 || hasNext) && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <Button
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              icon={locale === 'ar' ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            >
              {t('prevShort', 'promos')}
            </Button>
            <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{pageIndex + 1}</span>
            <Button size="sm" disabled={!hasNext} onClick={() => setPageIndex((p) => p + 1)}>
              {t('nextShort', 'promos')}
              {locale === 'ar' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </div>
        )}
      </Card>

      <CompanyUsageDetailDrawer companyId={selectedCompanyId} onClose={() => setSelectedCompanyId(null)} />
    </PageShell>
  );
}
