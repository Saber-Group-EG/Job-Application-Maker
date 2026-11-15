// Draws a custom report result (AI report builder / saved charts) in any of
// the views the data fits: table, bar, horizontal bar, line, area, pie,
// donut or a single number. The view switcher only offers views that make
// sense for the result's shape.
import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useLocale } from '../../context/LocaleContext';
import type { ChartView, CustomResult } from '../../services/reportsService';

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

function useFormatters(result: CustomResult) {
  const { t, locale } = useLocale();
  const lang = locale === 'ar' ? 'ar-EG' : 'en-US';
  const value = (v: number) => {
    if (result.unit === 'percent') return `${v}%`;
    if (result.unit === 'days') return t('daysValue', 'reports', { days: v });
    return Math.round(v).toLocaleString(lang);
  };
  const category = (c: string) => {
    if (!result.timeGrouped) return c;
    const g = result.spec.groupBy;
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

export function CustomChartBody({ result, view }: { result: CustomResult; view: ChartView }) {
  const { value, category, t } = useFormatters(result);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const shown = fitView(result, view);
  const cats = useMemo(() => result.categories.map(category), [result.categories, category]);

  const options: ApexOptions = useMemo(() => {
    const axis = { colors: dark ? '#94a3b8' : '#64748b', fontSize: '11px' };
    const base: ApexOptions = {
      chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit', background: 'transparent', stacked: false },
      colors: PALETTE,
      dataLabels: { enabled: false },
      legend: { show: result.series.length > 1 || shown === 'pie' || shown === 'donut', position: 'bottom', labels: { colors: axis.colors } },
      tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (v: number) => value(v) } },
      theme: { mode: dark ? 'dark' : 'light' },
    };
    if (shown === 'pie' || shown === 'donut') return { ...base, labels: cats };
    return {
      ...base,
      plotOptions: { bar: { horizontal: shown === 'hbar', borderRadius: 3, columnWidth: '60%', barHeight: '70%' } },
      stroke: shown === 'line' || shown === 'area' ? { curve: 'monotoneCubic', width: 2 } : { width: 0 },
      fill: shown === 'area' ? { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } } : {},
      grid: { borderColor: dark ? '#1e293b' : '#f1f5f9', strokeDashArray: 4 },
      xaxis: {
        categories: cats,
        labels: { style: axis, ...(shown === 'hbar' ? { formatter: (v: string) => value(Number(v)) } : { rotate: -30, trim: true, hideOverlappingLabels: true }) },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: axis.colors }, maxWidth: 200, ...(shown === 'hbar' ? {} : { formatter: (v: number) => value(v) }) } },
    };
  }, [shown, cats, dark, result.series.length, value]);

  if (!result.counted) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('noDataForChart', 'reports')}</p>;
  }
  if (shown === 'number') {
    return (
      <div className="py-6 text-center">
        <p className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{value(result.total)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.spec.title}</p>
      </div>
    );
  }
  if (shown === 'table') {
    const groupHeader = result.spec.groupBy === 'none' ? '' : t(`group_${result.spec.groupBy}`, 'reports');
    return (
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="px-5 py-2.5 text-start">{groupHeader}</th>
              {result.series.map((s) => (
                <th key={s.name} className="px-5 py-2.5 text-end">{result.series.length > 1 ? s.name : t(`measure_${result.spec.measure}`, 'reports')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={`${c}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-5 py-2 text-slate-800 dark:text-slate-100">{c}</td>
                {result.series.map((s) => (
                  <td key={s.name} className="px-5 py-2 text-end tabular-nums text-slate-600 dark:text-slate-300">{value(s.data[i] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const apexType = shown === 'hbar' ? 'bar' : shown;
  const series = shown === 'pie' || shown === 'donut' ? result.series[0]?.data ?? [] : result.series;
  const height = shown === 'hbar' ? Math.max(220, cats.length * 28 + 60) : 280;
  return (
    <Suspense fallback={<div style={{ height }} />}>
      <Chart key={shown} type={apexType as any} height={height} options={options} series={series as any} />
    </Suspense>
  );
}

// A card around a chart: title, view switcher, and the caller's buttons.
export function ChartCard({ title, result, view, onViewChange, actions, footer }: {
  title: ReactNode;
  result: CustomResult;
  view: ChartView;
  // Leave out to show the chart in a fixed view (saved charts).
  onViewChange?: (v: ChartView) => void;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <div className="min-w-0 text-base font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="flex flex-wrap items-center gap-2">
          {onViewChange && <ViewSwitcher result={result} view={fitView(result, view)} onChange={onViewChange} />}
          {actions}
        </div>
      </header>
      <div className="p-5">
        <CustomChartBody result={result} view={view} />
        {footer}
      </div>
    </section>
  );
}
