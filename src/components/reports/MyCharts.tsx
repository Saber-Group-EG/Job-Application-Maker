// "My charts": the charts this user saved from Ask AI, for one company. Each
// one is re-run on every visit (no AI, no credits), so the numbers are live.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { IconButton } from '../ui/kit';
import { useMyReportWidgets, useReportWidgetMutations, useRunCustomChart } from '../../hooks/queries/useReports';
import type { ReportWidget } from '../../services/reportsService';
import { ChartCard } from './CustomChart';
import { Skeleton } from './parts';

function SavedChart({ widget, companyId, first, last, onMove }: {
  widget: ReportWidget;
  companyId: string;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t, locale } = useLocale();
  // The chart's data doesn't depend on how it's shown, so changing the view
  // doesn't reload it.
  const { view: _view, ...dataSpec } = widget.spec;
  const { data, isLoading, error } = useRunCustomChart(companyId, { ...dataSpec, view: 'table' }, locale);
  const { update, remove } = useReportWidgetMutations(companyId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(widget.title);

  const saveTitle = () => {
    setEditing(false);
    const next = title.trim();
    if (next && next !== widget.title) update.mutate({ id: widget._id, title: next });
    else setTitle(widget.title);
  };

  const titleNode = editing ? (
    <input
      value={title}
      autoFocus
      onChange={(e) => setTitle(e.target.value)}
      onBlur={saveTitle}
      onKeyDown={(e) => {
        if (e.key === 'Enter') saveTitle();
        if (e.key === 'Escape') {
          setTitle(widget.title);
          setEditing(false);
        }
      }}
      maxLength={120}
      aria-label={t('renameChart', 'reports')}
      className="w-full min-w-[200px] rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
    />
  ) : (
    <span>{widget.title}</span>
  );

  const actions = (
    <span className="flex items-center gap-1">
      <IconButton label={t('renameChart', 'reports')} onClick={() => setEditing(true)}><Pencil className="size-4" /></IconButton>
      <IconButton label={t('moveUp', 'reports')} onClick={() => onMove(-1)} disabled={first}><ArrowUp className="size-4" /></IconButton>
      <IconButton label={t('moveDown', 'reports')} onClick={() => onMove(1)} disabled={last}><ArrowDown className="size-4" /></IconButton>
      <IconButton tone="danger" label={t('removeChart', 'reports')} onClick={() => remove.mutate(widget._id)}><Trash2 className="size-4" /></IconButton>
    </span>
  );

  if (isLoading || !data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-base font-semibold text-slate-900 dark:text-white">{widget.title}</p>
        {error ? <p className="text-sm text-rose-600">{(error as Error).message}</p> : <Skeleton rows={4} />}
      </section>
    );
  }
  return (
    <ChartCard
      title={titleNode}
      result={data}
      view={widget.view}
      onViewChange={(v) => update.mutate({ id: widget._id, view: v })}
      actions={actions}
    />
  );
}

export default function MyCharts({ companyId }: { companyId: string | null }) {
  const { t } = useLocale();
  const { data: widgets = [] } = useMyReportWidgets(companyId);
  const { update } = useReportWidgetMutations(companyId);
  if (!companyId || !widgets.length) return null;

  // Swap positions with the neighbour (orders are renumbered to be safe).
  const move = (index: number, dir: -1 | 1) => {
    const other = index + dir;
    if (other < 0 || other >= widgets.length) return;
    const list = [...widgets];
    [list[index], list[other]] = [list[other], list[index]];
    list.forEach((w, i) => {
      if (w.order !== i) update.mutate({ id: w._id, order: i });
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('myCharts', 'reports')}</h2>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {widgets.map((w, i) => (
          <SavedChart key={w._id} widget={w} companyId={companyId} first={i === 0} last={i === widgets.length - 1} onMove={(dir) => move(i, dir)} />
        ))}
      </div>
    </div>
  );
}
