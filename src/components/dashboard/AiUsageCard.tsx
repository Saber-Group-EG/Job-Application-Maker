// Where a company's AI credits went: spend per AI feature, spend per day and
// a table with calls, failures and tokens. Data: GET /dashboard/ai-usage.
// Shown on the homepage and the AI Features page.
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ApexOptions } from 'apexcharts';
import { Sparkles } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useAiUsageBreakdown } from '../../hooks/queries/useDashboard';
import type { AiUsageBreakdown, AiUsageRange } from '../../services/dashboardService';
import { Card, Empty, Skeleton } from '../reports/parts';

const Chart = lazy(() => import('react-apexcharts'));

const BRAND = '#E3302C';

// Feature names: the AI Features page titles, plus the two document writers
// that have no switch there.
const featureLabelKey = (feature: string) =>
  ['offerGenerator', 'contractGenerator'].includes(feature)
    ? { key: `aiUsage.feature.${feature}`, ns: 'home' }
    : { key: `aiFeatures.${feature}.title`, ns: 'settings' };

const formatUsd = (v: number) => {
  if (!v) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function eachDay(fromIso: string, toIso: string) {
  const out: string[] = [];
  const d = new Date(fromIso);
  d.setHours(0, 0, 0, 0);
  const end = new Date(toIso);
  while (d <= end && out.length < 120) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function AiUsageCard({
  companyId,
  title,
  planMeter,
  manageHref,
}: {
  companyId: string;
  title?: string;
  /** The plan's request meter, shown with the AI credit meter so the plan has one card. */
  planMeter?: ReactNode;
  /** Where the plan is managed ("Manage plan" link in the header). */
  manageHref?: string;
}) {
  const { t, locale } = useLocale();
  const [range, setRange] = useState<AiUsageRange>('cycle');
  const { data, isLoading, isError } = useAiUsageBreakdown(companyId, range);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const lc = locale === 'ar' ? 'ar-EG' : 'en-US';
  const num = (v: number) => Math.round(v).toLocaleString(lc);
  const label = (feature: string) => {
    const { key, ns } = featureLabelKey(feature);
    const out = t(key, ns);
    return out && out !== key ? out : feature;
  };

  const noAi = isError || (data && !data.enabled && data.totals.calls === 0);
  if (noAi && !planMeter) return null;

  const select =
    'h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

  return (
    <Card
      title={title || t(planMeter ? 'aiUsage.titleWithPlan' : 'aiUsage.title', 'home')}
      icon={<Sparkles className="size-4" />}
      info={noAi ? undefined : t('aiUsage.how', 'home').split('\n')}
      action={
        <div className="flex items-center gap-3">
          {!noAi && (
            <select className={select} value={range} onChange={(e) => setRange(e.target.value as AiUsageRange)} aria-label={t('aiUsage.range', 'home')}>
              <option value="cycle">{t('aiUsage.rangeCycle', 'home')}</option>
              <option value="30">{t('aiUsage.range30', 'home')}</option>
              <option value="90">{t('aiUsage.range90', 'home')}</option>
            </select>
          )}
          {manageHref && (
            <Link to={manageHref} className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {t('planManage', 'home')}
            </Link>
          )}
        </div>
      }
    >
      {noAi ? (
        planMeter
      ) : isLoading && !data ? (
        <Skeleton rows={5} />
      ) : !data ? (
        <Empty text={t('noData', 'home')} />
      ) : (
        <AiUsageBody data={data} dark={dark} lc={lc} num={num} label={label} planMeter={planMeter} />
      )}
    </Card>
  );
}

function AiUsageBody({
  data,
  dark,
  lc,
  num,
  label,
  planMeter,
}: {
  data: AiUsageBreakdown;
  dark: boolean;
  lc: string;
  num: (v: number) => string;
  label: (feature: string) => string;
  planMeter?: ReactNode;
}) {
  const { t } = useLocale();
  const axis = dark ? '#94a3b8' : '#64748b';
  const grid = dark ? '#1e293b' : '#f1f5f9';
  const total = data.totals.cost;
  const features = data.features;
  const share = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(lc, { month: 'short', day: 'numeric' });

  const days = useMemo(() => {
    const byDate = Object.fromEntries(data.days.map((d) => [d.date, d]));
    return eachDay(data.from, data.to).map((date) => byDate[date] ?? { date, cost: 0, calls: 0, features: {} });
  }, [data]);

  // Spend per feature: one bar each, biggest first.
  const featureOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
      colors: [BRAND],
      plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end', barHeight: '60%' } },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        offsetX: 6,
        style: { fontSize: '11px', fontWeight: 500, colors: [dark ? '#e2e8f0' : '#334155'] },
        formatter: (v: number) => `${formatUsd(v)} · ${share(v)}%`,
      },
      grid: { borderColor: grid, strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      xaxis: {
        categories: features.map((f) => label(f.feature)),
        labels: { formatter: (v: string) => formatUsd(Number(v)), style: { colors: axis, fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
        max: Math.max(...features.map((f) => f.cost), 0) * 1.35 || undefined,
      },
      yaxis: { labels: { maxWidth: 200, style: { colors: axis, fontSize: '12px' } } },
      tooltip: {
        theme: dark ? 'dark' : 'light',
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const f = features[dataPointIndex];
          if (!f) return '';
          const rows = [
            [t('aiUsage.colCost', 'home'), `${formatUsd(f.cost)} (${share(f.cost)}%)`],
            [t('aiUsage.colCalls', 'home'), num(f.calls)],
            [t('aiUsage.colAvg', 'home'), formatUsd(f.calls ? f.cost / f.calls : 0)],
            [t('aiUsage.colFailed', 'home'), num(f.failed)],
            [t('aiUsage.colTokens', 'home'), `${num(f.tokensIn)} / ${num(f.tokensOut)}`],
          ];
          return `<div style="padding:8px 10px;font-size:12px"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(label(f.feature))}</div>${rows
            .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:16px"><span style="opacity:.7">${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></div>`)
            .join('')}</div>`;
        },
      },
      theme: { mode: dark ? 'dark' : 'light' },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [features, dark, lc, total]
  );

  // Spend per day; the tooltip lists that day's features.
  const dayOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', background: 'transparent' },
      colors: [BRAND],
      plotOptions: { bar: { borderRadius: 3, borderRadiusApplication: 'end', columnWidth: days.length > 40 ? '80%' : '55%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: grid, strokeDashArray: 4 },
      xaxis: {
        type: 'category',
        categories: days.map((d) => shortDate(`${d.date}T00:00:00`)),
        tickAmount: Math.min(days.length, 8),
        labels: { rotate: 0, hideOverlappingLabels: true, style: { colors: axis, fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v: number) => formatUsd(v), style: { colors: axis, fontSize: '11px' } } },
      tooltip: {
        theme: dark ? 'dark' : 'light',
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const d = days[dataPointIndex];
          if (!d) return '';
          const parts = Object.entries(d.features).sort((a, b) => b[1] - a[1]);
          return `<div style="padding:8px 10px;font-size:12px;min-width:180px"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(
            new Date(`${d.date}T00:00:00`).toLocaleDateString(lc, { weekday: 'short', month: 'short', day: 'numeric' })
          )} · ${escapeHtml(formatUsd(d.cost))}</div>${
            parts.length
              ? parts
                  .map(([f, c]) => `<div style="display:flex;justify-content:space-between;gap:16px"><span style="opacity:.7">${escapeHtml(label(f))}</span><span>${escapeHtml(formatUsd(c))}</span></div>`)
                  .join('')
              : `<div style="opacity:.7">${escapeHtml(t('aiUsage.noneThatDay', 'home'))}</div>`
          }</div>`;
        },
      },
      theme: { mode: dark ? 'dark' : 'light' },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, dark, lc]
  );

  const cycle = data.cycle;
  const pct = cycle.limit > 0 ? Math.min(100, Math.round((cycle.used / cycle.limit) * 100)) : 0;
  const tone = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('aiUsage.spent', 'home')} value={formatUsd(total)} />
        <Stat label={t('aiUsage.calls', 'home')} value={num(data.totals.calls)} />
        <Stat label={t('aiUsage.failed', 'home')} value={num(data.totals.failed)} />
        <Stat label={t('aiUsage.features', 'home')} value={num(features.length)} />
      </div>

      {planMeter}

      {cycle.limit > 0 && (
        <div>
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {t('aiUsage.cycleUsed', 'home')}
              {cycle.end && <span className="text-slate-400"> · {t('aiUsage.resets', 'home', { date: shortDate(cycle.end) })}</span>}
            </span>
            <span className="tabular-nums text-slate-900 dark:text-white">
              {formatUsd(cycle.used)} <span className="text-slate-400">/ {formatUsd(cycle.limit)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('aiUsage.cycleUsed', 'home')}>
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {features.length === 0 ? (
        <Empty text={t('aiUsage.empty', 'home')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-900 dark:text-white">{t('aiUsage.byFeature', 'home')}</h3>
              <Suspense fallback={<Skeleton rows={4} />}>
                <Chart options={featureOptions} series={[{ name: t('aiUsage.colCost', 'home'), data: features.map((f) => Number(f.cost.toFixed(6))) }]} type="bar" height={Math.max(160, features.length * 40 + 40)} />
              </Suspense>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-900 dark:text-white">{t('aiUsage.byDay', 'home')}</h3>
              <Suspense fallback={<Skeleton rows={4} />}>
                <Chart options={dayOptions} series={[{ name: t('aiUsage.colCost', 'home'), data: days.map((d) => Number(d.cost.toFixed(6))) }]} type="bar" height={Math.max(200, features.length * 40 + 40)} />
              </Suspense>
            </div>
          </div>

          {/* The same numbers as a table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pe-3 text-start font-medium">{t('aiUsage.colFeature', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colCalls', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colFailed', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colTokens', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colAvg', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colCost', 'home')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('aiUsage.colShare', 'home')}</th>
                  <th className="ps-3 py-2 text-end font-medium">{t('aiUsage.colLastUsed', 'home')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {features.map((f) => (
                  <tr key={f.feature} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td className="py-2 pe-3 text-slate-900 dark:text-white">{label(f.feature)}</td>
                    <td className="px-3 py-2 text-end text-slate-700 dark:text-slate-300">{num(f.calls)}</td>
                    <td className="px-3 py-2 text-end text-slate-700 dark:text-slate-300">{num(f.failed)}</td>
                    <td className="px-3 py-2 text-end text-slate-700 dark:text-slate-300">{num(f.tokensIn + f.tokensOut)}</td>
                    <td className="px-3 py-2 text-end text-slate-700 dark:text-slate-300">{formatUsd(f.calls ? f.cost / f.calls : 0)}</td>
                    <td className="px-3 py-2 text-end font-medium text-slate-900 dark:text-white">{formatUsd(f.cost)}</td>
                    <td className="px-3 py-2 text-end text-slate-700 dark:text-slate-300">{share(f.cost)}%</td>
                    <td className="ps-3 py-2 text-end text-slate-500 dark:text-slate-400">{shortDate(f.lastUsedAt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-medium text-slate-900 dark:border-slate-700 dark:text-white">
                  <td className="py-2 pe-3">{t('aiUsage.total', 'home')}</td>
                  <td className="px-3 py-2 text-end">{num(data.totals.calls)}</td>
                  <td className="px-3 py-2 text-end">{num(data.totals.failed)}</td>
                  <td className="px-3 py-2 text-end">{num(features.reduce((s, f) => s + f.tokensIn + f.tokensOut, 0))}</td>
                  <td className="px-3 py-2 text-end">{formatUsd(data.totals.calls ? total / data.totals.calls : 0)}</td>
                  <td className="px-3 py-2 text-end">{formatUsd(total)}</td>
                  <td className="px-3 py-2 text-end">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
