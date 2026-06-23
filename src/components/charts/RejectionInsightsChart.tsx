import { Suspense, lazy, useMemo, useCallback } from "react";
import type { ApexOptions } from "apexcharts";
import { useRejectionInsights } from "../../hooks/queries/useApplicants";
import { useLocale } from "../../context/LocaleContext";

const Chart = lazy(() => import("react-apexcharts"));

type RejectionInsightsChartProps = {
  companyId?: string[];
  maxReasons?: number;
  showPercentageLabels?: boolean;
};

const MAX_REASON_LENGTH = 34;
const DEFAULT_MAX_REASONS = 10;
const TRUNCATION_LIMIT = 31;

function formatReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) return "Unknown";
  return normalized.length > MAX_REASON_LENGTH 
    ? `${normalized.slice(0, TRUNCATION_LIMIT)}...` 
    : normalized;
}

function getReasonColor(index: number): string {
  const colors = ["#e42e2b", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"];
  return colors[index % colors.length];
}

export default function RejectionInsightsChart({ 
  companyId, 
  maxReasons = DEFAULT_MAX_REASONS,
  showPercentageLabels = false 
}: RejectionInsightsChartProps) {
  const { t, dir } = useLocale();
  const { data, isLoading, isFetching, error, refetch } = useRejectionInsights({ companyId });

  // Memoized data transformation
  const rows = useMemo(() => {
    const items = Array.isArray(data) ? data : (data as any)?.data ?? [];
    
    if (!items.length) return [];

    const normalizedReason = (reason: string) => reason.replace(/\s+/g, ' ').trim();

    const sorted = [...items]
      .map((item) => ({
        reason: normalizedReason(String(item.reason ?? "Unknown")) || "Unknown",
        count: Number(item.count ?? 0),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxReasons);

    return sorted;
  }, [data, maxReasons]);

  const totalRejected = useMemo(
    () => rows.reduce((sum, item) => sum + item.count, 0),
    [rows]
  );

  const topReason = rows[0];
  const topReasonShare = totalRejected > 0 && topReason 
    ? Math.round((topReason.count / totalRejected) * 100) 
    : 0;

  const chartHeight = useMemo(
    () => Math.max(330, Math.min(rows.length * 50, 600)),
    [rows.length]
  );

  // Format number with locale support
  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat().format(num);
  }, []);

  // ApexCharts options with fixed type issues
  const options: ApexOptions = useMemo(() => ({
    chart: {
      fontFamily: "Outfit, system-ui, -apple-system, sans-serif",
      type: "bar",
      height: chartHeight,
      toolbar: { 
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      animations: {
        enabled: true,
        speed: 650,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "65%",
        borderRadius: 8,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: rows.map((_, index) => getReasonColor(index)),
    dataLabels: {
      enabled: showPercentageLabels,
      formatter: function(val: number) {
        const percentage = totalRejected > 0 ? Math.round((val / totalRejected) * 100) : 0;
        return `${percentage}%`;
      },
      style: {
        fontSize: "11px",
        fontWeight: 500,
        colors: ["#1f2937"],
      },
      offsetX: 10,
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 4,
      position: "back",
      xaxis: {
        lines: { show: true },
      },
      yaxis: {
        lines: { show: false },
      },
      padding: {
        left: 0,
        right: 0,
      },
    },
    xaxis: {
      categories: rows.map((item) => formatReason(item.reason)),
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 500,
          colors: "#374151",
        },
        trim: true,
        maxHeight: 60,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      title: {
        text: t('xaxisTitle', 'rejection'),
        style: {
          fontSize: "12px",
          fontWeight: 500,
          color: "#6B7280",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 500,
          colors: "#374151",
        },
        maxWidth: 200,
        trim: true,
      },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: function(val: number) {
          return t('rejectedApplicant' + (val !== 1 ? '_plural' : ''), 'rejection', { count: formatNumber(val) });
        },
      },
      x: {
        formatter: function( opts?: any) {
          const category = rows[opts?.dataPointIndex]?.reason || "";
          return t('reasonPrefix', 'rejection', { reason: category });
        },
      },
      marker: {
        show: true,
      },
    },
    stroke: {
      width: 0,
    },
    fill: {
      opacity: 1,
      type: "solid",
    },
    legend: {
      show: false,
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 0.1,
        },
      },
    },
  }), [rows, chartHeight, showPercentageLabels, totalRejected, formatNumber]);

  const series = useMemo(() => [
    {
      name: t('seriesName', 'rejection'),
      data: rows.map((item) => item.count),
    },
  ], [rows]);

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="animate-pulse">
          <div className="h-7 w-48 bg-gray-200 rounded dark:bg-gray-700" />
          <div className="mt-2 h-4 w-96 bg-gray-200 rounded dark:bg-gray-700" />
          <div className="mt-6 grid gap-6 xl:grid-cols-[220px_1fr]">
            <div className="h-96 bg-gray-100 rounded-2xl dark:bg-gray-800" />
            <div className="h-96 bg-gray-100 rounded-2xl dark:bg-gray-800" />
          </div>
        </div>
      </section>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-800 dark:bg-red-900/10 sm:p-6">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            {t('loadError', 'rejection')}
          </h3>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error instanceof Error ? error.message : t('unexpectedError', 'rejection')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            {t('tryAgain', 'rejection')}
          </button>
        </div>
      </section>
    );
  }

  // Empty state
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t('noData', 'rejection')}
          </h3>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {t('noDataDesc', 'rejection')}
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('tip', 'rejection')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
      aria-label="Rejection reasons analytics"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t('title', 'rejection')}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {t('description', 'rejection')}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_1fr]" dir="ltr">
        {/* Sidebar with insights summary */}
        <div dir={dir} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-brand-50/50 p-5 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-brand-500/10">
          <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white/90 break-words">
            {topReason?.reason ?? t('noDataYet', 'rejection')}
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {topReason
                ? t('rejectionCount' + (topReason.count !== 1 ? '_plural' : ''), 'rejection', { count: formatNumber(topReason.count), share: topReasonShare })
                : t('waitingInsights', 'rejection')}
            </p>
          </div>

          {/* Top reasons list with improved UX */}
          <div className="mt-5">
            <div className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('topReasons', 'rejection', { count: Math.min(rows.length, 5) })}
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {rows.slice(0, 5).map((item, index) => {
                const share = totalRejected > 0 ? Math.round((item.count / totalRejected) * 100) : 0;
                return (
                  <div 
                    key={item.reason} 
                    className="group rounded-xl bg-white/80 p-3 shadow-sm transition-all hover:shadow-md dark:bg-gray-900/70"
                    style={{ borderLeft: `3px solid ${getReasonColor(index)}` }}
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 truncate font-medium text-gray-700 dark:text-gray-300">
                        <span className="text-xs text-gray-400">{index + 1}.</span>
                        <span className="truncate" title={item.reason}>
                          {formatReason(item.reason)}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">{share}%</span>
                        <span className="text-xs text-gray-400">
                          ({formatNumber(item.count)})
                        </span>
                      </div>
                    </div>
                    {/* Progress bar for visual representation */}
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${share}%`,
                          backgroundColor: getReasonColor(index)
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {rows.length > 5 && (
                <div className="rounded-xl bg-gray-100/50 p-3 text-center dark:bg-gray-800/50">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('moreReasons' + (rows.length - 5 !== 1 ? '_plural' : ''), 'rejection', { count: rows.length - 5 })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart container */}
        <div dir={dir} className="min-h-[330px] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900/50 sm:p-4">
          <div className={`${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            <Suspense 
              fallback={
                <div 
                  style={{ height: `${chartHeight}px` }} 
                  className="flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/60"
                >
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
                </div>
              }
            >
              <Chart 
                options={options} 
                series={series} 
                type="bar" 
                height={chartHeight}
                width="100%"
              />
            </Suspense>
          </div>
          
          {/* Refresh indicator */}
          {isFetching && !isLoading && (
            <div className="mt-2 text-right">
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <div className="h-2 w-2 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                {t('updating', 'rejection')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
