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

  if (companiesLoading) {
    return (
      <>
        <PageMeta
          title={t('pageTitle', 'home')}
          description={t('pageDescription', 'home')}
        />
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                  <div className="size-5 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="mt-2 h-8 w-12 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={t('pageTitle', 'home')}
        description={t('pageDescription', 'home')}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-4 md:gap-6 items-end">
          <div className="col-span-12 sm:col-span-12 md:col-span-12 lg:col-span-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-gray-500">{t('showing', 'home')}</div>
              <div className="font-semibold text-gray-800">
                {loading ? t('loading', 'home') : t('applicantsCount', 'home', { count: totalApplicants })}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await refetch();
                    setLastRefetch(new Date());
                  } catch (e) {
                    // ignore
                  }
                }}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {isFetching ? t('updatingData', 'home') : t('updateData', 'home')}
              </button>
              <div className="text-sm text-gray-500">
                {elapsed ? t('lastUpdate', 'home', { time: elapsed }) : t('notUpdatedYet', 'home')}
              </div>
            </div>
          </div>
        </div>

        {!hasSelection ? (
          <div className="flex flex-col items-center justify-center py-16">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6">
              {t('selectCompany', 'home')}
            </h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {companyOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(c.id)}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-8 py-6 text-sm font-medium text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 min-w-[160px]"
                >
                  {c.logoPath ? (
                    <img src={c.logoPath} alt="" className="size-12 rounded object-cover" />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                      {c.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-base font-semibold">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div
            onClick={handleTotalCardClick}
            className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-5 dark:from-gray-800 dark:to-gray-900 cursor-pointer transition hover:shadow-md hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('totalApplicants', 'home')}
              </div>
              <div className="text-gray-400">
                <UserIcon className="size-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-200">
              {loading ? (
                <span className="inline-block h-6 w-14 rounded bg-gray-200 animate-pulse" />
              ) : (
                totalApplicants
              )}
            </div>
          </div>

          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                    <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="mt-2 h-8 w-12 rounded bg-gray-200 animate-pulse" />
                </div>
              ))
            : statusCards.map((card) => {
                const Icon = card.icon;
                const bgStyle = {
                  backgroundColor: card.bgColor + '15',
                  borderLeftColor: card.bgColor,
                  borderLeftWidth: '4px',
                };

                return (
                  <div
                    key={card.name}
                    onClick={() => handleStatusCardClick(card.name)}
                    className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                    style={bgStyle}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold" style={{ color: card.textColor }}>
                        {card.displayName || card.name}
                      </div>
                      <div style={{ color: card.bgColor }}>
                        {Icon && <Icon className="size-5" />}
                      </div>
                    </div>
                    <div className="mt-2 text-2xl font-bold" style={{ color: card.textColor }}>
                      {card.count}
                    </div>
                  </div>
                );
              })}
        </div>
        <InterviewScheduleWidget />
        <RejectionInsightsChart companyId={companyIds} />

        {!loading && statusCards.length === 0 && countsData && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('noStatusData', 'home')}</p>
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
}
