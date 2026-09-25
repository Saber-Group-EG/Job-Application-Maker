// pages/promos/components/PromoUI.tsx
// Shared building blocks for the promo pages, in the dashboard's standard
// style (slate borders, white cards, text-sm controls) so every promo
// screen looks and behaves the same.
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useLocale } from '../../../context/LocaleContext';

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900';

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark] dark:disabled:bg-slate-800/60';

export const selectClass = `${inputClass} cursor-pointer pe-8`;

export const invalidClass =
  '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20';

// ─── Layout ──────────────────────────────────────────────────────────────────

export function PageShell({
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {back}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

// Card header row: optional title on the start side, controls on the end.
export function CardToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
      {children}
    </div>
  );
}

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </h2>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white shadow-sm hover:bg-brand-600',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger:
    'border border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-500/10',
  success:
    'border border-emerald-200 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  loading?: boolean;
}) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2';
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${BUTTON_VARIANTS[variant]} ${focusRing} ${className}`}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  tone = 'default',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  const tones = {
    default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
    danger: 'text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400',
    success: 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400',
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex size-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Data display ────────────────────────────────────────────────────────────

export type BadgeTone = 'green' | 'amber' | 'red' | 'slate' | 'blue';

const BADGE_TONES: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

// A promo code in monospace, optionally with a copy button.
export function CodeChip({
  code,
  copyable = false,
  size = 'md',
}: {
  code: string;
  copyable?: boolean;
  size?: 'md' | 'lg';
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (permissions / insecure context) */
    }
  };

  const text = size === 'lg' ? 'text-lg px-3 py-1.5' : 'text-xs px-2 py-1';
  return (
    <span className="inline-flex items-center gap-1">
      <span
        dir="ltr"
        className={`rounded-md border border-slate-200 bg-slate-50 font-mono font-semibold tracking-wide text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${text}`}
      >
        {code}
      </span>
      {copyable && (
        <IconButton
          label={copied ? t('codeCopied', 'promos') : t('copyCode', 'promos')}
          onClick={copy}
          tone={copied ? 'success' : 'default'}
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </IconButton>
      )}
      <span className="sr-only" role="status">
        {copied ? t('codeCopied', 'promos') : ''}
      </span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
          <bdi>{value}</bdi>
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

export function Table({
  children,
  minWidth = 720,
  busy,
}: {
  children: ReactNode;
  minWidth?: number;
  busy?: boolean;
}) {
  return (
    <div className="overflow-x-auto" aria-busy={busy || undefined}>
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = 'start' }: { children?: ReactNode; align?: 'start' | 'end' }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 ${
        align === 'end' ? 'text-end' : 'text-start'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'start',
  className = '',
}: {
  children?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-middle ${align === 'end' ? 'text-end' : ''} ${className}`}>
      {children}
    </td>
  );
}

export const rowClass =
  'border-t border-slate-100 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/40';

export function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-slate-100 dark:border-slate-800" aria-hidden="true">
          {Array.from({ length: cols }, (__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className={`h-4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800 ${
                  j === 0 ? 'w-28' : j === cols - 1 ? 'ms-auto w-14' : 'w-20'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  text,
  onRetry,
}: {
  title: ReactNode;
  text?: ReactNode;
  onRetry?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <div className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {onRetry && (
        <Button className="mt-5" icon={<RotateCcw className="size-4" />} onClick={onRetry}>
          {t('retry', 'promos')}
        </Button>
      )}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export function Pagination({
  page,
  totalPages,
  totalCount,
  onChange,
  busy,
}: {
  page: number;
  totalPages: number;
  totalCount?: number;
  onChange: (page: number) => void;
  busy?: boolean;
}) {
  const { t, locale } = useLocale();
  const isRtl = locale === 'ar';
  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
      aria-label={t('paginationLabel', 'promos')}
    >
      <span className="text-slate-500 dark:text-slate-400" aria-live="polite">
        {totalCount != null && `${t('resultsFound', 'promos', { count: totalCount })} · `}
        {t('pageOf', 'promos', { page, total: Math.max(totalPages, 1) })}
      </span>
      <div className="flex items-center gap-2">
        {busy && <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />}
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<Prev className="size-4" />}>
          {t('prevShort', 'promos')}
        </Button>
        <Button size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          {t('nextShort', 'promos')}
          <Next className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

// ─── Form controls ───────────────────────────────────────────────────────────

export function Field({
  label,
  htmlFor,
  hint,
  optional,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-slate-400">{t('optional', 'promos')}</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

// An input with a fixed unit on the end (e.g. "%" or "EGP").
export function AdornedInput({
  unit,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className="relative">
      <input {...rest} className={`${inputClass} pe-14 tabular-nums ${className}`} />
      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-slate-400">
        {unit}
      </span>
    </div>
  );
}

// Two-or-more option toggle (tabs, discount type).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  role = 'radiogroup',
}: {
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  role?: 'radiogroup' | 'tablist';
}) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={role === 'tablist' ? 'tab' : 'radio'}
            aria-checked={role === 'radiogroup' ? selected : undefined}
            aria-selected={role === 'tablist' ? selected : undefined}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${focusRing} ${
              selected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${focusRing} ${
        checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${
          checked ? 'start-[1.375rem]' : 'start-0.5'
        }`}
      />
    </button>
  );
}
