// Apply a removal and offer Undo. Only the listed form keys are snapshotted,
// so undoing doesn't roll back edits made elsewhere in the form meanwhile.
//
//   const removeWithUndo = useRemoveWithUndo(setForm);
//   removeWithUndo(t('undoTermRemoved', 'common'), ['terms'], (prev) => ({ ...prev, terms: prev.terms.filter(...) }));
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useUndo } from '../context/UndoContext';

export function useRemoveWithUndo<F extends object>(setForm: Dispatch<SetStateAction<F>>) {
  const { offerUndo } = useUndo();
  return useCallback(
    <K extends keyof F>(message: string, keys: K[], update: (prev: F) => F) => {
      let saved: Pick<F, K> | null = null;
      setForm((prev) => {
        saved = keys.reduce((acc, k) => ({ ...acc, [k]: prev[k] }), {} as Pick<F, K>);
        return update(prev);
      });
      offerUndo(message, () => {
        const snapshot = saved;
        if (snapshot) setForm((prev) => ({ ...prev, ...snapshot }));
      });
    },
    [setForm, offerUndo]
  );
}
