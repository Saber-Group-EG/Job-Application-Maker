// "How is this calculated?" ⓘ button for report cards. Opens a small panel
// listing, in plain words, how the card's numbers are worked out.
import { useEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';

export default function HowCalculated({ lines }: { lines: string[] }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shown = lines.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('howTitle', 'reports')}
        title={t('howTitle', 'reports')}
        className={`inline-flex size-8 items-center justify-center rounded-lg transition ${open ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
      >
        <Info className="size-4" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('howTitle', 'reports')}
          className="absolute end-0 top-9 z-30 w-80 max-w-[calc(100vw_-_2rem)] rounded-xl border border-slate-200 bg-white p-4 text-start shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('howTitle', 'reports')}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('close', 'reports')} className="rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <X className="size-4" />
            </button>
          </div>
          <ul className="list-disc space-y-1.5 ps-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {shown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Built-in cards keep their explanation as one translation, one line per point.
export const splitLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean);
