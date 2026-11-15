// Reports: the hiring funnel on each company's own statuses (yield ratios),
// selection ratio, time to fill, fill rate, time to hire, the applications
// trend, sources, the jobs pipeline and rejection insights.
import { useEffect, useMemo, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { PageShell } from '../../components/ui/kit';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useCompanyFilter } from '../../context/CompanyFilterContext';
import { useCompanies } from '../../hooks/queries/useCompanies';
import { useReportsOverview } from '../../hooks/queries/useReports';
import { getCompanyIdFromUser } from '../../utils/companyScope';
import { toPlainString } from '../../utils/strings';
import RejectionInsightsChart from '../../components/charts/RejectionInsightsChart';
import AskAiPanel from '../../components/reports/AskAiPanel';
import MyCharts from '../../components/reports/MyCharts';
import {
  ApplicantSources,
  ApplicationsTrend,
  HiringFunnel,
  HiringSpeed,
  JobsPipeline,
  RecruitingRatios,
} from '../../components/reports/ReportSections';

const RANGES = [30, 90, 180, 365];

export default function Reports() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const { selectedCompanyId, companyOptions } = useCompanyFilter();
  const { data: companies = [] } = useCompanies();
  const [days, setDays] = useState(90);
  const [jobId, setJobId] = useState<string | null>(null);

  const companyIds = useMemo(() => getCompanyIdFromUser(user, selectedCompanyId ?? undefined), [user, selectedCompanyId]);

  // The funnel follows one company's statuses: the selected company, else a
  // pick among the ones in view.
  const [pickedCompanyId, setPickedCompanyId] = useState<string | null>(null);
  const hiringCompanyId = selectedCompanyId ?? pickedCompanyId ?? companyOptions[0]?.id ?? null;
  useEffect(() => {
    setJobId(null);
  }, [hiringCompanyId]);

  const { data, isLoading } = useReportsOverview({ companyIds, days, hiringCompanyId, jobId }, { enabled: Boolean(user) });
  const companyName = (id: string) => toPlainString((companies as any[]).find((c) => (c._id || c.id) === id)?.name, locale) || '';
  const showCompany = (companyIds?.length ?? 0) !== 1;
  // Ask AI follows the funnel's company; it needs that company's AI switched on.
  const hiringCompany = (companies as any[]).find((c) => (c._id || c.id) === hiringCompanyId);
  const aiSettings = hiringCompany?.settings?.aiSettings;
  const aiEnabled = Boolean(aiSettings?.enabled) && aiSettings?.featureToggles?.reportBuilder !== false;

  const companyPicker =
    !selectedCompanyId && companyOptions.length > 1 ? (
      <select
        value={hiringCompanyId ?? ''}
        onChange={(e) => setPickedCompanyId(e.target.value || null)}
        aria-label={t('funnelCompany', 'reports')}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {companyOptions.map((c) => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </select>
    ) : null;

  return (
    <PageShell
      title={t('pageTitle', 'reports')}
      subtitle={t('pageSubtitle', 'reports')}
      actions={
        <div role="group" aria-label={t('range', 'reports')} className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={`rounded-md px-2.5 py-1 transition ${days === d ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
            >
              {t('lastDays', 'reports', { days: d })}
            </button>
          ))}
        </div>
      }
    >
      <PageMeta title={t('pageTitle', 'reports')} description={t('pageSubtitle', 'reports')} />
      <div className="space-y-6">
        <AskAiPanel companyId={hiringCompanyId} enabled={aiEnabled} days={days} jobs={data?.hiring?.jobOptions} />
        <MyCharts companyId={hiringCompanyId} days={days} jobs={data?.hiring?.jobOptions} />
        <HiringFunnel data={data?.hiring} loading={isLoading} jobId={jobId} onJobChange={setJobId} companyPicker={companyPicker} />
        <RecruitingRatios data={data?.hiring} loading={isLoading} days={days} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <HiringSpeed data={data?.speed} loading={isLoading} />
          <ApplicantSources data={data?.sources} loading={isLoading} days={days} />
        </div>
        <ApplicationsTrend data={data?.trend} loading={isLoading} />
        <JobsPipeline data={data?.jobs} loading={isLoading} showCompany={showCompany} companyName={companyName} />
        <RejectionInsightsChart companyId={companyIds} />
      </div>
    </PageShell>
  );
}
