// Frame for a company-settings section. Embedded (inside the settings tabs)
// it's a card with the section's title, actions and stats; standalone it's a
// full page with the same content.
import type { ReactNode } from 'react';
import PageMeta from '../../../../components/common/PageMeta';
import { Card, CardToolbar, PageShell, SectionTitle } from '../../../../components/ui/kit';

export type SectionStat = { label: ReactNode; value: ReactNode; tone?: 'default' | 'success' };

export function StatStrip({ stats }: { stats: SectionStat[] }) {
  return (
    <div className={`grid grid-cols-2 gap-3 p-4 ${stats.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
      {stats.map((stat, i) => (
        <div key={i} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
          <p
            className={`mt-1 flex items-center gap-1.5 truncate text-sm font-semibold tabular-nums ${
              stat.tone === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function SettingsSection({
  embedded,
  metaTitle,
  metaDescription,
  icon,
  title,
  description,
  actions,
  stats,
  children,
}: {
  embedded?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: SectionStat[];
  children: ReactNode;
}) {
  if (!embedded) {
    return (
      <PageShell title={title} subtitle={description} actions={actions}>
        {metaTitle && <PageMeta title={metaTitle} description={metaDescription ?? ''} />}
        {stats && stats.length > 0 && (
          <Card>
            <StatStrip stats={stats} />
          </Card>
        )}
        {children}
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardToolbar>
          <div className="min-w-0">
            <SectionTitle icon={icon}>{title}</SectionTitle>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </CardToolbar>
        {stats && stats.length > 0 && <StatStrip stats={stats} />}
      </Card>
      {children}
    </div>
  );
}
