// "How is this calculated?" for AI-made and saved charts, written from the
// chart's own description (the spec the server ran), so it always matches the
// numbers and costs no AI credits.
import type { CustomResult } from '../../services/reportsService';
import { toPlainString } from '../../utils/strings';
import type { JobOption } from './CustomChart';

type T = (key: string, ns?: string, params?: Record<string, unknown>) => string;

const TIME = new Set(['day', 'week', 'month', 'quarter', 'year']);

export function describeChart(result: CustomResult, t: T, jobs: JobOption[], days: number, locale: string): string[] {
  const s = result.spec;
  const lines: string[] = [];
  const status = s.status || '';
  const r = (key: string, params?: Record<string, unknown>) => t(key, 'reports', params);

  // What is counted.
  lines.push(r(`how_m_${s.measure}`, { days, status }));
  if (s.measure === 'reachedStatus' || s.measure === 'conversion' || s.measure === 'avgDaysToStatus') lines.push(r('how_reachRule', { status }));

  // How it's broken down.
  const dimLine = (dim: string, key: 'how_g' | 'how_split') => {
    if (dim.startsWith('field:')) return r(`${key}_field`, { label: result.groupLabel && key === 'how_g' ? result.groupLabel : dim.slice(6).replace(/_/g, ' ') });
    if (TIME.has(dim)) return r(`${key}_time`, { unit: r(`unit_${dim}`) });
    return r(`${key}_${dim}`);
  };
  if (s.groupBy && s.groupBy !== 'none') lines.push(dimLine(s.groupBy, 'how_g'));
  if (s.splitBy) lines.push(dimLine(s.splitBy, 'how_split'));

  // Filters.
  const f = (s.filters || {}) as Record<string, string[] | undefined>;
  const jobName = (id: string) => toPlainString(jobs.find((j) => j._id === id)?.title, locale) || id;
  const depName = (id: string) => result.controlOptions?.department.find((d) => d.id === id)?.name || id;
  const parts: string[] = [];
  if (f.jobIds?.length) parts.push(r('how_f_jobs', { list: f.jobIds.map(jobName).join(', ') }));
  if (f.departmentIds?.length) parts.push(r('how_f_departments', { list: f.departmentIds.map(depName).join(', ') }));
  if (f.statuses?.length) parts.push(r('how_f_statuses', { list: f.statuses.join(', ') }));
  if (f.sources?.length) parts.push(r('how_f_sources', { list: f.sources.join(', ') }));
  if (f.genders?.length) parts.push(r('how_f_genders', { list: f.genders.join(', ') }));
  if (parts.length) lines.push(r('how_filters', { list: parts.join('; ') }));

  // How it's shown.
  if (s.cumulative) lines.push(r('how_cumulative'));
  if (s.stacked === 'percent' && result.series.length > 1) lines.push(r('how_stacked100'));
  const pie = s.view === 'pie' || s.view === 'donut';
  if ((s.labels === 'percent' || s.labels === 'both' || (pie && s.labels !== 'value')) && result.unit === 'count') lines.push(r('how_percentLabels'));
  if (!TIME.has(s.groupBy) && s.groupBy !== 'none' && s.groupBy !== 'weekday' && s.groupBy !== 'ageBand') {
    lines.push(s.groupOthers ? r('how_others', { n: s.limit ?? 15 }) : r('how_topN', { n: s.limit ?? 15 }));
  }
  if (result.series.length > 1 && s.splitBy) lines.push(r('how_maxSeries'));
  if (s.measure.startsWith('avg') || s.measure.startsWith('median')) lines.push(r('how_avgEmpty'));
  if (s.showTotal) lines.push(result.unit === 'count' && !s.cumulative ? r('how_totalRow') : r('how_overallRow'));
  return lines;
}
