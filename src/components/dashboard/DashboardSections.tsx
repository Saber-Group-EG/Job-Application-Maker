// Homepage sections under the status cards: what needs attention, the
// applications trend, open jobs, recent activity, hiring speed and plan
// usage. Everything comes from one request (GET /dashboard/overview).
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ApexOptions } from 'apexcharts';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  FileSignature,
  FileText,
  Gauge,
  Inbox,
  MessageSquare,
  Timer,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useDashboardOverview } from '../../hooks/queries/useDashboard';
import type { DashboardOverview } from '../../services/dashboardService';
import { paths } from '../../router/Paths';
import { toPlainString } from '../../utils/strings';

const Chart = lazy(() => import('react-apexcharts'));

// ─── Building blocks ───────────────────────────────────────────────────────

function Card({ title, icon, action, children, className = '' }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <span className="text-brand-600 dark:text-brand-400">{icon}</span>
          {title}
        </h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{text}</p>
);

function useTimeAgo() {
  const { t, locale } = useLocale();
  return (iso: string) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('now', 'home');
    if (mins < 60) return t('minAgo', 'home', { mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? t('hourAgo', 'home', { hours }) : t('hoursAgo', 'home', { hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('yesterday', 'home');
    if (days < 7) return t('daysAgo', 'home', { days });
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };
}

// ─── Needs attention ───────────────────────────────────────────────────────

function NeedsAttention({ data, loading }: { data?: DashboardOverview['attention']; loading: boolean }) {
  const { t } = useLocale();
  const items = [
    { key: 'unseenApplicants', icon: <UserPlus className="size-4" />, label: t('attentionUnseen', 'home'), to: paths.applicants.root },
    { key: 'interviewsToday', icon: <CalendarClock className="size-4" />, label: t('attentionInterviewsToday', 'home'), to: '#my-interviews' },
    { key: 'unassignedReplies', icon: <Inbox className="size-4" />, label: t('attentionUnassigned', 'home'), to: `${paths.applicants.mailPreview}?folder=unassigned` },
    { key: 'offersAwaiting', icon: <FileText className="size-4" />, label: t('attentionOffers', 'home'), to: paths.jobs.offers },
    { key: 'contractsAwaiting', icon: <FileSignature className="size-4" />, label: t('attentionContracts', 'home'), to: paths.jobs.contracts },
  ].filter((item) => data?.[item.key as keyof typeof data] !== undefined);
  const allClear = items.length > 0 && items.every((item) => !data?.[item.key as keyof typeof data]);

  return (
    <Card title={t('attentionTitle', 'home')} icon={<AlertTriangle className="size-4" />}>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : allClear ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('attentionAllClear', 'home')}</p>
        </div>
      ) : (
        <ul className="-my-1 divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const count = data?.[item.key as keyof typeof data] ?? 0;
            const content = (
              <>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${count ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                <span className={`text-lg font-semibold tabular-nums ${count ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{count}</span>
              </>
            );
            return (
              <li key={item.key}>
                {item.to.startsWith('#') ? (
                  <a href={item.to} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">{content}</a>
                ) : (
                  <Link to={item.to} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">{content}</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ─── Applications trend ────────────────────────────────────────────────────

function ApplicationsTrend({ data, loading, days, onDaysChange }: { data?: DashboardOverview['trend']; loading: boolean; days: number; onDaysChange: (d: number) => void }) {
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
      className="lg:col-span-2"
      action={
        <div role="group" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDaysChange(d)}
              aria-pressed={days === d}
              className={`rounded-md px-2.5 py-1 transition ${days === d ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
            >
              {t('trendDays', 'home', { days: d })}
            </button>
          ))}
        </div>
      }
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

// ─── Jobs pipeline ─────────────────────────────────────────────────────────

function JobsPipeline({ data, loading, showCompany, companyName }: { data?: DashboardOverview['jobs']; loading: boolean; showCompany: boolean; companyName: (id: string) => string }) {
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

// ─── Recent activity ───────────────────────────────────────────────────────

function RecentActivity({ data, loading }: { data?: DashboardOverview['activity']; loading: boolean }) {
  const { t } = useLocale();
  const timeAgo = useTimeAgo();
  const icons = {
    status: <RefreshCw className="size-3.5" />,
    comment: <MessageSquare className="size-3.5" />,
    reply: <Inbox className="size-3.5" />,
    offer: <FileText className="size-3.5" />,
    contract: <FileSignature className="size-3.5" />,
  };
  const describe = (e: DashboardOverview['activity'][number]) => {
    const name = e.applicantName || t('activityUnknown', 'home');
    switch (e.type) {
      case 'status': return t('activityStatus', 'home', { name, status: e.status || '' });
      case 'comment': return t('activityComment', 'home', { name });
      case 'reply': return t('activityReply', 'home', { name });
      case 'offer': return e.status === 'accepted' ? t('activityOfferAccepted', 'home', { name }) : t('activityOfferRejected', 'home', { name });
      case 'contract': return t('activityContractSigned', 'home', { name });
      default: return name;
    }
  };
  const linkFor = (e: DashboardOverview['activity'][number]) =>
    e.type === 'reply' && !e.applicantId ? `${paths.applicants.mailPreview}?folder=unassigned` : e.applicantId ? paths.applicants.details(e.applicantId) : null;

  return (
    <Card title={t('activityTitle', 'home')} icon={<Activity className="size-4" />}>
      {loading && !data ? (
        <Skeleton rows={6} />
      ) : !data?.length ? (
        <Empty text={t('activityEmpty', 'home')} />
      ) : (
        <ol className="space-y-4">
          {data.slice(0, 12).map((e, i) => {
            const link = linkFor(e);
            const body = (
              <>
                <p className="text-sm text-slate-800 dark:text-slate-100">{describe(e)}</p>
                {e.text && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">“{e.text}”</p>}
                <p className="mt-0.5 text-xs text-slate-400">
                  {timeAgo(e.at)}
                  {e.userName ? ` · ${e.userName}` : ''}
                </p>
              </>
            );
            return (
              <li key={`${e.type}-${e.at}-${i}`} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{icons[e.type]}</span>
                <div className="min-w-0 flex-1">
                  {link ? <Link to={link} className="block hover:opacity-80">{body}</Link> : body}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

// ─── Hiring speed ──────────────────────────────────────────────────────────

function HiringSpeed({ data, loading }: { data?: DashboardOverview['speed']; loading: boolean }) {
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

// ─── Plan usage ────────────────────────────────────────────────────────────

function Meter({ label, used, limit, format }: { label: string; used: number; limit: number; format: (n: number) => string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-900 dark:text-white">
          {format(used)} <span className="text-slate-400">/ {format(limit)}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlanUsage({ data, companyName }: { data: NonNullable<DashboardOverview['planUsage']>; companyName: (id: string) => string }) {
  const { t, locale } = useLocale();
  const n = (v: number) => Math.round(v).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  const usd = (v: number) => `$${v.toFixed(2)}`;
  const shown = data.filter((c) => c.requests || c.ai);
  if (!shown.length) return null;
  return (
    <Card title={t('planTitle', 'home')} icon={<Gauge className="size-4" />} action={<Link to="/recruiting/subscription" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">{t('planManage', 'home')}</Link>}>
      <div className="space-y-5">
        {shown.map((c) => (
          <div key={c.companyId} className="space-y-3">
            {shown.length > 1 && <p className="text-sm font-medium text-slate-900 dark:text-white">{companyName(c.companyId)}</p>}
            {c.requests && (
              c.requests.unlimited
                ? <p className="text-sm text-slate-600 dark:text-slate-300">{t('planUnlimited', 'home')}</p>
                : <Meter label={t('planRequests', 'home', { plan: c.requests.planName || '' })} used={c.requests.used} limit={c.requests.limit} format={n} />
            )}
            {c.ai && <Meter label={t('planAi', 'home')} used={c.ai.used} limit={c.ai.limit} format={usd} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function DashboardSections({ companyIds, companies }: { companyIds?: string[]; companies: any[] }) {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useDashboardOverview(companyIds, days, { enabled: Boolean(user) });
  const { locale } = useLocale();
  const companyName = (id: string) => toPlainString(companies.find((c: any) => (c._id || c.id) === id)?.name, locale) || '';
  const showCompany = (companyIds?.length ?? 0) !== 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <NeedsAttention data={data?.attention} loading={isLoading} />
        <ApplicationsTrend data={data?.trend} loading={isLoading} days={days} onDaysChange={setDays} />
      </div>
      {data?.jobs !== null && (
        <JobsPipeline data={data?.jobs} loading={isLoading} showCompany={showCompany} companyName={companyName} />
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity data={data?.activity} loading={isLoading} />
        <div className="space-y-6">
          {data?.speed !== null && <HiringSpeed data={data?.speed} loading={isLoading} />}
          {data?.planUsage && <PlanUsage data={data.planUsage} companyName={companyName} />}
        </div>
      </div>
    </div>
  );
}
