import { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { useReplyToMail } from '../../hooks/queries/useMail';
import { useLocale } from '../../context/LocaleContext';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plain text -> simple HTML paragraphs (blank line = new paragraph).
const textToHtml = (text: string) =>
    text
        .trim()
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('');

type Props = {
    mailId: string;
    to: string;
    subject: string;
    onClose: () => void;
    onSent: () => void;
};

// Answers a received email; the backend sends it through the company's
// transport, threaded under the applicant's message.
export default function MailReplyBox({ mailId, to, subject, onClose, onSent }: Props) {
    const { t } = useLocale();
    const reply = useReplyToMail();
    const [body, setBody] = useState('');
    const [replySubject, setReplySubject] = useState(/^re:/i.test(subject) ? subject : `Re: ${subject}`);

    const send = () => {
        if (!body.trim()) return;
        reply.mutate(
            { mailId, payload: { html: textToHtml(body), subject: replySubject.trim() || undefined } },
            { onSuccess: onSent },
        );
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('replyTo', 'mailPreview', { email: to })}
                </p>
                <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700" aria-label={t('cancel', 'mailPreview')}>
                    <X className="h-4 w-4" />
                </button>
            </div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="reply-subject">
                {t('subject', 'mailPreview')}
            </label>
            <input
                id="reply-subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <label className="sr-only" htmlFor="reply-body">{t('replyBody', 'mailPreview')}</label>
            <textarea
                id="reply-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                autoFocus
                placeholder={t('replyPlaceholder', 'mailPreview')}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            {reply.isError && (
                <p className="mt-2 text-xs text-rose-600" role="alert">
                    {reply.error instanceof Error ? reply.error.message : t('replyFailed', 'mailPreview')}
                </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700">
                    {t('cancel', 'mailPreview')}
                </button>
                <button
                    type="button"
                    onClick={send}
                    disabled={!body.trim() || reply.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                >
                    {reply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('sendReply', 'mailPreview')}
                </button>
            </div>
        </div>
    );
}
