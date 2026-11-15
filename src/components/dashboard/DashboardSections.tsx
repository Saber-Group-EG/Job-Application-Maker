// Homepage sections under the status cards: what needs attention, recent
// activity and plan usage, from one request (GET /dashboard/overview). The
// charts and hiring reports live on the Reports page.
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  FileSignature,
  FileText,
  Gauge,
  Inbox,
  MessageSquare,
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
import { Card, Empty, Skeleton, useTimeAgo } from '../reports/parts';

// ─── Needs attention ───────────────────────────────────────────────────────

function NeedsAttention({ data, loading }: { data?: DashboardOverview['attention']; loading: boolean }) {
  const { t } = useLocale();
  const items = [
    { key: 'unseenApplicants', icon: <UserPlus className="size-4" />, label: t('attentionUnseen', 'home'), to: `${paths.applicants.root}?unseen=1` },
    { key: 'interviewsToday', icon: <CalendarClock className="size-4" />, label: t('attentionInterviewsToday', 'home'), to: '#my-interviews' },
    { key: 'unassignedReplies', icon: <Inbox className="size-4" />, label: t('attentionUnassigned', 'home'), to: `${paths.applicants.mailPreview}?folder=unassigned` },
    { key: 'offersAwaiting', icon: <FileText className="size-4" />, label: t('attentionOffers', 'home'), to: `${paths.jobs.offers}?offersPending=1` },
    // Hidden: this system has no contract signatures to wait for.
    // { key: 'contractsAwaiting', icon: <FileSignature className="size-4" />, label: t('attentionContracts', 'home'), to: paths.jobs.contracts },
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
  const { user, hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const { data, isLoading } = useDashboardOverview(companyIds, { enabled: Boolean(user) });
  const companyName = (id: string) => toPlainString(companies.find((c: any) => (c._id || c.id) === id)?.name, locale) || '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NeedsAttention data={data?.attention} loading={isLoading} />
        <RecentActivity data={data?.activity} loading={isLoading} />
      </div>
      {data?.planUsage && <PlanUsage data={data.planUsage} companyName={companyName} />}
      {hasPermission?.('Applicant Management', 'read') && (
        <Link
          to={paths.reports}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-brand-300"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="size-4 text-brand-600 dark:text-brand-400" />
            {t('seeAllReports', 'home')}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
