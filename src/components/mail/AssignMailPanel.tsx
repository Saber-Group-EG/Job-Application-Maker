import { useEffect, useState } from 'react';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { useAssignMail, useAssignSuggestions } from '../../hooks/queries/useMail';
import { useLocale } from '../../context/LocaleContext';
import type { MailAssignSuggestion } from '../../types/mail';

const jobTitle = (s: MailAssignSuggestion) => {
    const title = s.jobPositionId?.title;
    if (!title) return '';
    return typeof title === 'string' ? title : title.en || title.ar || '';
};

type Props = {
    mailId: string;
    onClose: () => void;
    onAssigned: () => void;
};

// Attaches a received email to one of the company's applicants. Before
// anything is typed it suggests applicants matching the sender.
export default function AssignMailPanel({ mailId, onClose, onAssigned }: Props) {
    const { t } = useLocale();
    const [term, setTerm] = useState('');
    const [debounced, setDebounced] = useState('');
    const assign = useAssignMail();

    useEffect(() => {
        const id = setTimeout(() => setDebounced(term.trim()), 300);
        return () => clearTimeout(id);
    }, [term]);

    const { data: suggestions = [], isFetching } = useAssignSuggestions(mailId, debounced, true);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('assignTitle', 'mailPreview')}</p>
                <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700" aria-label={t('cancel', 'mailPreview')}>
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    autoFocus
                    placeholder={t('assignSearchPlaceholder', 'mailPreview')}
                    aria-label={t('assignSearchPlaceholder', 'mailPreview')}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
            </div>
            {!debounced && suggestions.length > 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('assignSuggested', 'mailPreview')}</p>
            )}
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {suggestions.map((s) => (
                    <li key={s._id}>
                        <button
                            type="button"
                            disabled={assign.isPending}
                            onClick={() => assign.mutate({ mailId, applicantId: s._id }, { onSuccess: onAssigned })}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white disabled:opacity-60 dark:hover:bg-slate-900"
                        >
                            <UserPlus className="h-4 w-4 shrink-0 text-brand-600" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.fullName}</span>
                                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                    {s.email}{jobTitle(s) ? ` · ${jobTitle(s)}` : ''}
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
            {!isFetching && suggestions.length === 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {debounced ? t('assignNoResults', 'mailPreview') : t('assignTypeToSearch', 'mailPreview')}
                </p>
            )}
            {assign.isError && (
                <p className="mt-2 text-xs text-rose-600" role="alert">
                    {assign.error instanceof Error ? assign.error.message : t('assignFailed', 'mailPreview')}
                </p>
            )}
        </div>
    );
}
