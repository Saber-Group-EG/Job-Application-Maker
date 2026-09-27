// Pieces shared by the job offer and contract pages.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Card, CardToolbar, IconButton, SectionTitle, focusRing } from '../ui/kit';

// PDF download with an EN / AR choice.
export function PdfDownloadButton({
  label,
  languageLabel,
  englishLabel,
  arabicLabel,
  onDownload,
}: {
  label: string;
  languageLabel: string;
  englishLabel: string;
  arabicLabel: string;
  onDownload: (lang: 'en' | 'ar') => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  const pick = async (lang: 'en' | 'ar') => {
    setOpen(false);
    setLoading(true);
    try {
      await onDownload(lang);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton label={label} aria-haspopup="menu" aria-expanded={open} disabled={loading} onClick={() => setOpen((v) => !v)}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      </IconButton>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-slate-400">{languageLabel}</p>
          {(['en', 'ar'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitem"
              onClick={() => pick(lang)}
              className={`flex w-full items-center rounded-lg px-2 py-1.5 text-start text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
            >
              {lang === 'en' ? englishLabel : arabicLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocCard({ icon, title, children }: { icon: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardToolbar>
        <SectionTitle icon={icon}>{title}</SectionTitle>
      </CardToolbar>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function DocTimeline({ events, locale }: { events: Array<{ label: string; date?: string | Date | null }>; locale: string }) {
  const items = events.filter((e) => e.date);
  return (
    <ol className="space-y-0">
      {items.map((event, idx) => (
        <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="relative flex flex-col items-center">
            <span className="mt-1.5 size-2 rounded-full bg-brand-500" />
            {idx !== items.length - 1 && <span className="absolute top-3.5 h-full w-px bg-slate-200 dark:bg-slate-700" />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{event.label}</p>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              {new Date(event.date!).toLocaleString(locale, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// Label / value pair for the overview card.
export function Meta({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}
