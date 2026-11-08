// A small "Removed · Undo" toast for reversible deletes inside forms.
//
//   const { offerUndo } = useUndo();
//   const removeTerm = (i: number) => {
//     const before = form;                       // snapshot
//     setForm(withoutTerm(form, i));
//     offerUndo(t('undoTermRemoved', 'common'), () => setForm(before));
//   };
//
// Prefer restoring a snapshot of the whole list/form over re-inserting by
// index, so the undo is exact even if other edits happened in between.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useLocale } from './LocaleContext';

type UndoToast = { id: number; message: string; undo: () => void };
type UndoContextType = { offerUndo: (message: string, undo: () => void) => void };

const UndoContext = createContext<UndoContextType | undefined>(undefined);
const DURATION_MS = 8000;

export function useUndo(): UndoContextType {
  const ctx = useContext(UndoContext);
  // Outside the provider (tests, isolated renders): deletes just aren't undoable.
  return ctx ?? { offerUndo: () => {} };
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [toast, setToast] = useState<UndoToast | null>(null);
  const [paused, setPaused] = useState(false);
  const nextId = useRef(1);

  const offerUndo = useCallback((message: string, undo: () => void) => {
    setToast({ id: nextId.current++, message, undo });
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const timer = window.setTimeout(() => setToast(null), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, paused]);

  // Ctrl/Cmd+Z undoes the last removal while its toast is up, unless the
  // user is typing in a field (where Ctrl+Z belongs to the text).
  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      toast.undo();
      setToast(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast]);

  return (
    <UndoContext.Provider value={{ offerUndo }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100001] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 py-2 pe-2 ps-4 text-sm text-white shadow-lg ring-1 ring-black/10 dark:bg-slate-100 dark:text-slate-900"
          >
            <span className="min-w-0 flex-1 truncate">{toast.message}</span>
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-amber-300 hover:bg-white/10 dark:text-amber-700 dark:hover:bg-slate-900/10"
            >
              <RotateCcw className="size-4" aria-hidden />
              {t('undo', 'common')}
            </button>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label={t('dismiss', 'common')}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white dark:text-slate-500 dark:hover:bg-slate-900/10 dark:hover:text-slate-900"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </UndoContext.Provider>
  );
}
