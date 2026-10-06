import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  FileText,
  DollarSign,
  Briefcase,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Hash,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCompanies } from '../../../hooks/queries/useCompanies';
import { useCompanyFilter } from '../../../context/CompanyFilterContext';
import {
  jobOffersKeys,
  useJobOffers,
  useJobOfferStatusCounts,
  useDeleteJobOffer,
  useUpdateOfferStatus,
} from '../../../hooks/queries/useJobOffers';
import { jobOffersService } from '../../../services/jobOffersService';
import type { JobOffer, OfferStatus } from '../../../services/jobOffersService';
import Swal from '../../../utils/swal';
import { useOpenContractEditor, useOpenOfferEditor } from '../documentEditor/editorNavigation';
import { useDebounce } from '../../../hooks/useDebounce';
import { Badge, Button, Card, EmptyState, IconButton, PageShell, Pagination, SearchInput, StatStrip, TabBar, focusRing, ErrorState } from '../../../components/ui/kit';
import { OFFER_STATUS_TONE, WORK_TYPE_TONE, offerStatusKey, workTypeKey } from './offerMeta';
import { useLocale } from '../../../context/LocaleContext';
import PageMeta from '../../../components/common/PageMeta';
import { OfferDetail } from './OfferDetail';
import JobOffersTab from '../Settings/JobOffersTab';
import { ResendModal } from './OffersActions';
import { offerToContractDefaults } from '../../../utils/OfferToContract';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 10;

const STATUS_OPTIONS: Array<{
  key: 'all' | OfferStatus;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'all', label: 'statusAll', icon: Hash },
  { key: 'draft', label: 'statusDraft', icon: FileText },
  { key: 'sent', label: 'statusSent', icon: Send },
  { key: 'accepted', label: 'statusAccepted', icon: CheckCircle2 },
  { key: 'rejected', label: 'statusRejected', icon: XCircle },
  { key: 'expired', label: 'statusExpired', icon: AlertCircle },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobOffersPage() {
  const { hasPermission } = useAuth();
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { data: companies = [] } = useCompanies(); // ← full objects, not just IDs

  const canWrite =
    hasPermission('Offer Management', 'write')
  const canCreateContract = hasPermission('Contract Management', 'write');

  const navigateToOfferEditor = useOpenOfferEditor();
  const openContractEditor = useOpenContractEditor();

  const { selectedCompanyId } = useCompanyFilter();
  const companyId: string[] = companies.map((c) => c._id);
  // Nothing to write an offer for until the companies have loaded.
  const openOfferEditor = (state: Parameters<typeof navigateToOfferEditor>[0]) => {
    if (companyId.length > 0) navigateToOfferEditor(state);
  };

  // ── View state ─────────────────────────────────────────────────────────
  const [section, setSection] = useState<'main' | 'templates'>('main');
  // Templates are per company: the one picked in the top bar, else the first.
  const templatesCompanyId = selectedCompanyId ?? companies[0]?._id;
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | OfferStatus>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // No company picked: send no companyId and let the API scope the list to
  // the user's companies, so the list doesn't wait for company details.
  const scopeCompanyIds = selectedCompanyId ? [selectedCompanyId] : undefined;
  const trimmedSearch = debouncedSearch.trim();

  const queryParams = {
    companyId: scopeCompanyIds,
    isTemplate: false as const,
    PageCount: LIMIT,
    page,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  };

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: offersData, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = useJobOffers(queryParams);

  const offers = offersData?.data ?? [];
  const total = offersData?.totalCount ?? 0;
  const totalPages = offersData?.totalPages ?? 1;

  // ── Per-status counts (one request for every tab) ──────────────────────
  const { data: statusCounts } = useJobOfferStatusCounts({
    companyId: scopeCompanyIds,
    ...(trimmedSearch ? { search: trimmedSearch } : {}),
  });

  // ── Prefetch next page ─────────────────────────────────────────────────
  useEffect(() => {
    // Wait for the real result: while the previous filter's data is shown as
    // a placeholder, totalPages belongs to that filter.
    if (!isPlaceholderData && page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: jobOffersKeys.list({ ...queryParams, page: page + 1 }),
        queryFn: () =>
          jobOffersService.listOffers({ ...queryParams, page: page + 1 }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [page, totalPages, isPlaceholderData, selectedCompanyId, statusFilter, trimmedSearch]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, selectedCompanyId]);

  // ── Mutations ──────────────────────────────────────────────────────────
  const deleteMutation = useDeleteJobOffer();
  const updateStatusMutation = useUpdateOfferStatus();

  const handleConvertToContract = async (offer: JobOffer) => {
    // Pre-fill the contract editor with offer data
    const defaults = offerToContractDefaults(offer);
    openContractEditor({
      mode: 'contract',
      companyId: defaults.companyId!,
      applicantId: defaults.applicantId,
      jobPositionId: defaults.jobPositionId,
      offerId: defaults.offerId,
      defaults,
    });
  };
  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: t('deleteTitle', 'jobOffers'),
      text: t('deleteText', 'jobOffers'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('cancel', 'common'),
      confirmButtonText: t('deleteConfirm', 'jobOffers'),
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      await deleteMutation.mutateAsync(id);
      if (selectedOfferId === id) {
        setView('list');
        setSelectedOfferId(null);
      }
    }
  };

  const selectedOffer = useMemo(
    () => offers.find((o) => o._id === selectedOfferId) ?? null,
    [offers, selectedOfferId]
  );

  const getStatusCount = (status: 'all' | OfferStatus) => {
    if (!statusCounts) return status === 'all' || status === statusFilter ? total : 0;
    return status === 'all' ? statusCounts.total : (statusCounts.counts[status] ?? 0);
  };

  const handleOfferClick = (id: string) => {
    setSelectedOfferId(id);
    setView('detail');
  };

  const handleClone = (offer: JobOffer) =>
    openOfferEditor({ mode: 'offer', companyId, cloneFrom: offer });

  const handleBackToList = () => {
    setView('list');
    setSelectedOfferId(null);
  };

  const handleEdit = (offer: JobOffer) =>
    openOfferEditor({ mode: 'offer', companyId, editing: offer });

  const showCompany = companies.length !== 1;

  const openNew = () => openOfferEditor({ mode: 'offer', companyId });

  const pickText = (v?: { en?: string | null; ar?: string | null } | null) =>
    (locale === 'ar' ? v?.ar || v?.en : v?.en || v?.ar) || '';

  // ── List View ──────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <PageShell
        title={t('sidebarTitle', 'jobOffers')}
        subtitle={t('pageMetaDescription', 'jobOffers')}
        actions={
          canWrite && section === 'main' && (
            <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openNew}>
              {t('newOffer', 'jobOffers')}
            </Button>
          )
        }
      >
        <PageMeta title={t('pageMetaTitle', 'jobOffers')} description={t('pageMetaDescription', 'jobOffers')} />

        <Card>
          <TabBar
            ariaLabel={t('jobOffersSections', 'jobOffers')}
            value={section}
            onChange={setSection}
            tabs={[
              { value: 'main' as const, label: t('tabOffers', 'jobOffers'), icon: <Briefcase className="size-4" /> },
              { value: 'templates' as const, label: t('tabTemplates', 'jobOffers'), icon: <FileText className="size-4" /> },
            ]}
          />
        </Card>

        {section === 'templates' ? (
          templatesCompanyId ? (
            <JobOffersTab companyId={templatesCompanyId} hideCompanySelector embedded />
          ) : (
            <Card>
              <EmptyState icon={<FileText className="size-6" />} title={t('selectCompanyForTemplates', 'jobOffers')} />
            </Card>
          )
        ) : (
          <>

        <Card>
          <StatStrip
            stats={[
              { label: t('totalOffers', 'jobOffers'), value: getStatusCount('all') },
              { label: t('accepted', 'jobOffers'), value: getStatusCount('accepted'), tone: 'success' },
              { label: t('pending', 'jobOffers'), value: getStatusCount('draft') + getStatusCount('sent'), tone: 'info' },
              { label: t('rejected', 'jobOffers'), value: getStatusCount('rejected'), tone: 'danger' },
              { label: t('statusExpired', 'jobOffers'), value: getStatusCount('expired'), tone: 'warning' },
            ]}
          />
        </Card>

        <Card>
          <TabBar
            ariaLabel={t('summaryTitle', 'jobOffers')}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={STATUS_OPTIONS.map((opt) => ({
              value: opt.key,
              icon: <opt.icon className="size-4" />,
              label: (
                <>
                  {t(opt.label, 'jobOffers')}
                  <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {getStatusCount(opt.key)}
                  </span>
                </>
              ),
            }))}
          />
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <SearchInput value={search} onChange={setSearch} placeholder={t('searchPlaceholder', 'jobOffers')} className="max-w-sm" />
          </div>

          {isLoading ? (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-busy="true">
              {[...Array(5)].map((_, i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-56 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                </li>
              ))}
            </ul>
          ) : isError && !offersData ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : offers.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="size-6" />}
              title={t('emptyTitle', 'jobOffers')}
              text={search || statusFilter !== 'all' ? t('emptyDescFilter', 'jobOffers') : t('emptyDescCreate', 'jobOffers')}
              action={
                canWrite && !search && statusFilter === 'all' && (
                  <Button variant="primary" icon={<PlusCircle className="size-4" />} onClick={openNew}>
                    {t('newOffer', 'jobOffers')}
                  </Button>
                )
              }
            />
          ) : (
            <ul className={`divide-y divide-slate-100 transition-opacity dark:divide-slate-800 ${isFetching ? 'opacity-60' : ''}`}>
              {offers.map((offer) => {
                const applicantName =
                  typeof offer.applicantId === 'object' && offer.applicantId !== null
                    ? offer.applicantId.fullName
                    : '—';
                return (
                  <li key={offer._id} className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleOfferClick(offer._id)}
                        className={`block max-w-full truncate rounded text-start text-sm font-semibold text-slate-900 after:absolute after:inset-0 hover:text-brand-600 dark:text-white ${focusRing}`}
                      >
                        {applicantName}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{pickText(offer.position)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <Badge tone={WORK_TYPE_TONE[offer.workType] ?? 'slate'}>{t(workTypeKey(offer.workType), 'modals')}</Badge>
                        {offer.salary.basic != null && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <DollarSign className="size-3.5" />
                            {offer.salary.basic.toLocaleString()} {offer.salary.currency}
                          </span>
                        )}
                        {companies.length !== 1 && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="size-3.5" />
                            {pickText(offer.companyId?.name)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={OFFER_STATUS_TONE[offer.status]}>{t(offerStatusKey(offer.status), 'jobOffers')}</Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(offer.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: '2-digit' })}
                      </span>
                    </div>
                    {canWrite && (
                      <div className="relative z-10 flex shrink-0">
                        <IconButton label={t('edit', 'jobOffers')} onClick={() => handleEdit(offer)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={t('clone', 'jobOffers')} onClick={() => handleClone(offer)}>
                          <Copy className="size-4" />
                        </IconButton>
                        <IconButton tone="danger" label={t('delete', 'jobOffers')} onClick={() => handleDelete(offer._id)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} totalCount={total} onChange={setPage} busy={isFetching} />
          )}
        </Card>
          </>
        )}

      </PageShell>
    );
  }

  // ── Detail View ────────────────────────────────────────────────────────
  if (view === 'detail' && selectedOffer) {
    return (
      <>
        <PageMeta title={t('pageMetaTitle', 'jobOffers')} description={t('pageMetaDescription', 'jobOffers')} />
        <OfferDetail
          offer={selectedOffer}
          canWrite={canWrite}
          onBack={handleBackToList}
          onEdit={handleEdit}
          setResendOpen={setResendOpen}
          showCompany={showCompany}
          onDelete={handleDelete}
          onClone={handleClone}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
          onConvertToContract={handleConvertToContract}
          canCreateContract={canCreateContract}
        />
        {resendOpen && (
          <ResendModal offer={selectedOffer} companies={companies} onClose={() => setResendOpen(false)} />
        )}
      </>
    );
  }

  // Fallback
  if (view === 'detail' && !selectedOffer) {
    setView('list');
    setSelectedOfferId(null);
    return null;
  }

  return null;
}
