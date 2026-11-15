// Card, loading and empty-state pieces shared by the homepage sections and
// the Reports page, so both look the same.
import type { ReactNode } from 'react';
import { useLocale } from '../../context/LocaleContext';
import HowCalculated from './HowCalculated';

export function Card({ title, icon, action, info, children, className = '' }: { title: string; icon: ReactNode; action?: ReactNode; info?: string[]; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <span className="text-brand-600 dark:text-brand-400">{icon}</span>
          {title}
        </h2>
        {(action || info) && (
          <div className="flex flex-wrap items-center gap-2">
            {action}
            {info && <HowCalculated lines={info} />}
          </div>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export const Empty = ({ text }: { text: string }) => (
  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{text}</p>
);

export function useTimeAgo() {
  const { t, locale } = useLocale();
  return (iso: string) => {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('now', 'home');
    if (mins < 60) return t('minAgo', 'home', { mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? t('hourAgo', 'home', { hours }) : t('hoursAgo', 'home', { hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('yesterday', 'home');
    if (days < 7) return t('daysAgo', 'home', { days });
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };
}
