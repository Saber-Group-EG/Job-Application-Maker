// The Reports page sections: the hiring funnel on the company's own statuses,
// selection ratio / time to fill / fill rate, time to hire, the applications
// trend, sources and the jobs pipeline. Data: GET /reports/overview.
import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ApexOptions } from 'apexcharts';
import { ArrowDownRight, ArrowUpRight, Briefcase, Filter, Percent, Share2, Timer, TrendingUp } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import type { HiringReport, ReportsOverview } from '../../services/reportsService';
import { paths } from '../../router/Paths';
import { toPlainString } from '../../utils/strings';
import { formatSourceLabel } from '../../utils/publicJobLinks';
import { Card, Empty, Skeleton, useTimeAgo } from './parts';

const Chart = lazy(() => import('react-apexcharts'));

// ─── Hiring funnel (yield ratios) ──────────────────────────────────────────

const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}%`);

function DropOffs({ counts }: { counts: Record<string, number> }) {
  const { t } = useLocale();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {t('funnelLeftHere', 'reports')}{' '}
      {entries.map(([status, n], i) => (
        <span key={status}>
          {i > 0 && ' · '}
          <span className="capitalize">{status}</span> <span className="tabular-nums">{n}</span>
        </span>
      ))}
    </p>
  );
}

export function HiringFunnel({ data, loading, jobId, onJobChange, companyPicker }: {
  data?: HiringReport | null;
  loading: boolean;
  jobId: string | null;
  onJobChange: (id: string | null) => void;
  companyPicker?: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const firstEmpty = data?.funnel.find((f, i) => i > 0 && f.reached === 0);
  const select = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

  return (
    <Card
      title={t('funnelTitle', 'reports')}
      icon={<Filter className="size-4" />}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {companyPicker}
          {data && data.jobOptions.length > 0 && (
            <select
              value={jobId ?? ''}
              onChange={(e) => onJobChange(e.target.value || null)}
              aria-label={t('funnelJobFilter', 'reports')}
              className={select}
            >
              <option value="">{t('allJobs', 'reports')}</option>
              {data.jobOptions.map((j) => (
                <option key={j._id} value={j._id}>{toPlainString(j.title, locale) || '—'}</option>
              ))}
            </select>
          )}
        </div>
      }
    >
      {loading && !data ? (
        <Skeleton rows={5} />
      ) : !data ? (
        <Empty text={t('pickCompany', 'reports')} />
      ) : !data.steps.length ? (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('noSteps', 'reports')}{' '}
          <Link to={paths.recruiting.interviewSettings} className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">{t('setUpStatuses', 'reports')}</Link>
        </div>
      ) : data.applied === 0 ? (
        <Empty text={t('noApplicantsInRange', 'reports')} />
      ) : (
        <>
          <ol className="space-y-4">
            <li>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{t('applied', 'reports')}</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{data.applied}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-full rounded-full bg-slate-400 dark:bg-slate-500" />
              </div>
              <DropOffs counts={data.leftAfterApplying} />
            </li>
            {data.funnel.map((step) => (
              <li key={step.status}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium capitalize text-slate-900 dark:text-white">{step.status}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" title={t('pctOfPrevious', 'reports')}>
                      {pctText(step.pctOfPrevious)}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{step.reached}</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${step.reached ? Math.max(1, (step.reached / data.applied) * 100) : 0}%` }} />
                </div>
                <DropOffs counts={step.dropOffs} />
              </li>
            ))}
          </ol>
          {firstEmpty && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {t('emptyStepHint', 'reports', { status: firstEmpty.status })}
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('funnelExplain', 'reports')}</p>
        </>
      )}
    </Card>
  );
}

// ─── Selection ratio, time to fill, fill rate ──────────────────────────────

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

export function RecruitingRatios({ data, loading, days }: { data?: HiringReport | null; loading: boolean; days: number }) {
  const { t, locale } = useLocale();
  const lastStep = data?.steps[data.steps.length - 1] ?? '';
  const daysText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : t('daysValue', 'reports', { days: Math.round(v) }));
  const postedFmt = (iso: string) => new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card title={t('ratiosTitle', 'reports')} icon={<Percent className="size-4" />}>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : !data || !data.steps.length ? (
        <Empty text={t('pickCompany', 'reports')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile
              label={t('selectionRatio', 'reports')}
              value={pctText(data.selectionRatio.pct)}
              hint={t('selectionHint', 'reports', { hired: data.selectionRatio.hired, applied: data.selectionRatio.applied, status: lastStep })}
            />
            <Tile
              label={t('timeToFill', 'reports')}
              value={daysText(data.timeToFill?.median)}
              hint={data.timeToFill ? t('timeToFillHint', 'reports', { count: data.timeToFill.count }) : t('timeToFillNone', 'reports', { status: lastStep })}
            />
            <Tile
              label={t('fillRate', 'reports')}
              value={pctText(data.fillRate.pct)}
              hint={t('fillRateHint', 'reports', { filled: data.fillRate.filled, openings: data.fillRate.openings })}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('ratiosExplain', 'reports', { days, status: lastStep })}</p>
          {data.jobs.length > 0 && (
            <div className="-mx-5 -mb-5 mt-4 overflow-x-auto border-t border-slate-100 dark:border-slate-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-2.5 text-start">{t('jobsJob', 'home')}</th>
                    <th className="px-3 py-2.5 text-end">{t('posted', 'reports')}</th>
                    <th className="px-3 py-2.5 text-end">{t('applicants', 'reports')}</th>
                    <th className="px-3 py-2.5 text-end">{t('openings', 'reports')}</th>
                    <th className="px-3 py-2.5 text-end">{t('filled', 'reports')}</th>
                    <th className="px-3 py-2.5 text-end">{t('fillRate', 'reports')}</th>
                    <th className="px-5 py-2.5 text-end">{t('timeToFill', 'reports')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.slice(0, 15).map((j) => (
                    <tr key={j._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-5 py-2.5 text-slate-800 dark:text-slate-100">{toPlainString(j.title, locale) || '—'}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">{postedFmt(j.postedAt)}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{j.applicants}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{j.openings}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{j.filled}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{pctText(j.fillRate)}</td>
                      <td className="px-5 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{daysText(j.daysToFill)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Applications trend ────────────────────────────────────────────────────

export function ApplicationsTrend({ data, loading }: { data?: ReportsOverview['trend']; loading: boolean }) {
  const { t, locale } = useLocale();
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const change = data && data.previous > 0 ? Math.round(((data.current - data.previous) / data.previous) * 100) : null;

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', background: 'transparent' },
      colors: ['#E3302C'],
      dataLabels: { enabled: false },
      // monotone: smooth without overshooting below zero on sparse days
      stroke: { curve: 'monotoneCubic', width: 2 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
      grid: { borderColor: dark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
      xaxis: {
        type: 'category',
        categories: (data?.series ?? []).map((d) =>
          new Date(`${d.date}T00:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })
        ),
        tickAmount: 6,
        labels: { rotate: 0, style: { colors: dark ? '#94a3b8' : '#64748b', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => String(Math.round(v)), style: { colors: dark ? '#94a3b8' : '#64748b' } } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v) => t('trendTooltip', 'home', { count: v }) } },
      theme: { mode: dark ? 'dark' : 'light' },
    }),
    [data?.series, dark, locale, t]
  );

  return (
    <Card
      title={t('trendTitle', 'home')}
      icon={<TrendingUp className="size-4" />}
    >
      {loading && !data ? (
        <Skeleton rows={5} />
      ) : !data ? (
        <Empty text={t('noData', 'home')} />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{data.current}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('trendNewApplications', 'home', { days: data.days })}</span>
            {change !== null && (
              <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${change >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {t('trendChange', 'home', { change: `${change >= 0 ? '+' : ''}${change}%`, previous: data.previous })}
              </span>
            )}
          </div>
          <Suspense fallback={<div className="h-[220px]" />}>
            <Chart type="area" height={220} options={options} series={[{ name: t('trendSeries', 'home'), data: data.series.map((d) => d.count) }]} />
          </Suspense>
        </>
      )}
    </Card>
  );
}

// ─── Sources ───────────────────────────────────────────────────────────────

export function ApplicantSources({ data, loading, days }: { data?: ReportsOverview['sources']; loading: boolean; days: number }) {
  const { t } = useLocale();
  const items = data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => i.count));
  const label = (channel: string) => (channel === '__none' ? t('sourceUnknown', 'applicants') : formatSourceLabel(channel));

  return (
    <Card title={t('sourcesTitle', 'home')} icon={<Share2 className="size-4" />}>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : !data || data.total === 0 ? (
        <Empty text={t('noData', 'home')} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((item) => {
              const share = Math.round((item.count / data.total) * 100);
              return (
                <li key={item.channel}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">{label(item.channel)}</span>
                    <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                      {item.count} · {share}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('sourcesWindow', 'home', { days, total: data.total })}</p>
        </>
      )}
    </Card>
  );
}

// ─── Jobs pipeline ─────────────────────────────────────────────────────────

export function JobsPipeline({ data, loading, showCompany, companyName }: { data?: ReportsOverview['jobs']; loading: boolean; showCompany: boolean; companyName: (id: string) => string }) {
  const { t, locale } = useLocale();
  const timeAgo = useTimeAgo();
  const showOffered = (data ?? []).some((j) => j.offered !== null);
  return (
    <Card title={t('jobsTitle', 'home')} icon={<Briefcase className="size-4" />} action={<Link to={paths.jobs.root} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">{t('viewAll', 'home')}</Link>}>
      {loading && !data ? (
        <Skeleton rows={5} />
      ) : !data?.length ? (
        <Empty text={t('jobsEmpty', 'home')} />
      ) : (
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3 text-start">{t('jobsJob', 'home')}</th>
                <th className="px-3 py-3 text-end">{t('jobsNewThisWeek', 'home')}</th>
                <th className="px-3 py-3 text-end">{t('jobsTotal', 'home')}</th>
                <th className="px-3 py-3 text-end">{t('jobsInterviewed', 'home')}</th>
                {showOffered && <th className="px-3 py-3 text-end">{t('jobsOffered', 'home')}</th>}
                <th className="px-3 py-3 text-end">{t('jobsHired', 'home')}</th>
                <th className="px-5 py-3 text-end">{t('jobsLastApplication', 'home')}</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((job) => (
                <tr key={job._id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3">
                    <Link to={`${paths.applicants.root}?jobPositions=${job._id}`} className="font-medium text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                      {toPlainString(job.title, locale) || '—'}
                    </Link>
                    {showCompany && <span className="block text-xs text-slate-500 dark:text-slate-400">{companyName(job.companyId)}</span>}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums">
                    {job.newThisWeek > 0 ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{job.newThisWeek}</span> : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums text-slate-700 dark:text-slate-200">{job.total}</td>
                  <td className="px-3 py-3 text-end tabular-nums text-slate-700 dark:text-slate-200">{job.interviewed}</td>
                  {showOffered && <td className="px-3 py-3 text-end tabular-nums text-slate-700 dark:text-slate-200">{job.offered ?? '—'}</td>}
                  <td className="px-3 py-3 text-end tabular-nums text-slate-700 dark:text-slate-200">{job.hired}</td>
                  <td className="px-5 py-3 text-end whitespace-nowrap">
                    {job.stale ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" title={t('jobsStaleHint', 'home')}>
                        {job.lastApplicationAt ? timeAgo(job.lastApplicationAt) : t('jobsNoApplicants', 'home')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{job.lastApplicationAt ? timeAgo(job.lastApplicationAt) : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Hiring speed ──────────────────────────────────────────────────────────

export function HiringSpeed({ data, loading }: { data?: ReportsOverview['speed']; loading: boolean }) {
  const { t, locale } = useLocale();
  const steps = [
    { key: 'toInterview' as const, label: t('speedToInterview', 'home') },
    { key: 'toOffer' as const, label: t('speedToOffer', 'home') },
    { key: 'toHire' as const, label: t('speedToHire', 'home') },
  ].filter((s) => data && data.overall[s.key] !== undefined);
  const days = (v?: { median: number } | null) => (v ? t('speedDays', 'home', { days: Math.round(v.median) }) : '—');

  return (
    <Card title={t('speedTitle', 'home')} icon={<Timer className="size-4" />}>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : !data ? (
        <Empty text={t('noData', 'home')} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {steps.map((s) => {
              const v = data.overall[s.key];
              return (
                <div key={s.key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{days(v)}</p>
                  <p className="text-[11px] text-slate-400">{v ? t('speedBasedOn', 'home', { count: v.count }) : t('speedNoData', 'home')}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('speedWindow', 'home', { days: data.windowDays })}</p>
          {data.perJob.length > 0 && (
            <div className="-mx-5 mt-4 overflow-x-auto border-t border-slate-100 dark:border-slate-800">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-2.5 text-start">{t('jobsJob', 'home')}</th>
                    {steps.map((s) => <th key={s.key} className="px-3 py-2.5 text-end">{s.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.perJob.map((j) => (
                    <tr key={j._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-5 py-2.5 text-slate-800 dark:text-slate-100">{toPlainString(j.title, locale) || '—'}</td>
                      {steps.map((s) => <td key={s.key} className="px-3 py-2.5 text-end tabular-nums text-slate-600 dark:text-slate-300">{days(j[s.key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

