import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Clock3,
    Mail,
    Search,
    Inbox,
    Star,
    Send,
    FileText,
    Trash2,
    Tag,
    Filter,
    PlusCircle,
    CheckCircle2,
    AlertCircle,
    Clock,
    Eye,
    MousePointerClick,
    XCircle,
    ArrowLeft,
} from 'lucide-react';
import PageMeta from '../../../components/common/PageMeta';
import axiosInstance from '../../../config/axios';
import { useCompanies } from '../../../hooks/queries/useCompanies';
import { useJobPositions } from '../../../hooks/queries/useJobPositions';
import { useApplicants } from '../../../hooks/queries/useApplicants';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';

type MailStatus = 'queued' | 'delivery delayed' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

type MailEventType = 'queued' | 'provider_accepted' | 'delivered' | 'open' | 'click' | 'bounce' | 'complaint' | 'custom';

type MailEvent = {
    id: string;
    type: MailEventType;
    at: string;
    detail: string;
};

type ApiMailRecord = {
    _id: string;
    company: string;
    sentBy: string;
    to: string;
    from: string;
    subject: string;
    html: string;
    applicant: string | null;
    jobPosition?: unknown;
    resendEmailId: string;
    status: string;
    deliveredAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    bouncedAt: string | null;
    complainedAt: string | null;
    webhookEvents: Array<{ type?: string; createdAt?: string; [key: string]: any }>;
    createdAt: string;
    updatedAt: string;
    __v: number;
};

type ApiMailResponse = {
    message: string;
    page: string;
    PageCount: number | null;
    TotalCount: number;
    data: ApiMailRecord[];
};

type UiMailRecord = {
    id: string;
    applicantId: string | null;
    applicantName: string;
    applicantEmail: string;
    applicantJobPositionId: string | null;
    applicantAssignedJobId: string | null;
    applicantAssignedJobTitle: string;
    applicantAssignedCompanyId: string | null;
    applicantAssignedCompanyName: string;
    companyId: string;
    senderId: string;
    sender: string;
    resendEmailId: string;
    statusRaw: string;
    status: MailStatus;
    score: number;
    createdAt: string;
    lastUpdateAt: string;
    subject: string;
    preview: string;
    bodyHtml: string;
    deliveredAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    bouncedAt: string | null;
    complainedAt: string | null;
    webhookEvents: ApiMailRecord['webhookEvents'];
    events: MailEvent[];
    raw: ApiMailRecord;
};

const STATUS_OPTIONS: Array<{ key: 'all' | MailStatus; label: string; icon: any }> = [
    { key: 'all', label: 'statusAll', icon: Inbox },
    { key: 'queued', label: 'statusQueued', icon: Clock },
    { key: 'delivery delayed', label: 'statusDelayed', icon: AlertCircle },
    { key: 'delivered', label: 'statusDelivered', icon: CheckCircle2 },
    { key: 'opened', label: 'statusOpened', icon: Eye },
    { key: 'clicked', label: 'statusClicked', icon: MousePointerClick },
    { key: 'bounced', label: 'statusBounced', icon: XCircle },
    { key: 'failed', label: 'statusFailed', icon: AlertCircle },
];

const MAIL_POLL_INTERVAL_MS = 30 * 1000;
const MAIL_LIST_PAGE_SIZE = 10;

const formatDateTime = (value: string, locale?: string) =>
    new Date(value).toLocaleString(locale, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

const formatRelativeTime = (value: string, t?: (key: string, ns?: string, params?: Record<string, string | number>) => string) => {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t ? t('justNow', 'mailPreview') : 'Just now';
    if (diffMins < 60) return t ? t('minsAgo', 'mailPreview', { mins: diffMins }) : `${diffMins}m ago`;
    if (diffHours < 24) return t ? t('hoursAgo', 'mailPreview', { hours: diffHours }) : `${diffHours}h ago`;
    return t ? t('daysAgo', 'mailPreview', { days: diffDays }) : `${diffDays}d ago`;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const isInvalidNameToken = (value: string) => /^(undefined|null|unknown|n\/a|na)$/i.test(value.trim());

const getApplicantNameFromHtml = (html: string, t?: (key: string, ns?: string) => string) => {
    const match = html.match(/Dear\s+([^,<]+)[,:]?/i);
    const parsedName = match?.[1]?.trim() || '';
    if (!parsedName || isInvalidNameToken(parsedName)) return t ? t('unknownApplicant', 'mailPreview') : 'Unknown Applicant';
    return parsedName;
};

const getFallbackNameFromEmail = (email: string, t?: (key: string, ns?: string) => string) => {
    if (!email) return t ? t('unknownApplicant', 'mailPreview') : 'Unknown Applicant';
    const localPart = email.split('@')[0]?.trim();
    if (!localPart) return t ? t('unknownApplicant', 'mailPreview') : 'Unknown Applicant';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized || isInvalidNameToken(normalized)) return t ? t('unknownApplicant', 'mailPreview') : 'Unknown Applicant';
    return normalized;
};

const resolveUiStatus = (mail: ApiMailRecord): MailStatus => {
    const backendStatus = String(mail.status || '').toLowerCase();

    switch (backendStatus) {
        case 'queued':
            return 'queued';
        case 'delivery delayed':
            return 'delivery delayed';
        case 'sent':
            return 'sent';
        case 'delivered':
            return 'delivered';
        case 'opened':
            return 'opened';
        case 'clicked':
            return 'clicked';
        case 'bounced':
            return 'bounced';
        case 'failed':
            return 'failed';
        default:
            if (mail.clickedAt) return 'clicked';
            if (mail.openedAt) return 'opened';
            if (mail.deliveredAt) return 'delivered';
            if (mail.bouncedAt) return 'bounced';
            if (mail.complainedAt) return 'failed';
            return 'delivery delayed';
    }
};

const buildEvents = (mail: ApiMailRecord, t?: (key: string, ns?: string) => string): MailEvent[] => {
    const events: MailEvent[] = [
        { id: `${mail._id}-q`, type: 'queued', at: mail.createdAt, detail: t ? t('eventQueued', 'mailPreview') : 'Mail queued.' },
        { id: `${mail._id}-a`, type: 'provider_accepted', at: mail.updatedAt, detail: t ? t('eventProviderAccepted', 'mailPreview') : 'Provider accepted.' },
    ];
    if (mail.deliveredAt) events.push({ id: `${mail._id}-d`, type: 'delivered', at: mail.deliveredAt, detail: t ? t('eventDelivered', 'mailPreview') : 'Delivered.' });
    if (mail.openedAt) events.push({ id: `${mail._id}-o`, type: 'open', at: mail.openedAt, detail: t ? t('eventOpened', 'mailPreview') : 'Opened.' });
    if (mail.clickedAt) events.push({ id: `${mail._id}-c`, type: 'click', at: mail.clickedAt, detail: t ? t('eventClicked', 'mailPreview') : 'Clicked.' });
    if (mail.bouncedAt) events.push({ id: `${mail._id}-b`, type: 'bounce', at: mail.bouncedAt, detail: t ? t('eventBounced', 'mailPreview') : 'Bounced.' });
    if (mail.complainedAt) events.push({ id: `${mail._id}-cp`, type: 'complaint', at: mail.complainedAt, detail: t ? t('eventComplaint', 'mailPreview') : 'Complaint.' });
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

const toUiRecord = (mail: ApiMailRecord, t?: (key: string, ns?: string) => string): UiMailRecord => {
    const status = resolveUiStatus(mail);
    return {
        id: mail._id,
        applicantId: extractId(mail.applicant),
        applicantName: getApplicantNameFromHtml(mail.html, t),
        applicantEmail: mail.to,
        applicantJobPositionId: extractId(mail.jobPosition),
        applicantAssignedJobId: null,
        applicantAssignedJobTitle: t ? t('unknownJob', 'mailPreview') : 'Unknown Job',
        applicantAssignedCompanyId: null,
        applicantAssignedCompanyName: t ? t('unknownCompany', 'mailPreview') : 'Unknown',
        companyId: extractId(mail.company) || String(mail.company || ''),
        senderId: extractId(mail.sentBy) || String(mail.sentBy || ''),
        sender: mail.from,
        resendEmailId: mail.resendEmailId,
        statusRaw: mail.status,
        status,
        score: status === 'opened' || status === 'clicked' ? 95 : status === 'delivered' ? 85 : 40,
        createdAt: mail.createdAt,
        lastUpdateAt: mail.updatedAt,
        subject: mail.subject,
        preview: stripHtml(mail.html).slice(0, 100),
        bodyHtml: mail.html,
        deliveredAt: mail.deliveredAt,
        openedAt: mail.openedAt,
        clickedAt: mail.clickedAt,
        bouncedAt: mail.bouncedAt,
        complainedAt: mail.complainedAt,
        webhookEvents: mail.webhookEvents,
        events: buildEvents(mail, t),
        raw: mail,
    };
};

const statusChipClasses: Record<MailStatus, { bg: string; text: string; dot: string }> = {
    queued: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    'delivery delayed': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
    sent: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
    opened: { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-400' },
    clicked: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
    bounced: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
};

const toDisplayText = (value: unknown, fallback: string) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    if (value && typeof value === 'object') {
        const localized = value as { en?: unknown; ar?: unknown; name?: unknown; title?: unknown };
        const candidates = [localized.en, localized.ar, localized.name, localized.title];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
    }

    return fallback;
};

const extractId = (value: unknown): string | null => {
    if (Array.isArray(value)) {
        for (const item of value) {
            const resolved = extractId(item);
            if (resolved) return resolved;
        }
        return null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || null;
    }

    if (value && typeof value === 'object') {
        const maybeId = value as { _id?: unknown; id?: unknown };
        if (typeof maybeId._id === 'string' && maybeId._id.trim()) return maybeId._id.trim();
        if (typeof maybeId.id === 'string' && maybeId.id.trim()) return maybeId.id.trim();
    }

    return null;
};

const getApplicantCompanyId = (applicantRecord: any): string | null => {
    if (!applicantRecord) return null;
    return (
        extractId(applicantRecord?.companyId) ||
        extractId(applicantRecord?.company) ||
        extractId(applicantRecord?.companyObj) ||
        extractId(applicantRecord?.jobPositionId?.companyId) ||
        extractId(applicantRecord?.jobPositionId?.company) ||
        extractId(applicantRecord?.jobPosition?.companyId) ||
        extractId(applicantRecord?.jobPosition?.company) ||
        null
    );
};

const getApplicantJobPositionId = (applicantRecord: any): string | null => {
    if (!applicantRecord) return null;
    return extractId(applicantRecord?.jobPositionId) || extractId(applicantRecord?.jobPosition) || null;
};

const getApplicantJobTitle = (applicantRecord: any): string | null => {
    if (!applicantRecord) return null;
    const titleFromJobPositionId = toDisplayText((applicantRecord as any)?.jobPositionId?.title || (applicantRecord as any)?.jobPositionId?.name, '');
    if (titleFromJobPositionId) return titleFromJobPositionId;
    const titleFromJobPosition = toDisplayText((applicantRecord as any)?.jobPosition?.title || (applicantRecord as any)?.jobPosition?.name, '');
    if (titleFromJobPosition) return titleFromJobPosition;
    return null;
};

const SidebarNavItem = ({ icon: Icon, label, count, active }: { icon: any; label: string; count?: number; active?: boolean }) => (
    <button
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
        role="tab"
        aria-selected={active}
        tabIndex={active ? 0 : -1}
    >
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-brand-200 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {count}
            </span>
        )}
    </button>
);

export default function MailPreview() {
    const { t, locale } = useLocale();
    const { user } = useAuth();
    const roleName = user?.roleId?.name?.toLowerCase();
    const isSuperAdmin = roleName === 'super admin' || roleName === 'admin';

    // Navigation state: 'list' or 'detail'
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

    // Filters
    const { selectedCompanyId: globalSelectedCompanyId } = useCompanyFilter();
    const selectedCompanyId = globalSelectedCompanyId ?? 'all';
    const [selectedJobId, setSelectedJobId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | MailStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [mailPage, setMailPage] = useState(1);

    const assignedCompanyIds = useMemo(() => {
        if (isSuperAdmin) return [];
        const fromCompanies = Array.isArray(user?.companies)
            ? user.companies.map((c: any) => extractId(c?.companyId))
            : [];
        const fromAssigned = Array.isArray(user?.assignedcompanyId) ? user.assignedcompanyId : [];
        return Array.from(new Set([...fromCompanies, ...fromAssigned])).filter(Boolean) as string[];
    }, [user, isSuperAdmin]);

    const { data: companies } = useCompanies(isSuperAdmin ? undefined : assignedCompanyIds);
    const availableCompanyIds = useMemo(
        () => (companies || []).map((company: any) => extractId(company?._id || company?.id)).filter(Boolean) as string[],
        [companies],
    );

    const companyNameById = useMemo(() => {
        const map = new Map<string, string>();
        (companies || []).forEach((company: any) => {
            map.set(company._id, toDisplayText(company?.name, t('unknownCompany', 'mailPreview')));
        });
        return map;
    }, [companies, t]);

    useEffect(() => {
        setSelectedJobId('all');
    }, [selectedCompanyId]);

    const jobPositionParams = useMemo(() => {
        if (isSuperAdmin) {
            return selectedCompanyId !== 'all' ? [selectedCompanyId] : undefined;
        }
        if (availableCompanyIds.length === 1) {
            return [availableCompanyIds[0]];
        }
        return assignedCompanyIds;
    }, [isSuperAdmin, selectedCompanyId, assignedCompanyIds, availableCompanyIds]);

    const { data: jobPositions } = useJobPositions(jobPositionParams, false);


    const jobTitleById = useMemo(() => {
        const map = new Map<string, string>();
        (jobPositions || []).forEach((job: any) => {
            if (job?._id) map.set(job._id, toDisplayText((job as any)?.title || (job as any)?.name, t('untitledJob', 'mailPreview')));
        });
        return map;
    }, [jobPositions, t]);

    const applicantCompanyIds = useMemo(() => {
        if (!isSuperAdmin && assignedCompanyIds.length > 0) return assignedCompanyIds;
        return undefined;
    }, [isSuperAdmin, assignedCompanyIds]);

    const { data: applicants = [], isLoading: isApplicantsLoading, isFetching: isApplicantsFetching, isFetched: isApplicantsFetched } = useApplicants({
        companyId: applicantCompanyIds,
        jobPositionId: undefined,
        departmentId: undefined,
        enabled: true,
    });

    const applicantById = useMemo(() => {
        const map = new Map<string, any>();
        (applicants || []).forEach((applicant: any) => {
            if (applicant?._id) map.set(applicant._id, applicant);
        });
        return map;
    }, [applicants]);

    const queryCompanyIds = useMemo(() => {
        if (!isSuperAdmin && assignedCompanyIds.length > 0) return assignedCompanyIds;
        return [] as string[];
    }, [isSuperAdmin, assignedCompanyIds]);

    const { data: apiResponse, isLoading } = useQuery<ApiMailResponse>({
        queryKey: ['mail-logs', queryCompanyIds.join(',')],
        queryFn: async () => {
            const baseParams: Record<string, string> = { PageCount: 'all' };

            if (queryCompanyIds.length <= 1) {
                if (queryCompanyIds.length === 1) {
                    const companyId = queryCompanyIds[0];
                    baseParams.company = companyId;
                }
                const res = await axiosInstance.get<ApiMailResponse>('/mail', { params: baseParams });
                return res.data;
            }

            const responses = await Promise.all(queryCompanyIds.map((companyId) =>
                axiosInstance.get<ApiMailResponse>('/mail', { params: { ...baseParams, companyId, company: companyId } })
            ));

            const mergedMap = new Map<string, ApiMailRecord>();
            responses.forEach((response) => {
                (response.data?.data || []).forEach((mail) => mergedMap.set(mail._id, mail));
            });

            const data = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const firstResponse = responses[0]?.data;

            return {
                message: firstResponse?.message || 'success',
                page: firstResponse?.page || 'all',
                PageCount: firstResponse?.PageCount ?? null,
                TotalCount: data.length,
                data,
            };
        },
        staleTime: 5 * 60 * 1000,
        refetchInterval: MAIL_POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
    });

    const unknownApplicantLabel = useMemo(() => t('unknownApplicant', 'mailPreview'), [t]);

    const knownNameByApplicantId = useMemo(() => {
        const map = new Map<string, string>();
        (apiResponse?.data || []).forEach((mail) => {
            const applicantId = extractId((mail as any)?.applicant);
            const parsedName = getApplicantNameFromHtml((mail as any)?.html || '');
            if (applicantId && parsedName !== unknownApplicantLabel && !isInvalidNameToken(parsedName)) {
                map.set(applicantId, parsedName);
            }
        });
        return map;
    }, [apiResponse, unknownApplicantLabel]);

    const knownNameByEmail = useMemo(() => {
        const map = new Map<string, string>();
        (apiResponse?.data || []).forEach((mail) => {
            const email = String((mail as any)?.to || '').trim().toLowerCase();
            const parsedName = getApplicantNameFromHtml((mail as any)?.html || '');
            if (email && parsedName !== unknownApplicantLabel && !isInvalidNameToken(parsedName)) {
                if (!map.has(email)) map.set(email, parsedName);
            }
        });
        return map;
    }, [apiResponse, unknownApplicantLabel]);

    const uiRecords = useMemo(() => {
        if (isLoading || !apiResponse) return [];
        return (apiResponse.data || []).map((mail) => {
            const base = toUiRecord(mail, t);
            const matchedApplicant = base.applicantId ? applicantById.get(base.applicantId) : null;
            const hasLinkedApplicant = !!base.applicantId;
            const unknownJobLabel = t('unknownJob', 'mailPreview');
            const unknownApplicantLabel = t('unknownApplicant', 'mailPreview');
            const unknownCompanyLabel = t('unknownCompany', 'mailPreview');
            const applicantJobPositionId = getApplicantJobPositionId(matchedApplicant) || base.applicantJobPositionId || null;
            const applicantAssignedJobTitle = getApplicantJobTitle(matchedApplicant) ||
                (applicantJobPositionId ? jobTitleById.get(applicantJobPositionId) || applicantJobPositionId : unknownJobLabel);
            const userFullName = toDisplayText(matchedApplicant?.fullName || matchedApplicant?.name, '');
            const parsedHtmlName = base.applicantName !== unknownApplicantLabel && !isInvalidNameToken(base.applicantName) ? base.applicantName : '';
            const knownByApplicantId = base.applicantId ? knownNameByApplicantId.get(base.applicantId) || '' : '';
            const knownByEmail = knownNameByEmail.get(String(base.applicantEmail || '').trim().toLowerCase()) || '';
            const fallbackName = getFallbackNameFromEmail(base.applicantEmail, t);
            const shouldWaitForApplicantLookup = hasLinkedApplicant && !matchedApplicant && (!isApplicantsFetched || isApplicantsLoading || isApplicantsFetching);
            const applicantName = userFullName || parsedHtmlName || knownByApplicantId || knownByEmail ||
                (shouldWaitForApplicantLookup ? t('loadingRecipient', 'mailPreview') : (hasLinkedApplicant ? unknownApplicantLabel : fallbackName));
            const assignedCompanyId = getApplicantCompanyId(matchedApplicant) || base.companyId || null;
            const assignedCompanyName = assignedCompanyId ? companyNameById.get(assignedCompanyId) || assignedCompanyId : unknownCompanyLabel;

            return {
                ...base,
                applicantName,
                applicantJobPositionId,
                applicantAssignedJobId: applicantJobPositionId,
                applicantAssignedJobTitle,
                applicantAssignedCompanyId: assignedCompanyId,
                applicantAssignedCompanyName: assignedCompanyName,
            };
        });
    }, [apiResponse, applicantById, companyNameById, jobTitleById, knownNameByApplicantId, knownNameByEmail, isApplicantsLoading, isApplicantsFetching, isApplicantsFetched, t]);

    const filteredMails = useMemo(() => uiRecords
        .filter((m) => {
            const matchesCompany = selectedCompanyId === 'all' || m.companyId === selectedCompanyId;
            const matchesJob = selectedJobId === 'all' || m.applicantJobPositionId === selectedJobId;
            const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
            const matchesSearch = !searchTerm || [m.applicantName, m.applicantEmail, m.subject].some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesCompany && matchesJob && matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (createdDiff !== 0) return createdDiff;
            return new Date(b.lastUpdateAt).getTime() - new Date(a.lastUpdateAt).getTime();
        }),
        [uiRecords, selectedCompanyId, selectedJobId, statusFilter, searchTerm]);

    useEffect(() => {
        setMailPage(1);
    }, [selectedCompanyId, selectedJobId, statusFilter, searchTerm]);

    const totalMailPages = useMemo(() => Math.max(1, Math.ceil(filteredMails.length / MAIL_LIST_PAGE_SIZE)), [filteredMails.length]);

    useEffect(() => {
        setMailPage((prev) => Math.min(prev, totalMailPages));
    }, [totalMailPages]);

    const paginatedMails = useMemo(() => {
        const startIndex = (mailPage - 1) * MAIL_LIST_PAGE_SIZE;
        return filteredMails.slice(startIndex, startIndex + MAIL_LIST_PAGE_SIZE);
    }, [filteredMails, mailPage]);

    const selectedMail = useMemo(() => {
        if (!selectedMailId) return null;
        return filteredMails.find(m => m.id === selectedMailId) || null;
    }, [filteredMails, selectedMailId]);



    const getStatusCount = (status: 'all' | MailStatus) => {
        if (status === 'all') return filteredMails.length;
        return filteredMails.filter(m => m.status === status).length;
    };

    const handleMailClick = (mailId: string) => {
        setSelectedMailId(mailId);
        setView('detail');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedMailId(null);
    };

    // Render Email List View
    if (view === 'list') {
        return (
            <div className="mx-auto flex h-full max-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
                <PageMeta title={t('pageTitle', 'mailPreview')} description={t('pageDesc', 'mailPreview')} />

                <div className="flex h-full flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
                        <div className="sticky top-0 p-4">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-6 w-6 text-brand-600" />
                                    <span className="text-lg font-bold text-slate-800 dark:text-white">{t('sidebarTitle', 'mailPreview')}</span>
                                </div>
                                <button className="rounded-lg bg-brand-600 p-2 text-white transition hover:bg-brand-700">
                                    <PlusCircle className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-6" role="tablist" aria-label={t('sidebarTitle', 'mailPreview')}>
                                <div>
                                    <SidebarNavItem icon={Inbox} label={t('sidebarInbox', 'mailPreview')} count={filteredMails.length} active={statusFilter === 'all'} />
                                    <SidebarNavItem icon={Star} label={t('sidebarMarked', 'mailPreview')} count={filteredMails.filter(m => m.score > 90).length} />
                                    <SidebarNavItem icon={FileText} label={t('sidebarDraft', 'mailPreview')} count={0} />
                                    <SidebarNavItem icon={Send} label={t('sidebarSent', 'mailPreview')} />
                                    <SidebarNavItem icon={Trash2} label={t('sidebarTrash', 'mailPreview')} />
                                </div>

                                <div>
                                    <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('sidebarCustomWork', 'mailPreview')}</div>
                                    <SidebarNavItem icon={Tag} label={t('sidebarPartnership', 'mailPreview')} count={6} />
                                    <SidebarNavItem icon={Tag} label={t('sidebarInProgress', 'mailPreview')} />
                                    <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span>{t('sidebarAddLabel', 'mailPreview')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content - Email List */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        {/* Top Bar */}
                        <div className="flex flex-shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-3">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <button className="hidden shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:block">
                                    <Filter className="h-4 w-4" />
                                </button>
                                <div className="hidden h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700 lg:block" />
                                <div className="flex items-center gap-2">
                                    {STATUS_OPTIONS.map((opt) => {
                                        const count = getStatusCount(opt.key);
                                        return (
                                            <button
                                                key={opt.key}
                                                onClick={() => setStatusFilter(opt.key as any)}
                                                className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === opt.key
                                                        ? 'bg-brand-600 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                {t(opt.label, 'mailPreview')}
                                                {count > 0 && statusFilter !== opt.key && (
                                                    <span className="rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                                                        {count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="relative w-full lg:w-auto">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={t('searchPlaceholder', 'mailPreview')}
                                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white lg:w-80"
                                />
                            </div>
                        </div>

                        {/* Email List */}
                        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {paginatedMails.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                                        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                                            <Mail className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">{t('emptyTitle', 'mailPreview')}</h3>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {searchTerm || statusFilter !== 'all' ? t('emptyDescFilter', 'mailPreview') : t('emptyDescEmpty', 'mailPreview')}
                                        </p>
                                    </div>
                                ) : (
                                    paginatedMails.map((mail) => (
                                        <button
                                            key={mail.id}
                                            onClick={() => handleMailClick(mail.id)}
                                            className="w-full px-6 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                            {mail.applicantName}
                                                        </p>
                                                        <div className={`h-1.5 w-1.5 rounded-full ${statusChipClasses[mail.status].dot}`} />
                                                    </div>
                                                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                                        {mail.subject}
                                                    </p>
                                                    <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
                                                        {mail.preview}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                                                        {formatRelativeTime(mail.createdAt, t)}
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${statusChipClasses[mail.status].bg} ${statusChipClasses[mail.status].text}`}>
                                                        {(STATUS_OPTIONS.find(o => o.key === mail.status) ? t(STATUS_OPTIONS.find(o => o.key === mail.status)!.label, 'mailPreview') : mail.status)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Pagination */}
                            {filteredMails.length > MAIL_LIST_PAGE_SIZE && (
                                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                                    <button
                                        disabled={mailPage === 1}
                                        onClick={() => setMailPage(p => Math.max(1, p - 1))}
                                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        {t('previous', 'mailPreview')}
                                    </button>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {t('paginationInfo', 'mailPreview', { page: mailPage, totalPages: totalMailPages })}
                                    </span>
                                    <button
                                        disabled={mailPage === totalMailPages}
                                        onClick={() => setMailPage(p => Math.min(totalMailPages, p + 1))}
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

    // Render Email Detail View
    if (view === 'detail' && selectedMail) {
        return (
            <div className="mx-auto flex h-full max-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
                <PageMeta title={t('detailPageTitle', 'mailPreview', { subject: selectedMail.subject })} description={t('detailPageDesc', 'mailPreview')} />

                <div className="flex h-full flex-1 overflow-hidden">
                    {/* Sidebar (minimized in detail view) */}
                    <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
                        <div className="sticky top-0 p-4">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-6 w-6 text-brand-600" />
                                    <span className="text-lg font-bold text-slate-800 dark:text-white">{t('sidebarTitle', 'mailPreview')}</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Email Detail Content */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
                        {/* Back Button */}
                        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
                            <button
                                onClick={handleBackToList}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('backToInbox', 'mailPreview')}
                            </button>
                        </div>

                        {/* Email Header */}
                        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedMail.subject}</h2>
                            <div className="mt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedMail.applicantName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedMail.applicantEmail}</p>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-xs font-medium ${statusChipClasses[selectedMail.status].bg} ${statusChipClasses[selectedMail.status].text}`}>
                                    {(STATUS_OPTIONS.find(o => o.key === selectedMail.status) ? t(STATUS_OPTIONS.find(o => o.key === selectedMail.status)!.label, 'mailPreview') : selectedMail.status)}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                                <span>{formatDateTime(selectedMail.createdAt, locale)}</span>
                                <span>•</span>
                                <span>{t('to', 'mailPreview', { email: selectedMail.applicantEmail })}</span>
                            </div>
                        </div>

                        {/* Email Body */}
                        <div className="p-6">
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <iframe
                                    srcDoc={selectedMail.bodyHtml}
                                    title="Mail Preview"
                                    className="h-auto min-h-[400px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                                />
                            </div>
                        </div>

                        {/* Activity Timeline */}
                        <div className="border-t border-slate-200 p-6 dark:border-slate-800">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Clock3 className="h-4 w-4" />
                                {t('activityTimeline', 'mailPreview')}
                            </h3>
                            <div className="space-y-4">
                                {selectedMail.events.map((event, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="relative flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-brand-500" />
                                            {idx !== selectedMail.events.length - 1 && (
                                                <div className="absolute top-2 h-full w-px bg-slate-200 dark:bg-slate-700" />
                                            )}
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-xs font-medium text-slate-900 dark:text-white">
                                                {event.type.replace(/_/g, ' ').toUpperCase()}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(event.at, locale)}</p>
                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Raw Metadata */}
                        <details className="border-t border-slate-200 p-6 dark:border-slate-800">
                            <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
                                {t('viewRawMetadata', 'mailPreview')}
                            </summary>
                            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-100 p-4 text-xs dark:bg-slate-800">
                                {JSON.stringify(selectedMail.raw, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback: if selectedMail is null when in detail view, go back to list
    if (view === 'detail' && !selectedMail) {
        useEffect(() => {
            setView('list');
            setSelectedMailId(null);
        }, []);
        return null;
    }

    return null;
}