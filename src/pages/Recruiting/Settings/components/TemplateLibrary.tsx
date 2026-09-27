// Card grid shared by the offer and contract template tabs.
import type { ReactNode } from 'react';
import { Copy, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, IconButton } from '../../../../components/ui/kit';
import type { BadgeTone } from '../../../../components/ui/kit';

export function TemplateCard({
  title,
  badge,
  meta,
  canEdit,
  labels,
  onEdit,
  onClone,
  onDelete,
}: {
  title: ReactNode;
  badge: { tone: BadgeTone; label: ReactNode };
  meta: Array<{ icon: ReactNode; label: ReactNode } | false | null | undefined>;
  canEdit: boolean;
  labels: { edit: string; clone: string; delete: string };
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  const items = meta.filter(Boolean) as Array<{ icon: ReactNode; label: ReactNode }>;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        {canEdit && (
          <div className="-me-1.5 -mt-1 flex shrink-0">
            <IconButton label={labels.edit} onClick={onEdit}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label={labels.clone} onClick={onClone}>
              <Copy className="size-4" />
            </IconButton>
            <IconButton tone="danger" label={labels.delete} onClick={onDelete}>
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="shrink-0 text-slate-400">{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateGrid({
  isLoading,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyText,
  createLabel,
  onCreate,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyIcon: ReactNode;
  emptyTitle: ReactNode;
  emptyText?: ReactNode;
  createLabel?: ReactNode;
  onCreate?: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-800" />
        ))}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <Card>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          text={emptyText}
          action={
            onCreate && (
              <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={onCreate}>
                {createLabel}
              </Button>
            )
          }
        />
      </Card>
    );
  }
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
