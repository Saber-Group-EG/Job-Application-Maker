import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { useAuth } from '../../context/AuthContext';
import { useApplicantStatuses } from '../../hooks/queries/useApplicants';
import { useCompanies } from '../../hooks/queries/useCompanies';
import { useStatusSettings } from '../../hooks/useStatusSettings';
import { useLocale } from '../../context/LocaleContext';
import { useCompanyFilter } from '../../context/CompanyFilterContext';
import {
  TimeIcon,
  ChatIcon,
  CheckCircleIcon,
  CheckLineIcon,
  CloseLineIcon,
  TrashBinIcon,
  UserIcon,
} from '../../icons';
import InterviewScheduleWidget from '../../components/charts/MyInterviewWidget';
import RejectionInsightsChart from '../../components/charts/RejectionInsightsChart';
import DashboardSections from '../../components/dashboard/DashboardSections';
import { RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, PageShell, focusRing } from '../../components/ui/kit';

const getStatusIcon = (statusName: string): any => {
  const lowerStatus = statusName.toLowerCase();
  const iconMap: Record<string, any> = {
    pending: TimeIcon,
    interview: ChatIcon,
    interviewed: CheckCircleIcon,
    approved: CheckCircleIcon,
    rejected: CloseLineIcon,
    accepted: CheckLineIcon,
    trashed: TrashBinIcon,
    deleted: TrashBinIcon,
  };
  return iconMap[lowerStatus] || UserIcon;
};

function getCompanyIdFromUser(
  user: any,
  selectedCompanyId?: string
): string[] | undefined {
  const roleName = user?.roleId?.name?.toLowerCase();
  if (roleName === 'super admin') {
    if (selectedCompanyId) return [selectedCompanyId];
    return undefined;
  }
  const fromCompanies =
    user?.companies?.map((c: any) =>
      typeof c.companyId === 'string' ? c.companyId : c.companyId?._id
    ).filter(Boolean) || [];
  const fromAssigned = user?.assignedcompanyId?.filter(Boolean) || [];
  const userCompanyIds = [...new Set([...fromCompanies, ...fromAssigned])];
  if (selectedCompanyId) {
    return userCompanyIds.includes(selectedCompanyId) ? [selectedCompanyId] : [];
  }
  return userCompanyIds.length > 0 ? userCompanyIds : undefined;
}

export default function Home() {
  const navigate = useNavigate();
  const { selectedCompanyId, setSelectedCompanyId, companyOptions, isLoading: companiesLoading } = useCompanyFilter();
  const { user } = useAuth();
  const { t, locale } = useLocale();

  const isSuperAdmin = useMemo(() => {
    const roleName = user?.roleId?.name?.toLowerCase();
    return roleName === 'super admin';
  }, [user?.roleId?.name]);

  const userCompanyIds = useMemo(() => {
    const fromCompanies =
      user?.companies?.map((c: any) =>
        typeof c.companyId === 'string' ? c.companyId : c.companyId?._id
      ).filter(Boolean) || [];
    const fromAssigned = user?.assignedcompanyId?.filter(Boolean) || [];
    return [...new Set([...fromCompanies, ...fromAssigned])];
  }, [user?.companies, user?.assignedcompanyId]);

  const { data: companies = [] } = useCompanies(
    isSuperAdmin ? undefined : userCompanyIds
  );

  const isMultiCompany = companyOptions.length > 1;

  useEffect(() => {
    if (!isMultiCompany && companyOptions.length === 1 && !selectedCompanyId) {
      setSelectedCompanyId(companyOptions[0].id);
    }
  }, [isMultiCompany, companyOptions, selectedCompanyId, setSelectedCompanyId]);

  const hasSelection = !isMultiCompany || selectedCompanyId !== null;

  const companyIds = useMemo(() => {
    if (isMultiCompany && !selectedCompanyId) return undefined;
    return getCompanyIdFromUser(user, selectedCompanyId ?? undefined);
  }, [user, selectedCompanyId, isMultiCompany]);

  const selectedCompany = useMemo(() => {
    if (selectedCompanyId && companies.length > 0) {
      return companies.find((c: any) => c._id === selectedCompanyId);
    }
    if (!isSuperAdmin && companies.length > 0) {
      return companies[0];
    }
    return null;
  }, [selectedCompanyId, companies, isSuperAdmin]);

  const { statusOptions, getColor } = useStatusSettings(selectedCompany);

  const {
    data: applicantsData,
    isLoading: loading,
    refetch,
    isFetching,
  } = useApplicantStatuses({
    companyId: companyIds,
    enabled: hasSelection,
  });

  const countsData = useMemo(() => {
    if (applicantsData && typeof applicantsData === 'object' && !Array.isArray(applicantsData)) {
      return applicantsData;
    }
    return null;
  }, [applicantsData]);

  const [lastRefetch, setLastRefetch] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && lastRefetch === null) {
      setLastRefetch(new Date());
    }
  }, [loading, lastRefetch]);

  useEffect(() => {
    if (!lastRefetch) {
      setElapsed(null);
      return;
    }
    const formatRelative = (d: Date) => {
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return t('now', 'home');
      const mins = Math.floor(diffSec / 60);
      if (mins < 60) return t('minAgo', 'home', { mins });
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours === 1 ? t('hourAgo', 'home', { hours }) : t('hoursAgo', 'home', { hours });
      const days = Math.floor(hours / 24);
      if (days === 1) return t('yesterday', 'home');
      if (days < 7) return t('daysAgo', 'home', { days });
      return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
    };
    const update = () => setElapsed(formatRelative(lastRefetch));
    update();
    const id = setInterval(update, 30 * 1000);
    return () => clearInterval(id);
  }, [lastRefetch]);

  const handleStatusCardClick = (statusName: string) => {
    const params = new URLSearchParams();
    const matched = statusOptions?.find(
      (opt: any) =>
        opt.label?.toLowerCase() === statusName.toLowerCase() ||
        opt.value?.toLowerCase() === statusName.toLowerCase()
    );
    params.set('status', matched?.label || statusName);
    if (selectedCompanyId) params.set('company', selectedCompanyId);
    navigate(`/applicants?${params.toString()}`);
  };

  const handleTotalCardClick = () => {
    const params = new URLSearchParams();
    if (selectedCompanyId) params.set('company', selectedCompanyId);
    navigate(`/applicants?${params.toString()}`);
  };

  const statusCards = useMemo(() => {
    if (!countsData) return [];
    const excludeFromCards = ['total', 'trashed', 'deleted'];
    const cards = Object.entries(countsData)
      .filter(([key]) => !excludeFromCards.includes(key.toLowerCase()))
      .map(([statusName, count]) => {
        const statusOption = statusOptions?.find(
          (opt: any) =>
            opt.label?.toLowerCase() === statusName.toLowerCase() ||
            opt.value?.toLowerCase() === statusName.toLowerCase()
        );
        const bgColor = statusOption?.color || getColor(statusName) || '#94a3b8';
        return {
          name: statusName,
          displayName: statusName,
          count: Number(count),
          bgColor,
          textColor: '#111827',
          icon: getStatusIcon(statusName),
        };
      })
    return cards;
  }, [countsData, statusOptions, getColor]);

  const totalApplicants = useMemo(() => {
    if (!countsData) return 0;
    const total = countsData.total || 0;
    const trashed = countsData.Trashed || countsData.Deleted || countsData.trashed || countsData.deleted || 0;
    return total - trashed;
  }, [countsData]);

  const refresh = async () => {
    try {
      await refetch();
      setLastRefetch(new Date());
    } catch {
      // ignore
    }
  };

  const statusSkeleton = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <div key={`skeleton-${i}`} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-hidden="true">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" />
          <div className="size-5 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" />
        </div>
        <div className="mt-3 h-7 w-12 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" />
      </div>
    ));

  const cardButton = `group rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${focusRing}`;

  return (
    <PageShell
      title={t('pageTitle', 'home')}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {t('showing', 'home')}{' '}
            <span className="font-medium text-slate-900 dark:text-white">
              {loading || companiesLoading ? t('loading', 'home') : t('applicantsCount', 'home', { count: totalApplicants })}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{elapsed ? t('lastUpdate', 'home', { time: elapsed }) : t('notUpdatedYet', 'home')}</span>
        </span>
      }
      actions={
        <Button icon={<RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />} onClick={refresh} disabled={isFetching || !hasSelection}>
          {isFetching ? t('updatingData', 'home') : t('updateData', 'home')}
        </Button>
      }
    >
      <PageMeta title={t('pageTitle', 'home')} description={t('pageDescription', 'home')} />

      {companiesLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{statusSkeleton(6)}</div>
      ) : !hasSelection ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-12">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('selectCompany', 'home')}</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {companyOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(c.id)}
                  className={`flex min-w-[160px] flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5 ${focusRing}`}
                >
                  {c.logoPath ? (
                    <img src={c.logoPath} alt="" className="size-12 rounded-lg object-cover" />
                  ) : (
                    <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {c.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-semibold">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button type="button" onClick={handleTotalCardClick} className={cardButton}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('totalApplicants', 'home')}</span>
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <UserIcon className="size-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {loading ? <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : totalApplicants}
              </div>
            </button>

            {loading
              ? statusSkeleton(5)
              : statusCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button key={card.name} type="button" onClick={() => handleStatusCardClick(card.name)} className={cardButton}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                          <span className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: card.bgColor }} />
                          <span className="truncate">{card.displayName || card.name}</span>
                        </span>
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${card.bgColor}26`, color: card.bgColor }}
                        >
                          {Icon && <Icon className="size-4" />}
                        </span>
                      </div>
                      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{card.count}</div>
                    </button>
                  );
                })}
          </div>

          <DashboardSections companyIds={companyIds} companies={companies} />
          <div id="my-interviews" className="scroll-mt-20">
            <InterviewScheduleWidget />
          </div>
          <RejectionInsightsChart companyId={companyIds} />

          {!loading && statusCards.length === 0 && countsData && (
            <Card>
              <EmptyState icon={<UserIcon className="size-6" />} title={t('noStatusData', 'home')} />
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}
