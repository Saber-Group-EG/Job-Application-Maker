import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { Modal } from '../ui/modal';
import Label from '../form/Label';
import TextArea from '../form/input/TextArea';
import { useLocale } from '../../context/LocaleContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import DraftBanner from '../common/DraftBanner';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  commentForm: any;
  setCommentForm: (v: any) => void;
  commentError: string;
  setCommentError: (v: string) => void;
  handleCommentSubmit: (e: React.FormEvent) => void;
  isSubmittingComment: boolean;
};

export default function CommentModal({
  isOpen,
  onClose,
  commentForm,
  setCommentForm,
  commentError,
  setCommentError,
  handleCommentSubmit,
  isSubmittingComment,
}: Props) {
  const { t } = useLocale();
  // The comment being written survives a refresh. The parent keeps the text
  // while the modal is closed and empties it after a successful add, which
  // also removes the draft. Only used on the applicant page (/:id).
  const { id: applicantId } = useParams<{ id: string }>();
  const draftValue = useMemo(() => ({ text: String(commentForm?.text ?? '') }), [commentForm?.text]);
  const draft = useFormDraft({
    key: applicantId ? `comment:${applicantId}` : null,
    value: draftValue,
    isEmpty: (v) => !v.text.trim(),
    onRestore: (saved) => setCommentForm({ text: saved.text || '' }),
  });
  // Once the text is gone (added, or erased) there's no restored draft to talk about.
  const hasRestored = !!draft.restoredAt;
  const { discard } = draft;
  useEffect(() => {
    if (hasRestored && !draftValue.text.trim()) discard();
  }, [hasRestored, draftValue.text, discard]);
  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setCommentError(''); }} className="max-w-2xl p-6" closeOnBackdrop={false}>
      <form onSubmit={handleCommentSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('addComment', 'modals')}</h2>

        <DraftBanner draft={draft} onDiscard={() => { setCommentForm({ text: '' }); setCommentError(''); }} />

        {commentError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start justify-between">
              <p className="text-sm text-red-600 dark:text-red-400"><strong>{t('error', 'modals')}</strong> {commentError}</p>
              <button type="button" onClick={() => setCommentError('')} className="ml-3 text-red-400 hover:text-red-600 dark:hover:text-red-300">✕</button>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="comment-text">{t('commentLabel', 'modals')}</Label>
          <TextArea value={commentForm.text} onChange={(value: any) => setCommentForm({ text: value })} placeholder={t('commentPlaceholder', 'modals')} rows={5} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-stroke px-6 py-2 hover:bg-slate-100 dark:border-strokedark dark:hover:bg-slate-800" disabled={isSubmittingComment}>{t('cancel', 'modals')}</button>
          <button type="submit" className="rounded-lg bg-slate-600 px-6 py-2 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" disabled={isSubmittingComment}>
            {isSubmittingComment ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t('adding', 'modals')}</span>
              </>
            ) : (
              <span>{t('addComment', 'modals')}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
