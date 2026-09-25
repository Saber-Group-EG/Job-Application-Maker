import { useState } from 'react';
import { FileWarning, Loader2, Paperclip } from 'lucide-react';
import { mailService } from '../../services/mailService';
import { useLocale } from '../../context/LocaleContext';
import type { MailAttachment } from '../../types/mail';

const formatSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Files attached to an applicant's reply. Links are signed on click (they
// expire after a few minutes), so nothing downloadable sits in the page.
export default function MailAttachments({ mailId, attachments }: { mailId: string; attachments?: MailAttachment[] }) {
    const { t } = useLocale();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!attachments?.length) return null;

    const open = async (attachment: MailAttachment) => {
        setError(null);
        setLoadingId(attachment._id);
        // Opened before the request so popup blockers treat it as a click.
        const tab = window.open('about:blank', '_blank');
        if (tab) tab.opener = null;
        try {
            const url = await mailService.attachmentUrl(mailId, attachment._id);
            if (tab) tab.location.href = url;
            else window.location.href = url;
        } catch (e) {
            tab?.close();
            setError(e instanceof Error ? e.message : t('attachmentError', 'mailPreview'));
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('attachmentsCount', 'mailPreview', { count: attachments.length })}
            </p>
            <ul className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                    <li key={a._id}>
                        {a.key ? (
                            <button
                                type="button"
                                onClick={() => open(a)}
                                disabled={loadingId === a._id}
                                className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                title={a.filename}
                            >
                                {loadingId === a._id ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
                                <span className="truncate">{a.filename}</span>
                                <span className="shrink-0 text-slate-400">{formatSize(a.size)}</span>
                            </button>
                        ) : (
                            <span
                                className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-400 dark:border-slate-600"
                                title={t('attachmentTooLarge', 'mailPreview')}
                            >
                                <FileWarning className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{a.filename}</span>
                                <span className="shrink-0">{t('attachmentNotKept', 'mailPreview')}</span>
                            </span>
                        )}
                    </li>
                ))}
            </ul>
            {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}
        </div>
    );
}
