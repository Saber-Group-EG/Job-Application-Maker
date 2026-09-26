import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Clock3,
    Mail,
    Search,
    Inbox,
    Star,
    Filter,
    CheckCircle2,
    AlertCircle,
    Eye,
    MousePointerClick,
    XCircle,
    ArrowLeft,
    Reply,
    Send,
    UserX,
    UserPlus,
    Trash2,
    Paperclip,
    Loader2,
    Maximize2,
    type LucideIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';
import PageMeta from '../../../components/common/PageMeta';
import MailAttachments from '../../../components/mail/MailAttachments';
import MailBody from '../../../components/mail/MailBody';
import { Modal } from '../../../components/ui/modal';
import MailReplyBox from '../../../components/mail/MailReplyBox';
import AssignMailPanel from '../../../components/mail/AssignMailPanel';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import {
    useApplicantMails,
    useDeleteMail,
    useMailCounts,
    useMailDetail,
    useMailList,
    mailKeys,
    MAIL_LIST_STALE_MS,
} from '../../../hooks/queries/useMail';
import { mailService } from '../../../services/mailService';
import type { MailDirection, MailListParams, MailRecord, MailStatusKey } from '../../../types/mail';

type TFn = (key: string, ns?: string, params?: Record<string, string | number>) => string;

type Folder = 'all' | 'inbound' | 'outbound' | 'unassigned' | 'marked';

type MailEventType = 'queued' | 'provider_accepted' | 'delivered' | 'open' | 'click' | 'bounce' | 'complaint' | 'received';

type MailEvent = { id: string; type: MailEventType; at: string; detail: string };

type UiMailRecord = {
    id: string;
    applicantId: string | null;
    applicantName: string;
    applicantEmail: string;
    jobTitle: string | null;
    direction: MailDirection;
    unassigned: boolean;
    status: MailStatusKey;
    createdAt: string;
    subject: string;
    preview: string;
    bodyHtml: string;
    attachments: MailRecord['attachments'];
    events: MailEvent[];
    raw: MailRecord;
};

// Filter chips (delivery outcomes of sent mail).
const STATUS_OPTIONS: Array<{ key: MailStatusKey; label: string; icon: LucideIcon }> = [
    { key: 'delivery_delayed', label: 'statusDelayed', icon: AlertCircle },
    { key: 'delivered', label: 'statusDelivered', icon: CheckCircle2 },
    { key: 'opened', label: 'statusOpened', icon: Eye },
    { key: 'clicked', label: 'statusClicked', icon: MousePointerClick },
    { key: 'bounced', label: 'statusBounced', icon: XCircle },
    { key: 'failed', label: 'statusFailed', icon: AlertCircle },
];

const STATUS_LABEL_KEYS: Record<MailStatusKey, string> = {
    sent: 'statusSent',
    delivery_delayed: 'statusDelayed',
    delivered: 'statusDelivered',
    opened: 'statusOpened',
    clicked: 'statusClicked',
    bounced: 'statusBounced',
    failed: 'statusFailed',
    received: 'statusReceived',
};

const statusChipClasses: Record<MailStatusKey, { bg: string; text: string; dot: string }> = {
    sent: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
    delivery_delayed: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
    opened: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
    clicked: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
    bounced: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
    received: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_STORAGE_KEY = 'mailPreview.pageSize';

// The viewer's page size, remembered per browser.
const readStoredPageSize = () => {
    try {
        const n = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
        return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
    } catch {
        return DEFAULT_PAGE_SIZE;
    }
};

const formatDateTime = (value: string, locale?: string) =>
    new Date(value).toLocaleString(locale, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatRelativeTime = (value: string, t: TFn) => {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('justNow', 'mailPreview');
    if (diffMins < 60) return t('minsAgo', 'mailPreview', { mins: diffMins });
    if (diffHours < 24) return t('hoursAgo', 'mailPreview', { hours: diffHours });
    return t('daysAgo', 'mailPreview', { days: diffDays });
};

const HTML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

// Plain-text preview: drop tags, then decode the common entities so a quoted
// "<hr@company.com>" doesn't show as "&lt;hr@company.com&gt;".
const stripHtml = (html: string) =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => HTML_ENTITIES[e])
        .replace(/\s+/g, ' ')
        .trim();

const isInvalidNameToken = (value: string) => /^(undefined|null|unknown|n\/a|na)$/i.test(value.trim());

// Sent mail usually opens with "Dear <name>".
const getNameFromHtml = (html: string) => {
    const parsed = html.match(/Dear\s+([^,<]+)[,:]?/i)?.[1]?.trim() || '';
    return parsed && !isInvalidNameToken(parsed) ? parsed : '';
};

const getNameFromEmail = (email: string) => {
    const normalized = (email.split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
    return normalized && !isInvalidNameToken(normalized) ? normalized : '';
};

const localized = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
        const v = value as { en?: string; ar?: string };
        return (v.en || v.ar || '').trim();
    }
    return '';
};

const refId = (value: MailRecord['applicant'] | MailRecord['jobPosition']): string | null =>
    typeof value === 'string' ? value : value?._id ?? null;

const resolveStatus = (mail: MailRecord): MailStatusKey => {
    if (mail.direction === 'inbound') return 'received';
    switch (String(mail.status || '').toLowerCase()) {
        case 'delivery_delayed':
            return 'delivery_delayed';
        case 'delivered':
            return 'delivered';
        case 'opened':
            return 'opened';
        case 'clicked':
            return 'clicked';
        case 'bounced':
            return 'bounced';
        case 'failed':
        case 'complained':
            return 'failed';
        default:
            // Sent, and nothing more is known — not evidence of a delay.
            return 'sent';
    }
};

const buildEvents = (mail: MailRecord, t: TFn): MailEvent[] => {
    if (mail.direction === 'inbound') {
        return [{ id: `${mail._id}-r`, type: 'received', at: mail.receivedAt || mail.createdAt, detail: t('eventReceived', 'mailPreview') }];
    }
    const events: MailEvent[] = [
        { id: `${mail._id}-q`, type: 'queued', at: mail.createdAt, detail: t('eventQueued', 'mailPreview') },
        { id: `${mail._id}-a`, type: 'provider_accepted', at: mail.updatedAt, detail: t('eventProviderAccepted', 'mailPreview') },
    ];
    if (mail.deliveredAt) events.push({ id: `${mail._id}-d`, type: 'delivered', at: mail.deliveredAt, detail: t('eventDelivered', 'mailPreview') });
    if (mail.openedAt) events.push({ id: `${mail._id}-o`, type: 'open', at: mail.openedAt, detail: t('eventOpened', 'mailPreview') });
    if (mail.clickedAt) events.push({ id: `${mail._id}-c`, type: 'click', at: mail.clickedAt, detail: t('eventClicked', 'mailPreview') });
    if (mail.bouncedAt) events.push({ id: `${mail._id}-b`, type: 'bounce', at: mail.bouncedAt, detail: t('eventBounced', 'mailPreview') });
    if (mail.complainedAt) events.push({ id: `${mail._id}-cp`, type: 'complaint', at: mail.complainedAt, detail: t('eventComplaint', 'mailPreview') });
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

const toUiRecord = (mail: MailRecord, t: TFn): UiMailRecord => {
    const direction: MailDirection = mail.direction === 'inbound' ? 'inbound' : 'outbound';
    // The applicant is the recipient of sent mail and the sender of a reply.
    const applicantEmail = direction === 'inbound' ? mail.from : mail.to;
    const applicant = typeof mail.applicant === 'object' ? mail.applicant : null;
    // A reply quotes our email, so its body can't be trusted for the name.
    const applicantName =
        applicant?.fullName?.trim() ||
        (direction === 'outbound' ? getNameFromHtml(mail.html) : '') ||
        getNameFromEmail(applicantEmail) ||
        t('unknownApplicant', 'mailPreview');
    const job = typeof mail.jobPosition === 'object' ? mail.jobPosition : null;
    return {
        id: mail._id,
        applicantId: refId(mail.applicant),
        applicantName,
        applicantEmail,
        jobTitle: localized(job?.title) || null,
        direction,
        unassigned: direction === 'inbound' && !mail.applicant,
        status: resolveStatus(mail),
        createdAt: direction === 'inbound' ? mail.receivedAt || mail.createdAt : mail.createdAt,
        subject: mail.subject,
        preview: stripHtml(mail.html).slice(0, 100),
        bodyHtml: mail.html,
        attachments: mail.attachments,
        events: buildEvents(mail, t),
        raw: mail,
    };
};

const SidebarNavItem = ({ icon: Icon, label, count, loading, active, onClick }: { icon: LucideIcon; label: string; count?: number; loading?: boolean; active?: boolean; onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
        role="tab"
        aria-selected={active}
        tabIndex={active ? 0 : -1}
    >
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
        </div>
        {loading && <span className="h-4 w-7 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true" />}
        {!loading && count !== undefined && count > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-brand-200 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {count}
            </span>
        )}
    </button>
);

// Placeholder rows shaped like the real list, shown while a page loads.
const MailListSkeleton = ({ rows = DEFAULT_PAGE_SIZE }: { rows?: number }) => (
    <>
        {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-6 py-4" aria-hidden="true">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="h-2.5 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        ))}
    </>
);

const FOLDER_PARAMS: Record<Folder, Partial<MailListParams>> = {
    all: {},
    inbound: { direction: 'inbound' },
    outbound: { direction: 'outbound' },
    unassigned: { unassigned: true },
    marked: { marked: true },
};

export default function MailPreview() {
    const { t, locale } = useLocale();

    const [view, setView] = useState<'list' | 'detail'>('list');
    // The opened mail. Kept as a snapshot so it survives paging/refetches;
    // refreshed from the latest list/conversation data when present.
    const [selected, setSelected] = useState<MailRecord | null>(null);
    const [panel, setPanel] = useState<'none' | 'reply' | 'assign'>('none');
    const [notice, setNotice] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const { selectedCompanyId } = useCompanyFilter();
    const companyId = selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : undefined;
    const [folder, setFolder] = useState<Folder>('all');
    const [statusFilter, setStatusFilter] = useState<Set<MailStatusKey>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [mailPage, setMailPage] = useState(1);
    const [pageSize, setPageSize] = useState(readStoredPageSize);

    const changePageSize = (size: number) => {
        setPageSize(size);
        setMailPage(1);
        try {
            localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
        } catch {
            /* storage unavailable: the choice lasts for this visit */
        }
    };

    // Filters reset to page 1 in the same update that changes them, so the
    // old page number is never requested for the new filter.
    useEffect(() => {
        const next = searchTerm.trim();
        if (next === debouncedSearch) return;
        const id = setTimeout(() => {
            setDebouncedSearch(next);
            setMailPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchTerm, debouncedSearch]);

    const [pagedCompanyId, setPagedCompanyId] = useState(companyId);
    if (pagedCompanyId !== companyId) {
        setPagedCompanyId(companyId);
        setMailPage(1);
    }

    const listParams = useMemo<MailListParams>(() => ({
        page: mailPage,
        limit: pageSize,
        companyId,
        ...FOLDER_PARAMS[folder],
        status: [...statusFilter],
        q: debouncedSearch || undefined,
    }), [mailPage, pageSize, companyId, folder, statusFilter, debouncedSearch]);

    const { data: listResponse, isLoading, isFetching, isPlaceholderData } = useMailList(listParams);
    const { data: counts, isLoading: isCountsLoading } = useMailCounts({ companyId });
    // Showing the previous page/folder while the requested one loads.
    const isSwitching = isFetching && isPlaceholderData;
    const queryClient = useQueryClient();
    const deleteMail = useDeleteMail();

    const mails = useMemo(() => (listResponse?.data || []).map((m) => toUiRecord(m, t)), [listResponse, t]);
    const totalMailPages = listResponse?.totalPages ?? 1;

    useEffect(() => {
        if (!isPlaceholderData && mailPage > totalMailPages) setMailPage(totalMailPages);
    }, [mailPage, totalMailPages, isPlaceholderData]);

    // Stay one page ahead: on page N, page N+1 loads in the background, so
    // "Next" is instant and only N+2 is fetched when you get there. Pages
    // already loaded aren't requested again while fresh (MAIL_LIST_STALE_MS).
    useEffect(() => {
        if (isPlaceholderData || mailPage >= totalMailPages) return;
        const nextParams = { ...listParams, page: mailPage + 1 };
        queryClient.prefetchQuery({
            queryKey: mailKeys.list(nextParams),
            queryFn: () => mailService.list(nextParams),
            staleTime: MAIL_LIST_STALE_MS,
        });
    }, [queryClient, listParams, mailPage, totalMailPages, isPlaceholderData]);

    const selectedApplicantId = selected ? refId(selected.applicant) : null;
    const { data: conversationData = [], isLoading: isConversationLoading } = useApplicantMails(view === 'detail' ? selectedApplicantId ?? undefined : undefined);
    const { data: rawDetail, isFetching: isRawLoading } = useMailDetail(selected?._id, showRaw);

    const selectedMail = useMemo(() => {
        if (!selected) return null;
        const fresh =
            listResponse?.data.find((m) => m._id === selected._id) ||
            conversationData.find((m) => m._id === selected._id) ||
            selected;
        return toUiRecord(fresh, t);
    }, [selected, listResponse, conversationData, t]);

    const conversation = useMemo(
        () => conversationData
            .map((m) => toUiRecord(m, t))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        [conversationData, t],
    );

    const openMail = (mail: MailRecord) => {
        setSelected(mail);
        setPanel('none');
        setNotice(null);
        setShowRaw(false);
        setExpanded(false);
        setView('detail');
    };

    const handleBackToList = () => {
        setView('list');
        setSelected(null);
        setPanel('none');
        setNotice(null);
    };

    const selectFolder = (next: Folder) => {
        setFolder(next);
        setStatusFilter(new Set());
        setMailPage(1);
    };

    const handleDelete = async () => {
        if (!selectedMail) return;
        const result = await Swal.fire({
            title: t('deleteConfirmTitle', 'mailPreview'),
            text: t('deleteConfirmText', 'mailPreview'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: t('delete', 'mailPreview'),
            cancelButtonText: t('cancel', 'mailPreview'),
        });
        if (!result.isConfirmed) return;
        deleteMail.mutate(selectedMail.id, {
            onSuccess: handleBackToList,
            onError: (e) => setNotice(e instanceof Error ? e.message : t('deleteFailed', 'mailPreview')),
        });
    };

    if (view === 'list' || !selectedMail) {
        return (
            <div className="mx-auto flex flex-col bg-slate-50 dark:bg-slate-950">
                <PageMeta title={t('pageTitle', 'mailPreview')} description={t('pageDesc', 'mailPreview')} />

                <div className="flex flex-1">
                    {/* Sidebar */}
                    <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
                        <div className="sticky top-16 p-4">
                            <div className="mb-6 flex items-center gap-2">
                                <Mail className="h-6 w-6 text-brand-600" />
                                <span className="text-lg font-bold text-slate-800 dark:text-white">{t('sidebarTitle', 'mailPreview')}</span>
                            </div>
                            <div className="space-y-1" role="tablist" aria-label={t('sidebarTitle', 'mailPreview')}>
                                <SidebarNavItem icon={Inbox} label={t('sidebarInbox', 'mailPreview')} count={counts?.all} loading={isCountsLoading} active={folder === 'all'} onClick={() => selectFolder('all')} />
                                <SidebarNavItem icon={Reply} label={t('sidebarReceived', 'mailPreview')} count={counts?.inbound} loading={isCountsLoading} active={folder === 'inbound'} onClick={() => selectFolder('inbound')} />
                                <SidebarNavItem icon={UserX} label={t('sidebarUnassigned', 'mailPreview')} count={counts?.unassigned} loading={isCountsLoading} active={folder === 'unassigned'} onClick={() => selectFolder('unassigned')} />
                                <SidebarNavItem icon={Send} label={t('sidebarSent', 'mailPreview')} count={counts?.outbound} loading={isCountsLoading} active={folder === 'outbound'} onClick={() => selectFolder('outbound')} />
                                <SidebarNavItem icon={Star} label={t('sidebarMarked', 'mailPreview')} count={counts?.marked} loading={isCountsLoading} active={folder === 'marked'} onClick={() => selectFolder('marked')} />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content - Email List */}
                    <div className="flex min-w-0 flex-1 flex-col">
                        {/* Folders on small screens */}
                        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 no-scrollbar dark:border-slate-800 dark:bg-slate-900 lg:hidden" role="tablist">
                            {(['all', 'inbound', 'unassigned', 'outbound', 'marked'] as Folder[]).map((f) => (
                                <button
                                    key={f}
                                    role="tab"
                                    aria-selected={folder === f}
                                    onClick={() => selectFolder(f)}
                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${folder === f ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                                >
                                    {t({ all: 'sidebarInbox', inbound: 'sidebarReceived', unassigned: 'sidebarUnassigned', outbound: 'sidebarSent', marked: 'sidebarMarked' }[f], 'mailPreview')}
                                </button>
                            ))}
                        </div>

                        {/* Top Bar */}
                        <div className="flex flex-shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-3">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <div className="hidden shrink-0 rounded-md p-2 text-slate-500 lg:block">
                                    <Filter className="h-4 w-4" />
                                </div>
                                <div className="hidden h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700 lg:block" />
                                {folder !== 'inbound' && folder !== 'unassigned' && (
                                    <div className="flex items-center gap-2">
                                        {STATUS_OPTIONS.map((opt) => {
                                            const count = counts?.status?.[opt.key] ?? 0;
                                            const isOn = statusFilter.has(opt.key);
                                            return (
                                                <button
                                                    key={opt.key}
                                                    aria-pressed={isOn}
                                                    onClick={() => { setMailPage(1); setStatusFilter((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(opt.key)) next.delete(opt.key);
                                                        else next.add(opt.key);
                                                        return next;
                                                    }); }}
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${isOn
                                                        ? 'bg-brand-600 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                                >
                                                    {t(opt.label, 'mailPreview')}
                                                    {count > 0 && (
                                                        <span className="rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-600 dark:text-slate-200">{count}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {folder === 'unassigned' && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('unassignedHint', 'mailPreview')}</p>
                                )}
                            </div>
                            <div className="relative w-full lg:w-auto">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('searchPlaceholder', 'mailPreview')}
                                    aria-label={t('searchPlaceholder', 'mailPreview')}
                                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white lg:w-80"
                                />
                                {isFetching && !isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
                            </div>
                        </div>

                        {/* Email List */}
                        <div className="relative flex-1 bg-white dark:bg-slate-900" aria-busy={isLoading || isSwitching}>
                            {/* Thin bar while a background refresh runs */}
                            {isFetching && !isLoading && !isSwitching && (
                                <div className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-brand-500" role="progressbar" aria-label={t('loading', 'mailPreview')} />
                            )}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading || isSwitching ? (
                                    <>
                                        <span className="sr-only" role="status">{t('loading', 'mailPreview')}</span>
                                        <MailListSkeleton rows={Math.min(pageSize, 20)} />
                                    </>
                                ) : mails.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                                        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                                            <Mail className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">{t('emptyTitle', 'mailPreview')}</h3>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {debouncedSearch || statusFilter.size > 0 || folder !== 'all' ? t('emptyDescFilter', 'mailPreview') : t('emptyDescEmpty', 'mailPreview')}
                                        </p>
                                    </div>
                                ) : (
                                    mails.map((mail) => (
                                        <button
                                            key={mail.id}
                                            onClick={() => openMail(mail.raw)}
                                            className="w-full px-6 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {mail.direction === 'inbound' && <Reply className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />}
                                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{mail.applicantName}</p>
                                                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusChipClasses[mail.status].dot}`} />
                                                        {mail.unassigned && (
                                                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                                                {t('unassigned', 'mailPreview')}
                                                            </span>
                                                        )}
                                                        {!!mail.attachments?.length && <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label={t('attachmentsCount', 'mailPreview', { count: mail.attachments.length })} />}
                                                    </div>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{mail.subject}</p>
                                                    <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">{mail.preview}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">{formatRelativeTime(mail.createdAt, t)}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${statusChipClasses[mail.status].bg} ${statusChipClasses[mail.status].text}`}>
                                                        {t(STATUS_LABEL_KEYS[mail.status], 'mailPreview')}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Pagination */}
                            {(listResponse?.totalCount ?? 0) > PAGE_SIZE_OPTIONS[0] && (
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                                    <button
                                        disabled={mailPage === 1 || isSwitching}
                                        onClick={() => setMailPage((p) => Math.max(1, p - 1))}
                                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        {t('previous', 'mailPreview')}
                                    </button>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="inline-flex items-center gap-2">
                                            {isSwitching && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                                            {t('paginationInfo', 'mailPreview', { page: mailPage, totalPages: totalMailPages })}
                                        </span>
                                        <label className="inline-flex items-center gap-2">
                                            {t('perPage', 'mailPreview')}
                                            <select
                                                value={pageSize}
                                                onChange={(e) => changePageSize(Number(e.target.value))}
                                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            >
                                                {PAGE_SIZE_OPTIONS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <button
                                        disabled={mailPage === totalMailPages || isSwitching}
                                        onClick={() => setMailPage((p) => Math.min(totalMailPages, p + 1))}
                                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                                    >
                                        {t('next', 'mailPreview')}
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Detail view
    return (
        <div className="mx-auto flex flex-col bg-slate-50 dark:bg-slate-950">
            <PageMeta title={t('detailPageTitle', 'mailPreview', { subject: selectedMail.subject })} description={t('detailPageDesc', 'mailPreview')} />

            <div className="flex flex-1">
                <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
                    <div className="sticky top-16 p-4">
                        <div className="mb-6 flex items-center gap-2">
                            <Mail className="h-6 w-6 text-brand-600" />
                            <span className="text-lg font-bold text-slate-800 dark:text-white">{t('sidebarTitle', 'mailPreview')}</span>
                        </div>
                    </div>
                </aside>

                <div className="min-w-0 flex-1 bg-white dark:bg-slate-900">
                    {/* Back + actions */}
                    <div className="sticky top-14 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToInbox', 'mailPreview')}
                        </button>
                        <div className="flex items-center gap-2">
                            {selectedMail.direction === 'inbound' && (
                                <>
                                    <button
                                        onClick={() => { setPanel(panel === 'assign' ? 'none' : 'assign'); setNotice(null); }}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        {selectedMail.unassigned ? t('assignToApplicant', 'mailPreview') : t('reassign', 'mailPreview')}
                                    </button>
                                    <button
                                        onClick={() => { setPanel(panel === 'reply' ? 'none' : 'reply'); setNotice(null); }}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                                    >
                                        <Reply className="h-4 w-4" />
                                        {t('reply', 'mailPreview')}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleDelete}
                                disabled={deleteMail.isPending}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
                                aria-label={t('delete', 'mailPreview')}
                                title={t('delete', 'mailPreview')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedMail.subject}</h2>
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                    {selectedMail.applicantName}
                                    {selectedMail.unassigned && (
                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                            {t('unassigned', 'mailPreview')}
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedMail.applicantEmail}
                                    {selectedMail.jobTitle ? ` · ${selectedMail.jobTitle}` : ''}
                                </p>
                            </div>
                            <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusChipClasses[selectedMail.status].bg} ${statusChipClasses[selectedMail.status].text}`}>
                                {t(STATUS_LABEL_KEYS[selectedMail.status], 'mailPreview')}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                            <span>{formatDateTime(selectedMail.createdAt, locale)}</span>
                            <span>•</span>
                            <span>
                                {selectedMail.direction === 'inbound'
                                    ? t('from', 'mailPreview', { email: selectedMail.applicantEmail })
                                    : t('to', 'mailPreview', { email: selectedMail.applicantEmail })}
                            </span>
                        </div>
                        <MailAttachments mailId={selectedMail.id} attachments={selectedMail.attachments} />
                    </div>

                    {/* Reply / assign */}
                    {(panel !== 'none' || notice) && (
                        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                            {notice && (
                                <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" role="status">
                                    {notice}
                                </p>
                            )}
                            {panel === 'reply' && (
                                <MailReplyBox
                                    mailId={selectedMail.id}
                                    to={selectedMail.applicantEmail}
                                    subject={selectedMail.subject}
                                    onClose={() => setPanel('none')}
                                    onSent={() => { setPanel('none'); setNotice(t('replySent', 'mailPreview')); }}
                                />
                            )}
                            {panel === 'assign' && (
                                <AssignMailPanel
                                    mailId={selectedMail.id}
                                    onClose={() => setPanel('none')}
                                    onAssigned={() => { setPanel('none'); setNotice(t('assigned', 'mailPreview')); }}
                                />
                            )}
                        </div>
                    )}

                    {/* Body: grows to fit, so the page is the only scroll area */}
                    <div className="p-6">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {selectedMail.direction === 'inbound' ? t('bodyReplyLabel', 'mailPreview') : t('bodySentLabel', 'mailPreview')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setExpanded(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <Maximize2 className="h-3.5 w-3.5" />
                                {t('expandMail', 'mailPreview')}
                            </button>
                        </div>
                        <MailBody key={selectedMail.id} html={selectedMail.bodyHtml} title={t('mailBody', 'mailPreview')} />
                    </div>

                    {/* Conversation with this applicant: sent and received, oldest first */}
                    {selectedMail.applicantId && isConversationLoading && (
                        <div className="border-t border-slate-200 p-6 dark:border-slate-800" aria-busy="true">
                            <div className="mb-3 h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="space-y-2">
                                {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                            </div>
                        </div>
                    )}
                    {conversation.length > 1 && (
                        <div className="border-t border-slate-200 p-6 dark:border-slate-800">
                            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t('conversation', 'mailPreview', { count: conversation.length })}
                            </h3>
                            <ol className="space-y-2">
                                {conversation.map((m) => (
                                    <li key={m.id}>
                                        <button
                                            onClick={() => openMail(m.raw)}
                                            aria-current={m.id === selectedMail.id ? 'true' : undefined}
                                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${m.id === selectedMail.id ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'}`}
                                        >
                                            {m.direction === 'inbound'
                                                ? <Reply className="h-4 w-4 shrink-0 text-sky-600" aria-label={t('statusReceived', 'mailPreview')} />
                                                : <Send className="h-4 w-4 shrink-0 text-slate-400" aria-label={t('statusSent', 'mailPreview')} />}
                                            <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{m.subject}</span>
                                            {!!m.attachments?.length && <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                                            <span className="shrink-0 text-xs text-slate-400">{formatDateTime(m.createdAt, locale)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Activity timeline */}
                    <div className="border-t border-slate-200 p-6 dark:border-slate-800">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <Clock3 className="h-4 w-4" />
                            {t('activityTimeline', 'mailPreview')}
                        </h3>
                        <div className="space-y-4">
                            {selectedMail.events.map((event, idx) => (
                                <div key={event.id} className="flex gap-3">
                                    <div className="relative flex flex-col items-center">
                                        <div className="h-2 w-2 rounded-full bg-brand-500" />
                                        {idx !== selectedMail.events.length - 1 && <div className="absolute top-2 h-full w-px bg-slate-200 dark:bg-slate-700" />}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-xs font-medium text-slate-900 dark:text-white">{event.type.replace(/_/g, ' ').toUpperCase()}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(event.at, locale)}</p>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Raw metadata (full record incl. webhook events, loaded on open) */}
                    <details className="border-t border-slate-200 p-6 dark:border-slate-800" onToggle={(e) => setShowRaw((e.target as HTMLDetailsElement).open)}>
                        <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
                            {t('viewRawMetadata', 'mailPreview')}
                        </summary>
                        {isRawLoading && !rawDetail ? (
                            <Loader2 className="mt-4 h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                            <pre className="mt-4 whitespace-pre-wrap break-all rounded-lg bg-slate-100 p-4 text-xs dark:bg-slate-800">
                                {JSON.stringify(rawDetail ?? selectedMail.raw, null, 2)}
                            </pre>
                        )}
                    </details>
                </div>
            </div>

            {/* Large view of the open email */}
            <Modal isOpen={expanded} onClose={() => setExpanded(false)} className="mx-4 max-w-5xl !rounded-2xl !bg-white dark:!bg-slate-900">
                <div className="space-y-4 p-2 pe-14">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedMail.subject}</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {selectedMail.applicantName} ·{' '}
                            {selectedMail.direction === 'inbound'
                                ? t('from', 'mailPreview', { email: selectedMail.applicantEmail })
                                : t('to', 'mailPreview', { email: selectedMail.applicantEmail })}{' '}
                            · {formatDateTime(selectedMail.createdAt, locale)}
                        </p>
                        <MailAttachments mailId={selectedMail.id} attachments={selectedMail.attachments} />
                    </div>
                </div>
                <div className="p-2">
                    {expanded && <MailBody html={selectedMail.bodyHtml} title={t('mailBody', 'mailPreview')} minHeight={400} />}
                </div>
            </Modal>
        </div>
    );
}
