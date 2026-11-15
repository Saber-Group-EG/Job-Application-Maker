// Draws a custom report result (AI report builder / saved charts) in any of
// the views the data fits: table, bar, horizontal bar, line, area, pie,
// donut or a single number, with the display options the chart asked for
// (labels, stacking, colours, legend, total row) and any menus on the chart.
import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useLocale } from '../../context/LocaleContext';
import type { ChartControl, ChartView, CustomResult, CustomSpec } from '../../services/reportsService';
import { toPlainString } from '../../utils/strings';
import HowCalculated from './HowCalculated';
import { describeChart } from './describeChart';

const Chart = lazy(() => import('react-apexcharts'));

const PALETTE = ['#E3302C', '#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#0891B2', '#DB2777', '#64748B', '#84CC16'];

export const ALL_VIEWS: ChartView[] = ['table', 'bar', 'hbar', 'line', 'area', 'pie', 'donut', 'number'];

export function viewsFor(result: CustomResult): ChartView[] {
  const grouped = result.spec.groupBy !== 'none' && result.categories.length > 0;
  const single = result.series.length === 1;
  return ALL_VIEWS.filter((v) => {
    if (v === 'number') return !grouped;
    if (v === 'table') return true;
    if (!grouped) return false;
    if (v === 'line' || v === 'area') return result.timeGrouped;
    if (v === 'pie' || v === 'donut') return single && !result.timeGrouped && result.unit === 'count';
    return true;
  });
}

// A view that fits; falls back to the first that does.
export const fitView = (result: CustomResult, view: ChartView): ChartView => {
  const ok = viewsFor(result);
  return ok.includes(view) ? view : ok.find((v) => v !== 'number' && v !== 'table') ?? 'table';
};

// ─── Menus on the chart ─────────────────────────────────────────────────────

export type JobOption = { _id: string; title: string | { en?: string; ar?: string } };

const FILTER_KEY: Record<ChartControl, string> = {
  job: 'jobIds',
  source: 'sources',
  status: 'statuses',
  gender: 'genders',
  department: 'departmentIds',
};

export const controlsOf = (spec: CustomSpec): ChartControl[] => {
  const list = [...(spec.controls ?? [])];
  if (spec.jobFilter && !list.includes('job')) list.push('job');
  return list;
};

// The value a menu is set to (the filter's single value), or null for "All".
export const controlValue = (spec: CustomSpec, control: ChartControl): string | null => {
  const ids = (spec.filters?.[FILTER_KEY[control]] as string[] | undefined) ?? [];
  return ids.length === 1 ? ids[0] : null;
};
export const withControl = (spec: CustomSpec, control: ChartControl, value: string | null): CustomSpec => ({
  ...spec,
  filters: { ...(spec.filters || {}), [FILTER_KEY[control]]: value ? [value] : [] },
});
// Older saved charts used these two helpers for the Job menu.
export const chartJobId = (spec: CustomSpec) => controlValue(spec, 'job');
export const withJob = (spec: CustomSpec, jobId: string | null) => withControl(spec, 'job', jobId);

function ControlMenu({ control, spec, result, jobs, onChange }: {
  control: ChartControl;
  spec: CustomSpec;
  result: CustomResult;
  jobs: JobOption[];
  onChange: (value: string | null) => void;
}) {
  const { t, locale } = useLocale();
  const opts = result.controlOptions;
  const options: { value: string; label: string }[] =
    control === 'job'
      ? jobs.map((j) => ({ value: j._id, label: toPlainString(j.title, locale) || '—' }))
      : control === 'department'
        ? (opts?.department ?? []).map((d) => ({ value: d.id, label: d.name }))
        : control === 'gender'
          ? (opts?.gender ?? []).map((g) => ({ value: g, label: t(g.toLowerCase(), 'personalInfo') || g }))
          : ((control === 'source' ? opts?.source : opts?.status) ?? []).map((v) => ({ value: v, label: v }));
  if (!options.length) return null;
  return (
    <select
      value={controlValue(spec, control) ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={t(`group_${control}`, 'reports')}
      className="h-8 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <option value="">{t(`all_${control}`, 'reports')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function useFormatters(result: CustomResult) {
  const { t, locale } = useLocale();
  const lang = locale === 'ar' ? 'ar-EG' : 'en-US';
  const value = (v: number) => {
    if (result.unit === 'percent') return `${v}%`;
    if (result.unit === 'days') return t('daysValue', 'reports', { days: v });
    if (result.unit === 'score') return (Math.round(v * 10) / 10).toLocaleString(lang);
    return Math.round(v).toLocaleString(lang);
  };
  const category = (c: string) => {
    if (!result.timeGrouped) return c;
    const g = result.spec.groupBy;
    if (g !== 'month' && g !== 'week' && g !== 'day') return c; // quarter "2026-Q2", year "2026"
    const d = new Date(g === 'month' ? `${c}-01T00:00:00Z` : `${c}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return c;
    return g === 'month'
      ? d.toLocaleDateString(lang, { month: 'short', year: 'numeric', timeZone: 'UTC' })
      : d.toLocaleDateString(lang, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  return { value, category, t };
}

export function ViewSwitcher({ result, view, onChange }: { result: CustomResult; view: ChartView; onChange: (v: ChartView) => void }) {
  const { t } = useLocale();
  const views = viewsFor(result);
  return (
    <div role="group" aria-label={t('viewLabel', 'reports')} className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-md px-2.5 py-1 transition ${view === v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
        >
          {t(`view_${v}`, 'reports')}
        </button>
      ))}
    </div>
  );
}

// ─── The chart itself ───────────────────────────────────────────────────────

export function CustomChartBody({ result, view }: { result: CustomResult; view: ChartView }) {
  const { value, category, t } = useFormatters(result);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const shown = fitView(result, view);
  const cats = useMemo(() => result.categories.map(category), [result.categories, category]);
  const spec = result.spec;

  // Numbers on the chart. Pies and donuts show percentages unless asked for values;
  // percentages only make sense for counts.
  const isPie = shown === 'pie' || shown === 'donut';
  const asked = spec.labels ?? 'none';
  let labels = isPie ? (asked === 'value' || asked === 'both' ? asked : 'percent') : asked;
  if (result.unit !== 'count' && (labels === 'percent' || labels === 'both')) labels = 'value';
  const totals = result.series.map((s) => s.data.reduce((a, b) => a + (Number(b) || 0), 0));
  const pctOf = (seriesIndex: number, v: number) => {
    const total = totals[seriesIndex] || 0;
    return total ? Math.round((v / total) * 1000) / 10 : 0;
  };
  const labelText = (seriesIndex: number, v: number) => {
    if (labels === 'percent') return `${pctOf(seriesIndex, v)}%`;
    if (labels === 'both') return `${value(v)} (${pctOf(seriesIndex, v)}%)`;
    return value(v);
  };
  const isBar = shown === 'bar' || shown === 'hbar';
  const stacked = isBar && result.series.length > 1 ? spec.stacked ?? 'none' : 'none';
  const colors = spec.colors?.length ? [...spec.colors, ...PALETTE] : PALETTE;
  const legendWanted = spec.showLegend !== false;

  const options: ApexOptions = useMemo(() => {
    const axis = { colors: dark ? '#94a3b8' : '#64748b', fontSize: '11px' };
    const base: ApexOptions = {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'inherit',
        background: 'transparent',
        stacked: stacked !== 'none',
        ...(stacked === 'percent' ? { stackType: '100%' as const } : {}),
      },
      colors,
      dataLabels: {
        enabled: labels !== 'none',
        formatter: (_val: number, opts: any) => {
          const si = isPie ? 0 : opts.seriesIndex;
          const v = isPie ? opts.w.globals.series[opts.seriesIndex] : opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex];
          return labelText(si, Number(v) || 0);
        },
        style: { fontSize: '11px', fontWeight: 600 },
        dropShadow: { enabled: false },
        ...(isPie ? {} : { offsetY: shown === 'hbar' || stacked !== 'none' ? 0 : -6, style: { fontSize: '10px', colors: [stacked !== 'none' ? '#ffffff' : dark ? '#e2e8f0' : '#334155'] } }),
      },
      legend: {
        show: legendWanted && (result.series.length > 1 || isPie),
        position: 'bottom',
        labels: { colors: axis.colors },
      },
      tooltip: {
        theme: dark ? 'dark' : 'light',
        y: { formatter: (v: number, opts: any) => (result.unit === 'count' ? `${value(v)} (${pctOf(isPie ? 0 : opts?.seriesIndex ?? 0, v)}%)` : value(v)) },
      },
      theme: { mode: dark ? 'dark' : 'light' },
    };
    if (isPie) return { ...base, labels: cats };
    return {
      ...base,
      plotOptions: { bar: { horizontal: shown === 'hbar', borderRadius: stacked !== 'none' ? 0 : 3, columnWidth: '60%', barHeight: '70%', dataLabels: { position: shown === 'hbar' || stacked !== 'none' ? 'center' : 'top' } } },
      stroke: shown === 'line' || shown === 'area' ? { curve: 'monotoneCubic', width: 2 } : { width: 0 },
      fill: shown === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } } : {},
      grid: { borderColor: dark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
      xaxis: {
        categories: cats,
        labels: {
          style: axis,
          ...(shown === 'hbar'
            ? { formatter: (v: string) => (stacked === 'percent' ? `${Math.round(Number(v))}%` : value(Number(v))) }
            : { rotate: -30, trim: true, hideOverlappingLabels: true }),
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: axis.colors },
          maxWidth: 200,
          ...(shown === 'hbar' ? {} : { formatter: (v: number) => (stacked === 'percent' ? `${Math.round(v)}%` : value(v)) }),
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, cats, dark, result, labels, stacked, legendWanted, colors.join(',')]);

  if (!result.counted) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('noDataForChart', 'reports')}</p>;
  }
  if (shown === 'number') {
    return (
      <div className="py-6 text-center">
        <p className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{value(result.total)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{spec.title}</p>
      </div>
    );
  }
  if (shown === 'table') {
    const groupHeader = spec.groupBy === 'none' ? '' : result.groupLabel || t(`group_${spec.groupBy}`, 'reports');
    const withShare = labels === 'percent' || labels === 'both';
    const cellText = (si: number, v: number) => (withShare ? `${value(v)} (${pctOf(si, v)}%)` : value(v));
    return (
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="px-5 py-2.5 text-start">{groupHeader}</th>
              {result.series.map((s) => (
                <th key={s.name} className="px-5 py-2.5 text-end">{result.series.length > 1 ? s.name : t(`measure_${spec.measure}`, 'reports')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={`${c}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-2 text-slate-800 dark:text-slate-100">{c}</td>
                {result.series.map((s, si) => (
                  <td key={s.name} className="px-5 py-2 text-end tabular-nums text-slate-600 dark:text-slate-300">{cellText(si, s.data[i] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {spec.showTotal && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
                <td className="px-5 py-2 text-slate-900 dark:text-white">{result.unit === 'count' && !spec.cumulative ? t('total', 'reports') : t('overall', 'reports')}</td>
                {result.series.map((s, si) => (
                  <td key={s.name} className="px-5 py-2 text-end tabular-nums text-slate-900 dark:text-white">
                    {result.unit === 'count' && !spec.cumulative ? value(totals[si]) : si === 0 ? value(result.total) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  }
  const apexType = shown === 'hbar' ? 'bar' : shown;
  const series = isPie ? result.series[0]?.data ?? [] : result.series;
  const height = shown === 'hbar' ? Math.max(220, cats.length * 28 + 60) : 280;
  return (
    <Suspense fallback={<div style={{ height }} />}>
      <Chart key={`${shown}-${stacked}`} type={apexType as any} height={height} options={options} series={series as any} />
    </Suspense>
  );
}

// A card around a chart: title, menus, view switcher, and the caller's buttons.
export function ChartCard({ title, result, view, onViewChange, jobs, onControlChange, days, actions, footer }: {
  title: ReactNode;
  result: CustomResult;
  view: ChartView;
  // The page's date range, for the "How is this calculated?" note.
  days?: number;
  // Leave out to show the chart in a fixed view (saved charts).
  onViewChange?: (v: ChartView) => void;
  // Menus the user asked for on this chart (no AI involved when they change).
  jobs?: JobOption[];
  onControlChange?: (control: ChartControl, value: string | null) => void;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const { t, locale } = useLocale();
  const controls = onControlChange ? controlsOf(result.spec).filter((c) => c !== result.spec.groupBy) : [];
  const how = describeChart(result, t as any, jobs ?? [], days ?? 90, locale);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="min-w-0 text-base font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="flex flex-wrap items-center gap-2">
          {controls.map((c) => (
            <ControlMenu key={c} control={c} spec={result.spec} result={result} jobs={jobs ?? []} onChange={(v) => onControlChange!(c, v)} />
          ))}
          {onViewChange && <ViewSwitcher result={result} view={fitView(result, view)} onChange={onViewChange} />}
          {actions}
          <HowCalculated lines={how} />
        </div>
      </header>
      <div className="p-5">
        <CustomChartBody result={result} view={view} />
        {footer}
      </div>
    </section>
  );
}
