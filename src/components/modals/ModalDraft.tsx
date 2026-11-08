// Draft persistence for modals: render it inside the modal body (it only
// mounts while the modal is open). Each time the modal opens it looks for a
// saved draft, so a draft survives both a page refresh and closing the modal.
//
//   const draftRef = useRef<FormDraft | null>(null);
//   <ModalDraft
//     draftKey={`message:${id}`}
//     value={draftValue}               // memoised, JSON-serialisable
//     isEmpty={(v) => !v.body.trim()}
//     onRestore={(saved) => apply(saved)}
//     onDiscard={() => resetToStart()}
//     draftRef={draftRef}              // draftRef.current?.clear() after a successful send
//   />
//
// The restore waits one render after opening, so it lands after any
// "reset the form when the modal opens" effect in the modal or its parent.
import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import DraftBanner from '../common/DraftBanner';
import { useFormDraft } from '../../hooks/useFormDraft';
import type { FormDraft } from '../../hooks/useFormDraft';

export default function ModalDraft<T>({
  draftKey,
  value,
  baseline,
  isEmpty,
  onRestore,
  onDiscard,
  draftRef,
  className,
}: {
  /** null turns drafts off. */
  draftKey: string | null;
  value: T;
  baseline?: T;
  isEmpty?: (value: T) => boolean;
  onRestore: (saved: T) => void;
  onDiscard: () => void;
  /** Receives the draft handle; it stays set after the modal closes so a late clear() still works. */
  draftRef?: MutableRefObject<FormDraft | null>;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const draft = useFormDraft<T>({ key: draftKey, value, baseline, ready, isEmpty, onRestore });

  useEffect(() => {
    if (draftRef) draftRef.current = draft;
  }, [draft, draftRef]);

  return <DraftBanner draft={draft} onDiscard={onDiscard} className={className} />;
}
