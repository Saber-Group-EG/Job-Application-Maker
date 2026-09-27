// An English input with an optional Arabic twin and a translate button. The
// button fills the empty side: EN → AR when English is filled, otherwise
// AR → EN.
import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useLocale } from '../../../../context/LocaleContext';
import { translatePair } from './jobFormUtils';
import { focusRing, inputClass } from '../../../../components/ui/kit';

type Props = {
  label?: ReactNode;
  /** Shown instead of `label` above the Arabic input. */
  labelAr?: ReactNode;
  en: string;
  ar: string;
  onEn: (value: string) => void;
  onAr: (value: string) => void;
  bilingual: boolean;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  placeholderAr?: string;
  onEnter?: () => void;
  autoFocus?: boolean;
  size?: 'md' | 'sm';
  hint?: ReactNode;
};

export function TranslateButton({ en, ar, onEn, onAr }: { en: string; ar: string; onEn: (v: string) => void; onAr: (v: string) => void }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const label = en.trim() ? t('createTranslateEnAr', 'jobs') : t('createTranslateArEn', 'jobs');
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        try {
          await translatePair(en, ar, { en: onEn, ar: onAr });
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy || (!en.trim() && !ar.trim())}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 ${focusRing}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
      {t('createTranslate', 'jobs')}
    </button>
  );
}

export default function BilingualField({
  label,
  labelAr,
  en,
  ar,
  onEn,
  onAr,
  bilingual,
  multiline,
  rows = 4,
  required,
  placeholder,
  placeholderAr,
  onEnter,
  autoFocus,
  size = 'md',
  hint,
}: Props) {
  const id = useId();
  const sizing = size === 'sm' ? '!py-1.5 text-sm' : '';
  const onKeyDown = onEnter
    ? (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          onEnter();
        }
      }
    : undefined;

  const control = (lang: 'en' | 'ar') => {
    const common = {
      id: `${id}-${lang}`,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      value: lang === 'en' ? en : ar,
      required,
      placeholder: lang === 'en' ? placeholder : placeholderAr,
      autoFocus: lang === 'en' ? autoFocus : undefined,
      onKeyDown,
      className: `${inputClass} ${sizing} ${multiline ? 'resize-y' : ''}`,
    } as const;
    const onChange = (e: { target: { value: string } }) => (lang === 'en' ? onEn : onAr)(e.target.value);
    return multiline ? <textarea {...common} rows={rows} onChange={onChange} /> : <input {...common} onChange={onChange} />;
  };

  const labelCls = 'text-sm font-medium text-slate-700 dark:text-slate-300';

  if (!bilingual) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={`${id}-en`} className={`block ${labelCls}`}>
            {label}
          </label>
        )}
        {control('en')}
        {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    );
  }

  // Unlabelled pair (e.g. an option being added): keep both inputs aligned
  // and put the translate button beside the Arabic one.
  if (!label) {
    return (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {control('en')}
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">{control('ar')}</div>
          <TranslateButton en={en} ar={ar} onEn={onEn} onAr={onAr} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          {label && (
            <label htmlFor={`${id}-en`} className={`flex items-center gap-1.5 ${labelCls}`}>
              {label}
              <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">EN</span>
            </label>
          )}
          {control('en')}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${id}-ar`} className={`flex items-center gap-1.5 ${labelCls}`}>
              {labelAr ?? label}
              <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">AR</span>
            </label>
            <TranslateButton en={en} ar={ar} onEn={onEn} onAr={onAr} />
          </div>
          {control('ar')}
        </div>
      </div>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
