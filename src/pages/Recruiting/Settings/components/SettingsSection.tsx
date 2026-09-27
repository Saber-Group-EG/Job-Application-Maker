// Frame for a company-settings section. Embedded (inside the settings tabs)
// it's a card with the section's title, actions and stats; standalone it's a
// full page with the same content.
import type { ReactNode } from 'react';
import PageMeta from '../../../../components/common/PageMeta';
import { Card, CardToolbar, PageShell, SectionTitle, StatStrip } from '../../../../components/ui/kit';
import type { StatItem } from '../../../../components/ui/kit';

export type SectionStat = StatItem;

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
