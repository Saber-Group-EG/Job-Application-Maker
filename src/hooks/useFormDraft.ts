// Keeps an unsaved form in localStorage so a refresh (or a closed modal)
// doesn't lose it. One draft per user per form key.
//
//   const draft = useFormDraft({
//     key: isEdit ? `job:edit:${id}` : 'job:new',
//     value: form,                 // must be JSON-serialisable (no File objects)
//     baseline: initialForm,       // value that counts as "nothing to save"
//     ready: !loading,             // wait until edit data has loaded
//     onRestore: (saved) => setForm(saved),
//   });
//   ...
//   <DraftBanner draft={draft} onDiscard={() => setForm(initialForm)} />
//   ...after a successful save: draft.clear();
//
// Never pass passwords or other secrets in `value`.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { read, remove, same, storageKey } from './formDraftStorage';

export { clearAllFormDrafts, pruneFormDrafts } from './formDraftStorage';

const SAVE_DELAY_MS = 500;

export type FormDraft = {
  /** When the restored draft was last saved, or null if nothing was restored. */
  restoredAt: number | null;
  /** Forget the draft (call after a successful save). Stops saving until the key changes. */
  clear: () => void;
  /** Forget the draft and hide the banner; the caller resets the form. */
  discard: () => void;
};

export function useFormDraft<T>({
  key,
  value,
  baseline,
  ready = true,
  enabled = true,
  isEmpty,
  onRestore,
}: {
  /** Unique per form and record, e.g. `offer:new:<applicantId>`. null disables. */
  key: string | null;
  value: T;
  /** The untouched form; a value equal to it is not saved. */
  baseline?: T;
  /** False until the form holds its starting data (edit forms: after loading). */
  ready?: boolean;
  enabled?: boolean;
  /** True when there's nothing worth keeping (checked in addition to baseline). */
  isEmpty?: (value: T) => boolean;
  onRestore: (saved: T) => void;
}): FormDraft {
  const { user } = useAuth();
  const userId = user?._id;
  const fullKey = enabled && key && userId ? storageKey(userId, key) : null;

  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  // Saving only starts after we've looked for a draft for this key.
  const checkedKey = useRef<string | null>(null);
  const suppressed = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;
  const nothingToKeep = (v: T) =>
    (baseline !== undefined && same(v, baseline)) || !!isEmptyRef.current?.(v);

  // Look for a saved draft once the form is ready.
  useEffect(() => {
    if (!fullKey || !ready || checkedKey.current === fullKey) return;
    checkedKey.current = fullKey;
    suppressed.current = false;
    const saved = read<T>(fullKey);
    if (saved && !nothingToKeep(saved.value)) {
      onRestoreRef.current(saved.value);
      setRestoredAt(saved.savedAt);
    } else {
      if (saved) remove(fullKey);
      setRestoredAt(null);
    }
    // baseline is read once at check time on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, ready]);

  // The latest change not yet written, written on a short delay — or at once
  // when the page is closing or the form goes away, so the last keystrokes
  // before a refresh/close aren't lost.
  const pending = useRef<{ key: string; value: T } | null>(null);
  const nothingToKeepRef = useRef(nothingToKeep);
  nothingToKeepRef.current = nothingToKeep;
  const flush = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    if (!p || suppressed.current) return;
    if (nothingToKeepRef.current(p.value)) {
      remove(p.key);
      return;
    }
    try {
      localStorage.setItem(p.key, JSON.stringify({ savedAt: Date.now(), value: p.value }));
    } catch {
      // storage full or blocked: drafts are best-effort
    }
  }, []);

  useEffect(() => {
    if (!fullKey || checkedKey.current !== fullKey || suppressed.current) return;
    pending.current = { key: fullKey, value };
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [fullKey, value, baseline, flush]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush(); // form closed or navigated away
    };
  }, [flush]);

  const clear = useCallback(() => {
    suppressed.current = true;
    pending.current = null;
    if (fullKey) remove(fullKey);
    setRestoredAt(null);
  }, [fullKey]);

  const discard = useCallback(() => {
    pending.current = null;
    if (fullKey) remove(fullKey);
    setRestoredAt(null);
  }, [fullKey]);

  return { restoredAt, clear, discard };
}
